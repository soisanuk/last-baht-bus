# Soi 6 expansion: two more segments with named venues

Planned and **built on 2026-10-09**. This is the record of what was decided and why. §3 is the
checklist for the next round on Soi 6, and for applying the same method to other districts later.
§4 lists what this round taught.

Two steps shipped first, the same day, and the expansion rests on them:

- **Namesakes.** `_npcByName` (engine-core) is the one name-to-person policy: the woman in the room,
  else the one you met most recently, else the only one you know, else nobody. `tests/js/namesake.test.js`
  proves it on every surface with five women called Rung. Names may now repeat across the town; the
  only uniqueness rule is one woman of a name per bar.
- **Density.** The street rooms say what the soi is: about a hundred fronts, with the named bars as
  the ones you come to know (`reads.bars` / `reads.girls`; COUNT BARS reads the same look).

## 1. Mario's calls

| question | call |
|---|---|
| where the segments go | between the middle and each end (the ends are real roads; the soi cannot grow past them) |
| venues per segment | the reasonable maximum: **four** (the venue list prints as ENTER lines and chips; five reads as a wall on a phone, and the middle's four was already the most) |
| what kind of bars | Soi 6 hostess bars with short-time rooms upstairs (`barType: "soi6"`) |
| the group's buying | visible, but **concentrated in one segment**, the one nearest the flagship (the Pink Lotus at the west end); the other stays clean |
| the Soi 6 challenge | includes both segments |
| the hostesses | **authored**, every one: Soi 6's rule is that every girl is a specific, hand-written person (engine.test) |

The middle core stays neutral ground. Nobody's group ever bought into it, and a test pins that.

## 2. The shape built

```
beach_rd_n ─ soi6_street ─ soi6_west_in ─ soi6_mid ─ soi6_east_in ─ soi6_deep ─ second_rd_soi6
             West End      Inner West     Middle     Inner East     East End
             (corner,      (the group     (neutral)  (nobody's)     (the loudest)
              flagship)     is buying)
```

There are about a hundred fronts in five stretches of about twenty each. Every existing id, venue,
save, art file and test kept its meaning. The two new rooms' survey pins are **sketched** (4 decimal
places, interpolated); re-survey them with Mario's anchors before trusting them.

| segment | bars | paper by the till |
|---|---|---|
| Inner West | **Jade Lounge**, **Peach Lounge** | the group's company (`owner: "plg"`, `_PLG_ROOMS`) |
| | **Lollipop Bar** (a folder on the back table: "not yet is not no") | the mamasan's own name |
| | **Sweet Tamarind** (the holdout: a row of business cards, every one a no) | the mamasan's own name |
| Inner East | **Firecracker**, **Hot Pepper**, **Hula Hula**, **Ladybird** | a woman's own name, every one |

**The frontier is seen from the street.** `_frontierTick` runs on the inner west only, while the fronts
are open. On a `FRONTIER_CYCLE` (60-day) clock, keyed by vacation and day, an anonymous front goes
through three phases: the folder, the paint, reopened under the group's paper. You get one dim line
per phase per trip. It is the bar-opposite idiom (`_oppTick`) for a man who owns nothing on the soi.
The named holdouts are the ones whose answer is *not yet*. Their mamasans each answer the offer in
their own words: appended nodes, found by room and role so a regenerated floor keeps them.

**The people.** 40 in all: 26 authored hostesses (`SOI6_INNER_GIRLS` in world.js, about four nodes
each) and 14 house staff on the pooled floor (`FLOOR_STAFF` records from `tools/gen-floor-staff.mjs`,
spec in `docs/soi6-expansion-staff.json`). Each woman names her province in her own words, so the
town's fallback answers about her home agree with her (`_authoredStory`). Each has a placeholder
bust and is on the render queue.

**Two offers are verbs.** EAT TAMARIND (Ple's pod at the Sweet Tamarind) and EAT SOM TAM (Noey's
spoon test at the Hot Pepper) are each free once a night, and each is tappable from the line that
offers it.

