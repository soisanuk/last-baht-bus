# Reusing the engine for sibling settings — Itaewon, the Honch, and beyond

**Provenance.** This is a founding design note, discussed **2026-07-20** — before the
i18n work, before most of the game existed. It was captured as a Claude memory in the
**thaicab** project's silo (`~/.claude/projects/-Users-mario-thaicab/memory/lbb-sibling-settings.md`),
which meant no LBB session could see it, it was in no git repo, and the codebase drifted
away from it for weeks without anyone able to check. **Ported into the repo 2026-08-13**
so it stops being invisible; the design content below is faithful to the original
(Mario-confirmed, firsthand throughout), with only the stale path and line-counts fixed
and a "current state" reconciliation added at the end.

This sits alongside CLAUDE.md's "Designed for the online / shared-world future" and
"Designed for a future 2D conversion" — the **third** future-facing axis, and the oldest:
the engine was meant, from the start, to be reskinnable to other bar-district nightlife
sims in Pattaya's family.

## The one-line thesis

These settings are **siblings of Pattaya, not different-dynamics rebuilds.** The
social/economy machinery **maps** rather than gets rewritten; the cost is content
authoring plus (optionally) a new language-learning stack.

## The reuse-layer model (use this to size any future setting)

- **Layer 1 — the machine (~2.5–3k lines, reuse verbatim):** parser dispatch, modal-gate
  framework (`doCommand`/`_renderResume`), room+exit graph, BFS fast-travel, tick clock,
  seeded LCG, save/restore (merge-over-`newGame`), autocomplete + `term.js` flyout,
  known-names, encounters skeleton. Setting-agnostic Zork plumbing.
- **Layer 2 — generic shape, Pattaya semantics (~1–1.5k, retune):** meters that tick/redline
  (hunger/thirst/battery), scalar relationship w/ tiers (`_bondTier`), scheduled NPCs
  (`_PATRON`), money/rent/hotels. Mechanism transfers; numbers + prose don't.
- **Layer 3 — the actual social dynamics (rewrite/MAP):** barfine economy, hedonic
  treadmill (`jaded`/`_conquestHappy`), venue types, register rules, plus `world.js`
  (NPCs/rooms/dialogue = 100% content). **Not data-driven / pluggable — reuse =
  fork-and-gut, not swap-a-data-file.** The high-leverage refactor, worth doing before a
  second fork: extract Layer 1 into `engine/`, push domain systems behind a **content-pack
  interface** (a `systems` registry + world data) so future settings become "write a pack."
  Formalizing **venue class** as a first-class property (vs ad-hoc `barType` checks) is the
  same boundary.

**Effort bands:** reskin same-dynamics = **days**; different social dynamics, same genre =
**a few weeks** (keep L1, rewrite L3 + world.js); different genre = keep the machine, write
everything else.

## Setting #1 — Itaewon, Korea (1990s–2000s, US Army / Yongsan garrison era)

Open-ended sim: you're an **English teacher living nearby** (resident, not a vacationer)
who bar-crawls the "buy me drinky" scene. **Three venue tiers with different rules for
what money buys:**

1. **Normal pubs / dance clubs** — "regular" women (locals + base fauna: soldiers, spouses).
   Money is the WRONG verb (insults). Maps to LBB's existing non-transactional NPCs
   (`bkktourist` / `britles` / `punterwife`).
2. **Hostess bars** — buy her a drink for attention (conversation, pool); **nothing overtly
   sexual on premises.** ≈ gentleman's club minus the sex; conquest ceiling capped here.
3. **Juicy bars** — transactional; ≈ **Soi Khao Talo bars in lock-in mode** (reuse the
   Darkside `lockIn` machinery). **Real texture (Mario-confirmed):** the **bigger** juicy
   bars DID have a **mamasan** (so `NPC_ROLES` mamasan still applies at the larger venues),
   but **most Hooker Hill juicy bars were tiny — 1–2 customers at a time**, often just the
   lady/ladies running a small operation. Signature mechanic: **they lock the door once they
   have customers.** A **locked door = occupied → go find another bar or come back later**
   (it unlocks when the current customer leaves). This is a **CAPACITY / occupancy lock that
   keeps OTHERS OUT while occupied — the semantic INVERSION of LBB's `lockIn`** (which keeps
   YOU in after you spend freely). Reuses the same door-state + `_arriveAt` closed-door
   messaging, just flipped. It is also a **literal instance of the shared-world contention
   design note** (a locked door means someone else has the scarce 1–2-seat venue) —
   single-player it reads as availability / timing / patience; multiplayer it's real
   contention.
