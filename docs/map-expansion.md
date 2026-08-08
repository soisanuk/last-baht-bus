# The map expansion — content spec

Written 2026-08-08 after the survey finished; **BUILT the same day.** Everything
below is done unless marked otherwise. Kept as the record of what was decided and
why, because the reasoning is worth more than the checklist.

**Final shape:** 177 → 194 rooms, 4 → 26 piwin stands, 268 NPCs, audit 23 → 11
flags with **nothing over 120°**. Soi Buakhao 3 → 16 rooms.

**Still open, both optional and both Mario's call:** a room at the 3rd Rd × Sai
Nueng junction (coordinates banked), and the four extra POIs in §2 —
Thepprasit Market, Terminal 21, and the daytime attractions that were judged the
wrong shape for a night game.

Coordinates for everything below are already banked in the `ROOM_GEO` header of
`web/js/world.js`.

## 1. Piwin stands — the biggest gap, and it is mechanical

**Today there are FOUR motosai stands** (`jomtien_beach_rd`, `beach_rd_s`,
`buakhao_s`, `sukhumvit_crossing`) and **eleven districts have none**: Thappraya,
Pratumnak, Soi 6, Second Road, Myth Night, Walking Street, Tree Town, LK Metro,
Naklua, Soi Honey, Soi Diana.

This is not cosmetic. `_doMotosai` is the route home **after `LAST_BUS_TURN`**,
it is the broke player's pity-ride, and it is where the small-hours gouge
(`LATE_MOTO_MULT`) lands. A district with no stand is a dead end at 2am — the
player's only options are the free-but-dark walk or a rough wake. Adding stands
changes the shape of the late night everywhere.

**Every nightlife district needs at least one.** Mario's specifics:

- **LK Metro — one at BOTH ends.**
- **Myth Night — at the junction with Second Road.**
- **Walking Street — at the Gate / main entrance.**
- **Bali Hai pier — a transport HUB: piwin stand *and* baht buses.** It is the
  end of the strip and where everyone leaves from.

## 2. New rooms

### Bali Hai pier
Transport hub (see above). The traditional south end of Walking Street.

### Soi Diamond — two go-gos
Runs Walking Street → Second Road. The two venues are based on:
- **Windmill** — "super wild".
- **Katoey's-R-Us** — a go-go specialising in ladyboys.

Note the second one wants the orientation/bi routing that Phase B built
(`_orient`, the Peacock courtship) rather than being written as a novelty.

### Mike's Mall
**Down-market shoppers and expats on a budget.** The **top-floor food court** is
especially popular with **fixed-income retirees** — the "Cheap Charlie" crowd.

Worth knowing while writing it: **"cheap charlie" is already load-bearing
vocabulary in this game.** `_bfRefusal` uses it as a barfine refusal reason. The
mall's food court and that refusal are describing the same man from two sides,
and the prose should let them rhyme rather than treat it as a fresh coinage.

### Pattaya Night Bazaar
Cheap tourist trinkets and clothes — **the famous Chang singlets**. Cloth is sold
**in the back, near the food court**.

**This is where the `buakhao_market` NPC moves** — not Mike's Mall. The reason is
the good part: **the cloth merchants relocated there after Tree Town replaced the
old Soi Buakhao market.** She isn't being filed somewhere convenient; she moved
for the same reason the market did, and she can say so.

### Cheap Charlie's
The one **next to Cindy Bar is the FIRST, ORIGINAL location**. There is a branch
on **Jomtien Soi 7** as well — so it is a small chain with an origin, and the
original sits inside the after-hours pocket Candy Bar anchors.

### Also banked, lower priority
Pattaya's own Soi 7 (`short_time_motel` already stands on it), the 3rd Rd × Sai
Nueng junction, Thepprasit Market, Terminal 21.

## 3. 7-Elevens and ATMs

- **Second Road has NO 7-Eleven and NO ATM** — the only nightlife spine with
  neither. Its first one is wanted.
- **Soi Buakhao** wants another (with ATM). Note its current ATM sits on
  `buakhao_market`, which is being repurposed, so **that ATM needs rehoming
  regardless**.
- **The Soi Khao Talo bar cluster needs a 7-Eleven with ATM.** It is the one
  drinking strip on the map with no cash and no shop.

## 4. Repurpose: `buakhao_market`

**There is no Soi Buakhao market any more** — Tree Town replaced it years ago,
and Tree Town already occupies that role in the game. The room needs a new
identity, its NPC goes to the Night Bazaar (above), and its ATM goes to whichever
Buakhao segment gets the new 7-Eleven.

## 5. Candy Bar

Moves to Cindy Bar's real location at the Soi Diana junction
(`12.928568/100.884735`). New canon: **semi-famous as an after-hours place**,
because of the slightly out-of-the-way location **and the brown envelopes that
keep the police away**.

That last clause is *suay* — the levy paid to be left alone — which
`docs/factions-thai.md` already establishes as the money on the good table at the
Orchid. Candy's envelopes and White Dish's envelopes are the same institution at
two different scales, and the prose should not explain it twice.

**Care required:** Candy's `bars` rotation is `day % len` and Act One opens on
day 2, and the wallet chain points the player at Candy Bar. Moving her is a
gameplay change, not a tidy-up.

## 6. New road segments

- **Soi Buakhao: 3 nodes → ~5** (Klang, Made-in-Thailand/Myth Night, Tree Town,
  Diana, south). Clears more audit flags than anything else on the list.
  **Mario's brief: the extra segments exist to carry the CONGESTION.** Soi
  Buakhao at night is baht buses stuck in traffic while motorbikes carrying
  ladies and punters weave through them. Thin prose here would make the busiest
  street in the game feel emptier than it does with three rooms.
- **Second Road: one more node** at Soi Diana's latitude.
- Populate both with **random massage places**.

## 7. Exit fixes (one-liners)

- `soi_honey_e —e→ buakhao_s` → should be `buakhao_n` (125 m vs 620 m).
- `thappraya_ext_s —w→ supertown_elbow` → should be `s`.
- `buakhao_n —n→ pattaya_klang` → should be `w`.
- `pattaya_klang —w→ beach_rd_n` → should be `beach_rd_c` (75° → ~24°).
- `diana_e —s→ areca_room` → the Areca is a third along from Second Road.
- `soi6_deep` needs an east exit onto Second Road (real junction, 0 m).
- The **Soi 5 connector**: Thappraya → WS via Soi 5 and Big Buddha, the 392 m gap.