Pinned in `tests/js/soi6expansion.test.js`, including the template pin (§3, step 4).

## 3. TEMPLATE: adding a segment of named bars

In order. Every step is one that this round either needed or got wrong first.

1. **Decide the shape before the prose.** Where the segment sits on the bar mat (never past a real
   road), how many venues (four is the cap), the venue class, who owns what (the faction geography;
   a neutral stretch is a stated rule plus a test), and whether the district's challenge mode
   includes it.
2. **Names.** Check every proposed venue name for collisions with existing room names, NPC names and
   common prose words (the script in this round's history; "Velvet" and "Sunflower" were taken). Check
   against the real street too (a real bar's name plus its real flavour is two traits; see
   `docs/guardrails.md`).
3. **Rooms.** The street room (desc, an 8-line hour-blind `revisit` pool, a `lateDesc` pool of at least
   3, `reads.bars` / `reads.girls`, exits, venues) and each bar (desc, one or two `reads` fixtures, a
   6-line revisit pool, `exits: { out }`). **Register every new reads key in `_READ_NOUNS`.** Rewire
   the neighbours' exits, and fix every adjacency or count claim in the neighbours' prose (a West End
   that says "east, the quiet middle" is wrong the moment there is a segment between).
4. **Staff.** Write a spec (`docs/<expansion>-staff.json`) and run
   `node tools/gen-floor-staff.mjs <spec>` dry, then read the table it prints before `--write`.
   - The tool guarantees the floor's invariants: one name per bar, one look per bar, no hostess look
     on more than six women, one life story per rail, and a donor's tail kept with its picks.
   - `--write --replace` is safe. The output is a pure function of the floor *outside* the spec's
     rooms, and the template pin asserts that re-running it changes nothing.
   - On a district whose rule is authored hostesses (Soi 6), set `"authored": true`. The tool then
     writes only the house staff and prints a SCAFFOLD (id, name, Thai name, province) to write the
     women from.
5. **Write the women** at the district's standard: a greeting and three subjects, their own `look`
   (≤20 words, front-loaded), their province in their own words, and a line on their bar's side of
   whatever the segment is about. Give a subject a node if her greeting volunteers it. **An offer is a
   verb or it is narrated to completion.** Never type a price.
   **Write the floor as one floor** (round 77): every subject a woman volunteers about a colleague or
   a neighbour needs a node on BOTH sides (Duang names "the Peach girl", so Keng answers her nails). The
   segment's story (the folder, the cards) needs a line from its house staff and from the bar next
   door, not only from the bar it happens in. A woman whose words say she owns the bar is marked
   `ownsBar`. The house staff are written too (`_houseOwn` makes a written set from one object per woman),
   and the existing floor gets a line on the new stretch. Neighbours who never mention each other read
   as two games. **A return greeting may say only what is true of every man who came back** (paid,
   came back), never a particular thing he did ("last time you sang"): the game didn't record it.
   **A look is what a renderer reads**: no `{{…}}`, and a face in it (a job description makes the
   model invent the woman).
6. **Portraits.** Add `CHARS` specs to `scripts/gen-portraits.py` and run it with **explicit ids only**
   (it skips anything rendered). Check `git status web/portraits` shows only `??`. Regenerate the
   portrait manifest so the new women land on the render queue. Tell the art agent.
7. **Wire the lists** that name rooms: the challenge pocket (`SOI6_ROOMS`), encounter `rooms:`
   (the noodle patrol), the ATM refusal list, `_MAP` / `_MAP_SOI6`, and `ROOM_GEO` (sketched at 4
   decimal places until surveyed).
8. **Instruments, in this order:** the full suite (the doctrine tests will name what you missed),
   `examine-audit --room` on every new room (give real objects a close look), the promise audits
   (errand / asktopic / afford / askable), `dialogue-walk --lint` (two provinces in one woman, a
   pronoun slip), `prose-corpus --delta --taps` (stray character taps such as "Muay Thai", and a
   third-person "phone"), a multi-seed soak of the challenge mode, and `TZ=UTC npm run test:e2e`.
   Then `--seed` the prose review on its own, never in the commit's shell chain.
9. **Regenerate** the graph, the export, the scene manifest and the portrait manifest, then commit
   with targeted `git add`.

## 4. Lessons learned (2026-10-09)

- **A generator's output must be a pure function of everything outside what it generates.** The first
  `--replace` read its own previous output as part of the floor, shifted every name, and appended forty
  women instead of replacing forty. Then writing the women made their names "principal" and their
  words "authored prose", which shifted the pool again. The template pin caught the second one, so
  write the regeneration test the day you write the tool.
- **A borrowed record carries its origin.** Donor tails brought go-go badge numbers to a street with
  no go-gos. Written women's looks and names would have given a new bar a second Pong. Two mamasans
  four doors apart drew one husband's funeral. Strip what belongs to the donor's room, never borrow
  from a written woman, and deal stories so a run does not repeat one.
- **Names the prose already uses are taken**, whatever the cast says: Boonsri is on Neil's fridge,
  Manow is behind your own rail, and Hong is the Covers quest. Search the quest text and the engine's
  own prose, not only the dialogue.
- **An alias can hijack a venue.** The chilli's "pepper" alias answered EXAMINE HOT PEPPER BAR, so a
  fixture alias must never be a word in a venue name on the same street.
- **Two provinces in one woman's words are a mechanical bug, not a style point**, because the fallback
  answer about her home reads her text.
- **A doctrine test is a design question.** "Every Soi 6 girl is hand-authored" is a choice about what
  the district is, not a regression to route around. Asked, answered (authored), and written.
- **Counts and adjacency in neighbouring prose** go stale silently ("forty fronts at this end", "back
  past the Queen Vic"). Grep the neighbours' descs, revisits and reads for both whenever a segment is
  inserted.

### From the first persona round on the new soi (round 77)

- **An opinion is kept.** Colleague reviews were re-dealt on every ask from a nightly book, so a
  mamasan reviewed one girl three ways in a week, once in another girl's words. Reviews now live on
  `G.reviewOf`: dealt once per speaker and colleague, never reused for a second woman, never mirrored,
  and never asserting a life fact (a village, a cousin, an age) about a woman who has written facts.
  A new floor inherits all of this for free.
- **A heard story stays heard by every route.** A word inside a node reached it as a *new* question
  and retold it in full. A heard node now gives its gist by any route (`_gistOf`).
- **A street has questions of its own:** the bar next door, the old owner, who is buying, and the
  stretches. These are `_townTalk` rows now. A new segment answers them on day one if its rooms carry
  `formerOwner` / `boughtWhen` and its bars sit in a street's `venues`.
- **One sentence per venue question** (`_venueAnswer`): the distance comes from where you stand and
  the owner from the paper, so it can't say "a few doors down" and "ten minutes by bike" at once.
- **No fixed count in any mouth** for a thing a mechanic keeps changing. The frontier buys a front
  every sixty days, so "six, going on seven" was false by the second cycle.
- **Check the template's own output.** The map's "north beach" was split across two rows by the
  expansion that wrote this template.

## Not done, and why

- ~~Written floors for the house staff.~~ **Done the same day** (the deepening pass): all 14 have
  `FLOOR_OWN` sets built by `_houseOwn` (world.js). Each has a return greeting, her girls or her money
  (the two-fee price), family, plan, home, the wallet's pointer at Candy, her bar, and LAST TIME both
  ways. Kinship is consistent with the hostesses' words: Tukta is View's niece, Pang is Napa's daughter,
  Chom is Noey's cousin. The original eleven bars' house staff each got a line on the new stretches
  (`_OLD_SOI_KNOWS`).
- **The survey.** The two new rooms are sketched; Mario's anchors would make them surveyed.
- **Renders.** All 40 are placeholders on the render queue (the art agent's).
- **A persona round** on the new soi: a one-bar week in a new bar, and a walker who counts fronts and
  asks every mouth who owns what. Aim it with `coverage-map --dark` on the Soi 6 row.
