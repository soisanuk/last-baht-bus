# The Rabbit arc — Fast Eddy, the White Rabbit, and the heist that misreads the target

Design spec. Written 2026-08-13. **Nothing here is built yet** except where noted;
Tier 0 (the bar and the man) follows this document. Update the decision log at the
bottom as pieces land.

This arc rubs against three things already in the game — the White Dish antagonist
canon, the faction/`suay` doctrine (`docs/factions-thai.md`), and the hidden CTF
(`docs/ctf.md`) — so read those first. The whole point of the arc is that it sits
*on top of* existing canon rather than inventing a parallel one.

## The one-line thesis

A washed-up farang hacker wants revenge on White Dish and is sure the jugular is
the crypto they launder through. He is wrong in the exact way he has always been
wrong, and the arc is about the player learning — faster than he ever will — that
the thing you can hack was never the thing that matters.

## The man: Fast Eddy, a.k.a. Rabbit

**Two names, and the gap between them is the character.** *Fast Eddy* is the name
he insists on — a man clinging to a cooler past self. *Rabbit* is the black-hat
handle nobody has used in twenty years, which he will not admit to your face and
which you learn sideways, the way you learn everything true about him.

**Backstory (canon):** ex-DoD sysadmin who moonlighted as a second/third-tier
black hat when he was young. Ten years ago he lifted a bitcoin wallet off an
unlocked laptop in a Las Vegas coffee shop, tumbled the coins, cashed out,
abandoned the job and the family, and bought a bar on Soi 6. Most of the illicit
money went into that bar; it was eventually sold to White Dish at a knock-down
price, renamed and refitted. Bad blood with Ryan Powers over the sale left him
*persona non grata* on the whole soi — even the non-WDG places refuse him service,
because he brings trouble. He took what was left and opened the **White Rabbit** in
Naklua, the only district he could both afford and get his paperwork cleared in
(hinted: an illegal nominee company, since he has no Thai wife or partner). He is
down on his luck again and wants WDG to burn.

**What he IS, thematically — the anti-Tan and the living Shamrock.** The faction
doctrine says a bar with no Thai partner has no cushion, which is *why the Shamrock
died* (`docs/factions-thai.md`, "Why the Shamrock failed"). Eddy is that lesson
still breathing: no wife, no partner, an illegal nominee, exiled to the district he
could afford. Tan's power is that he never has to act; Eddy's whole problem is that
he has no *sen* — nobody whose interest is served by keeping his doors open. He
overpays his staff because it is the only lever he has, and it is bleeding him. He
is the third case in a set the game already builds: the man who did it right (Tan),
the ghost who did it wrong (Sean/Shamrock), and now the man doing it wrong in real
time, in front of you, too vain to see it.

**Characterisation brief — a TWO-LAYER character: the surface repels, the depth
earns a second look.** On first meeting he is sleazy, obnoxious, vain and
overconfident — the wannabe you are not meant to warm to, and that contrast still
sharpens the cast around him. But he is **not dumb and not deluded.** He is smart,
experienced, and — the crucial part — *self-aware*: he knows he has made a run of
stupid decisions and knows he has to get his act together or lose the little that is
left. The proof is the sobriety: **one year dry after an unspecified incident that
was his wake-up call**, a bar owner who no longer drinks in his own bar. That is not
a deluded man's move. So the self-image/reality gap (the look, below) is real but he
is *not blind to it* — he keeps the cool-guy costume knowing it lands on nobody,
because taking it off would mean admitting how far he has fallen. **The costume is
armour, not blindness**, and that is the whole depth: a man white-knuckling a
course-correction while wearing the old skin.

Build it as the game's existing **two-layer pattern** (like Pia): `EXAMINE`/`desc`
gives the sleazy surface deadpan; the sober, self-aware man underneath is revealed
only through `TALK`/`ASK`, and only to a player who keeps talking. Keep the
prose-voice rule ([[lbb-prose-voice-girls]]) — the girls are full people; Eddy is a
man who has made himself small and is trying, badly, to get big again, and the
writing should let you *see* that without the narrator editorialising.

**Why the depth matters: he is the franchise bridge.** Rabbit is the most likely
tie to the Bangkok cyberpunk follow-on, so he is built with a real interior and kept
**narratively reusable** — reinforcing the don't-jail-him rule, *no ending burns
him.* He is an asset the way Tan is, but from the opposite direction: Tan is the
local who owns you; Rabbit is the farang who has finally, expensively, started to
understand the rules Tan was born knowing.

