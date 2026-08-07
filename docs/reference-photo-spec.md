# Reference Photo Spec — shooting for ControlNet

What to photograph in Pattaya so the scene-art pipeline can copy real
composition instead of arguing with a model about it. Companion to
`docs/art-pipeline-spec.md`.

## Why photos help (and what they don't fix)

Prompt-only work has hit its ceiling. Every remaining problem is
**compositional** — the width of the soi, where the light pools, signs
projecting into the street, the camera standing in the road rather than behind a
bar — and all of it competes for the same 77 CLIP tokens, so each fix costs
another. ControlNet takes composition out of the prompt entirely: the photo
supplies the geometry, the prompt supplies the look.

It will **not** fix style, palette or content — those stay with the checkpoint,
the LoRA and the style contract. A reference photo is a *layout*, not a target.

## The three shooting rules

1. **Night.** The game runs 18:00 → dawn and the art is night-only. A daylight
   photo is useless as a reference for a night scene: the depth map is fine but
   the framing instincts are wrong (you shoot different things in daylight).
2. **No recognisable faces.** These may end up committed to a public repo, and
   the game's cast is fictional — a real person's face has no business in it.
   Shoot from behind, at distance, or wait for a gap. Crowds at 10 m+ where
   nobody is identifiable are fine and are exactly what we want.
3. **Hold the phone level, landscape.** Tilt introduces keystone that ControlNet
   faithfully reproduces as a leaning building. Landscape matches the render
   buckets (streets are 1344×768, 1.75:1 — a normal phone landscape frame at
   16:9 is near-perfect; interiors are 1216×832).

## The shot list, in priority order

Each entry: **3–5 frames** from slightly different positions, not one. Variety
of viewpoint matters more than perfection in any single frame.

| # | Subject | What the frame must contain | Feeds |
|---|---|---|---|
| 1 | **Soi 6, looking down the soi** — from the west (Beach Rd) end and the east (Second Rd) end | The full width of the street, bar fronts both sides, the run of signs receding | `soi6_street`, `soi6_mid`, `soi6_deep`, region `soi-6` |
| 2 | **One Soi 6 bar front, square on** | Balloon arch, blade sign, stools, the light spilling onto the pavement | the 7 Soi 6 bar interiors |
| 3 | **Inside a beer bar, looking OUT at the street** — camera at bar-stool height, *behind* the rail, looking **down its length** (see below) | The rail running away from you, stools, staff and punters along it, the street beyond | 49 `beer` rooms — the most-used template in the game, and the one with no reference at all |
| 4 | **Beach Road at dusk and after dark** | The palm row, the kerb striping, promenade left, bar fronts right, looking *along* the road | `beach_rd_*`, region `beach-road` |
| 5 | **Walking Street from the arch end** | The canyon — stacked signage both sides, pedestrian crowd | region `walking-street` |
| 6 | **A go-go doorway from outside** (do not shoot inside) | Curtain, doorway light, frontage | 9 `gogo` rooms |
| 7 | **A soi at its quiet end** — unlit, shuttered, a stray dog if you're lucky | Darkness with one light source | every `dark` room |
| 8 | **A hotel room at night, lights off, curtains open** | Bed, window, neon leaking in | 4 hotel rooms |
| 9 | **A night market lane** | Festoon lights, stalls, plastic stools | region `myth-night`, `market` kinds |
| 10 | **Baht bus interior and a songthaew from behind** | Bench seats, the open back | future use; the game is named after it |

## The bar-interior angle, specifically

Worth its own note, because it's the shot that covers the most rooms and the one
the renders keep getting wrong — they produce a *wall of counter* seen side-on,
which reads as a shop front rather than a place with people in it.

A staged promotional set of a Pattaya beer bar (studied 2026-08-07 — someone
else's copyrighted work, looked at and not kept) solved it with one choice:
**camera at bar-stool height, behind the rail, pointing down its length.** That
does three things at once —

- the rail becomes a **receding diagonal** instead of a flat band, which gives
  the room depth in a single frame;
- **faces and bottles stack along it** at decreasing size, so the bar reads as
  populated without anybody being a portrait;
- the **street stays visible past the end** of the rail, which is what makes an
  open-front Thai beer bar look like itself rather than a pub interior.

Shoot it from both ends of the rail, and once standing in the street looking in.
Height matters more than anything else: stool height, not standing height.

## Technical

- **Format**: JPEG straight off the phone is fine. Don't edit, don't filter, and
  don't use night mode's heavy stacking if you can avoid it — it smears motion
  into mush and the depth map suffers.
- **Resolution**: anything ≥ 1500px on the long edge. Downscale to **1600px** and
  strip EXIF before committing (EXIF carries GPS).
- **Where**: `reference/<subject>/<n>.jpg` at the repo root — deliberately NOT
  under `web/`, since these are generator input and should never ship to a
  player's browser. `web/art/`'s guard test only polices `web/art`, so nothing
  needs changing to accommodate this.
- **Naming**: `reference/soi6-west/01.jpg`, `reference/beer-bar-interior/03.jpg`.
  Subject folders, numbered frames.

## What happens next (the pipeline side)

`main.py` already takes `--reference`, but the only ControlNet installed is
**tile**, which copies an image wholesale — useful for upscaling, wrong for
this. Two candidates, both ~2.5 GB:

- **Depth** (`diffusers/controlnet-depth-sdxl-1.0`) — *recommended*. Transfers
  the layout (street width, where the buildings are, how far the run recedes)
  while leaving surfaces free to be repainted. Crucially it does **not** carry
  lettering across, so real venue names in the photo can't leak into the render.
- **Canny** — transfers edges, so it holds signage shapes and detail more
  tightly, but that includes the *text*, which the no-readable-text rule
  forbids. Only worth it for a shot where the sign geometry itself matters.

Conditioning strength wants to be low (0.3–0.5): enough to hold the layout,
loose enough that the style contract still governs the look.

## Privacy and rights, briefly

Own photos only — the earlier batch of Google Images shots was deleted for
exactly this reason. No recognisable faces. Avoid framing a real venue's name as
the subject of the shot: the game's venues are fictional and the canon shouldn't
be contradicted by its own reference material.
