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

`portraits/thumb/<id>.webp` at **384 px** on the long edge. **Landed 2026-08-08:
72 files, 1.1 MB total — 14 KB average, 19 KB max, against 104 MB of full-size
renders. 99% smaller.**

The estimate here was 60–100 KB and the measurement came in at 14 KB, because
illustrated LoRA output compresses far harder than photographic material. Worth
recording rather than quietly correcting: every size estimate in this document
before that point was guessed from photographic assumptions and ran 4–7× high.

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

### 3. Budget the thumbnails, not the renders

**This section originally proposed ≤ 250 KB for anything in `portraits/`. That
rule cannot be enforced and should not be added.** All 72 full-size renders are
1.2–1.67 MB, so it would fail 72 files the day it landed — and the gallery and
lightbox paths genuinely want that detail, so shrinking them isn't the answer
either. A rule that fails on arrival gets "fixed" by deleting the assertion,
which leaves you worse off than having no rule.

What landed instead (`tests/js/portraits.test.js`, 2026-08-08):

- **thumbs ≤ 60 KB**, must be real WebP, one per render, no orphans — a real
  constraint against the actual 14 KB average
- **full-size ≤ 2 MB** — a drift ceiling, not a diet: it stops the existing
  files getting worse without pretending they're going to get smaller

The ≤ 250 KB rule only becomes possible if the full-size renders leave the repo
— the middle option in §4 below. The reasoning is also left in a comment at the
test, so nobody later "fixes" the gap by adding the 250 KB rule and then
deleting the failing assertion.

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
2. ~~Thumbnail track in `portrait_gen`~~ — **done 2026-08-08**, 384 px WebP, 72 files.
3. ~~Point both games' small-format displays at `thumb/`~~ — **done 2026-08-08**
   (LBB `_avatarSrc`, Second Road `portraitUrl`); full-size kept for the gallery.
4. ~~Add a ≤ 250 KB portraits budget~~ — **not enforceable; see §3.** The thumb
   budget (≤ 60 KB) and a 2 MB drift ceiling landed instead.
5. ~~Convert scene art to WebP~~ — **unblocked 2026-08-10.** `_sceneArt()` now
   tries `.webp` before `.png` at every step, and `art.test.js` accepts either
   by magic bytes. The conversion itself is the art agent's, and it can land
   one file at a time: drop the `.webp` in and delete the `.png`.
   Measured on the largest file in the repo (`kitten_corner`, 400 KB, right
   against the budget): `cwebp -q 82` gives **96 KB, a 76% saving**. Across
   234 rooms that is **~22 MB instead of ~85 MB**.
6. Decide the `.git` question — and do it before the migration finishes, not
   after.

Step 1 is deliberately first: it's the only one that unblocks the others, and
it's the cheapest thing in the list.

---

## The masters are in the served directory (2026-08-09)

Measured while answering "shouldn't the portraits just be PNGs or something not
so big?" — and the answer turned out to be that they ARE PNGs, that this is the
problem rather than the fix, and that the expensive ones are not being displayed
at all.

| track | count | size | each |
|---|---|---|---|
| full renders, PNG | 84 | **117 MB** | 1.5 MB |
| thumbs, WebP | 84 | **1.3 MB** | 20 KB |
| pixel placeholders, PNG | 231 | 924 KB | 4 KB |
| `pics/` photo frames | — | 25 MB | — |
| **`web/portraits` total** | | **144 MB** | |

**The thumb track already wins, 90×.** Bert is 1.5 MB as a PNG and 20 KB as a
WebP, and `_portraitSrc` prefers the thumb whenever one exists. term.js says so
in its own comment: *"keep the full render for nothing at all — 14 KB against
1.44 MB."*

So for all 84 rendered characters, **the game never requests the 1.5 MB file.**

### Which makes this a location problem, not a format problem

`web/` is what `.github/workflows/pages.yml` publishes to gh-pages. So 117 MB of
never-requested masters ship with every deploy. Steps 1–4 above already solved
the *format* question and it worked; nobody then asked what the originals were
still doing in the served tree.

Masters belong in `../portrait_gen`, beside `characters.py` and `gen_pics.sh`,
where every other generation input already lives.

**`web/portraits` 144 MB → 26 MB**, and the same off the deploy.

### The check that makes it safe

The fallback chain is `thumb → full → remove`, so a master whose thumb is
missing is the only thing standing between a character and no face. Any move has
to be driven off `_THUMBS` rather than off a glob.

Checked 2026-08-09: **all 84 masters have a thumb, and zero are unbacked** — so
today the safe set is the whole set. That will not stay true the moment the art
agent renders a face before its thumb, which is the normal order of work. Re-run
the check at the time; do not trust this paragraph.

### What this does NOT fix

`.git` is 261 MB and moving files forward reclaims none of it — the blobs are
already committed. That is still §6's open question (history rewrite, or accept
it), and it gets more expensive every day the current pipeline runs. Worth
noting the ordering: **the .git decision should be made BEFORE the remaining
~200 characters are rendered**, because that is when the cost of rewriting is
lowest and the cost of not rewriting is highest.

### Ownership

`web/portraits/` and the thumbnail track are the art agent's; this is a proposal
to them, not a change to make from this side. The consumer wiring (`_avatarSrc`,
`portrait-thumbs.js`, `_portraitSrc`) is ours and needs no change at all — the
fallback already handles a missing master, which is precisely why the move is
cheap.

## After the rewrite: three things that are still true (2026-08-10)

The masters moved and `main`'s history was rewritten to drop the blobs. Three
consequences that outlive the operation, recorded because each one is the sort
of thing that gets rediscovered painfully.

### 1. `gh-pages` still holds ~64 MB, and a rewrite was the WRONG tool there

The deploy branch had accumulated its own copies of the masters across its
history — the same blobs `main` just shed, kept alive on the other branch.

It was not rewritten, and should not be. The remote had **nine deploys a local
backup did not**, so force-pushing a rewritten copy would have destroyed real
deployment history to save space on a branch that is **regenerated from `main`
on every push**. Its history holds no information `main` does not.

So the fix is to stop keeping a history at all: `force_orphan: true` on the
`peaceiris/actions-gh-pages` step, which publishes a single fresh commit each
time. Landed in `.github/workflows/pages.yml`. The 64 MB goes on the next
deploy, with no destructive operation anywhere.

The general lesson: **before rewriting a branch, ask whether it is derived.** A
derived branch should be regenerated, never rewritten — and check the remote
against your backup first, because "my copy" is not the same as "the copy".

### 2. GitHub will not shrink when you do

Rewriting locally and force-pushing does not reclaim server-side storage. The
old objects stay until GitHub's own gc runs, and unreferenced blobs can linger
indefinitely — a support request may be needed to purge them properly.

So the repo-size graph will lie for a while. Do not treat a flat number as
evidence the operation failed, and do not repeat the operation trying to make
it move.

### 3. Every existing checkout is now incompatible — `git pull` will NOT fix it

Rewritten history means new hashes for every commit. Anyone holding a clone —
**the art agent working in this same checkout, and Second Road's `npm run
sync`** — has a divergent history that no pull, merge or rebase resolves
sanely.

They must **re-clone**. Anyone with uncommitted work should copy it out as
files first, re-clone, and re-apply — not stash it, because the stash lives in
the old object graph.

This is the cost that is easy to forget when the space saving is the visible
part, and it is paid by people who were not in the room.
