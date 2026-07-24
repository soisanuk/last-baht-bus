# Session Checkpoint

<!-- Auto-generated before compaction. Read this after context resumption. -->

## Last Updated
2026-07-22T17:48:23

## Current Objective
Building out **The Last Baht Bus** (`/Users/mario/last-baht-bus`) — a long feature session on the Pattaya text-adventure. The current thread is capturing Mario's personal, evocative Pattaya experiences as game systems. Most recent completed work: the **Night Ride** (the emotional core — a bonded lady takes you off the tourist map on the back of her bike), its **dog grace note**, and two small **beach bug fixes** (GIVE bottles to Nok, Auntie Nok cats dialogue). All committed and pushed; working tree clean.

## Decisions Made
- **Night ride design (Mario chose via AskUserQuestion):** (1) **bond-gated** — only a lady you've bonded with (`_bondTier ≥ 2`, regular+) offers the ride, "she shows you HER world because she likes you"; (2) **pure serendipity** — each stop is random from a venue pool, you only choose RIDE ON or call it. Built as the deliberate WARM MIRROR of the existing cynical `bfhop` kickback tour.
- **Night ride is the one time the last-bus dread lifts** — she's your ride, so the game's core anxiety dissolves for the bonded night (poetic payoff).
- **สนุก from the ride does NOT jade** — it's the "one deepening girl stays rewarding" philosophy at its peak; big reward but hard-earned (must bond a girl to regular first).
- **Token-cost awareness (Mario flagged it):** this single session got very long; the biggest driver is the compounding cost of one enormous continuous transcript, plus screenshot reads and large file/log dumps. Going forward: prefer smaller targeted reads, skip screenshot reads unless a visual bug needs eyes, and split features across sessions (`/clear`). Keep verification lean.
- **Companion prose convention:** all dog prose is authored against "Sai Krok" and re-lettered at render time by `_dogN()` (function replacer so `$`-names survive); `_isDogWord()` is the single answers-to test. Any new dog text MUST wrap the whole composed string in one `_dogN(...)`.
- **All-caps character names in room descs kill their mobile tap target** (kw-decorator is case-sensitive) — now enforced by a world.test regression test.

## In-Flight Work
None open. Every item this session is committed, tested (431 passing), pushed, and CI-green. Last commit `0d6c271`.

Possible next threads (Mario's call, not started):
- Weave real named Thai discos / viewpoints into the night-ride venue pool (he offered his own nights' places).
- ~~Dog on the night ride~~ — DONE/closed. The door-vigil version (`dce256d`, dog waits up at dawn and vets who you brought home) is the shipped answer; a "dog rides along" variant was considered and rejected as diluting it (would also contradict the "exactly where you left him" dawn beat). No further work.
- The broader "persistent relationship" / live-in-GF system (gateway to belief-jealousy, the líang-duu flip, the Adonis "your GF suggests YOU work there" beat).

## Key Files
- `web/js/engine-systems.js` — barfine resolution (`_bfResolve`), the loan, massage/soapy, dog favor/rain, and the **night ride** (`_nightRide`/`_endRide` + `_RIDE_VENUES`/`_RIDE_HOP`).
- `web/js/engine-parser.js` — verb handlers, `_doGive` (bottles-to-Nok fix), `_doMotosai`/`_doPay` (dog transport), the `GO UP` filler-word fix, dog verbs.
- `web/js/engine-encounters.js` — `_ENC` resolvers incl. `nightride`, the scam encounters, dog scam-rescues.
- `web/js/engine-core.js` — `G` init (`rideSeq`, `dog`, `catDay`, `dragDay`…), `_describeRoom` dog presence + nudge, dark-soi dog defusal.
- `web/js/world.js` — all data: rooms, NPCS (Nok cats dialogue), items, QUESTS, `_RIDE_*` referenced here? no (in systems); constants (`DOG_MOTOSAI_FARE`, `HOST_*`).
- `tests/js/engine.test.js` + `tests/js/world.test.js` — 431 tests.
- `CLAUDE.md` — architecture doc; Companions + night-ride + quest paragraphs kept current.

## Open Questions / Blockers
None blocking. Awaiting Mario's next direction (more personal-memory features, the relationship system, or the named-venue polish on the night ride).

## Active Context Items
(no sticky.md or session.md items)

## Side Effects This Session
(no side-effects.md entries — all work was local code + git push to own repo; no sensitive external mutations)

## Promotion Candidates
(no sticky items exist yet — nothing to promote)
