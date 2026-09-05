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
| **0** | The bar + Eddy as a voiced, unlikeable presence; backstory in `ASK` topics | nothing | SHIPPED |
| **1** | Rabbit is the in-world author of CTF stage 2 (the security-probe text) | CTF stage 2 (`docs/ctf.md`) | spec |
| **2** | The heist quest — fork-not-filter, the inversion, CCIB | Tier 0 | phases 1–2 SHIPPED (interview, mule path, operator path + `cli-sim.js`); kid path, SIM/dog beats, landings spec |
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

### The kid path — Nont (agreed 2026-09-04)

The interview's third answer. The engine cannot tell whether the player is technical;
Nont is the player who isn't and *knows a kid who is*. He is the built LBB NPC (the
Old Market table, the priced fixer — `docs/bangkok-concept.md`), and this is his
LBB backstory happening again in front of you: Rabbit's runner and tech-kid, taught
the craft and then the crime, steered off before it took him — by Tan, who placed him
somewhere safe and never named it. **Bringing him in turns the caper into a family
argument, which is the point.** Three beats, in order:

1. **Rabbit can't ask.** At the interview the player can say the name. Rabbit goes
   quiet — he wants the kid on it more than anything and knows exactly why he
   shouldn't ask — and lets *you* carry the request. The player carries a request
   Rabbit cannot make himself. (A `pendingChoice` option beside MULE / OPERATOR:
   `THE KID`. Offered only if the player has met Nont; never gated out.)
2. **Nont names a price he doesn't want paid.** He does not do favours (that is the
   whole design of him), so he prices it — and it is the first price he has named
   that he plainly wishes you wouldn't meet: walking back into the one thing he
   stepped out of, for the man who pointed him at it, with the man who pulled him out
   two streets away. Pay it and the **operator path runs offscreen through him** —
   no CLI, cleaner and faster than the mule path, a scene rather than a mini-game.
   Decline and nothing moves (doctrine). **No Bangkok in it, no "he's going places":**
   the no-signpost test applies exactly as it does to the lake errand — the beat must
   be worth having if the follow-on is never built.
3. **The kid lands on CCIB's radar, and it's the one outcome nobody in the arc can
   allow.** (Revised 2026-09-06: CCIB were already inside WDG's case — see *CCIB* below —
   so nothing "lands" on Nont as heat; what happens is that a competent institution now
   has his name, which for the follow-on game is the point.) The three adults in his
   life collide over what to do about that:
   - **Rabbit's guilt line, finally said out loud** (the unbuilt thread the concept doc
     notes is built here, in the only scene that earns it).
   - **Tan's unpriced favour gets called in early and in the wrong direction**: Tan
     makes a call that turns a file into a footnote — the `tanfavour` modal machinery,
     its second use — and now the *player* owes him for the kid, with no figure on it.
     The fixer who never takes money has just done the biggest favour in the game. (He
     cannot take the kid OFF the radar; nobody can. He can make sure the name is the
     last thing anyone looks at.)
   - **Or the player pays**, with cash, through Nont's own channel — the priced fixer
     paying for the priced fixer. `CASH` is already his verb. Same limit: it buys
     distance, not erasure.
   - **How the thread reaches him at all** is the SIM — see *The SIM — the wire, and
     the name on it* below. On your own phone or Rabbit's burner the kid stays off the
     radar unless you brought him in; on a Nont SIM it is the road you paved.
   - **Duangjai never learns which.** The tiffin errand reads differently afterward,
     and nothing in her dialogue changes — the player carries that one alone.

**Costs, per doctrine.** Aiding Rabbit already lowers `wdg` standing; bringing the kid
in is a deed with a second bill — if Tan has to clean up, `syndicate` standing moves
too (he did it; it cost him; you were the reason). Refusing THE KID at the interview
costs nothing, ever. The mule and operator paths are untouched by this section.

**Why this and not a fourth NPC.** Every piece already exists: the interview fork, the
Tan-favour modal, Nont's price-not-favour doctrine, the tiffin errand's mother, the
CCIB landing fork. The kid path is those pieces made to touch, and it is the only
version of the heist where the *player's* choice is a moral one rather than a
technical one.

### The SIM — the wire, and the name on it (agreed 2026-09-04)

