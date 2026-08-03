# Planning note — Spicy content gating & moddable content packs

**Status:** DESIGN NOTE, not started. Captures the intended architecture for graduated
adult content so it's ready when launch demand arrives. No code yet.

## The boundary (read this first)

This is deliberately an **architecture** plan, not a content plan. The split:

- **Buildable in-repo (engine/systems):** the tier model, the consent/age gate, the
  selection logic, the content-pack loader, save-compat, the moddable slot. All of it can
  ship as clean scaffolding with the shelves stocked **up to the game's current tasteful
  line** (PG‑13 → suggestive‑R: innuendo, fade-to-black, swimwear, the honest‑LT emotional
  beats).
- **NOT authored in-repo by the AI collaborator:** the *explicit tier itself* — graphic
  sexual prose and explicit imagery. That payload is authored by the project owner, a
  commission, or a permitting external tool, and dropped into the moddable slot below. The
  engine must never hard-depend on it: with no explicit pack present, the game degrades to
  the tame content and plays identically.

Design everything so the explicit layer is **separable, optional, and swappable** — good for
this boundary, and independently good for legal/commercial isolation (below).

## Content-tier model

A single ordered scalar on the player, mirroring how `G.player.lang` works:

- `G.player.spice`: `"tame"` (default) → `"suggestive"` → `"explicit"`. Ordered, so a scene
  asks "give me the highest tier at or below the player's setting that exists for me."
- Default is `"tame"`; nothing changes for an unset/old save (deserialize merge handles the
  new field with no backfill, exactly like `lang`).
- Persists across resets and save/restore like the rest of `G.player` (origin/lang).

## Consent + age gate

- A one-time gate before `"suggestive"`/`"explicit"` can be selected — a modal in the taxi
  intro (or first toggle), same `pendingChoice` pattern as the language/identity picks.
- Records an explicit opt-in (`G.player.ageOk` + chosen `spice`). Never defaults on.
- Re-affirm on a fresh install; `RESET` clears it. A visible `SPICE` verb to change tier
  later (three-surfaced: parser + completion + a HELP line), itself gated behind the age
  opt-in.
- For a future hosted/online build: the gate becomes an account attribute (see the shared-
  world rules in CLAUDE.md — this is player-local state, stays per-player).

## Selection logic — how a scene picks its tier

Reuse the patterns already in the engine; do NOT invent a parallel content system.

- **Dialogue** (`world.js` entries): add an optional `spice:"suggestive"|"explicit"` on an
  entry, plus optional parallel richer variants. `_pickDialogue` already skips entries a
  player can't see (bond tiers); extend the same gate: skip any entry whose `spice` exceeds
  `G.player.spice`, and when multiple tiers of "the same beat" exist, take the highest
  allowed. Absent `spice` = always eligible (tame). This mirrors the `bond:N` gating exactly.
- **Pools** (`_pickVary`): a hot line can carry tier-keyed variants; the picker chooses the
  pool for the active tier, falling back to tame. Same shape as the localization idea of
  parallel variants.
- **Encounters / barfine resolution / the night ride:** these already "resolve and move on."
  A higher tier swaps the *resolution prose* (a longer, more explicit beat) — it must NOT
  change mechanics, money, or outcomes (a tier is a **render** choice, never a rules change,
  so seeds/economy/determinism are identical across tiers — same discipline as the 2D/online
  "prose is one renderer" rule).
- **Photos:** the frame set already supports distinct art per entry (`pic` stems, the
  nudity-guarded `_picguard`). An explicit pack supplies alternate stems for the same caption;
  `_picFor` selects by tier, falling back to the tame frame. The tame frames stay the default
  asset shipped in-repo.

## Moddable content packs — the overlay pattern

**Model it on the localization seam (`_L` / `lang.js`), which already solves this exact
problem: an optional overlay keyed by a stable id, English/tame fallback, zero hard
dependency.**

