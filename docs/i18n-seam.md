# The localization seam (dormant)

**German was retired on 2026-10-07.** The *seam* was kept. This file is what the
1,040-line `docs/i18n-de-gaps.md` and the 530-line `tests/js/i18n.test.js` were
replaced with, and it exists to answer three questions: what is still here, why the
content went, and what reviving a language actually costs.

## What is still here

| Piece | Where | Note |
|---|---|---|
`_L(s)` | `engine-core.js` | translate-with-English-fallback. Reads a `_CATALOGS` global **no file defines today**, so it is identity for every player. The `typeof` guard is what makes that safe rather than a crash. |
`_fmt(en, params)` | `engine-core.js` | named-slot template filler, ~459 call sites. Earns its keep with or without i18n; a translation can reorder `{slots}` without touching the call site. |
`_num(n)` | `engine-core.js` | pins the thousands locale to `en-US`, ~132 call sites. **Call this, never bare `.toLocaleString()`** — the bare form follows the *runtime's* locale, so a machine set to de-DE printed ฿150.000 in an English game. |
`_plural(n)` | `engine-core.js` | English `s`. One call site. |
`G.player.lang` | `newGame()` | the switch. Nothing sets it off `"en"`. |
~80 `_L(...)` wrappers | the five `engine-*.js` parts, `term.js`, `scene.js` | **deliberately not unwrapped.** These mark the strings somebody judged player-facing. That judgement is the expensive part; the lookup is the cheap part. |
`tests/js/i18n-seam.test.js` | — | 7 tests, **no content assertions**. Installs a throwaway three-entry catalog in-test. It cannot go red when prose moves, which is the whole design. |

## Why the content went

The catalog was keyed by **exact English source string**. That is the defect, not an
implementation detail:

- Every prose edit anywhere in the game orphaned a key two files away, and
  `i18n.test.js` asserted the keys still matched — so a bar rewrite failed a German
  test. It happened on the morning of the removal: the go-go seating work changed
  "down the bar" to "across the room" and two German entries had to be re-keyed by
  hand to keep the suite green.
- The soak ran a four-mode German sweep on **every `node --test`** and rewrote a
  committed file, `docs/i18n-de-status.json`, so the working tree was dirty by
  default.
- Coverage was ~11%, and the taxi-intro language step had already been removed
  because offering a choice that delivers 11% is worse than not offering it — which
  meant **`G.player.lang` could not be set off `"en"` by any player.** The entire
  layer was unreachable.

A translation of a sentence that no longer exists is not an asset. "Mercedes speaks
Taitch" is permanently true; "this German matches that English" stops being true on
its own. That asymmetry is why the register was moved into the characters and the
rest was deleted rather than archived.

## The German content, if it is ever wanted

It is in git, not in the tree — an archived file in-tree rots silently and misleads
(cf. the "regulars drift between bars" line, which described movement that had
stopped for a year).

```sh
git show d8f964b9:web/js/lang.js         # the full 1,471-line de catalog
git show d8f964b9:docs/i18n-de-gaps.md    # the ranked coverage queue
```

The only part that was **writing rather than translation** is the three
German-speaking ladies' registers, at `lang.js:247` (Mercedes — Taitch, five years
in Linz), `:301` (Jenny — phrasebook German off Klaus, her sponsor) and `:335`
(Chompoo — genuinely fluent Berlin German, the counterpoint that makes Taitch
legible as a register).

**A line of each was salvaged into their own dialogue before deletion**, so the
concept is demonstrated to every player instead of to nobody:

- `ASK MERCEDES ABOUT GERMAN` — *"Fünf Jahr. Warmes Haus — ich war Möbel."* The
  dropped endings and absent articles are the register; she glosses it herself.
- `ASK JENNY ABOUT SPONSOR` — *"Ich bin vergeben."* One phrase, practised at Klaus,
  learned before please or thank you.
- `ASK CHOMPOO ABOUT LADYBOY` — *"In Pattaya ist es eine Kategorie. In Berlin war es
  einfach Dienstag."* Fully conjugated: the contrast that defines the other two.

`_GERMAN_QUIP` in `engine-parser.js` was untouched and still demonstrates all three
voices in English when a player types German at any of them.

## Reviving a language

1. Write `web/js/<lang>.js` defining `_CATALOGS`, keyed by exact English source.
   Load it before the engine (`index.html`, plus the `tools/*` vm load lists).
2. Restore one entry to `LANGUAGES` in `world.js` and one to `_INTRO_STEPS` in
   `engine-parser.js`.
3. `_plural` needs a per-noun suffix argument again — one language's `{s}` slot
   cannot serve another's ("3 Kondoms" for "3 Kondome" was the bug that proved it).
4. `_num` picks its locale in one place.
5. **Do not rebuild the key-matching test.** If a language is attempted again, key
   the catalog by a stable ID rather than by English source, or this happens twice.

## What was deliberately NOT lost

`tools/soak.mjs`'s `defmt` check — an unfilled `_fmt` `{placeholder}` reaching the
player — lived inside the German sweep and therefore almost never ran. It is
language-independent and now runs on every line of every soak.