Nont already sells a Thai SIM that isn't in your name (`BUY SIM`, `NONT_SIM`, item
`thai_sim` — *"Buriram. Don't ask."*). In the real economy that is a **mule SIM**
(ซิมม้า, *sim ma*, "horse SIM" — the SIM-side sibling of the mule account, บัญชีม้า,
that his `CASH` transfers run through): a villager's ID registered against a stack
of numbers for a few hundred baht, sold on to people who need a phone that isn't
theirs. Thai SIMs are ID-registered by law, and the mule-SIM trade is exactly what
CCIB runs public campaigns against. So the SIM is not colour. It is **the wire the
heist runs on, and the name CCIB finds at the end of it.**

**Rabbit's first instruction on every path is "not your phone."** The black box
phones home, the operator run needs a hotspot, the kid needs a number to be reached
on — and none of it can touch a farang's own registered number. That gives the player
three wires, chosen by what they already own, never by a menu:

| The wire | Where it comes from | Who lands on CCIB's radar |
|---|---|---|
| **Your own phone** | doing nothing — the sloppy default | **You.** A registered farang number inside a monitored machine's traffic: the plainclothes coffee is poured for you by name, and `ccibRadar.player` is set. |
| **Rabbit's burner** | he hands you one if you have nothing else | **Rabbit only** — and he was on it already. The one wire that keeps *you* off the radar (unless you sat at the keyboard). |
| **Nont's SIM** | ฿200 at the Old Market, before or during the arc | **Buriram** — a man who sold his ID for ฿300 and has never heard of any of you — and from Buriram to the table that bought the stack, which is **how Nont lands on the radar.** The player's own ฿200 built the road. |

**The SIM is the cheapest wire and the worst one to be caught holding.** A farang
found with his own number in a suspicious pattern is a farang with a story to tell.
A farang found holding *a Thai person's registered SIM* in that pattern is the exact
picture CCIB is built to see, and no story covers it — mule SIM, foreign operator,
done. So Rabbit says the rule out loud, once: *"The second it's done, that SIM goes
in the sea."* And the game makes keeping it tempting, because it is genuinely useful
afterward — a Thai number with no name on it is what the booking app, LINE and every
hostess's *"you have Thai number?"* want. Whether the player still **has** it when the
thread is pulled is the variable:

- **Ditched** (`BREAK SIM` / `THROW SIM` / drop it off the Bali Hai pier — a voiced
  verb, nothing more): you stay off the radar. The table, and Nont, may not.
- **Kept**: the coffee is poured for you too, and the question is the number. You are
  on the radar alongside Nont — the heaviest version of laying low — with Tan's read
  afterward: *"A Thai name in a farang pocket. My friend, you gave them the one thing
  they did not have to work for."*

**What it does to the kid path.** Beat 3 no longer needs fiat: CCIB reaches the kid
*through the SIM the player bought*, Buriram → the Old Market table → Nont's
channel → the boy on the other end of the number. Bring the kid in on your own phone
or Rabbit's burner and the fourth landing is a threat that never quite arrives; bring
him in on a Nont SIM and it is the road you paved. This is also the moment the player
learns what Nont's trade *is* — every `CASH` transfer that "had a moment", every SIM
from Buriram, was mule infrastructure in plain sight, and the arc is where the plain
sight ends. **Nont knew; he priced it; he wished you wouldn't pay.**

**Doctrine checks.** The SIM is never required — every path has a wire without it. It
moves nothing until a deed is done on it (buying it is innocent; Piotr bought one for
the noodle girl's LINE). CCIB stays competent and unhurried (the knock is a question
about a number, not a raid). No Bangkok in it. And it is not a new system: the item,
the vendor, the verb and the landing fork all exist; this section only makes the
existing object mean what it already says.

### The dog — cover, and description (agreed 2026-09-05)

If the player owns the soi dog by the time this arc runs — and a resident who has
been here long enough to know Rabbit very often does — he is **not** a bonus, a
gadget or a lockpick. He is **one property, cutting both ways**: the dog makes you
*legible*. Which is cover in one scene and conviction in the next, and the player
does not get to have it only one way.

**As cover.** A farang standing on a Naklua soi at three in the morning is a farang
standing on a soi at three in the morning, and everybody who passes files it. A
farang *walking his dog* at three in the morning is nobody at all — the most ordinary
sight in the country, and the only thing that explains a man being anywhere at any
hour without explaining anything. It is real tradecraft and it is warm: the dog you
fed once for no reason is the best cover you will ever own, and you acquired it by
being kind to something.

