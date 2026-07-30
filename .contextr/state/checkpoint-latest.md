# Session Checkpoint

<!-- Auto-generated before compaction. Read this after context resumption. -->

## Last Updated
2026-07-30T07:48:04

## Current Objective
Building out a **conversation-system overhaul** for The Last Baht Bus (`~/projects/last-baht-bus`):
turn the parser-driven "ASK X ABOUT Y" into something that reads like talking to a
person — active-conversation context, bare-word topics, scope/pronoun resolution,
conversation-aware chips, verbal social actions, and NPCs that ask *you* things and
remember the answers. All shipped to `main` and deployed. Currently in a build →
playtest → fix loop, extending the system NPC by NPC.

(Earlier in the session, before this thread: portrait_gen prompt tuning for the Stinky
cast + regenerating/committing those portraits.)

## Decisions Made
- **Layer over the parser, don't replace it.** Conversation resolution runs only from
  `doCommand`'s `default` branch, so every real verb/direction/modal keeps first refusal
  (bare topics never shadow LOOK/MAP/movement/shops).
- **Chip-surface must match the fiction.** Three flags govern what becomes a chip in
  `_convoTopics` (engine-core.js): `deflect:true` (a gated "earn it" refusal — hidden
  until the real node unlocks), `chip:false` (plot/quest nodes the quest flow drives),
  and automatic person-name exclusion (gossip about another character is typeable, not
  suggested). A node can force a person-topic back on with `chip:true`.
- **Trust arcs, not one-and-done.** `_npcState` = {trust 0-5, mood, dstate, know, heard}.
  Rapport topics bump trust once (first delivery); deeper nodes gate on trust with a
  deflect variant below the threshold.
- **Powers left alone** — a vain oversharer by design; a trust grind would be out of
  character. Not every NPC needs an arc.
- **42 filler hostesses stay templated** (built by `_buildHostess`); they got ONE shallow
  ask in the factory rather than individual arcs. Hostesses = nosy but shallow (limited
  English); expat NPCs = broader, more interesting questions.
- **Reputation NOT built** — user says the shape is still open. Groundwork is laid
  (`G.player.said` = what the town knows; per-partner `st.heard`); the hook is
  consistency/lie-catching (esp. cross-NPC) feeding a rep score later.
- **Commit-message backticks bite** — shell command-substitution ate a word once; avoid
  backticks in `git commit -m` strings.
- **Push workflow:** LBB auto-deploys via Pages on push to main; always
  `git pull --rebase` first (origin gets automated "Bake fresh headlines" commits).

## In-Flight Work
Nothing half-finished — every slice is committed, tested, and pushed (suite at 594 green).
The overhaul's core is complete: slices 1-4 + scope/pronoun + audits (Angela, Bert, the
WDG-quest NPCs Terry/Kesinee/Gavin, the Soi 6 roster) + NPC-driven Q&A + more asks +
callbacks. Natural next steps (not started): **reputation system** (needs a design
decision from the user), richer/cross-NPC lie-catching, wiring `asks`/arcs onto more
named NPCs, or wiring `%key%` callbacks onto more NPCs. Also unmerged-cleanup: local
`conversation-overhaul` branch still exists (already merged to main; safe to delete).

## Key Files
- `web/js/engine-core.js` — conversation state + helpers: `_npcState`, `_convoStart/
  Active/End`, `_resolveActor` (pronoun/scope), `_convoTopics` (chip gating),
  `_convoAsk` (NPC poses a question), `_fillSaid` (`%key%` callback token substitution),
  `_deliver`/`_patronTalk` (both call `_convoAsk` + `_fillSaid`). G template has
  `convo/itNpc/convoQ/player.said`.
- `web/js/engine-parser.js` — `_convoResolve` (default-branch entry: pending-answer →
  name → topic), `_convoTopic` (phrasing→canonical topic rules `_CONVO_TOPIC_RULES`),
  `_convoAnswer` (capture + ack/caught pools), `_topicLabel`, `_chipSet` (conversation
  palette), verbal actions wired (`compliment`/`joke`/`tease` → `_doTalkAct`).
- `web/js/engine-play.js` — `_doSocial` (physical, favor-based) + `_doTalkAct`
  (verbal, trust-based) + `_TALK_ACT_TEXT` pools + `_socialLedger` (per-day anti-farm).
- `web/js/world.js` — NPC/patron dialogue. Arcs/asks on: angela (patron, queen_vic —
  home ask + `%home%` callback greeting), bert (stinky_bar — quest gated on trust>=2,
  candy arc, `why` ask), kesinee (kitten_corner — white dish/police deflects),
  doug/phil (stinky regulars; doug `invested` ask + `ryan` deflect), joy (pink_lotus —
  earned `future` beat + `dream` ask), and `_buildHostess` factory (shallow ask for all
  filler girls).
- `tests/js/conversation.test.js` — 40 tests covering the whole layer (loads full engine
  via vm, drives `doCommand`). `tests/js/engine.test.js` — geo-suppression test bumps
  Bert trust because white_dish now needs trust>=2.

## Open Questions / Blockers
- **Reputation design** — user: "probably will drive your reputation rating at some point
  in some manner… not sure how it fits yet." Needs a decision on what moves rep and how
  it's surfaced before building. Memory (`G.player.said` + `st.heard`) is ready to drive it.
- Everything else is unblocked; awaiting user direction on what to extend next.

## Active Context Items
(none — no sticky.md / session.md items)

## Side Effects This Session
None logged in side-effects.md. External actions: multiple pushes to `origin/main` on
github.com/soisanuk/last-baht-bus (LBB auto-deploys via Pages on push — established
workflow; each push rebased over automated "Bake fresh headlines" commits first).
Latest commit: 148da0a. All routine, user-directed.

## Promotion Candidates
None (no sticky items exist).

---
### Session commit trail (LBB main, all pushed + deployed, newest first)
- 148da0a — more asks (nosy hostesses, probing expats) + callbacks that quote you back
- 76719c3 — NPCs drive conversation: they ask, you answer, they remember
- 8b5d930 — Soi 6 roster audit; fix Doug's leak; Joy's earned beat
- 7c0cd43 — audit WDG-quest NPCs (Terry/Kesinee/Gavin)
- 84f28db — Bert wired into trust; quest gated; audit Bert+Angela
- 7abefcf — chips: no person/gossip topics; fix Angela's Drew geography
- dddfc59 — Angela: gated-refusal topics off chips; Navy off the surface
- (earlier) f00c747 merge of conversation-overhaul (slices 1-4 + scope/pronoun);
  190312b regenerated Stinky portraits; d299bf5 Soi 6 West End prose fix.

### portrait_gen (separate repo, ~/projects/portrait_gen — user's workspace)
Painterly SDXL portraits for the Stinky cast. Prompts tuned (distinct male looks,
neutral backdrop, under CLIP's 77-token cap). Regenerate with `./gen_stinky.sh`; it
copies into LBB `web/portraits/`. Torch not installed in Claude's env — verify prompts
torch-free via `python3 -c "import characters"`, never run generation.
