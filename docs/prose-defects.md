# Cross-Reference Prose Defects — the failure mode of generated prose

Written 2026-08-06, after two playtest catches that every automated check and a
full 3,228-record corpus review had walked straight past.

## The two bugs

**The minibus.** Tan's taxi-ride intro opened *"The minibus out of
Suvarnabhumi…"*. Everywhere else in the game — his roster desc, the
near-confirmation where he pats "his very ordinary car", the Orchid reveal, the
once-a-vacation pickup — he drives a plain grey sedan. Two facts, both fine on
their own page, and one of them false about the world.

**"Come, I know a place."** His good-table deflection ended with an invitation
to go and eat. There was no place, no scene, and no FOLLOW verb — so the most
natural response to a direct invitation was `I didn't understand that`.

Neither is a typo, a broken flag, or a bad line. Both are **assertions that are
individually correct and globally false**: true of the sentence, wrong about the
world it claims to describe.

## Why this is the characteristic defect of generated prose

Hand-written prose accumulates in one head that holds the world. Generated prose
does not. A model writes each string with *local* context — this character, this
beat, this paragraph — and it is very good at that, which is exactly the problem:

1. **Plausible detail becomes canon by accident.** An airport transfer in
   Thailand *is* usually a minibus. The inference is sound, reads well, and
   silently contradicts five other lines written in a different session.
2. **Every string is written alone, so nothing collides.** The author of line
   #4,912 has no page on which line #212 is visible. Contradiction requires
   co-location, and generation never co-locates.
3. **Fluency conceals the seam.** A wrong fact in flat prose reads as a mistake;
   the same fact in good prose reads as *characterisation*. "The minibus smells
   of pine air-freshener and someone else's last beer" is a nice sentence. It is
   nice in the way that stops you checking it.
4. **Prose invents affordances for free.** Fiction speaks in invitations —
   *come*, *follow me*, *ask around* — and a model writes them because they are
   what a person would say. Nothing in the sentence knows whether a verb exists.

The through-line: **a model's failures are not local, so local review cannot see
them.** Per-string review confirms each record is well-written, in voice, and
canon-consistent *as text*. It structurally cannot ask "is this true of the
world?", because the world isn't on the page.

## Why the existing tiers missed them

| Check | Covers | Missed these because |
| --- | --- | --- |
| `promises.test.js` (tier 1) | every `(CAPS IN PARENS)` hint resolves to a real verb | the invitation was plain speech, not a hint |
| decorate/name-collision corpus (tier 1) | tap targets, name collisions | not a rendering defect |
| `prose-corpus.mjs` review (tier 2) | every string, read once, in voice | reads records in FILE order, one at a time |
| soak `hint-tap` (tier 1½) | printed CAPS hints actually work when played | again: only parenthesised hints |
| playtest (tier 3) | a human holding the world in their head | **caught both** |

And a fifth, worse gap found while investigating: the corpus tool only collected
declarative tables and top-level `const _POOL = [...]` arrays. **Prose passed
directly to `_say(...)` inside a function body — 1,864 records, ~40% of the
engine's player-facing words — was never in the corpus at all.** The minibus
line lived there. "Full corpus coverage" was true of the collection, not of the
game.

## How we're addressing it

Three layers, cheapest first. The doctrine is unchanged — *finding is `node`,
judging is the model* — applied one level up: the model's job is turning prose
into **claims**, and mechanical checks do the cross-referencing forever after.

### Layer 0 — collect everything (done)

`tools/prose-corpus.mjs` now walks the engine line by line with a running owner
(the enclosing `const _POOL` **or** the enclosing `function`), so function-body
prose enters the corpus as the `fn` group, attributed to its scene. Corpus:
3,309 → 5,079 records. The same rewrite fixed a real mislabel: a single-line
const (`const _HOSTS = ["arm","win"];`) never met a closing brace at column 0,
so the old block-slicer stayed in pool mode forever and filed every following
function's prose under that pool's name.

