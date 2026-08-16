# Metrics: what the game already knows about how it's going

A design note, not an implementation. Written 2026-08-13 from a conversation about
whether Google Analytics is still worth using; the answer for this game is no, and
the reasoning is below so it doesn't have to be had twice. **Nothing here is built.**
Update the decision log at the bottom when any of it lands.

CLAUDE.md's frontend rules are **the law** here, same as everywhere: the engine
stays free of browser APIs, all I/O lives in `main.js`, and the terminal is a
disposable frontend. Metrics is presentation-side plumbing and must die with
term.js when a 2D or websocket frontend replaces it.

## The one-line thesis

**The instrumentation is already written.** The engine keeps `act1Best`,
`act1Tries`, `nightLog`, `day`, `happy`, `quests` and `known` in one serializable
object, so metrics is not an instrumentation project — it's a *reporting* project.
`main.js` snapshots `G` after each submit, diffs it, and ships derived counters.
**Zero engine changes**, which is what makes this cheap and what keeps it legal.

## The question it exists to answer

From the 2026-08 engagement thread: *do first-time players get far enough in to come
back?* That was reasoned about — Act One's critical path was measured at 41 turns of
walking out of 100 and cut to a minimum of 8 — but never **observed**. Every fix
since (the quest hail, Tan's Act One rescue, live leads, the morning ledger, Mort
pointing at Glam) is a bet with no scoreboard.

**Honest limit, stated up front:** at this traffic, counters tell you *where* people
stop and never *why*. `/lbb-playtest` answers why, and five sessions of it will
outperform a month of numbers. Metrics is for the questions playtesting cannot
reach — *how many* never finish night one, and *do they return* — because those need
strangers, not a friend at your elbow.

## Why not Google Analytics

For the record, since this will come up again:

- **GA4 is current and free**; Universal Analytics stopped processing in 2023 and its
  properties are gone, so any UA-shaped intuition doesn't transfer.
- **It sets cookies** → an EEA consent banner → a cookie dialog as the first thing a
  new player meets, directly in front of Tan's taxi-ride character creation. That
  opening was built on purpose; putting a modal in front of it to gain a metric about
  whether players like the opening is self-defeating.
- **Free-tier event retention caps at 14 months**, short for a long-tail hobby project.
- **The reporting model is e-commerce furniture** — a seven-milestone quest funnel is
  fighting the tool.
- Third-party analytics domains are heavily ad-blocked, so the numbers are wrong in a
  direction you can't measure.

**A first-party endpoint on our own box wins on every axis**: no vendor, no cap, no
sampling, no consent-banner argument, and the raw rows stay ours so questions we
haven't thought of yet are still answerable.

## Architecture

```
web/js/metrics.js      (new, loaded last, after main.js)
  ├─ guarded on location.protocol === "https:"   → file:// and local dev never report
  ├─ wrapped so it can NEVER throw into the game loop
  ├─ reads G after each submit, diffs vs. last snapshot
  └─ buffers in memory, flushes via sendBeacon
```

Engine: untouched. `G`: untouched — the analytics id lives in its **own** localStorage
key, never in `lbb_save`, so it survives `RESET` (a player restarting from scratch is
a signal, not noise) and never rides the save wire.

## Transport, and the three things that fail silently

`navigator.sendBeacon()` — POST, fire-and-forget, and still delivered while the tab
is closing, which for a browser game is most sessions.

| Gotcha | Why | Fix |
|---|---|---|
| **HTTPS required** | GH Pages is https; an http endpoint is mixed content, dropped with nothing useful logged | real cert on the stats host |
| **`text/plain`, not `application/json`** | JSON content-type makes it a non-simple cross-origin request → an `OPTIONS` preflight per event, failing outright if unhandled | send JSON *as* text/plain, parse server-side |
| **Path name** | self-hosting dodges domain blocklists, but uBlock's generic rules match `/analytics`, `/track`, `/collect` on *any* domain | something boring and game-shaped, e.g. `/lbb/n` |

