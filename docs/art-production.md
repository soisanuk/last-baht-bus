# Getting the art to production weight

Written 2026-08-08, after Second Road's roster view made the numbers impossible
to ignore. Nothing here is urgent today; all of it is much cheaper to do now than
after the portrait migration finishes.

## Measured, not estimated

| | files | on disk |
| --- | --- | --- |
| `web/portraits/` | 277 | **125 MB** |
| `web/portraits/pics/` | 18 | 25 MB |
| `web/art/rooms/` | 33 | 12 MB |
| `web/art/regions/` | 15 | 5.5 MB |
| **`web/` total** | | **149 MB** |
| `.git` | | **324 MB** |

The portraits split cleanly in two: **205 are pixel-art placeholders under 10 KB**,
and **72 are generated SDXL portraits at 832×1088, averaging ~1.4 MB** (largest
1.59 MB). Nothing sits in between.

## The number that actually matters

**The migration is 26% done.** 72 of 277 portraits have been replaced with
generated art. At the current average, finishing it means:

> **~388 MB of portraits alone**, before any new characters, and before scene
> art (33 of 176 rooms so far) goes the same way.

So this isn't a 125 MB problem. It's a ~400 MB problem that is 26% arrived, and
every batch of generated art makes the eventual cleanup more expensive.

## Nothing displays these anywhere near full size

| where | rendered at |
| --- | --- |
| LBB `Here:`/`At the rail:` inline avatars | ~24–32 px |
| LBB flyout wheel header (`.fly-portrait`) | **140 px** — the largest anywhere |
| Second Road roster card | 64 × 78 px |
| LBB scene panel | ≤ ~800 px wide |

The biggest portrait display in either game is 140 px. Serving an 832×1088 PNG
for it is roughly **50× the pixels needed**, and about **30× the bytes**.

## What to do

### 1. A thumbnail track, generated at the source

`portraits/thumb/<id>.webp` at **192 px** on the long edge — covers the 140 px
flyout at ~1.4×, the roster at 3×, and inline avatars at 6×. Expect **20–40 KB**
each at WebP q80 for painterly output, against 1.4 MB now: **~97% smaller**.

Generate it in `portrait_gen` alongside the full render, not as a later
conversion pass in LBB. The generator is the source of truth for what a
character looks like; LBB should receive production-ready assets rather than
raw ones.

Keep the full-size render for the gallery/lightbox path (LBB's photo frames
genuinely want detail) — but only *that* path should ever load it.

### 2. WebP over PNG for anything painterly

The generated portraits and scene art are photographic/painterly, which is
exactly where PNG is the wrong container. WebP q80 typically lands 85–95% below
PNG for this material with no visible loss at display size.

**Keep PNG for the 205 pixel-art placeholders** — flat-colour 24×24 art is
already tiny and PNG is the right format for it. This is a two-track problem and
treating it as one is how you end up degrading the pixel art.

### 3. Extend the budget guard to portraits

`tests/js/art.test.js` already enforces **≤ 400 KB per file** on scene art, with
a comment pointing at `pngquant`. Portraits have **no budget at all**, which is
why 1.59 MB files exist. Add one — and set it low enough to be a real constraint
(**≤ 250 KB** for anything in `portraits/`, once the thumbnail track exists), so
the next batch can't quietly re-open this.

### 4. Decide about `.git` separately, and honestly

**Converting the working tree does not shrink history.** The 1.4 MB PNGs stay in
`.git` forever, and it is already 324 MB. Three options, in increasing order of
disruption:

- **Accept it.** Clone cost only, and it stops growing once the conversion
  lands. Reasonable if the migration converts *before* completing.
- **Stop committing full-size renders.** Keep them in `portrait_gen` (or an
  assets bucket) and commit only the production thumbnails. LBB's `onerror`
  fallback already tolerates missing art, so this degrades safely.
- **Rewrite history.** Real cleanup, real disruption, and it invalidates every
  existing clone. Only worth it if the repo becomes genuinely unmanageable.

The middle option is probably right, and it is *much* easier to adopt at 26%
converted than at 100%.

### 5. Deploy reality

GitHub Pages serves only what a page references, so 149 MB on disk is not 149 MB
per visitor — but it *is* paid on every clone and every CI run, and the E2E job
clones. The user-facing cost is the flyout portrait: **1.4 MB to open a character
card on a phone**, which on Thai mobile data is a real thing to have done to
somebody.

## Migration is safe to do incrementally

Both games already tolerate missing art by design — LBB's `_avatarSrc` drops the
`<img>` on `onerror`, and the scene panel falls back room → region → nothing. So
a thumbnail track can land character by character with no flag day and no broken
state in between.

## Order I'd do it in

1. Thumbnail track in `portrait_gen` (192 px WebP), for the 72 already generated.
2. Point both games' small-format displays at `thumb/`, keeping full-size only
   for the gallery path.
3. Add the portraits budget to `art.test.js`.
4. Decide the `.git` question — and do it before the migration finishes, not
   after.
