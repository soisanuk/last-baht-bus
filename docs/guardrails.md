# Guardrails — what this game may take from the real town

**Written 2026-09-23**, on the day the bar group and its owner were renamed out of an
identifiability risk. House style follows `~/projects/ground-floor/docs/money-side.md`,
whose governing clause applies here unchanged.

This repo is **public** (`github.com/soisanuk/last-baht-bus`) and auto-deploys to GitHub
Pages, so everything below ships the moment it is committed. Mario lives in Thailand.

## The rule

> Several of the real people are identifiable **without their names**. A composite that
> keeps two of those traits is a portrait. Take one trait, or none.

Treat that as a **trait budget of one** per real-world referent. The traits that spend the
budget are: **name** (including a derivation of one), **trade**, **location**,
**nationality**, and **any specific real event** — an arrest, a named dispute, an
acquisition, ownership of a real outlet.

## What defamation actually turns on here

Not whether the real name was used. **Whether the person is identifiable to people who
know them.** Thai criminal defamation (Criminal Code ss.326–328) and the Computer Crime
Act s.14 both apply, fiction is not a defence where the subject is identifiable, and the
exposure is criminal rather than merely civil.

**A deliberate near-miss can read worse than the real name**, because it evidences that the
author knew exactly who was meant.

## The 2026-09-23 rename, and why it was needed

The fictional names were **derivations rather than disguises** — a near-anagram and a
letter-drop, keeping the rhythm of the originals. Stacked with sector, town and the owner's
nationality, that is identification several times over: four traits where the budget is one.

| was | is |
|---|---|
| White Dish Group / WDG | **Pattaya Leisure Group / PLG** |
| Ryan Powers | **Duncan Ashcroft** |

**The replacement test, for anyone renaming again:** you must not be able to show the
derivation from the real name on one line. Break the phonetic and the anagram link
completely. Both new names were checked against public search for a real bar group or bar
figure of that name in this town and sector, and against the game's own cast for
collisions.

### Two deliberate residues, and why each is acceptable

- **`engine-core.js` names the old faction key `wdg`.** It has to: a save written before
  the rename carries `G.faction.wdg`, two old quest ids and five old flags, and
  `deserializeGame` migrates them. Without that line, a player mid-arc silently loses their
  standing and their progress. It is a key in a migration, not a claim about anyone.
- **The NPC id stays `powers`.** It names `web/portraits/thumb/powers.*`, a
  `gen-portraits.py` CHARS spec and every save's `G.known`. On its own it is an ordinary
  English word already present in this repo ("the powers that be", "a different set of
  powers"); the derivation lived in the full name, which is gone. Recorded with its reason
  in `ID_NOT_NAME` (`tests/js/world.test.js`), which fails if an id and a name diverge
  without a stated reason.

## What is SAFE to keep — and it is the good part

The dramatically excellent structure is **structurally generic across Southeast Asia and
identifies nobody**:

- A foreign-owned bar cluster that **also owns the visa firm and the law firm** — the
  operator controls both his staff's immigration status and his own legal representation.
  Vertical integration of leverage. Keep it; it is the engine of the whole arc.
- **Rent-to-own bar economics**, the seller-financed note, the landlord who can end you
  while the noteholder cannot.
- **Scale** — dozens of venues, hundreds of staff.
- ***Suay*** (the levy paid to be left alone) and ***sen*** (connections) as the economy the
  envelope at the good table actually pays into. See `docs/factions-thai.md`.

## What must stay out

- **Specific real events.** An arrest, a named investor dispute, ownership of a local news
  outlet. Each is a trait, and on a Pattaya bar group run by a Briton they rebuild the
  portrait whatever the name is.
- **Any storyline drawn from a trafficking prosecution**, and emphatically any involving an
  underage complainant. Not anonymised — **omitted**. The matter appears unresolved, there
  is a real minor involved, and the ownership structure above already supplies everything
  the fiction needs. *(Checked 2026-09-23: no such storyline exists in this repo. Keep it
  that way.)*
- **Real names, full stop** — of people, companies, families or venues, in prose, ids,
  comments, commit messages or test fixtures. Verified 2026-09-23 that the repo and all of
  git history name neither real referent; that is the state to preserve.

## The same rule, applied to the factions

`docs/factions-thai.md` already carries the repo policy — *no real families, names or
allegations, ever; structural pattern only*. That guardrail was **operating one layer too
high**: it stopped real people being named *inside* the fiction while the fiction's own
proper nouns did the identifying. Both layers are in scope now.

The Darkside *jao pho* family and the syndicate are written as **shapes of power**, never as
anybody. Nobody is accused of anything. Violence never becomes mechanics, and the restraint
is the menace.

## Before you add anything drawn from real reporting

1. Count the traits. Name, trade, location, nationality, a real event. **One. Not two.**
2. If it needs a second trait to work, the story is about a real person and does not belong
   in a public repo.
3. A near-miss name is a name. Derive nothing.
4. Ask whether the *structure* alone carries the drama. Here it always has.