```js
navigator.sendBeacon(URL, new Blob([JSON.stringify(batch)], { type: "text/plain" }));
```

Response is never read, so no `Access-Control-Allow-Origin` is strictly needed —
set one anyway so nothing surprises us later.

**Flush on:** night end, `visibilitychange → hidden`, and every ~20 buffered events.
Never one request per command — this is a text game, commands are the heartbeat.

## The open decision: identity

This one is the user's call, because it is the privacy question and it decides what
can be measured at all.

| | Per-session id (in memory) | Persistent id (own localStorage key) |
|---|---|---|
| Funnels (how far into Act One, where nights end, quests touched) | ✅ | ✅ |
| **Retention** (did they come back) | ❌ | ✅ |
| Storage on device | none | one random UUID |
| Privacy surface | nil | a tracking identifier — needs saying out loud |

**Leaning persistent**, because "did they come back" is the entire question. Truncate
IPs server-side so the row isn't personal data by a second route, and say so wherever
the game says anything about itself.

## What to send — nearly all of it already exists

Derived counters only. **Never the raw `G` blob** — it's large and it's the save.

| Signal | Source | Answers |
|---|---|---|
| Act One milestones reached | `G.act1Best` (0–7) | how far a first-timer actually gets |
| Attempts before success | `G.act1Tries` | is the do-or-die opening too hard |
| Night-end reasons | `G.nightLog` (already capped 30) | the difficulty curve, per cause |
| Day reached / return visits | `G.day` + the persistent id | **the retention question** |
| Quests offered vs. accepted vs. done | `G.quests` | 21 quests exist; a new player reaches one |
| Glam chain reach | `oldrocker`→`family` states | did the Mort pointer work |
| Surface usage: typed vs. chip vs. wheel vs. compass | `main.js` submit path | we maintain three surfaces — are they used |
| Daily play + share | `TODAY'S SOI` presses, `SHARE` | is the daily loop alive |
| **Parser misses** | first word of unrecognised input | see below |

**Parser misses are the highest-value row.** The house rule is that "I didn't
understand that" is a last resort; every miss is a plausible verb missing its voiced
refusal, named by a real player. **PII caveat:** players type anything into a free
text box, so ship the **first word only, against a whitelist** — never the raw line.

Include a schema `v` on every envelope. It will change.

## Server side, two tiers

- **Zero backend:** accept `GET /lbb/n?d=<base64>` as a pixel and let the nginx access
  log be the database. Ugly, works today, parse it whenever.
- **Proper:** a ~40-line receiver appending JSONL, or SQLite with one `events` table.

Deferred until the box's stack is known (nginx+PHP? node?) — the client half is
independent of that choice and can be built first.

## Why this is also the first brick of something else

CLAUDE.md's shared-world section stages it as *hosted single-player first — accounts,
cloud saves, leaderboards — shared world later.* A stats endpoint on our own domain is
literally that first piece of infrastructure, and the **daily leaderboard is nearly
free from here**: `TODAY'S SOI` already gives every player the same dice via
`_dailySeed`, and `_shareCard()` already renders the result. Same host, same beacon,
one more table.

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | GA4 rejected — cookie banner in front of the taxi intro, 14-month cap, blocked by default. First-party endpoint on the user's own server instead, separate domain from GH Pages (game stays on Pages). |
| 2026-08-13 | Transport settled: `sendBeacon` + `text/plain` + boring path + https. Client half buildable now; receiver waits on the server's stack. |
| open | Persistent vs. per-session identity (leaning persistent, separate localStorage key). |
| open | Whether parser-miss whitelisting is generous enough to be useful. |

## The probe-detector row: excluded (2026-08-17)

The CTF stage-2 gate (`docs/ctf.md`) can tell when a security professional is at
the prompt. It **does not report it**, and this doc should not grow a row for it:
it is the most identifying, most surveillance-shaped datum the game could send,
and the ethic here rejected GA4 for far less. If this project ever collects
first-party metrics, that row goes in last or never. Recorded so nobody
rediscovers it as "the interesting one."