4. **단란주점 (danran-jujeom, Mario's ear-spelling "dallang chu chom")** — traditional
   **Korean** hostess bars ≈ **Japanese** hostess bars, catering to the **business crowd +
   older clients.** Only light hanky-panky on premises, but **take-out OR after-shift meetup
   IS possible** (bridges the Honch off-shift model and Pattaya take-out). **Foreigner-rare =
   effectively access-gated:** you need a **business pretext or a Korean friend/sponsor** to
   get in. Design value: reuses hostess-bar machinery + a **formal / business-Korean
   register** (a different register from the GI-scene Konglish) AND adds a **genuinely new
   social-access gate** — a venue you can't buy your way into, only enter via an NPC
   introduction / sponsor (relationship-capital as a *key*, a fresh twist on the door-ban +
   known-names systems). Related term = **룸살롱 (room salon)**, nominally pricier/higher-end
   — but **Mario-confirmed the terms were often used interchangeably**, so treat
   danran-jujeom / room salon as **one loosely-bounded venue class in practice**, not two
   rigid tiers.

You can develop relationships (scalar `_bondTier`) with all the ladies. **Konglish** =
Tinglish with a phrase-pool + particle swap (요 / oppa) — the register *system* is 1:1.
Optional **Korean learning-app** tie-in.

**The signature motivation hook (Mario-confirmed, firsthand — differs sharply from
Pattaya).** The Itaewon juicy-bar women were **Korean, NOT Filipina** (the Filipina
juicy-bar scene was **Osan AFB's district — Songtan / Shinjang-dong**; maybe 1–2 Filipinas
in Itaewon, uncertain). They were typically **paying off a debt — usually significant
credit-card debt** (fits Korea's early-2000s card-debt crisis), which **escalated into money
owed to loan sharks** (illegal private moneylenders, 사채 / *sachae*), and that is how many
of the **younger** ladies ended up there. Where Pattaya runs on **Isan family remittance**,
Itaewon runs on **rescue-from-debt** — a concrete, personal figure with a **menacing creditor
attached.** The **loan shark is a built-in antagonist / plot spine** (a coercion-vector NPC,
the Itaewon analog of a mama / scammer). A **Russian nightclub** sat at the foot of Hooker
Hill (Mario never saw working ladies there — a landmark + ambiguous texture, not a
transactional venue). Landmarks: **Seoul Central Mosque** + the Muslim / Middle-Eastern
quarter on the hill. **Hooker Hill** = the steep juicy-bar alley cluster. USFK
**curfew / liberty** = the MP analog; juicy bars periodically went **"off-limits."** Dark
layer (kijichon / camptown history + juicy-bar debt-bondage): handle strictly **PG-13,
referenced-not-depicted.**

**Distinctly-Korean mechanics with NO Pattaya analog** (net-new, not reskins): **noraebang
(노래방)** karaoke rooms; **soju drinking etiquette** (pour two-handed for others, never your
own) as a possible light social-competence / face micro-mechanic. **NOT booking (부킹) —
Mario-corrected:** booking clubs (a waiter brings a woman to your table) were a **mainstream
*Korean* nightclub thing, NOT part of the Itaewon foreigner scene** (a foreigner would need
to be a VIP high roller); out of scope for Itaewon. **Guardrail: keep to the 90s / 2000s** —
do NOT fold in the *Itaewon Class* K-drama (2020) or the 2022 Halloween crowd-crush (both
out of era).

**Why it's cheap (sibling of Pattaya):** military texture maps onto machinery already built
— troop **curfew + MP courtesy patrol** ≈ midnight-closing + the `police` pseudo-encounter;
**payday-crowded bars** ≈ the patron schedule; soldiers / spouses ≈ non-transactional fauna.
**Resident frame = the existing `_goExpat` mode**, not the vacation / airline loop (drop
that; add a teaching-job income + schedule). Compact walkable strip (main drag, Hooker Hill,
station, base gates) — easier than Pattaya's sprawl.

**Cost driver = NOT the dynamics (near-identical).** It is (a) content-authoring volume
(`world.js`) and (b) whether you build the full Korean learning stack — a from-scratch
parallel to the vendored Thai stack (`data.js` / `tokeniser.js` / `thai-script.js` /
`wordcard.js` / `examples.js`), decoupled and shippable later. Hangul is friendlier than
Thai (clean syllable blocks, real word spacing) but still a new corpus + a Hangul
script/decompose module. **Sim itself: days-to-two-weeks. Korean app: separate multi-week,
optional.** New systems needed: the teaching-job loop; formalize the three-tier "what money
buys where" rule + the civilian-misread social-danger beat.

## Setting #2 — The Honch, Yokosuka, Japan (similar timeframe, US Navy base) — PITCHED, analysis DEFERRED

A Navy-flavored sibling of Itaewon. **Real geography (Mario-confirmed):** Yokosuka = 7th
Fleet base; **"the Honch" = Honchō**, the bar-street maze off the main pedestrian **Womble
Gate** — AND it **includes Dobuita-dori (どぶ板通り)**, which has a **day / night dual
identity**: by day the souvenir / tailor street (sukajan "Yokosuka jackets," patches,
burgers), and **at nightfall the shops roll down their shutters and that street's bars open
up.** In the **90s, Dobuita was closed to vehicle traffic on weekend nights**, and **vendor
carts filled the middle of the road** selling souvenirs, fake-branded clothing, food / beer
— a texture beat that maps almost 1:1 onto LBB's **saleng-cart** mechanic (a cart parks,
sells, moves on) plus a weekend / pedestrianized-street rhythm. Economy runs on the **ship
schedule** (carrier in port = packed, firm prices; deployed = ghost town). **Shore Patrol
(SP)** = the MP / curfew analog; periodic **SOFA liberty restrictions** after incidents.

Bars: **regular bars, hostess bars, karaoke bars.** Working ladies mostly **Filipina**
(entertainer-visa *Japayuki*); regular customers include **Japanese locals.** You buy drinks
for the ladies in hostess / karaoke bars, but **almost nothing explicit on premises AND no
barfine / no taking her out** — you must **wait until she's off shift** (the real dynamics
difference vs Pattaya / Itaewon juicy bars: **no on-premise transactional tier** — the
relationship must clear the shift boundary before anything, an "off-shift meetup" mechanic;
the Honch is the most relationship-forward, least-transactional of the three). Similar
relationship dynamics + fauna to Itaewon, just Navy. **Six-axis analysis still owed** —
Mario will walk through this before it's specced.