### Layer 1 — the dossier pivot (done)

`--about <subject>` / `--dossiers` regroups the corpus by **who or what a line is
about**, not which file it lives in: one document per NPC, patron, bar, or item,
carrying every claim the game makes about it. Mechanical — the entity list is
world.js itself. It does not judge anything; it makes contradiction *visible*
instead of *findable*, which is the entire trick. `--about tan` returns 72
records with all five vehicle claims on one page.

Matching is case-sensitive on display names (never the lowercase id — "tan"
would drag in every "Gold Coast tan"), and names that are ordinary capitalised
words are speaker-only, the same collision problem term.js solves with
`_WORD_NAME_NPCS`.

### Layer 1½ — the reference lint (done)

`tests/js/references.test.js` — a corpus test in the shape of decorate.test.js,
so a new bad reference fails the suite with no wordlist to maintain:

- **venues**: a venue-shaped name in prose must exist in ROOMS (catches a rename
  orphaning old prose). Three names are fiction on purpose and named as such —
  the dead Marine Bar in Nigel's list, and the Pattaya Flying Club.
- **people**: a name in an instruction position (*ask X, give it to X*) must be
  somebody addressable — otherwise the line is a dead end the player can't act
  on. Came back at zero.
- **prices**: a `฿N` typed into prose where a constant holds N. This one has to
  scan **source, not corpus**: world.js records are evaluated, so a correct
  `"฿" + BEER_PRICE` is textually identical to a hard-coded `"฿80"`. And the
  economy reuses round numbers — ฿300 is the ATM fee *and* a Thai massage *and*
  the joiner fee; ฿500 is the quiz prize *and* the wallet — so only constants
  with a distinctive value can be checked at all. Guarded list stays short,
  comments are stripped, and genuine collisions are named.

The first run found a real one (Pim quoting ฿150 rather than `LADY_DRINK`) and
proved out on an injected regression.

### Layer 2 — claims and probes (built)

`tools/prose-claims.mjs`, in the suite via `references.test.js`. It runs three
probes and **is proven against the original bug**: reintroduce the minibus line
and the suite fails, naming both sides —

```
Tan: two vehicle values — sedan (npc.tan.desc) vs minibus (engine-parser.js:_taxiIntro[1])
```

- **slots** — a slot is a closed vocabulary of mutually exclusive values
  (`vehicle`, `dancerNumber`). Two values of one slot for one subject is the
  minibus shape.
- **locations** — "X works at *Venue*" checked against `NPCS[id].room` / `bars`.
- **affordances** — spoken invitations with no command hint, the generalised
  "Come, I know a place". Ones that ARE delivered carry a reason in the tool's
  OK map (the invite system, third-party speech).

Two things building it taught, both worth more than the tool:

**Attribution must happen at SCENE scope, not record scope.** The corpus splits
prose at line granularity, so a scene's subject and its attributes routinely
land in different records — *the minibus line never contains the word "Tan"*;
his name is in the next `_say`. Record-scope attribution therefore missed the
one bug it was written to catch. Grouping records by container (a function, a
pool, an NPC entry) and asking "who is named anywhere in this scene?" is what
makes a claim attachable at all.

**A slot only works if its values are mutually exclusive AND the prose is
reliably about the subject.** `nationality` was tried and dropped: characters
describe each *other's* nationality constantly ("Ryan Powers. British, though
he's got a voice on now — half American"), so it fired on correct prose more
often than wrong prose. Precision over ambition — two good slots beat five noisy
ones, and a noisy check gets ignored, which is worse than no check.

Still unbuilt from the original design: `price` (covered by the reference lint
instead), `schedule`, `relationship`, `history`, and caching claims against
content hashes — none needed yet, because the mechanical extraction is fast
enough to just re-run.

### Tier 2b — transcript review (run 2026-08-07)

