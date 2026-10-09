# Soi 6 expansion: two more segments with named venues (PLAN)

Written 2026-10-09. **Nothing here is built yet.** The two steps it rests on shipped first, the same day:

- **Namesakes**: `_npcByName` is the one name-to-person policy, and `tests/js/namesake.test.js` proves it on every surface with five women called Rung. That removes the old constraint that every new woman needs a name nobody else has. Forty new women can be called whatever Isan girls are called.
- **Density**: the three street rooms now say what the soi is: about a hundred fronts, with the eleven named rooms as the ones you come to know.

Mario's brief: *two more segments with named venues; the middle core remains neutral ground.*

## 1. Shape: two inner segments, and the ends and the middle unchanged

Soi 6 runs about 350 m between two real roads: Beach Road North (`beach_rd_n`) and Second Road (`second_rd_soi6`, a real junction at 0 m). It cannot grow at either end. The survey has three rooms about 100 m apart:

| today | lon | will be |
|---|---|---|
| `soi6_street` West End (junction) | 100.88544 | **West End**, unchanged id, the beach-road end |
| — | — | **NEW `soi6_west_in`**, the inner west |
| `soi6_mid` Middle | 100.88647 | **Middle**, unchanged, neutral |
| — | — | **NEW `soi6_east_in`**, the inner east |
| `soi6_deep` East End | 100.88741 | **East End**, unchanged id, the Second Road end |

**Recommendation: insert the two new rooms between the existing ones.** That gives five rooms about 70 m apart. Every existing id, venue, save, art file and test keeps its meaning. The middle stays the middle, with one loud segment and one inner segment on each side.

The density numbers rebalance with the split: West End about 20 fronts, inner west about 20, the middle's twenty-odd beer bars, inner east about 20, East End about 20. That is still about a hundred. The street descs and `reads.bars` added in step 2 get edited to match; that's one line each.

**The bar mat:**

```
beach_rd_n ─w─ soi6_street ─e─ soi6_west_in ─e─ soi6_mid ─e─ soi6_east_in ─e─ soi6_deep ─e─ second_rd_soi6
```

Every move stays reversible (round46.test). The walk from the beach to Second Road goes from four steps to six.

## 2. The middle stays neutral, and the inner segments are where it shows

The middle's prose already says it: *nobody's group ever bought into the middle, it was never worth the trouble.* Every PLG room (`_PLG_ROOMS`: Pink Lotus, Golden Dragon, Kitten Corner, the Orchid Room) is at a loud end.

**Recommendation: make the two inner segments the FRONTIER.** These are the stretches where the rollup is still buying, and where independent bars still hold out:

- **The frontier is visible from the street.** Each inner room carries one front on the `OPP_CYCLE` idiom (the bar opposite: busy → the folder on a table → shutters → a new name), so a player walking the soi watches a bar change hands over a season. The machinery exists; today only a bar owner can see it, from his own doorway.
- **Each inner segment holds one group room and two or three independents.** That's enough for the paper by the till (`_licenceOf`) to tell them apart: the group's company frame, or the commercial registration in a woman's own name.
- **The middle is pinned.** A test asserts that no `soi6_mid` venue carries an `owner`, that no `_PLG_ROOMS` entry is a middle venue, and that the middle's `reads.bars` claim stands. Neutral ground then becomes an invariant rather than a sentence.

This gives the faction layer (`docs/factions-thai.md`) a place on the map without anyone being threatened. The rollup *buys*; nobody is pushed. That is the existing doctrine.

## 3. The venues: 3 or 4 per segment, each a reason to stop

Today's eleven are mostly variations on one shape: an open front, a staircase, sequins. New bars should each have one thing the soi doesn't have yet. These are the candidate flavours; **names are Mario's call** (see §6):

