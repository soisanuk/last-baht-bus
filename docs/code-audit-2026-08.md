# Code audit, August 2026 — what we did, and what we deliberately didn't

An external structural review of the codebase produced five recommendations.
Two were implemented, three were declined. This file records the declines with
their reasoning, because a declined recommendation with no written rationale
just gets re-recommended by the next reviewer — and two of these rest on
premises that are wrong *for this repo specifically*, which is exactly the kind
of thing that is expensive to re-derive from scratch every time.

Implemented (see git log, 2026-08-31):

- **Bind the hotspot resize listener once** (was: removed and re-added on every
  render). Measured before the fix: one extra `addEventListener("resize", …)`
  per render, 4 → 16 across 13 renders. Now flat at 1. Fixed a latent bug in
  passing — the early return when v1 hotspots are switched off never reached the
  removal, so the last listener stayed bound to a detached div for the life of
  the page. Pinned in `tests/e2e/hotspots.spec.mjs`.
- **`jsconfig.json` + `types/game.js`** — editor metadata only, no build step,
  nothing at runtime reads it. Details in the header comments of both files.

---

## Declined: split `world.js` (and the engine) into smaller files

**The stated rationale does not hold.** The review's argument was "risk of
accidental global variable collisions across unbundled script tags". Splitting a
file into more script tags does not reduce global-namespace collision risk *at
all* — every script still shares one `window`. You would get identical collision
exposure spread across more files.

**Half of it is already done.** The engine is already five files loaded in a
documented order (`engine-core` → `encounters` → `play` → `systems` →
`parser`). The review appears not to have known this.

**The cost is concrete and the benefit is not.** Splitting `world.js` would
touch **51 files**: 43 test files, 7 tools, and `index.html`, every one carrying
an explicit ordered load list (the vm suite, `tools/probe.mjs`, the
`SOURCES` array in `online.test.js`, the e2e boot, the `<script>` tags). That is
a large mechanical regression surface for zero functional gain.

`world.js` is also the file where size hurts *least*: it is flat declarative
data that you navigate by grep and by the tooling built for exactly that
(`tools/prose-corpus.mjs --about <subject>` regroups the whole corpus by who it
is about). It is not control flow anyone has to hold in their head.

**If this is ever revisited**, the case would have to be made on something other
than collisions — and the split should follow the existing seams (`ROOMS` /
`NPCS` / `ITEMS` / `QUESTS`), keeping `_barName` and the constants first, since
the filler-cast loops and `NPC_ROLES` cross-reference ids at load time.

## Declined-as-written: `CHEATS_ENABLED` production flag

**The observation is correct and already documented** — CLAUDE.md says, in as
many words, *"Currently `true`; the intended production default is `false` —
flip it before a real release."* This is a known, deliberate state, not a
discovery: the game is pre-release and the typed cheat codes are a testing
affordance.

**The part worth keeping** is the review's second half: right now nothing
*enforces* it. The flip depends on a human remembering at release time. A
release-gate (a test asserting `CHEATS_ENABLED === false`, switched on when the
release branch is cut, or a deploy-workflow check) would be cheap insurance.

Not built now because it only becomes meaningful at the first real release, and
building it earlier means either a permanently-skipped test or a red suite.
**Do this as part of release prep**, alongside the flip itself.

## Declined: reduce `_SCROLL_CAP` from 800 to ~300 on mobile

**Speculative, and it has a cost the review did not weigh.** No measurement was
offered that scrollback is causing jank on real devices — the cap exists and is
already tested (`smoke.spec.mjs`: "the scrollback is capped — a long session
doesn't grow the DOM without bound").

Against an unmeasured gain sits a real, specific loss: **this game's audience
skews 50s–70s reading dense prose on a phone** (the reason the `Aa` font control
exists at all, and the subject of `docs/voice-narration.md`). Scrollback is how
those players re-read the thing they just half-caught. Cutting mobile history to
~37% of desktop's penalises precisely the users least able to afford it, to fix
a problem nobody has shown exists.

**If revisited:** measure first — a real long session on a mid-range Android, in
the profiler — and if there is genuine reflow cost, prefer virtualising the
scrollback (render only what's near the viewport) over shortening the player's
memory. The transcript is the game's whole interface; it is the last thing to
economise on.