The soak writes full transcripts for free (`--transcript`), and a seeded one
replays exactly. Reading a couple end-to-end catches a class the corpus cannot
even represent, because **the corpus has no order**: defects that exist only in
the *assembly* of lines, not in any line.

Three findings from the first run, none of which any static check could see:

- **The Nite Owl's doubled attribution.** `_doColumn` prefixed every letter with
  "• A reader writes: ", but six of the nine authored letters introduce their own
  writer — so two-thirds of columns read *"A reader writes: A Thai wife writes:
  …"*. Template fine. Letter fine. Only the rendered column is wrong. The prefix
  is now conditional on the letter being a bare quote.
- **A doubled award.** `_soiSpectateHappy` printed its own "+1 สนุก" directly
  under `_addHappy`'s automatic "(+1 สนุก)" — two lines saying the same thing,
  reading like a double payout. Invisible per-string; obvious in sequence.
- **Markup leaking into transcripts.** `{{…}}` is render-only tap-suppression
  that decorate() strips, but the soak's print callback didn't, so transcripts
  showed `{{Nice}} girls` — noise that makes a reviewer distrust the artefact.
  The harness now uses `stripMarkup`, like any non-decorate consumer.

Worth noting what the transcript ALSO revealed and didn't need fixing here: a
German-language run shows English seams (the `CALL TAN` hint, MAP, the stat
line) — the localization gap that `docs/i18n-de-gaps.md` already tracks. New
prose widens that gap by default, which is the argument for finishing de
coverage before adding much more.

### A door nobody was watching — translation (found 2026-08-07)

The German localization pass produced a fresh instance of the exact defect this
document describes, by a route not anticipated here. "her scout friend owes her
a favour" was translated as *"ihre Scout-Freundin"* — a female scout — while the
delivery scene (`engine-parser.js:1244`) has Diamond say *"The Alcazar man owes
me… he hates that he does."*

The mechanism is the one from the top of this document, one level removed:
**translation forces a resolution the source left open.** English "her scout
friend" is silent about gender; German cannot be. Every such resolution is a new
assertion about the world, made — as always — with only the local string in
view. The `--about` dossier would have answered it in one command.

So the corpus rules bind translators too, and a second rule joins them:
**gendered grammar exposes what English hides.** Two bugs in two batches came
from English concealing an agreement question — "You already have one" (neuter
singular, but it fires for three plural items) and `"{who} ist im {v}"` (a
hardcoded dative that breaks on a feminine venue name). Neither is visible in
English. When a template slot takes a proper noun, prefer a preposition that
doesn't inflect.

Worth noting the direction of travel: reading prose *as translation candidates*
also surfaced a plain English bug two full corpus reviews had walked past —
`You rack. ${opp} breaks` renders "You rack. a leathery expat…" whenever the
opponent is the descriptor rather than a name. Localization is a prose review
in disguise, because it forces every line to be read again by someone who
cannot skim.

## Authoring rules that follow

For anyone — human or model — writing prose in this repo:

1. **A detail about a recurring entity is a claim about the world.** Vehicles,
   home provinces, ages, who works where, what something costs. Before inventing
   one, run `node tools/prose-corpus.mjs --about <subject>` and read what the
   game already says. Inventing is the default failure; checking is one command.
2. **An invitation is a promise.** *Come, follow me, I'll show you, meet me* —
   either a verb delivers it or the line doesn't say it. If a verb does deliver
   it, add the tappable `(CAPS)` hint so tier 1 can see it too.
3. **Numbers belong to constants.** Concatenate `BEER_PRICE`, don't type "฿90"
   — the one Nu line that hard-coded a price drifted the moment the constant
   moved.
4. **Novel prose gets a delta review.** `--delta` after any prose change; it is
   sized to what you touched.
5. **None of this replaces playing it.** Both bugs in this document were caught
   by a human reading prose against a world they held in their head. Tiers 0–2
   exist to keep that human's attention scarce and expensive — not to replace
   them.