**As description.** CCIB is competent and unhurried, and competent, unhurried people
do not need your face. **Nobody remembers a farang. Everybody remembers the farang
with the dog** — and this one has a clipped ear, which is not a memory, it is a
*description*. So the same property that made you invisible to the street makes you
trivial to the officer who is not looking at CCTV so much as asking the noodle
seller who was about. Where the SIM is the paper trail, the dog is the witness trail:
both acquired innocently, both the thread — and either is enough to put a mule who
otherwise stayed clean onto the radar by description alone.

**This is the fourth verse at the player's own level.** Eddy's whole life is one long
song titled *clever farang underestimates the real world* — and here the clever thing
the player did, the thing that genuinely worked, is the thing that identifies him.
The arc should not editorialise; it should let the player enjoy the cover for a whole
beat before anybody says the other half out loud.

**And he is in the room for it.** The White Rabbit is a `beer` bar, so `_dogSpot`
already puts him in under the rail rather than outside the door — no new rule, no
exception to write. Every scene in this arc that happens at Rabbit's own bar
happens with the dog under the stool, which is worth knowing before writing any
of them.

**Rabbit says the other half**, because he is the professional and it is exactly the
register he has: fond, deadpan, unsparing, and correct.

> *"He's a lovely dog."* A pause that goes on slightly too long. *"He's also a
> description. You want to be a shape in a doorway, boss, not a bloke with a dog."*

And a beat for the man rather than the operator: a dog gets through Eddy's armour
where nothing else in the arc does. He has no dependants, has lost two lives, and is
one year sober; he is precisely the sort of man who talks to a dog properly and to
people sideways. **Tier 0 can carry this for free** — Rabbit greeting the dog by name
before he greets you is characterisation that costs one line and needs no heist.

**The lever that already exists, and it is the good one.** The Shamrock dog's whole
backstory is *a farang who had to go*: Sean caught the one flight home, and the dog
sat that step for a month before he went walking. So when the arc's climax puts
**going to ground** on the table — Rabbit's own landing, or the heavy version of
yours — the game does not have to invent a cost. It has one, four years old and
engraved in brass. Nothing needs saying; the dog is simply in the room while the
option is discussed. *(A player who has done the Shamrock pilgrimage is carrying
the tag itself, which is the loudest version of this and needs even less said. A
player who hasn't still has the dog, and the dog is enough — do not gate the beat
on `brass_tag`.)*