**The look — the thesis rendered as a haircut.** Overweight, bald *except* for a
rat tail, and the rat tail grows out of a tattoo of a socket / neural port at the
nape — so his hair is, in his own mind, a jack cable and he is *jacked in*, the
Matrix motif worn on the neck. It is also a mullet growing out of a tattoo. Gold
loop in one ear (going for pirate). Nose hair that needs trimming and won't get it.
To a stranger it reads as pure vanity-vs-reality; the depth (above) is that he
*knows*, and wears it anyway. Write the `EXAMINE`/`look` and `desc` to report the
socket-tattoo-and-rat-tail **deadpan** and let the gap do the work — no sneering,
because the joke curdles once you know he's in on it. This doubles as the
**portrait brief** for the art agent (the socket-and-cable-hair is the one detail
that must survive; everything else is dressing) — a spec goes to
`scripts/gen-portraits.py` CHARS the usual way.

**Mechanical grace note — the sober owner.** The bar-manager machinery pours a free
house shot on arrival (`_managerWelcome`). Rabbit is the owner and a year dry, so he
*doesn't drink his own* — he pushes one on you and nurses a soda water, or the
free-shot ritual is conspicuously his-for-you-not-for-me. Small, and it says the
whole thing without a line of exposition.

## The bar: the White Rabbit (Naklua)

A beer bar in Naklua, down where the corner's fairy lights give out — placed apart
from the mellow trio (Anchor, Dolphin, Mooring) on purpose, the marginal bar nobody
walks to, because that is where an exile could afford to land. `barType: "beer"`,
hung off `naklua_bars` by an `e` exit. Trying much harder than its neighbours and
landing softer: a hand-painted white rabbit tumbling down a hole of green ones-and-
zeroes (a man who saw a film once), beer a note too cheap, and a tip jar fuller than
the room can explain — the last being the only visible trace of the European trade
that keeps the lights on (below).

## The ensemble — a bar of WDG's castoffs

**The keystone: everyone at the White Rabbit ran afoul of White Dish.** Rabbit lost
his Soi 6 bar to them; Nuan and both hostesses are former Soi 6 girls the rollup spat
out. The White Rabbit is not just Eddy's sad bar — it is **where the machine's
rejects washed up**, out in Naklua where WDG doesn't bother to look. That thread ties
the whole staff into one unit, hands the revenge arc a ready-made crew with real
grievances and real intel, and is exactly why CCIB/WDG attention would land hard on
this particular bar later. It also reframes the bar: a refuge, not a joke.

**The second keystone: the staff are one Laotian family.** Nuan, Ampha, Pooky and
Jinny are all Lao and all kin — Nuan the matriarch, the other three her (distant)
relations — and the kinship is *how they are all here*: when the rollup pushed them
off Soi 6, Nuan landed the mama's job and pulled her family in behind her rather than
let them scatter into random massage parlours. This is exactly how these bars staff
up in life (kinship and hometown ties, not a jobs board), and it transforms the
ownership trap below from "an employee has leverage" into something sharper: **Rabbit
is a lone farang who thinks he runs a bar that is actually a Lao family's operation**,
every role filled by Nuan's kin, all of them answering to her. His hard-won year of
clarity is just enough to *see* that he is surrounded and not enough to change it —
the cruelest version of his whole life's lesson, now domestic and daily. The player,
too, walks in as a lone farang being sized up by the whole clan.

