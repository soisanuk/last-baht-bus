# Map coverage — where players go, and the dead zones

A geography audit (2026-08-13): which regions the player is *likely* to visit, driven by
quest givers, quest targets, adjacency, and content density — and the outliers that have
rooms but no reason to enter them. Method: the exit graph, every quest's giver room and `at:`
target, and a per-room "draw" count (does it have an authored NPC, a patron, a quest pointer,
or a feature — bus stop / 7-Eleven / pool / darts / food / massage / soapy). A room with none
of those is **empty**: built, walkable, and pointless.

Update the build log at the bottom as pockets get fixed.

## The finding: a hot core and a cold rim

Five regions soak up almost every quest and nearly all the content:

| Core region | authored NPCs | quests pointing there |
|---|---|---|
| **Soi 6** | 58 | ~9 (wdg_flip, orchid_recon, nominee_deal, old_days, easy_come, quiet_one, her_brother, wrong_shot, bar_licence) |
| **Beach Road** | 6 (+6 patrons) | white_dish, league, bar_premises, bar_opening, shamrock (giver) |
| **Thappraya** | 8 | the Glam saga (keys, quietmoney, family, scout) + hill_order |
| **Walking Street** | 11 | taxi_debt, hill_photo, debtrun |
| **Soi Buakhao** | 4 (+Candy) | bar_partner, recce, sangsom (giver) |

Everything else is the rim, and it splits into two problems that want **opposite** fixes.

## Per-region data (empty = no NPC/patron/quest/feature)

| Region | rooms | empty | authored NPCs | patrons | quests point here |
|---|---:|---:|---:|---:|---|
| **Jomtien** | 32 | **21** | 2 | 0 | **none** |
| **Pratumnak** | 19 | **13** | 3 | 0 | hill chain only |
| Beach Road | 29 | 12 | 6 | 6 | several (core) |
| Myth Night | 12 | 11 | 1 | 0 | sangsom, bee_number |
| **Tree Town** | 13 | 8 | 5 | 1 | **none** |
| Soi Buakhao | 19 | 7 | 4 | 4 | several (core) |
| Naklua | 14 | 6 | 6 | 0 | **none** |
| Soi Diana | 9 | 6 | 1 | 0 | none (connector) |
| Thappraya | 16 | 5 | 8 | 1 | Glam saga (core) |
| LK Metro | 9 | 5 | 3 | 1 | none (+ hidden CTF) |
| Second Road | 17 | 3 | 3 | 0 | none (connector) |
| Soi Honey | 6 | 4 | 1 | 0 | none (small connector) |

## The two problems, opposite fixes

**Tier 1 — dead zones (many rooms, almost nothing in them). Need content AND a pull.**
- **Jomtien — the worst by a mile: 32 rooms, 21 empty, 2 NPCs, 0 quests.** And it's cruel — it's where the player *wakes up* in Act One and then never has one reason to return. A whole beach district built and abandoned. 32 rooms is genuinely over-built for a place used for one night.
- **Pratumnak — 19 rooms, 13 empty.** Only the small Bob/Bill hill chain pulls anyone up the hill; the rest is silent.

**Tier 2 — populated but pull-less (the content exists; nothing routes you there). Just need a pointer — the cheap, high-leverage fixes.**
- **Tree Town** — 13 rooms, 5 authored NPCs (Madam Oy's flagship, the new girl Nong, the veteran Pim), a patron (Fergie), and **0 sandbox quests.** Memorable, because Oy held your wallet in Act One — and then you never come back.
- **Naklua** — the White Rabbit crew (Eddy + the Lao family) just built, and **no quest points at Naklua at all.** The Rabbit arc is its eventual pull (spec'd, unbuilt).
- **The Darkside lake cluster** — just built (Duangjai, the two lake bars); pull already hooked (the "look in on my boy" quest, `docs/bangkok-concept.md`).
- **LK Metro** — has the hidden CTF QR, but that's a security-nerd draw, not a player one.

**Connective tissue (fine as-is):** Second Road, Soi Diana, Soi Honey are thin *by design* — streets between pockets. Not a problem; don't pad them.

## Proposals, in leverage order

1. **Give Tier-2 pockets a pull — cheapest, because the content already exists.** A new quest-giver in an under-visited pocket surfaces a whole cast that's currently invisible.
   - **Tree Town → a Madam Oy sandbox quest.** She's the most memorable NPC out there (Act One), it re-engages the antagonist in a new light, and her office + flagship + the maze bars keep the objective *in* the pocket. **First build (below).**
   - **Naklua → a small pre-Rabbit-arc hook** (Eddy or Nont sending you to the White Rabbit) until the heist arc lands.
   - **The lake → the Duangjai quest** already hooked.
2. **Jomtien anchor + identity (the biggest single dead zone).** Its real identity is *the calm, local, cheaper beach* against Beach Road's chaos. Give it a giver on the sand (an old-timer / boat guy / vendor with a thread) and a standing mechanic that makes a *different kind* of night happen there (quieter, the scene that isn't a hustle). It already has the beach cats companion beat and is where you woke up — lean on "return to the beginning."
3. **Pratumnak — extend the hill chain past three beats, and make Buddha Hill's viewpoint a standing draw** (a spectator point like the Queen Vic's WATCH SOI — one calm point a night, a photo-collection anchor).

**Honest caveat on "just re-target existing quests' `at:`":** tempting, but a quest's `at:` must match where its fiction actually sends you (`_questWhere` resolves it live) — you can't point it at an outlier the quest doesn't involve without the hint lying. So the real lever is **new** givers/quests in outliers, not moving old pointers.

## Cross-cutting levers (pull players outward without a bespoke quest each)

- **Contact invites** — the incoming-text system already pulls you to bars where you swapped numbers; make sure rim-bar girls text back and the rim self-populates with reasons.
- **The photo gallery / blackbook** — a completionist chases faces; a *distinctive* one seeded in each outlier routes them there.

## Build log

| Date | Pocket | Fix | Status |
|---|---|---|---|
| 2026-08-13 | Darkside lake | Duangjai + The Boathouse + The Sundowner built; "look in on my boy" quest hooked | content built, quest spec'd |
| 2026-08-13 | Tree Town | **The Safe-Cracker** — Madam Oy sandbox quest (giver oy → Pim at the Starlight → report to Oy, ฿2000). Re-engages the Act One antagonist; seeds a debt-buying-in-the-maze thread. | **shipped** |
| 2026-08-13 | Naklua | **An Introduction** — Candy vouches you into Rose's discreet Orchid Club (relationship-as-key). Deliberately NOT the White Rabbit, which stays the CTF stage-2 discovery. | **shipped** |
| 2026-08-13 | Jomtien | **The Quiet Side** quest (Sumalee → Nok → back; the Gordon elegy) + **populated** the four Soi 7 bars with the quiet-side crowd it always implied: patrons **Roger** (knew Gordon — quest-aware), **Dieter**, **Gerald** (Dongtan), **Sandra**. 0 patrons → 4. | **shipped** — the bars now have regulars; the empty beach segments are calm-by-design; room-thinning still optional |
| 2026-08-13 | Pratumnak | **Buddha Hill viewpoint** — a standing, once-a-day, non-jading contemplation beat (WATCH THE BAY, its own daily budget like the cats). A *mechanic*, not a quest — the right fix, since the hill already has the Bob/Bill quest chain; what it lacked was a repeatable reason to climb. | **shipped** |
