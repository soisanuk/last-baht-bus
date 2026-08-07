# Getting the art to production weight

Written 2026-08-08, after Second Road's roster view made the numbers impossible
to ignore. Nothing here is urgent today; all of it is much cheaper to do now than
after the portrait migration finishes.

## Measured, not estimated

Re-measured 2026-08-08 (later the same day, after the Soi 6 art pass):

| | files | on disk |
| --- | --- | --- |
| `web/portraits/` | 277 | **125 MB** |
| `web/portraits/pics/` | 18 | 25 MB |
| `web/art/rooms/` | 33 | 12 MB |
| `web/art/regions/` | 15 | 5.5 MB |
| `web/art/filler/` | 11 | 4.1 MB |
| **`web/` total** | | **149 MB** |
| `.git` | | **324 MB** |

The portraits split cleanly in two: **205 are pixel-art placeholders averaging
0.4 KB**, and **72 are generated SDXL portraits at 832×1088, averaging 1.44 MB**
(largest 1.67 MB). Nothing sits in between — there is no middle tier to trim,
which is why this is a format problem and not a compression one.

## The number that actually matters

**The migration is 26% done.** 72 of 277 portraits have been replaced with
generated art. At the current average, finishing it means:

> **~400 MB of portraits alone**, before any new characters, and before scene
> art goes the same way.

So this isn't a 125 MB problem. It's a ~400 MB problem that is 26% arrived, and
every batch of generated art makes the eventual cleanup more expensive.

**Scene art is a second curve, not a footnote.** 21.6 MB today across
rooms/regions/filler, held under a 400 KB per-file budget — but that's 33 of 176
rooms. Finished, it's **~70 MB**, and it's growing faster than portraits right
now because a region shot covers many rooms and hero rooms keep overriding them.
The same WebP argument applies to it unchanged.

## Nothing displays these anywhere near full size

| where | rendered at | CSS |
| --- | --- | --- |
| LBB `Here:`/`At the rail:` inline avatars | **20 px** | `.kw-av` |
| LBB scene-panel cast row | **52 px** | `#scene-cast .bust img` |
| Second Road roster card | 64 × 78 px | |
| LBB flyout wheel header | **140 px** — the largest anywhere | `.fly-portrait` |
| LBB scene backdrop | ≤ 820 × 210 px | `#scene-art img` |

The biggest portrait display in either game is 140 px. Serving an 832×1088 PNG
for it is roughly **50× the pixels needed**, and about **30× the bytes**.

Note the **cast row at 52 px** is the most *frequent* portrait display in LBB —
it repaints every time you enter a room, for everyone present. The 140 px flyout
is the largest but the rarest.

## What to do

### 1. A thumbnail track, generated at the source

`portraits/thumb/<id>.webp` at **384 px** on the long edge. Expect **60–100 KB**
each at WebP q80 for painterly output, against 1.44 MB now: **~93% smaller**.

**Why 384 and not 192.** The flyout is a 140 px *CSS* box, and a 3× phone renders
that at ~420 device pixels — a 192 px source would be visibly soft on exactly the
display it was sized for. 384 px is 2× the largest consumer, covers the 52 px cast
row at 7× and the 20 px inline avatars at 19×, and still throws away ~93% of the
bytes. Device-pixel-ratio is the thing that makes the obvious 192 px answer wrong.

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

#### `.png` is hardcoded in four places — this is not a drop-in swap

Worth knowing before starting, because a reader would otherwise hit it cold:

| file | what assumes `.png` |
| --- | --- |
| `web/js/scene.js` | the whole fallback chain — `art/rooms/<id>.png`, `art/regions/<slug>.png`, and the `_sceneHas` check |
| `web/js/term.js` | `portraits/<id>.png` and `portraits/pics/<pic>.png` |
| `tests/js/art.test.js` | asserts every art file ends `.png` |
| `tests/js/portraits.test.js` | asserts PNG magic bytes |

`docs/art-pipeline-spec.md` also states the hardcoding as a deliberate contract
("the shipped fallback chain hardcodes `.png`"), so that line needs updating too.

The clean route is **extension-agnostic lookup with `.webp` → `.png` fallback**,
mirroring the existing room → region → nothing chain. That keeps the migration
incremental in exactly the way this doc argues for: a character or room converts
the moment its WebP lands, with no flag day and no broken intermediate state.

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

1. **Extension-agnostic lookup first** (`.webp` → `.png`) in `scene.js` and
   `term.js`, plus the two tests. Nothing changes visually, but every later step
   becomes incremental instead of a flag day.
2. Thumbnail track in `portrait_gen` (**384 px** WebP), for the 72 already generated.
3. Point both games' small-format displays at `thumb/`, keeping full-size only
   for the gallery path.
4. Add the portraits budget to `portraits.test.js` (≤ 250 KB once thumbs exist).
5. Convert scene art to WebP under the same 400 KB budget — it's the second
   curve and it's growing fastest.
6. Decide the `.git` question — and do it before the migration finishes, not
   after.

Step 1 is deliberately first: it's the only one that unblocks the others, and
it's the cheapest thing in the list.