**Reference — Shenmue (Sega, Dreamcast 1999):** set in Yokosuka with **Dobuita-dori as a
central explorable area** (recreated storefronts, vending / capsule machines, arcade, bars).
Use as an **atmosphere / geography reference for the Honch's map + period set dressing, NOT a
content model** — it is set in **1986–87** (a decade before our window) and keeps Dobuita PG
(a teen martial-arts story), so it omits the sailor-nightlife / hostess-bar / entertainer-
visa economy that IS our area of interest. Also a design-lineage touchstone: Shenmue is the
ur-example of the recreated-real-district **"living town" sim** (Sega's "FREE" — scheduled
NPCs, day / night, weather) that LBB is itself doing.

## Where the code actually stands (2026-08-13) — the honest reconciliation

The original note sized Layer 1 at ~2.5–3k lines and `world.js` at 3,494. Today: **`world.js`
is 12,023 lines** and the five `engine-*.js` files total **~15,700**, carrying **~1,350
`_say(` prose literals.** That is the drift this note predicted and the silo enabled:
**content leaked into the engine** (the Owl-column pools, the smell / sound tables, the
Zork-verb refusals, encounter resolvers) instead of staying in data. So the reskin is *more*
fork-and-gut than it needed to be — the skeleton honors the intent, the prose does not.

Two later pieces of work are **the same instinct arriving in a new form**, and should be
read as continuous with this note rather than separate:

- **The Rabbit arc's CLI simulator** (`docs/rabbit-arc.md`) is specced as a **portable,
  pure, data-driven module** (the `games.js` doctrine — no `G`, no DOM, injected rng, no LBB
  nouns) precisely so a future setting can reuse it. That is the content-pack boundary from
  Layer 3, built for one component.
