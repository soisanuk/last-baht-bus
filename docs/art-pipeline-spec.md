# Scene Art Pipeline (gen-scenes) — Implementation Spec

The backdrop track from `docs/2d-roadmap.md`: room art for the v0 scene panel
(shipped — `web/js/scene.js`), and later the hotspot surface for v1. Mirrors the
proven portrait pipeline **exactly**: LBB owns *what the rooms are* (a generated
manifest, the only coupling), portrait_gen owns *how they look* (prompts, SDXL,
batching). Read `/Users/mario/projects/portrait_gen/CLAUDE.md` first — this spec
extends that contract to scenes; `gen_pics.sh` is the wrapper pattern to copy.

## The consumption contract (already shipped — do not change it)

`web/js/scene.js` `_sceneArt()` tries, in order:

1. `web/art/rooms/<roomId>.png`
2. `web/art/regions/<slug>.png` where slug is **exactly**
   `String(region).toLowerCase().replace(/[^a-z0-9]+/g, "-")` ("Soi 6" → `soi-6`)
3. nothing (the art row removes itself)

So coverage is incremental by construction: **~10 region images give every room
in the game a backdrop on day one**; hero rooms then override their region one
file at a time. Display: `object-fit: cover`, full panel width (390–820px),
max-height 210px — compositions must survive aggressive vertical cropping (keep
the subject in the middle horizontal band; nothing essential near top/bottom edges).

## Output contract

| Property | Value |
|---|---|
| Paths | `web/art/rooms/<roomId>.png`, `web/art/regions/<slug>.png` |
| Format | PNG (the shipped fallback chain hardcodes `.png`) |
| Delivered size | long edge ≤ 1216px (generate at an SDXL bucket, e.g. 1216×832, ship as-is or downscaled) |
| File budget | **≤ 400 KB per file** (post-process: `pngquant --quality 60-85` or equivalent; the repo already carries heavy portraits — scenes are ~100 files and must not be 1.5 MB each) |
| Content | **No people** — the cast row IS the people; a painted-in girl contradicts the live roster. Distant anonymous silhouettes acceptable in street scenes only. |
| Text | **No readable text/signage** — SDXL mangles it and any legible venue name will contradict world.js naming. Negative-prompt it; reject renders with prominent text. |
| Time of day | Night (neon) everywhere — play is 18:00→dawn. Day variants out of scope. |
| Style | One global style contract (below) across every image — the town must read as one place. |

## The manifest (the only coupling — same doctrine as portraits)

**New file in LBB: `scripts/gen-scene-manifest.mjs`** → writes
`docs/scene-manifest.json`. Copy the loader pattern from
`scripts/gen-portrait-manifest.mjs` (vm-load world.js, DOM-free). Never
hand-edit the JSON; regenerate it in LBB. Emit:

```jsonc
{
  "rooms": [{
    "id": "queen_vic", "name": "Queen Vic Inn", "bar": "Queen Vic Inn",
    "barType": "pub",            // null for streets/rooms
    "region": "Soi 6", "regionSlug": "soi-6",
    "kind": "pub",               // derived: barType, else "street" | "hotel_room" |
                                 // "shop" | "beach" | "interior" (heuristic on the room)
    "desc": "Actual air conditioning. Actual wood panelling. …"  // full prose — the
                                 // ground truth of what the room looks like
  }],
  "regions": [{
    "slug": "soi-6", "name": "Soi 6",
    "roomIds": ["soi6_street", "…"],
    "sampleDescs": ["…", "…"]    // 2-3 street-room descs to prompt the region shot
  }]
}
```

The `regionSlug` in the manifest **must** be produced by the same regex as
scene.js (quoted above) — one slug function, copied verbatim, or the fallback
chain silently misses.

## portrait_gen side (you own the how — this is the shape)

- A `gen_scenes.sh` mirroring `gen_pics.sh`: batches, `set -euo pipefail`, copies
  results to `/Users/mario/projects/last-baht-bus/web/art/{rooms,regions}/`,
  fails loudly per-file. Subset support (`./gen_scenes.sh queen_vic ruby_kiss`)
  for redo loops.