1. **A ladyboy bar.** Soi 6 has them, and the game already routes bi orientation to katoey courtship (the Peacock). This would be the first one on the soi.
2. **A family bar.** Three sisters and their aunt on the till; the one-woman-bar staffing canon at family size, where the "relative trusted with the money" is the whole floor.
3. **A brand-new bar.** Opened this month, staff still learning the till, fresh paint. It is the other end of the `OPP_CYCLE`, and the frontier's newest purchase.
4. **A pool bar.** Today the soi's only table is in Kitten Corner's back room; its desc named the table and the flag was missing until 2026-10-09. A bar that is ABOUT pool would give the soi a house team and a reason to come on league nights (`room.pool`, killer pool).
5. **The late room.** The one Soi 6 bar that ignores the midnight close (`_closesMidnight` exception, like the Darkside's lock-ins). Somewhere for a man to go when the rest of the grilles come down.
6. **An old bar.** Twenty years under one name, the mama older than most of the customers. It is the soi's memory: Tan's read, the Owl's listing, and the place the regulars' stories about the old soi come from.
7. **A theme bar** (school uniforms / nurses / sailors, the soi's real costume nights), kept PG-13 by the same rules as the rest.

**Recommendation:** pick 3–4 per segment. Put the ladyboy bar, the pool bar and the new bar in the inner west (the PLG side, the bigger-money stretch). Put the family bar, the old bar and the late room in the inner east. Use the theme bar wherever it reads better.

## 4. The women

- **Staffing** follows the canon. A big bar gets a mamasan, a cashier and four or five hostesses. A small bar gets one woman who is owner, mama and cashier (`_soloMama`, `_tillKeeper`).
- **Seven new bars come to roughly 30–40 women**, all as `FLOOR_STAFF` records with stored looks. The pools are already deep enough that one new woman doesn't move anybody else.
- **Names may repeat across the town** now. The only rule is one woman of a name per bar, and `namesake.test.js` enforces it. A Thai-script name must still be unique (round 56).
- **Looks**: never two women at one bar with one look, and no more than six to a look. A `look` field is all the portrait prompt there is.
- **Portraits**: `python3 scripts/gen-portraits.py <id …>` with explicit ids only, for placeholder busts. They land on the art agent's render queue (`docs/portrait-manifest.json` `unrendered`). This is the biggest piece of work the expansion hands the art agent; tell them before the batch lands.
- **Written floors**: phase 2 writes one `FLOOR_OWN` floor per segment (the Gilt Cage pattern: own words, a return greeting, a LAST TIME answer, a line on her bar). The rest stay on the pooled floor.

## 5. What else moves (the ripple list)

- `world.js`: the two rooms (desc, revisit pools, `lateDesc` pool, `reads.bars`/`reads.girls`), exits rewired, `SOI6_ROOMS`, and `ROOM_GEO`. All five Soi 6 pins get re-surveyed at about 70 m. Use Mario's Google Maps anchors and the 5-decimal-place convention, never chained off a neighbour (the geography rework method).
- `engine-parser.js`: the ATM refusal list (`["soi6_mid", "soi6_deep"]`, about line 11533) gains the inner rooms. `_MAP_SOI6` grows two columns. The `_MAP` line is unchanged.
- **Soi 6 Challenge mode**: the pocket is `SOI6_ROOMS`. **Recommendation: include both segments**, because the challenge is "the soi". Then re-check its balance with `node tools/soak.mjs --mode soi6`, since two more steps cost turns.
- **Unchanged and automatic**: the pushy-bar hash, the licence frame, the season's bench, saleng eligibility, the askable/witness/composition audits, the music (the region is unchanged), and the scene art (it falls back to the region plate until the art agent paints the rooms).
- **Tests**: anything that walks `e`/`w` between Soi 6 rooms gets one more step. Today that's a handful (`grep -rn "soi6_" tests/`), and `compass.spec` stands in the middle, which doesn't move.
- **Audits after authoring**: `examine-audit --room` for each new room and bar, `afford-audit`, `prose-corpus --rooms --delta`, the reference lint (venue names), and `gen-world-graph` / `gen-world-export` / `gen-scene-manifest`.

## 6. Calls for Mario

1. **Inner segments between the existing rooms** (recommended), or something else, such as a real side lane if you know of one off Soi 6.
2. **Three or four venues per segment.**
3. **Which flavours from §3, and their names.** Check every name against the real soi before it ships: a name is the one trait the guardrails allow, and a real bar's name plus its real flavour would already be two.
4. **The frontier**: should the rollup's buying be visible in the inner segments, or should they be plain independents with only the middle's neutrality stated?
5. **Soi 6 Challenge**: does the daily's pocket include the new segments?

## 7. Phasing

1. **Geography and the bars on the pooled floor**: rooms, exits, survey, venues, `FLOOR_STAFF`, placeholder busts, maps, the neutral-middle pin. One commit; the suite and audits stay green.
2. **One written floor per segment** (`FLOOR_OWN`).
3. **A persona round on the new soi**: a one-bar week in a new bar, plus a walker who counts fronts and asks every mouth who owns what. Aim it with `coverage-map --dark` on the Soi 6 row.