- **The "Bangkok or elsewhere" cyberpunk follow-on** in the same doc is the *genre-shift*
  band of the effort model above (keep the machine, write everything else). Itaewon / the
  Honch are the *cheaper* same-genre band.

**The high-leverage move remains what the note said in July:** before a second fork, extract
Layer 1 into an `engine/` boundary, put the domain systems behind a content-pack interface,
and make **venue class** a first-class property. Every prose literal pulled out of the engine
and every ad-hoc `barType` check formalized is a down-payment on Itaewon and the Honch. It is
also exactly what the online / shared-world and 2D rules already push toward — three
future-facing goals, one refactor.

## Three content-packs, not two — and design the boundary against the hardest one

**The Bangkok cyberpunk follow-on (`docs/rabbit-arc.md`) is a third content-pack on this same
engine**, and adding it to the picture is what makes the content-pack refactor pay for itself
three times over. But it sits in a **different effort band** from the nightlife siblings, and
the difference is the whole point:

| Target | Band | What it reuses |
|---|---|---|
| Itaewon, the Honch | *same-genre sibling* | L1 fully, L2 retuned, **most of L3** — nightlife dynamics map (barfine, treadmill, hostess register, venue tiers) |
| Bangkok cyberpunk | *genre shift* | L1 fully, most of L2, **only selected L3** (the CLI sim, modal-gate framework, encounters skeleton) — the nightlife-specific economy mostly does NOT come along |

So Bangkok reuses *less* of Layer 3 than Itaewon does — and that makes it the case the pack
interface must be **designed against, not deferred to.** Draw the engine/content boundary to
fit Itaewon (which shares nightlife DNA) and you will be tempted to leave barfines, venue
class, the hedonic treadmill on the *engine* side because they look structural. Then a
cyberpunk heist game shows up wanting none of them and the boundary has to move again. **The
hardest reuse case reveals the true L1/L3 line:** a boundary that satisfies both a cyberpunk
game and a nightlife sim is genuinely setting-agnostic; one that only satisfies nightlife
siblings has merely baked Pattaya in one layer up. If the Bangkok follow-on is real, it is the
target to design the interface *against*.

Two things already point the right way. **The Rabbit-arc CLI simulator is the first
pack-component built to that boundary** — pure, data-driven, no LBB nouns, reusable in Bangkok
verbatim; the job is to widen that discipline from one component to the whole domain layer.
And **Rabbit is the narrative bridge** between the packs, which surfaces a useful property of
the model: packs share the *engine* and may also share *canon* (a character carrying Pattaya →
Bangkok) while remaining separate content. **Engine reuse and story continuity are independent
axes** — a pack can reuse the machine without sharing canon, or share canon without the player
noticing the machine is the same.

## Decision log

| Date | Decision |
|---|---|
| 2026-07-20 | Sibling-settings reuse discussed: Itaewon (Korea) + the Honch (Yokosuka) as same-genre reskins; the three-layer reuse model; Shenmue/Dobuita as atmosphere reference, not content model. Captured as a thaicab memory. |
| 2026-07-20 | Itaewon signature hook = credit-card-debt → loan-shark (rescue-from-debt), vs Pattaya's family-remittance. Booking out of scope; 90s/2000s guardrail. |
| 2026-07-20 | The Honch = most relationship-forward (no on-premise transactional tier; off-shift meetup). Six-axis analysis deferred pending Mario's walk-through. |
| 2026-08-13 | **Ported the note into the repo** (`docs/settings-reuse.md`) after finding it stranded in the thaicab memory silo — the invisibility was the direct cause of engine-prose drift. Reconciled with the Rabbit-arc portability work and the current (grown) line-counts. |
| 2026-08-13 | The **Bangkok cyberpunk follow-on is a third content-pack** — a genre-shift, not a same-genre sibling, so it reuses less of L3. Therefore the pack interface should be **designed against Bangkok (the hardest case)**, not Itaewon: the hardest reuse case reveals the true L1/L3 line. Engine reuse and story continuity are independent axes (Rabbit bridges the canon; the engine is shared regardless). |
| open | The Layer-1-extraction / content-pack refactor — the shared down-payment on reuse, online, and 2D. Not started. |
| open | The Honch six-axis analysis (Mario to walk through). |
