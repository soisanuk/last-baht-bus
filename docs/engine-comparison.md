# Architecture positioning: bespoke engine vs. IF platform

*Analysis note, 2026-08-03. Why The Last Baht Bus (LBB) is a hand-rolled engine rather than a
game built on a general interactive-fiction platform — contrasted with **Quest Viva** (formerly
Quest 5, the open-source `.aslx`/ASL text-adventure platform). Positioning + rationale, not a
to-do.*

## The headline: different *kinds* of thing

Quest Viva is a **platform** — the general-purpose tool you would *use to build* a game like
LBB. LBB is a single authored **game** that deliberately did **not** use such a platform; it
hand-rolls a bespoke engine fitted to one game. Almost every difference below flows from that.

| | **Quest Viva** | **The Last Baht Bus** |
|---|---|---|
| Category | IF authoring *platform* / engine | one authored *game* |
| Stack | C#/.NET 10 — Blazor Server, browser-WASM (AOT), Electron, SvelteKit editor | vanilla JS/HTML, **no build, no deps, no framework** |
| Code | ~55.7k LOC C#, 198 files, 5 layered libs (Common / Engine / PlayerCore / EditorCore / Legacy) | ~25k LOC JS, 18 files (12k engine + 8.3k `world.js` data) |
| Content model | declarative `.aslx` (XML object trees) + ASL scripting + **GUI editor, "no code required"** | content *is* hand-coded JS data, welded to a bespoke engine |
| Author | anyone (non-programmer, via editor) | the programmer *is* the author |
| Maturity | ~15-yr lineage (Quest 5 → Viva), `v6.0.0-beta.48`, NuGet packages, hosted users (play.questviva.com) | personal, single artifact, GitHub Pages |
| Process | protected `main`, PR + review, conventional commits, release-please, multi-workflow CI, signed builds | push-to-`main`, CI-gates-deploy, solo |
| Deploy | web + desktop (signed DMG) + NuGet libs + hosted catalog | one static site, runs from `file://` |
| Tests | MSTest / Moq / Shouldly across 5 projects + `.mjs` e2e | 659 `node:vm` unit + 8 Playwright e2e, **deterministic (seeded RNG)** |
| i18n | **built-in** — 6+ languages as declarative language packs | English-only; retrofit only just planned |

## The insights that matter

**1. Engine/content separation vs. auteur coupling.** Quest's defining move is total separation:
a game is *data* (`<object name="room"><object name="player"/></object>`), and even the core
verbs and language are themselves authored in `.aslx` and `<include>`-d. That is what lets a
non-programmer build in a GUI and lets one engine run thousands of games. LBB does the opposite
on purpose — content and engine are co-designed, and its distinctive mechanics (the hedonic
treadmill, bond tiers, the reputation asymmetry, the last-baht-bus curfew) are **bespoke code a
generic object-tree/verb model would fight you to express**. For a game this systemically deep,
hand-rolling is arguably the correct call, even though it forfeits everything the platform gives
for free.

**2. The i18n retrofit is the whole tradeoff in miniature.** Adding native-language play to LBB
(see the localization backlog note) is a large retrofit *precisely because* English prose is
hardcoded into a bespoke engine. Quest already ships French/German/Spanish/Dutch/Portuguese
essentially for free, because language is just another swappable declarative include
(`<include ref="English.aslx"/>`). That is the generality dividend; LBB pays for auteur control
in exactly this coin.

**3. Process rigor scales with headcount — both are disciplined for their size.** Quest has the
ceremony a multi-contributor OSS platform *needs*: protected main, mandatory review,
release-please, draft-release choreography around macOS notarization, NuGet publishing. LBB has
solo-appropriate rigor — test-gated deploys, the no-flaky pooling rule, the three-surfaces
invariant, the vendored-from-trainer discipline. Neither is "more professional"; they are
calibrated to different team sizes. LBB's determinism-for-testing (seeded RNG → replayable
transcripts) is a nice property Quest's stochastic-friendly world model doesn't force.

**4. A platform can't make the prose good.** Quest exists to *enable* games; LBB is an example
of what auteur care produces — voiced prose, an interlocking economy, a point of view baked into
mechanics. Those are exactly the things a platform hands you a blank canvas for and cannot
supply. They are not rivals: Quest is infrastructure, LBB is a work.

## If each borrowed from the other

- **LBB ← Quest:** the engine/content *separation seam*. LBB's own `CLAUDE.md` already aspires
  to a disposable frontend (the `print`/`speak`/`sfx` callback boundary) and a possible 2D /
  online future — that instinct *is* Quest's architecture. A declarative content layer would
  have made i18n nearly free and a 2D port trivial. The cost: you would then be fighting a
  generic model to keep LBB's bespoke systems.
- **Quest ← LBB:** less, structurally — but LBB is a proof of the *depth* achievable when you
  refuse the generic model, which is the end Quest ultimately exists to serve.

## Recommendation

Do **not** move LBB onto a general IF platform. Its value lives in the bespoke systems a generic
engine would flatten. The one idea worth stealing is the **separation seam** — keep pushing game
logic behind the `_say`/`print` callback boundary and out of the renderer, which LBB is already
half-way toward, so a future 2D/online frontend (or a localization layer) is a re-plumb rather
than a rewrite.