- An explicit pack is a separate classic script (e.g. `web/js/spice.js`, git-ignorable /
  distributable separately) exposing a data table `_SPICE` keyed by a **stable content id**
  (dialogue-entry id, pool key, encounter id, photo caption). Load order: after
  `world.js`/`lang.js`, before the engine parts — same slot `lang.js` occupies.
- A single accessor `_spice(id, tier)` returns the pack's payload for that id at/below the
  active tier, or **null** → caller renders the tame in-repo content. So:
  - Pack absent entirely → `typeof _SPICE === "undefined"` → every lookup is null →
    identical to today. (Same `_L` short-circuit trick.)
  - Pack present but player at `"tame"` → never consulted.
- Keep the pack **data-only and declarative** (like `world.js`), so it needs no engine
  changes to grow, and so a future served/2D/online frontend consumes it the same way.
- **Determinism & save-compat:** the pack changes only rendered strings/asset paths, never
  `G`, never `G.rng`, never mechanics. Same seed + same commands = same transcript regardless
  of which pack is loaded (preserves the online.test replay/anti-cheat basis). No new `G`
  field beyond `player.spice`/`player.ageOk`.
- **Separability wins:** the explicit layer lives in one optional file with its own art
  folder; it can be shipped, withheld, region-gated, sold, or community-authored without
  touching the core repo. The public repo stays tasteful; the pack is a distinct artifact.

## Where it plugs into existing seams

| Surface | Existing hook | Change |
|---|---|---|
| Dialogue | `_pickDialogue` (bond/req gating) | add `spice` skip + highest-allowed pick |
| Repeatable prose | `_pickVary(pool,key)` | tier-keyed pool select, tame fallback |
| Barfine / encounters | `_bfResolve`, `_ENC[...]` | swap resolution prose only; mechanics untouched |
| Photos | `_picFor(id,cap)` (already multi-pool) | add pack stems, tier select, tame fallback |
| Player state | `G.player` (lang/origin) | `+spice`, `+ageOk`; deserialize merge, no backfill |
| Verb/UI | three-surfaces rule | `SPICE` verb + a HELP line, gated on `ageOk` |
| Content overlay | `_L`/`lang.js` seam (the template) | new optional `_SPICE`/`spice.js` + `_spice()` accessor |

## Legal / commercial isolation (why separable matters beyond the AI boundary)

- Explicit content in its own artifact makes age-verification, store-policy compliance
  (app stores forbid it; the web build can gate it), regional law, and "SFW build vs adult
  build" a **packaging** decision, not a code fork.
- The core game (this repo) can stay listable/PG‑13 everywhere; the adult pack is distributed
  through channels that permit it.

## Open decisions (resolve at build time)

1. Two tiers (`tame`/`explicit`) or three (`+suggestive`)? Three gives a graceful middle and
   matches where the game already sits; costs one more content pass.
2. Is `"suggestive"` authored in-repo (it's within the current tasteful line) with only
   `"explicit"` in the external pack? Likely yes — cleanest boundary.
3. Pack packaging: bundled-but-gated vs a separately downloaded file vs a mod folder the
   frontend loads. (The engine seam is identical for all three; it's a distribution choice.)
4. Community mods: if third parties author packs, do they get a documented `_SPICE` schema +
   a validation test (like the world-integrity tests)? Recommended if modding is a goal.

## Phasing (once/if pursued)

- **P0** — `G.player.spice`/`ageOk`, the consent gate, the `_spice()` accessor + optional
  `spice.js` slot, English/tame fallback everywhere, the `SPICE` verb. Ships doing nothing
  visible (no pack) — pure scaffolding.
- **P1** — wire the selection into one surface end-to-end (dialogue is the easiest) with a
  tame-authored `"suggestive"` tier to prove the pipeline.
- **P2** — extend to pools/encounters/photos; document the `_SPICE` schema.
- **P3** — the `"explicit"` pack itself (author-supplied, out of this repo's authored scope).

Related: the localization seam (`_L`/`lang.js`) is the structural template; the disposable-
frontend and shared-world rules in `CLAUDE.md` govern determinism/save-compat/render-only.