- Scene prompts composed from: **kind template** (per `kind`/`barType` — the
  framing) + **desc distillation** (key nouns from the room's prose: the mirror
  wall, the dartboard, the lipstick-red lighting) + **the style contract** +
  the standard negative (people, faces, text, watermark, logo). Overrides file
  for hero rooms where the template misses.
- Kind templates (starting set — tune freely):
  - `beer` — open-front bar interior, rail + stools facing the soi, string lights
  - `gogo` — enclosed club interior, stage poles, red/purple wash, mirror walls
  - `soi6` — narrow shophouse bar front, lipstick neon, open door spilling light
  - `pub` — dark wood interior, brass, warm lamps, dartboard
  - `gents` — AC villa lounge, curtained couches, low amber light
  - `street` — neon-soaked soi at night, wet asphalt, signage bokeh (unreadable)
  - `beach` — night beach/promenade, distant town glow, palms
  - `hotel_room` — modest Thai hotel room at night, neon leaking through curtains
- Batch by checkpoint/settings like gen_pics.sh batches by backdrop — model
  init dominates wall-clock.

### Style contract (v1 of it — iterate on ~6 test renders before mass generation)

> cinematic wide establishing shot, night, neon-noir, humid tropical air, wet
> reflective surfaces, moody painterly-photographic, rich color, film grain,
> Pattaya Thailand back-soi atmosphere

Negative: `people, person, face, crowd, text, signage lettering, watermark,
logo, daylight, washed out`

Lock the exact wording after the test renders and record it in this file — the
style contract is part of the spec once frozen.

## Phasing (ship after every phase — the fallback chain makes partials clean)

1. **Phase R — regions (~10 images, day one):** one establishing shot per
   region slug from the manifest. Every room in the game gets a backdrop.
2. **Phase H — hero rooms (~25):** the Soi 6 pocket first (it's the shipped
   challenge mode: `SOI6_ROOMS` — the 7 bars, Queen Vic, qv_room, the 3 soi
   segments, beach), then the remaining canon bars.
3. **Phase L — long tail:** streets, hotels, shops, interiors, in whatever
   order play surfaces them. No deadline; missing = region fallback, forever fine.

## LBB-side guard test — `tests/js/art.test.js` (new, ship with Phase R)

Same doctrine as portraits but **inverted on missing**: orphaned art fails,
missing art never does. Assert, vm-loading world.js like the other tests:

- every file in `web/art/rooms/` matches a real `ROOMS` id (catches renames)
- every file in `web/art/regions/` matches a live region slug (same regex, verbatim)
- every art file is a PNG (magic bytes) and **≤ 400 KB** (the budget, enforced)
- `web/art/` contains nothing but `rooms/`, `regions/` (and optional README)

## Review loop

- A throwaway contact sheet beats clicking through the game: a small
  `tools/art-sheet.mjs` that writes an HTML grid (room id + name + image) to
  the scratchpad for eyeballing a batch. Optional but recommended.
- In-game check: open `web/index.html`, `travel` through the covered rooms —
  the v0 panel shows each backdrop with overlays (rain/dark/bell) compositing
  over it. Verify one rainy and one three-bell room for overlay legibility.
- Reject-and-redo is cheap (`gen_scenes.sh <id>`); style drift is expensive —
  when in doubt re-render the outlier, don't retune the contract.

## Acceptance (per phase)

```sh
node --test                    # art.test.js green: no orphans, budget held
node tools/probe.mjs 'sandbox(); run("look"); show()'   # engine untouched
git status --short             # only web/art/** (+ the test, first time)
```

Plus: game opened from `file://`, panel shows art in covered rooms, region
fallback still fires for uncovered ones, no broken-image icons anywhere.

## Out of scope

Day variants; per-room ambient animation; hotspot boxes (v1 — but compositions
should leave tappable landmarks visible: the bell, the door, the rail); any
scene.js change; any engine change; committing generator code into LBB
(portrait_gen is not a git repo and stays the workshop).