**The ownership trap — Rabbit does not control his own bar.** He *thinks* he does. In
fact the nominee-company structure means he is one phone call from being removed, and
the people who can make that call work for him. This is the engine of the whole
staff dynamic and the seed of a future quest: Rabbit is a landlord who is really a
tenant, and the only reason he is still standing is that he is worth more kept than
removed — the illicit European contacts and the high-tipping trade they bring (the
Tier 3 black-market thread is *Rabbit's contacts*). The day that trade is worth less
than the hassle of him, the call gets made. Until the wake-up incident a year ago he
thought he was the big man in charge. Now he knows exactly whose bar it is, and can
do nothing about it — which is half of why he wants out from under and dreams of the
WDG score.

### Nuan — mamasan, and the real power in the room

Laotian, 42, a former Soi 6 girl and still drop-dead gorgeous. **Morally flexible**
by necessity — you do not run a bar of castoffs on the edge of the nominee world by
being fastidious. One of the *first* hostesses Rabbit hired at his old Soi 6 bar,
which is why he thought he could trust her, which is the mistake. Her own work permit
and visa are **tied into the same nominee-company mess** as the bar, so she is bound
into the structure deeply enough to pull its threads: she is **one phone call from
removing Rabbit from the picture**, and both of them know it. She has started
**giving herself pay rises** he cannot refuse — a live financial wound, and a future
quest hook (can the player help him claw it back, or does helping her tighten the
noose?). She is not a villain; she is a survivor who ended up holding the cards and
is playing them, and the tragedy is that she and Rabbit are the same kind of person
who trusted the wrong structure.

**The romance vector (novel, needs design).** Nuan takes a *romantic* liking to the
**player** — no clear reason (looks like an ex? bored on the edge of Naklua?). This
is unlike anything the relationship system currently models: she is **management, not
a barfinable hostess**, so the existing bond/barfine machinery does not apply. It is
its own thing and needs a design pass before it is mechanised — *what does a
mamasan's genuine interest in the player DO?* (leverage in the Rabbit quest? a
protection buff at the bar? a complication with her own precarious status? all
three?). **Tier 0 treats it as characterisation only** — she is simply warmer to the
player than to anyone, and reads it as something she can't quite explain — never an
invitation a verb has to deliver.

### Ampha — the cashier who is not what she looks like

Nuan's young kinswoman, Lao, whom everyone reads as **naive and innocent — and that
is the cover.** She is a threat in her own quiet way. (Note: being Lao, she is *not*
the Thai nominee name — an earlier guess, killed by the family's nationality; the
real nominee, if the paperwork ever matters, is someone off-screen, and Nuan's
leverage runs through her *entanglement* in the structure, not through holding it.)
So Ampha's threat is something else, left a hook rather than spelled out: the family's
actual brain and bookkeeper, the one who truly understands the money and the
structure and only *plays* the sweet innocent — the quiet one who sees everything and
misses nothing. Write her Tier-0 surface as genuinely sweet with one beat that
doesn't sit right, and leave the reveal for later.

### Pooky & Jinny — the hostesses who carry the thread

Older former Soi 6 girls who ran afoul of WDG — the human face of the keystone. Their
grievances are the emotional fuel of the revenge arc and, later, a source of intel on
how WDG actually runs. Written with the prose-voice rule ([[lbb-prose-voice-girls]]):
women with real histories and real anger, not victims-as-scenery. Aged past the green
Soi 6 tier by design.

### The threat web, in one line

Rabbit owns the bar on paper; Nuan and her family actually run it, and her
entanglement in the nominee structure is the thread she can pull to remove him;
Rabbit survives only by being worth more — via the European trade — than the cost of
removing him. Every relationship in the bar is a pressure on that balance, and the
player walks into the middle of it — a lone farang, like Rabbit, being read by the
whole clan.

**Tier 0 vs. later.** Tier 0 *establishes the five characters* — surface, the
WDG-castoff thread present in the prose, the threats and the romance seeded as
characterisation. **Deferred, and spec'd as future work:** Nuan's leverage and the
pay-rise drain as a *playable* pressure; the romance vector's mechanic; the Ampha
reveal; the European-trade / black-market thread (Tier 3). Prose-promise discipline
holds throughout: in Tier 0 the threats and the interest are *feelings and
foreshadowing*, never a door a verb must open.

## The tiers

| Tier | What | Depends on | Status |
|---|---|---|---|
| **0** | The bar + Eddy as a voiced, unlikeable presence; backstory in `ASK` topics | nothing | building now |
| **1** | Rabbit is the in-world author of CTF stage 2 (the security-probe text) | CTF stage 2 (`docs/ctf.md`) | spec |
| **2** | The heist quest — fork-not-filter, the inversion, CCIB | Tier 0 | spec (this doc) |
| **3** | Black-market tie-in (the tourists who tip too well) | Tier 2 | seed only, build nothing |

Tiers are independent by design. Tier 0 ships standalone. Tier 1 makes existing
CTF machinery diegetic. Tier 2 is the ambitious build. Tier 3 is a hook planted in
dialogue with nothing behind it (same discipline as the Darkside second-bar hook).

## Tier 1 — Rabbit is the voice of the CTF

CTF stage 2 (`docs/ctf.md`) is "designed, not built": it arms when the player types
an obvious security probe at the prompt (`' OR 1=1--`, `<script>…`, `../../etc/passwd`)
and answers with a text from an unknown number. **That number is Rabbit.** He is the
one person in this world who would clock a probe the way Mort clocked a careful
reader, and text you about it. This gives stage 2 a character and a reason, and it
retro-justifies the biro rabbit under the LK Metro QR: a hacker who goes by Rabbit
*is the sort of person who stickers a QR onto a Matrix poster.* The CTF becomes
something a character did, not an author's wink.

