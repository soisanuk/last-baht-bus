# web/art — scene backdrops

Generated art, written here by `../portrait_gen`'s `gen_scenes.sh`. Nothing in
this tree is hand-made and nothing here is required: `web/js/scene.js`
`_sceneArt()` walks

    art/rooms/<roomId>.png  →  art/regions/<slug>.png  →  (row removes itself)

so coverage is incremental by construction. The ~15 region shots give every
room in the game a backdrop; a hero room then overrides its region one file at
a time.

| | |
|---|---|
| `rooms/` | `<roomId>.png` — must match a `ROOMS` id in `web/js/world.js` |
| `regions/` | `<slug>.png` — `region.toLowerCase().replace(/[^a-z0-9]+/g, "-")` |
| budget | PNG, long edge ≤ 1216px, **≤ 400 KB each** (`pngquant --quality 60-85`) |

`tests/js/art.test.js` enforces the names, the format and the budget — orphans
fail, missing never does. The room list the generator works from is
`docs/scene-manifest.json` (`node scripts/gen-scene-manifest.mjs`); the whole
contract is `docs/art-pipeline-spec.md`.

Review a batch with `node tools/art-sheet.mjs` (contact sheet, crops to the
live panel's ratio).