**Where he goes if you have to.** If a landing takes you off the map for a while,
the dog must have somewhere to be, named in the scene: **Nuan** (who runs the
White Rabbit's floor and would take him without being asked twice), **Daeng** on
Khao Talo (who knew him as Paddy's dog and crouched to his face), or **Auntie Nok**,
who has fed two beach cats morning and night for ten years and has room for a third
mouth. He is never killed, never lost, never hurt, and never taken — violence never
becomes mechanics, and least of all here.

**Doctrine checks.** No path requires a dog and none is easier for the want of one;
the cover is *flavour and framing*, never a lockpick, and the description tilts a
landing's weight rather than deciding it (heat, per the open question below, not a
different ending). Owning him moves nothing until a deed is done. He costs the
player nothing he did not already sign up for by feeding a stray. And it is not a
new system: `G.dog`, `_dogName()`, the brass tag and the Shamrock scene all exist —
this section only makes the animal already at the player's heel mean what he already
means.

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

**WDG WAS ALREADY UNDER INVESTIGATION** (Mario, 2026-09-06 — this replaces the
"who takes the heat" fork below). CCIB had the group's crypto laundering open for
months before the player ever sat down at the White Rabbit. Rabbit does not know.
Nobody on the soi knows, because that is what competent and unhurried looks like from
the outside: nothing. So the heist is not the thing that brings CCIB to WDG. **The
heist is the thing that nearly blows the case CCIB already had** — two amateurs and a
black box stumbling around inside a monitored machine — and CCIB's move is to
*interrupt it*, quietly, so their own work isn't wrecked by the help. That is the
fourth verse sung straight: the clever farang thought he was first. He was a year
late, and in the way.

**What the interruption IS.** Not a raid — raids are loud, and loud is what the whole
faction doctrine says the competent never are. The job completes on its own terms
(the light goes green; the file lands on the stick — the player's nerve or skill still
pays, and both built paths stand). What is interrupted is the *follow-through*: Rabbit
never gets to use what you brought him. The morning after, a plainclothes officer is
already at the White Rabbit when you arrive — coffee, not a warrant, first name only —
and the conversation is about how long they have been in that machine and how close
last night came to costing them the case. The data is theirs now; it always was. He
does not threaten anybody. He does not have to. He does, once, say the thing Mario
gave him: that a mutual friend had mentioned the group might have a problem soon, and
that a problem is only useful if nobody else is standing in it. **Then he leaves, and
the case against WDG proceeds without you, exactly as it would have.**

**Why the player lays low — three voices, one of them right (agreed 2026-09-06).**
Nobody tells the player to lay low in so many words, because the two people who could
are the two who mustn't.

- **The officer informs; he never warns.** A warning is a threat made, and the faction
  doctrine says the competent never make one — making it is already a failure. So over
  the coffee he tells you what he knows, which is everything: how long they have been
  inside that machine, what you typed, the number the box phoned home on. He never says
  *don't*. He never says anything about you beyond the facts. Then he leaves. That is
  worse than a warning — a competent man has just shown you your own name in his file
  and gone back to work as though you weren't worth a second sentence. The player lays
  low because he understood that on his own, which is the only way this town teaches
  anything.
- **Eddy tells you to lay low, and is wrong about why.** He goes to ground theatrically —
  shutters the bar for a week, changes his number — because he thinks this is about
  *him*: the fourth life, the noose. It isn't. CCIB decided he was irrelevant to the
  case months ago, which for a man who needs to matter is the one thing he cannot hear.
  His advice is correct by accident and for the wrong reason. That is his verse, sung
  one more time.
- **Tan gives the read — and Tan is the mutual friend.** CANON: the syndicate has a
  working relationship with CCIB, favours both ways, exactly as `docs/factions-thai.md`
  says influence works; withdrawing tolerance of WDG was never going to be a threat, it
  was a coffee with someone who was already looking. Tan says so afterward, in his usual
  register, no favour with a number on it: *"For some weeks, my friend, be boring. It is
  not about you. They have a case to finish and you are a footnote they would prefer
  not to write. Footnotes that stay still get left out."* And the player realises Tan
  didn't read the situation. He is in it. He has been in it the whole time — which is
  what the hidden hub is for.

So the lay-low period is **Tan's read**, triggered by an officer who never warned, with
Eddy's advice as the wrong-reason counterpoint. It ends the way Tan says it will: the
WDG case breaks in the Owl, the footnote is left out, and the flag stays. Being off the
news is not the same as being off the radar.

**The variable is the RADAR, not the heat.** The heat lands on WDG regardless — they
are the real outsiders, the ones paying *suay* to be tolerated, and the case is
already made. What the player's choices decide is **who CCIB now has a file on**, and
that is the Bangkok seed (`docs/bangkok-concept.md`): a name on a competent
institution's radar is a thread a later game can pull.

| Who lands on the radar | How |
|---|---|
| **Eddy / Rabbit** | Always. It is his bar, his box, his stick; they had him before you. He slips nothing this time — he is simply *known*, which for a man planning a fourth life is worse than a charge. |
| **You** | If you sat at the machine (the operator path — a monitored keyboard remembers), if the job ran on **your own phone**, or if you were still holding a Thai SIM when the coffee was poured. The mule who used Rabbit's burner and walked away from the box is the one player who stays off it. |
| **Nont** | If the wire was **his SIM** (Buriram → the table → his channel), or if you brought **the kid** in. Direct or indirect, he is on it — and he is the one the follow-on game most needs to be on it. |

**What "you don't get away scot-free" means, mechanically.** No visa revoked, no
deportation, no cell, no ban — that would be a scandal and this town does not do
scandals. You **lay low**: a `ccibRadar.player` flag, a period (weeks) in which a
second plainclothes visit is possible, WORK at your own bar prints the awareness of
being watched, Tan's read on it, and the Owl running a lead about the group's
troubles with nobody's name in it. It lifts when the WDG investigation becomes the
news — the focus was always elsewhere; you were only ever adjacent. Standing moves as
before: aiding Rabbit against WDG still lowers `wdg`; nothing moves for a choice not
taken.

**Portability note.** `G.ccibRadar = { player, eddy, nont }` is exactly the kind of
field the baton/export should carry forward: three booleans a Bangkok game can read
on day one without importing an engine. Keep it flat, keep it boolean, keep it named.

**The old four-way "who takes the heat" fork is retired** (it lives in the decision
log). Its best line survives in the new shape — you win, insofar as anybody wins, by
being the one person in the story who *wasn't in the way*.

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
- **Does the SIM decide the landing on its own, or weight it?** Lean *decide*: the
  table above is three clean outcomes and the ditched/kept split is one readable
  choice. Weighting it into a computed heat score (the open question below) risks the
  player never learning that the SIM was the reason — and the SIM being the reason is
  the whole lesson.
- **Does the operator path award anything the mule path doesn't?** Lean no on
  mechanics (both reach the same `doneFlag`), maybe yes on *flavour/trophy* — a
  `WHO AM I` line, a nod from Rabbit — so the richer path feels seen without
  splitting the reward and pressuring players onto it.
- **Rabbit's staff and the sad-grace-note hostess** — authored or filler? Lean one
  authored (the day-counter), the rest filler.

### If the iPhone build happens — two constraints that are cheap NOW and dear later

Raised 2026-08-24, when the possibility of an iOS port came up. The arc is in far
better shape for it than the CTF is (see below), but two things want deciding
before the CLI is built rather than after.

**1. TAP-REACHABILITY IS A HARD SCENARIO CONSTRAINT — every legal move must be
reachable without the keyboard.** A CLI mini-game is a typing game, and glass is
where typing goes to die: iOS gives you autocapitalisation (`Ls`), autocorrect on
filenames, and smart punctuation. `cat ~/.bash_history` is genuinely miserable to
thumb. The game already solved this shape once — the thumbs-only playtest
completed a full seven-night week with zero typed commands, because prefill chips
fan out from the engine's own completion pool. A CLI whose verb set is small
(`help` lists them, by design) and whose filesystem is small (also by design) can
surface both as chips: tap `ls`, tap a filename. That turns the worst mobile
surface into one of the better ones — but only if the scenario config can enumerate
its own legal moves, which is a design decision about the DATA SHAPE, not a
rendering detail bolted on afterwards. Concretely: the scenario should be able to
answer "what can be typed here right now", the same way `_playOptions()`/
`_gameVerbs()` already do for the bar games. On a WKWebView build also set
`autocorrect="off" autocapitalize="off" spellcheck="false"` on the input.

**2. A `sanuk{…}` flag is DECORATION on mobile, and should be written as such.**
The firewall already holds — "CTF flavour, never CTF dependency" — so the arc does
not inherit the CTF's iOS problems, which is the single best decision in this
document from a portability standpoint. But note that on iOS a flag string has
nowhere to go: no URL bar, no submission surface, nothing to do with it. Fine as a
wink taped to a monitor; just don't write a beat that expects the player to *act*
on it.

**Adjacent, and worth knowing rather than solving here: App Store review risk is
higher for the heist than for anything else in the game.** The defence in "Real-world
sensitivity" above is honest and I would not weaken it — a navigation puzzle over a
fictional filesystem, whose whole method is "unlocked machine, copied file", is a
deflation of hacking mystique rather than a how-to. But a reviewer sees a terminal,
a wallet file and a copy-it-out goal, stacked on top of a 17+ adult rating. Cheap
mitigations that improve the fiction anyway: keep the filesystem visibly fictional
(no real tool names, no commands that map onto real exploitation), and make the
first screen read as a story beat rather than a shell prompt. The CCIB thread
already supplies the in-world framing for that.

**The CTF, by contrast, should stay web-only.** Its affordances *are* the puzzle:
`/.well-known/security.txt` has no app analogue; `EXAMINE QR` prints a code meant to
be scanned BY a phone, which inverts into a dead end when the player IS the phone;
and stage 2 turns on `dig TXT`, which iOS does not have. The content is documented
as inert to the game — no quest gates on it — so an iOS build can drop the solving
chain and keep the artefacts as flavour at zero mechanical cost. That is another
argument for the firewall this arc already has.

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | Arc greenlit: Fast Eddy / Rabbit, the White Rabbit beer bar in Naklua, the heist that misreads the target. Anti-Tan / living-Shamrock reading. |
| 2026-08-13 | Rabbit is a two-layer character with real depth, not a gag: smart, self-aware, one year sober after a wake-up incident; the vanity is armour he knows is armour. He is the likely franchise bridge to the Bangkok cyberpunk game, so no ending burns him. Look: overweight, bald but for a rat-tail growing from a neural-socket tattoo (jacked-in motif), gold ear-hoop, untrimmed nose hair — deadpan, not sneered. |
| 2026-08-13 | Heist is fork-not-filter: mule path (reuses the suspicion ratchet) always available; operator path (CLI sim) is opt-in, richer, never required, and winnable by a non-expert. |
| 2026-09-04 | **The kid path**: Nont (built as the priced fixer) is the interview's third answer — the player who isn't technical and knows a kid who is. Rabbit can't ask; Nont names a price he doesn't want paid; the operator path runs offscreen through him; a fourth CCIB landing (on the kid) collides Rabbit's guilt, Tan's favour called in early, and the player's cash. Deed-gated costs; no Bangkok signposting. Rides with the heist build. |
| 2026-08-13 | CLI simulator is a portable, data-driven, pure module (`games.js` doctrine) — built for reuse in a future cyberpunk game, no LBB nouns inside. |
| 2026-08-13 | The inversion: crypto was never the jugular, the *suay* is; Rabbit can't see it. Canon-correct per factions doc. |
| 2026-08-13 | CCIB named and never portrayed badly ("quietly, unhurriedly competent"); involved no matter what; the variable is who takes the heat — Rabbit (slips it, never jailed), you (sloppy play), or WDG (the elegant win). |
| 2026-08-13 | Firewall: Rabbit fronts the CTF but the CTF never depends on Rabbit and no quest gates on the cipher. |
| 2026-08-13 | The White Rabbit staff are an AUTHORED ensemble, not filler, unified by one keystone: everyone here is a WDG castoff (Rabbit lost his bar to them; Nuan + hostesses are ex-Soi-6). The bar is a refuge and the revenge crew. |
| 2026-08-13 | Ownership trap: Rabbit doesn't control his own bar — the nominee structure means mamasan Nuan (Lao, 42, ex-Soi-6, first hire he trusted) is one call from removing him, is giving herself pay rises, and he survives only by the European trade he brings. Ampha the "innocent" cashier is the likely Thai nominee name (a threat in cover). Pay-rise drain + leverage = future quest. |
| 2026-08-13 | Nuan takes a romantic liking to the PLAYER — a novel vector (she's management, not a barfinable hostess, so bond/barfine machinery doesn't apply). Tier 0 = characterisation only; the mechanic needs its own design pass. |
| 2026-09-05 | **The dog is cover AND description**: if `G.dog` is owned, one property cutting both ways — a man walking a dog at 3am is invisible to the street and trivial to describe to an officer (the SIM is the paper trail, the dog is the witness trail). Rabbit names the second half out loud; a dog gets through his armour, which is free Tier-0 characterisation. The going-to-ground cost needs no invention: the Shamrock dog has already been left behind by a farang who had to go. He is never killed, lost or taken, and is never required by any path. |
| 2026-09-04 | **The SIM is the wire**: Nont's Buriram SIM is a mule SIM (ซิมม้า); "not your phone" is Rabbit's first rule on every path; the wire you used decides where CCIB's thread leads (you / Rabbit / Buriram → the table → the kid); a farang caught still HOLDING a Thai's registered SIM is the heaviest "you take it" landing, so ditching it is a voiced choice the game makes tempting to skip. Never required; buying it stays innocent; no new system. |
| 2026-09-05 | **Phase 1 built** (interview + mule path). Office = `kitten_office` behind Kitten Corner's till (WDG by Kesinee's own line; not the flagship or the ops bar). Expat-only, deps `white_dish`. Interview is a `pendingChoice="rabbitjob"` modal (CARRY IT / NOT ME / ASK), NOT ME free and re-offerable. Mule path: buy the till girl a drink to open the corridor (`_boxGirlPaid` via `_tillKeeper`), PLACE the box, WAIT `BOX_TURNS` clean ticks; a noisy command on a footstep turn spends heat (`_gogoLightWarn` shape), 3 strikes = Kesinee finds you = `rabbitBlown` + `_kickOut`; leaving mid-run refused, TAKE aborts clean. Two quests `rabbit_job`/`rabbit_heist`, doneFlags `rabbitPath`/`rabbitData`. Operator path, kid path, SIM/dog beats and the CCIB landings are the next phases. |
| 2026-09-05 | **Landing decided** (Mario): CCIB's heat lands mostly on WDG no matter what — the real outsiders — and may even acknowledge the player's contribution as the excuse it needed to build the WDG case "for a mutual friend". The player is not scot-free but keeps visa/liberty: lay low until focus is elsewhere (the WDG investigation). The SIM DECIDES the landing (not a computed score). Betrayal fork IN for v1. Operator path yields a recoverable, player-useful thing (TBD in the operator build). |
| 2026-09-05 | **Phase 2 built — the operator path, on a PORTABLE module.** `web/js/cli-sim.js` loads after `games.js` and follows its doctrine exactly: pure, no G/DOM/clock, injected rnd, plain-data state (lives in `G.game.cli`, so a save resumes the puzzle), data-driven (`CLI_SCENARIOS.wdg_office` in world.js holds every host noun), and **enumerable moves** — `cliOptions()` lists every legal command, a password only becoming a chip once READ. `tests/js/cli-sim.test.js` loads ONLY the module (the portability assertion) and proves tap-reachability by breadth-first search over the options to the win; it also greps the source for host nouns and globals. Host wiring: KEYBOARD at the interview → `G.rabbitWay="operator"` + Rabbit's stick (no item) → same corridor gate → USE/SIT AT LAPTOP → `G.game.type="cli"` through the real game router (`_gameInput/_gameBoard/_gameVerbs/_renderGame`, QUIT = EXIT, no stake). Won → `rabbitData`; budget lock → retry another night, no flag; EXIT keeps what was copied. **The reward decided (Mario: "something recoverable, interesting, useful"): Rabbit's old regulars** — `regulars_2019.xls` in the office archive, WDG lifted it with his bar and never used it. Copy it and it is an item (`trade_book`) with a fork: GIVE it to Eddy (trust +2, +2 สนุก, his best line) or READ it at your own bar (`barBook` → takings × `BOOK_TAKINGS` 1.06 — the European trade he survives on, now yours; he hears, and says so, and doesn't ask). Not the crypto, so the inversion stands. |
| 2026-09-06 | **WDG was already under CCIB investigation** for crypto laundering before the arc begins. The heist doesn't bring CCIB — it nearly BLOWS their case, and CCIB interrupts it: the job completes (both built paths stand) but the follow-through is taken from Rabbit by a plainclothes visit the morning after, coffee not warrant, "a mutual friend mentioned the group might have a problem soon". The heat lands on WDG regardless. **The variable is the RADAR** — `G.ccibRadar = {player, eddy, nont}` — Eddy always; the player if operator / own phone / holding a Thai SIM; Nont if his SIM or the kid. No visa/deportation/jail: the player lays low for weeks (a second visit possible, WORK notes it, Tan reads it) until the WDG case is the news. The four-way "who takes the heat" fork is retired. The radar flags are the Bangkok seed and should ride the export. |
| 2026-09-06 | **Tan is the mutual friend** (canon): the syndicate and CCIB have a working relationship, favours both ways; WDG's tolerance was withdrawn as a coffee with someone already looking. The lay-low is Tan's read, not a CCIB warning (they inform, never warn) and not Eddy's advice (he goes to ground for the wrong reason — he thinks it's about him). |
| 2026-09-06 | **CCIB heat: CLOSED** — neither scripted-landing nor computed; the landing is fixed (WDG) and the radar is set by three legible facts (path, wire, SIM held). |

| open | Betrayal fork in v1 (tentative yes). |
| 2026-09-05 | Operator-path reward: CLOSED — Rabbit's old regulars (see phase 2 row). |
| 2026-08-24 | If iOS happens: tap-reachability is a HARD constraint on the CLI scenario format (every legal move enumerable and tappable, per the thumbs-only precedent), and a `sanuk{…}` flag is decoration only on mobile. The CTF stays web-only — its affordances (`/.well-known/`, a scannable QR, `dig TXT`) have no app analogue, and the existing CTF-independence firewall is what makes that free. |