**Firewall (non-negotiable):** the CTF is deliberately *inert* — nothing in the
game gates on it. Rabbit may **front** the CTF (be its voice, its texter, its
rabbit) but the CTF must never **depend** on Rabbit, and no quest may gate on
solving the cipher. Otherwise the "inert, byte-stable, strangers-only" invariants
break and quest content ends up locked behind an out-of-game website. Eddy flavours
the CTF; the CTF never blocks the game, and the game never blocks the CTF.

## Tier 2 — the heist quest

### The interview is a fork, not a filter

Rabbit sizes you up and offers a path — he never gates you out of the other one.
The engine cannot detect who is technical, and a skill-question that throws a
wrong-guesser into a path they can't finish is worse than no fork at all. So the
interview is a `pendingChoice` modal that *offers*, and both branches reach the same
`doneFlag`.

### Mule path (default, always available)

You carry Rabbit's black box into WDG's back office, place it, and **babysit** it —
stay in the room, keep it from being clocked. Rabbit is the brains, remote; you are
the hands and the nerve. **Reuses existing machinery:** the go-go flashlight's
*"the house assumes a camera"* suspicion escalation (`_gogoLightWarn`) is the exact
shape — a per-command heat ratchet that walks you out if it maxes. New skin, proven
mechanic. No technical knowledge required of the player at all.

### Operator path (opt-in, richer, never required)

The player who lights up when Rabbit asks the real question gets the fake-CLI set
piece: a fictional-but-grounded workstation somebody left unlocked. Navigate it,
find the wallet file, get it out. **The realism is the boring truth** — not a
Hollywood hack, an unlocked machine and a copied file, which is the game's habit of
puncturing the farang fantasy. Runs as a modal mini-game on the same state machinery
as the safe keypad and Jackpot (`G.game` / `pendingChoice`, routed through
`doCommand` while live).

Two hard constraints:
- **Winnable by a determined non-expert.** The puzzle is *navigation and noticing*,
  not exploitation knowledge — `help` lists the verbs, the filesystem is small,
  breadcrumbs lead (a `.bash_history`, a reused password in a `notes.txt`). A
  technical player moves fast and grins; a curious non-technical player still gets
  through.
- **CTF flavour, never CTF dependency.** A `sanuk{…}` string taped to a monitor is
  fine as an easter egg; requiring the real cipher is not (see the firewall above).

### The CLI simulator is a PORTABLE MODULE (architectural rule)

Mario sees a follow-on game taking shape — cyberpunk, Bangkok (concept grounded in
`docs/bangkok-concept.md`) — and
wants the mechanics portable, the CLI simulator especially. **So it is built to the
`games.js` doctrine, not woven into the engine:**

- Its own file (`web/js/cli-sim.js`), loaded like `games.js`.
- **Pure.** No `G`, no DOM, no output side-effects, no wall-clock. Every random
  decision takes an **injected `rnd()`** (same rule as `c4Ai`), so a scenario is
  seed-deterministic and testable.
- **Data-driven.** The filesystem, the goal, and the breadcrumbs are a **scenario
  config object**, not code. A new level is new data, not a new function. That is
  what makes it reusable in a different game: drop in a new scenario, get a new
  workstation.
- **Clean interface**, e.g. `makeCliSession(scenario, rnd)` → a session with
  `input(line) → { output, done, won }`. The host game wires it to its own I/O and
  its own win-condition. LBB's engine is one such host; the cyberpunk game would be
  another, importing the same file unchanged.
- **No LBB nouns inside it.** Baht, สนุก, WDG, Naklua all live in the *scenario data
  and the host wiring*, never in the simulator. The engine reads `won` and pays the
  quest; the simulator never knows what a quest is.

This mirrors how `games.js` already stays free of `G` and output — follow that file
as the template. See also the portability note in the follow-on-game section below.

### The inversion — the crypto was never the jugular

