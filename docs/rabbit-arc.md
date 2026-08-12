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

A beer bar in Naklua. The district already has three (Anchor, Dolphin, Mooring)
plus the Orchid Club, so a fourth beer bar sits naturally on the existing grid.
`barType: "beer"`. Add via the `lbb-add-npc` conventions (room + bar display name +
staff roles + a mamasan/cashier/hostesses so the role mechanics have someone to hang
on). Staff canon: they stay because he overpays. One authored hostess who is openly
counting the days is the sad-grace-note.

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

Mario sees a follow-on game taking shape — cyberpunk, Bangkok or elsewhere — and
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
| open | CCIB heat: scripted landing vs. computed from play. |
| open | Betrayal fork in v1 (tentative yes). |
| open | Operator-path reward (flavour-only vs. nothing extra). |
