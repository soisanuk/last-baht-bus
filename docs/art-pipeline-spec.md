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

**SHIPPED — `scripts/gen-scene-manifest.mjs`** → writes `docs/scene-manifest.json`
(`--check` verifies it's current, date-insensitive, like the portrait one).
Never hand-edit the JSON; regenerate it in LBB. **176 rooms, 15 regions.** Emits:

```jsonc
{
  "rooms": [{
    "id": "queen_vic", "name": "Queen Vic Inn", "bar": "Queen Vic Inn",
    "barType": "pub",            // null for streets/rooms
    "region": "Soi 6", "regionSlug": "soi-6",
    "kind": "pub",               // derived — see the kind table below
    "dark": false,               // the room's G.dark flag: the art should say unlit
    "people": ["Angela", "Mort", "Terry"],  // everyone stationed here + everyone the
                                 // prose names — the generator DROPS those clauses
                                 // (scene art carries no people; the cast row does)
    "desc": "Actual air conditioning. Actual wood panelling. …"  // full prose — the
                                 // ground truth of what the room looks like
  }],
  "regions": [{
    "slug": "soi-6", "name": "Soi 6",
    "roomIds": ["soi6_street", "…"],
    "sampleDescs": ["…", "…"]    // the region's top-3 street rooms by `hubScore`
                                 // (venues/bus stop/exits, minus dark) — the main
                                 // drag, not whichever room sorts first
  }]
}
```

`kind` is `barType` when the room is a bar (`beer` 49 · `gogo` 9 · `soi6` 7 ·
`pub` 3 · `gents` 3 · `club` 1), else its flags (`massage` 14 · `soapy` 3 ·
`hostbar` 1 · `cabaret` 1 · `food` 2 · `shop` 2 · `hotel_room` 4), else a name
heuristic (`beach` 9), else `street` (59) — with a small `KIND_OVERRIDE` table
for landmarks the flags can't read (`market` 4 · `viewpoint` 2 · `interior` 3).
Every kind must have a template in portrait_gen's `scenes.py KIND_TEMPLATES`.

The `regionSlug` in the manifest **must** be produced by the same regex as
scene.js (quoted above) — one slug function, copied verbatim, or the fallback
chain silently misses. `tests/js/art.test.js` asserts both files still carry it.

## portrait_gen side — SHIPPED (`scenes.py`, `gen_scenes.sh`)

`scenes.py` mirrors `manifest.py`: it loads the scene manifest and builds
**CHARACTERS-shaped entries**, so `compose_prompt()`/`generate()` need no
scene-specific code — only the size differs (landscape **1216×832** vs the
portrait 832×1088). `main.py` gains `--scene ID`, `--scenes ID…`,
`--all-regions` (Phase R) and `--all-scenes`; scene mode swaps the registry,
forces the character venue backdrop **off** (a scene *is* the venue), and takes
the neon LoRA dial-back (`NEON_VENUE_STRENGTH`) for stylized styles, since every
scene is a night scene. `--show-prompt` works model-free, as with characters.

Prompt = **kind template** (the framing) + **distilled prose** + **style
contract**, with `SCENE_OVERRIDES` (in `scenes.py`) as the hero-room escape
hatch — `{STYLE}` expands to the contract. The distiller drops parenthesised
command hints, ALL-CAPS venue names, Thai runs, `{{…}}` markup, and any sentence
naming a person from the manifest's `people` (or containing a person noun) —
then keeps the first ~22 words of what's left. **Region shots** additionally get
a flavour clause from the region's dominant venue kind (`REGION_FLAVOUR`), which
is what stops Soi 6 rendering as a six-lane road.

`gen_scenes.sh` mirrors `gen_pics.sh`: one model load per batch, `--rooms` for
the long tail, no args = every region, subset support (`./gen_scenes.sh
queen_vic soi-6`) for redo loops, `KEEP=1` to stage without copying. It resolves
each id to `rooms/` or `regions/` **from the manifest**, so a rename needs no
script edit, and post-processes each render with `generator/scene_post.py`
(Pillow: downscale 1216→1024→896→768, then palette 256→96 until it fits) —
a raw SDXL PNG is ~1.7 MB and the budget is 400 KB. No pngquant dependency.

Kind templates live in `scenes.py KIND_TEMPLATES` (one per manifest kind, 18 of
them) with `KIND_NEGATIVE` for per-kind exclusions (`soi6` → `cars, traffic,
wide road`; `beach` → `buildings, street, cars`).

### Style contract (FROZEN — every image shares it; changing it re-renders all)

> cinematic wide establishing shot, night, neon noir, humid tropical air, wet
> reflective ground, moody painterly photographic, rich color, film grain

Negative: `people, person, man, woman, face, crowd, text, letters, lettering,
signage text, watermark, logo, caption, daylight, blue sky, sunny, washed out,
flat lighting, blurry, low detail, distorted architecture`

**The contract carries no geography** — "Pattaya Thailand" lives in the *kind
templates* ("neon-soaked **Pattaya** soi at night"), which is why the street
shots stay in Thailand. Anything that replaces a template must re-state it: the
first `beach-road` override said "seafront boulevard, palms, blue pickup truck
taxi" with no country in the prompt and produced three straight Miami synthwave
renders. **Every `SCENE_OVERRIDES` prompt must name Pattaya or Thailand.**

Style: **`exquisite`** (the LoRA, at the 0.35 neon strength) — `STYLE=realistic
./gen_scenes.sh` overrides per run. The contract is ~30 CLIP tokens and the
templates ~15, so the prose distillation gets trimmed to fit 77; `scenes.py
_fit()` trims the *prose*, never the template or the contract.

## Phasing (ship after every phase — the fallback chain makes partials clean)

1. **Phase R — regions (15 images, day one):** one establishing shot per
   region slug from the manifest. Every room in the game gets a backdrop.
   `./gen_scenes.sh` with no args is exactly this batch (~20 min on MPS).
2. **Phase H — hero rooms (~25):** the Soi 6 pocket first (it's the shipped
   challenge mode: `SOI6_ROOMS` — the 7 bars, Queen Vic, qv_room, the 3 soi
   segments, beach), then the remaining canon bars.
3. **Phase L — long tail:** streets, hotels, shops, interiors, in whatever
   order play surfaces them. No deadline; missing = region fallback, forever fine.

## LBB-side guard test — `tests/js/art.test.js` (SHIPPED)

Same doctrine as portraits but **inverted on missing**: orphaned art fails,
missing art never does. It vm-loads world.js like the other tests and asserts:

- every file in `web/art/rooms/` matches a real `ROOMS` id (catches renames)
- every file in `web/art/regions/` matches a live region slug (same regex, verbatim)
- every art file is a PNG (magic bytes) and **≤ 400 KB** (the budget, enforced)
- `web/art/` contains nothing but `rooms/`, `regions/` (and optional README)
- the slug regex is still character-identical in scene.js *and* the generator
- `docs/scene-manifest.json`, if present, still matches world.js room-for-room

Missing directories are fine (a fresh clone has no art) — every check no-ops.

## Review loop

- **Contact sheet — `tools/art-sheet.mjs` (SHIPPED).** Writes an HTML grid of
  every room's *effective* backdrop (it walks the same room → region → nothing
  chain) with the cards cropped to the live panel's ratio, so a composition that
  dies under the crop dies on the sheet. `node tools/art-sheet.mjs` for
  everything, `… soi-6 naklua` for regions, `--kind gogo`, `--missing`, `--out`.
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