Both paths converge: Rabbit gets his data. Then the arc turns. **WDG's real
fragility is not its money — it is that it survives only by paying *suay* to Tan's
syndicate, and tolerance can simply be withdrawn** (`docs/factions-thai.md`, "What is
actually in the envelope"). The crypto is real and it is laundered, but touching it
changes nothing structural. The gut-punch is the same one `orchid_recon` already
delivers: you thought you were scouting the seat of power; you were watching rent
get collected. Rabbit, a hacker to the marrow, is *constitutionally incapable* of
seeing this — he thinks in exploits, and the lever that would actually move WDG is
not an exploit. The player who has run the town's procurement gauntlet knows better.

### CCIB — the fourth verse of Eddy's own song

Thailand's **Cyber Crime Investigation Bureau** (the "Cyber Police") is real, and
the design uses its real reputation: it *sounds* like a joke to a farang and is
**quietly, unhurriedly competent.** That is the identical note the syndicate runs on
(restraint is competence; the locals were never the marks), now at institutional
street level — and it is the fourth verse of Eddy's whole life, which is one long
song titled *clever farang underestimates the real world*: the Vegas wallet (got
lucky, thought he was smart), the Soi 6 bar (lost it for want of *sen*), the nominee
company (a bomb with his name on it), and now this. The farang hears "Cyber Police"
and laughs. The farang is wrong. Again.

**Portrayal rule:** CCIB is named and never shown in a bad light — competent
professionals doing a real job, full stop. This is deliberately *not* the "no real
names" rule that governs crime families; a government agency doing its job honestly
is safe to name precisely because there is no allegation attached. No named officers,
no real cases — the institution and its reputation, nothing more. (Same spirit as
using the *category* of the syndicate without naming a real family.)

**CCIB is involved no matter what — the only variable is who takes the heat.** A
crypto move against WDG draws the one thing the powers cannot abide: *attention*
(`docs/factions-thai.md`, "Influence, not violence"). CCIB pulls the thread
regardless; the arc's climax is **where it lands**, a three-way fork:

- **Rabbit** takes it — but he is a survivor who has landed on his feet twice, so he
  *slips the noose a third time* rather than going to jail (Mario's constraint: he is
  a future asset). The near-miss is the tension, not a game-over. Cost: he goes to
  ground; you lose easy access to him for a while.
- **You** take it — the sloppy-play outcome. You underestimated the locals exactly
  as Eddy always has, and the knock comes to *your* door. Survivable (violence never
  becomes mechanics; nobody threatens you), but it costs you — heat, money, a scare,
  a favour owed to get clear.
- **WDG** takes it — the elegant outcome. The heist's real product was never the
  coins; it was *evidence of the laundering*, and CCIB doing its competent job on
  **WDG** is the lever Rabbit could never see. This is the inversion made mechanical:
  you win by handing the competent locals a true thing, not by out-hacking anyone.

Who it lands on is a function of *how you played* (see the open question below) and
of the betrayal fork.

### The betrayal fork (v1, tentative)

"Curry favour with WDG" is a real branch: steer the heat toward Rabbit's operation
and WDG is grateful (heat off them, a rival's scheme disrupted). You gain `wdg`
faction standing — which opens the Orchid Room (`_faction("wdg")` gates
`orchid_room`) — and lose Rabbit as an ally, but he walks, because he always does.
**Marked v1-tentative:** in scope for the first build unless the shape argues
otherwise once the straight arc exists. Revisit before committing.

### Faction consequences

Helping Eddy is a *deed*, so per doctrine it moves standing (declining never does —
`_align` is only called on an act). Aiding Rabbit against WDG plausibly *lowers*
`wdg` standing (and may nudge `indie`); the betrayal path *raises* `wdg`. This is a
felt consequence — Orchid Room access swings on it — and it is the correct use of the
existing scalar. Keep it deed-gated; never move standing for a choice not taken.

## Real-world sensitivity

- **CCIB:** named, competent, never defamed — see the portrayal rule above.
- **The hacking content is fiction, not a tutorial.** The CLI simulator is a
  navigation puzzle over a *fictional* filesystem; it must not read as a real
  exploitation how-to. "Unlocked machine, copied file" is the whole method, and that
  is a *deflation* of hacking mystique, not an instruction manual.
- **White Dish stays fictional** — Ryan Powers / WDG only, never the real names the
  faction is drawn from ([[lbb-white-dish-canon]]).
- **PG-13 and morally grey, like the rest of the game.** A crypto heist against a
  fictional criminal rollup is fine as fiction; keep the tone the game's own.

## The follow-on game (why portability is a rule, not a nicety)

Mario sees a cyberpunk follow-on (Bangkok or elsewhere) taking shape. That reframes
the CLI simulator as **shared infrastructure**, the way `docs/second-road-plan.md`
treats LBB's data and art as an upstream Second Road consumes. Design implication:
the simulator ships as a standalone, engine-agnostic, data-driven module (spec
above), and anything else in this arc that could plausibly recur — a suspicion meter,
a "carry a device into a place and don't get noticed" beat — should be built with the
same seam-awareness the CLAUDE.md online/2D rules already demand: no browser or
wall-clock APIs in the core, all nondeterminism through an injected rng, state
serialisable. LBB is the first host; keep the second one buildable.

**The Bangkok follow-on is a content-pack** in the sense `docs/settings-reuse.md`
defines — the same reusable engine as the Itaewon and Honch nightlife siblings, but
in the *genre-shift* effort band (it reuses Layer 1 fully and only selected Layer 3,
since the nightlife economy mostly doesn't transfer). That makes it **the case the
pack interface should be designed against**, not deferred to: the hardest reuse case
reveals the true engine/content boundary. This CLI simulator is the first pack-
component built to that boundary; Rabbit is the narrative bridge, and engine reuse
and canon continuity are independent axes (see `docs/settings-reuse.md`).

## Open decisions

- **Where CCIB heat comes from.** Botched-heist-only (simple) vs. accrued from *how*
  you play — a spotted black box, a noisy operator run (richer, more to build, and it
  makes the three-way heat fork emergent rather than scripted). Mario leaning toward
  "involved no matter what"; the open part is whether the *landing* is scripted by a
  final choice or computed from play.
- **Betrayal fork in v1?** Tentatively yes; revisit once the straight arc exists.
- **Does the operator path award anything the mule path doesn't?** Lean no on
  mechanics (both reach the same `doneFlag`), maybe yes on *flavour/trophy* — a
  `WHO AM I` line, a nod from Rabbit — so the richer path feels seen without
  splitting the reward and pressuring players onto it.
- **Rabbit's staff and the sad-grace-note hostess** — authored or filler? Lean one
  authored (the day-counter), the rest filler.

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | Arc greenlit: Fast Eddy / Rabbit, the White Rabbit beer bar in Naklua, the heist that misreads the target. Anti-Tan / living-Shamrock reading. |
| 2026-08-13 | Rabbit is a two-layer character with real depth, not a gag: smart, self-aware, one year sober after a wake-up incident; the vanity is armour he knows is armour. He is the likely franchise bridge to the Bangkok cyberpunk game, so no ending burns him. Look: overweight, bald but for a rat-tail growing from a neural-socket tattoo (jacked-in motif), gold ear-hoop, untrimmed nose hair — deadpan, not sneered. |
| 2026-08-13 | Heist is fork-not-filter: mule path (reuses the suspicion ratchet) always available; operator path (CLI sim) is opt-in, richer, never required, and winnable by a non-expert. |
| 2026-08-13 | CLI simulator is a portable, data-driven, pure module (`games.js` doctrine) — built for reuse in a future cyberpunk game, no LBB nouns inside. |
| 2026-08-13 | The inversion: crypto was never the jugular, the *suay* is; Rabbit can't see it. Canon-correct per factions doc. |
| 2026-08-13 | CCIB named and never portrayed badly ("quietly, unhurriedly competent"); involved no matter what; the variable is who takes the heat — Rabbit (slips it, never jailed), you (sloppy play), or WDG (the elegant win). |
| 2026-08-13 | Firewall: Rabbit fronts the CTF but the CTF never depends on Rabbit and no quest gates on the cipher. |
| 2026-08-13 | The White Rabbit staff are an AUTHORED ensemble, not filler, unified by one keystone: everyone here is a WDG castoff (Rabbit lost his bar to them; Nuan + hostesses are ex-Soi-6). The bar is a refuge and the revenge crew. |
| 2026-08-13 | Ownership trap: Rabbit doesn't control his own bar — the nominee structure means mamasan Nuan (Lao, 42, ex-Soi-6, first hire he trusted) is one call from removing him, is giving herself pay rises, and he survives only by the European trade he brings. Ampha the "innocent" cashier is the likely Thai nominee name (a threat in cover). Pay-rise drain + leverage = future quest. |
| 2026-08-13 | Nuan takes a romantic liking to the PLAYER — a novel vector (she's management, not a barfinable hostess, so bond/barfine machinery doesn't apply). Tier 0 = characterisation only; the mechanic needs its own design pass. |
| open | CCIB heat: scripted landing vs. computed from play. |
| open | Betrayal fork in v1 (tentative yes). |
| open | Operator-path reward (flavour-only vs. nothing extra). |
