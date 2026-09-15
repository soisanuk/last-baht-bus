# Why every persona still finds bugs, and what would stop the classes coming back

Written 2026-09-15 after round 47 (four Fable waves, twelve personas, ~200 findings, ~150
fixed, 63 new pins). Companion to `playtest-findings-analysis.md` (classes A–H, written
2026-08-23) and `testing-gap-analysis.md` (why the instruments were blind). Those two
documents were right and the instruments they proposed were built — the soak's liveness
ledger, the engine-derived walker vocabulary, the affordance/ask/errand audits, the
real-path rule. **The classes they named have largely stopped coming back.** What the
last four waves found is six classes those documents did not name, and every one of them
has the same shape: **a fact the engine already holds, consulted in some places and not
in others.**

## 1. What the last twelve personas actually found

| Class | Shape | Instances this round |
|---|---|---|
| **I. Relationship-edge blindness** | A predicate exists (`G.party.ids`, `_affairLive()`, `_atOwnBar()`, `_onRide()`) and the mechanic's CORE consults it; its EDGES don't. | The jilt loop souring the girl on your arm; the police not seeing her; the nurse pitching across her; the roster listing her as floor staff; the affair girl quoting her barfine to the man she went home with; his cashier "keeping an eye" on the owner; her texts asking the boss for rent; the bar's drizzle narrated from her pillion. **~20 findings, three personas.** |
| **J. Return channels** | A dialogue node gated on a quest being ACTIVE goes dark when the quest completes; the mouth that sent you cannot hear the answer you bring back; a finished quest keeps pitching. | Wimon "not yet" about a scene she played; Diamond can't discuss the keys she hung; Mala can't hear "consider it done"; Bill's order pitch after the order; Tan's Eddy node unreachable behind the locator for its whole life. |
| **K. The clock in prose** | A string carries an hour or a weekday the game did not compute; a multi-stop scene spends no turns and then narrates dawn. | "3am" at 21:06; "2am and she's hungry" at 00:30; "morning already" at 00:48; "a Tuesday checkpoint" on a Sunday; "Pay-day's Friday" on a Friday; "six hours ago"; "three different nights" on the first; "never once" on night one; the after-hours room stepping out into "morning" mid-ride. |
| **L. The wrong predicate** | The right question asked of the wrong field. | `G.known` (named in print) where `G.talked` (met) was meant — Waen's homework to a stranger; `NPC_ROLES[id]` as "is a person who texts" — Priew never texted; `region !== "Jomtien"` as "in town" — Thappraya told to walk; `_inBar()` as "sells drinks" — the cabaret couldn't; `_sheltered` as "has a roof" — a street's awning was a doorway. |
| **M. One template, many people** | A line written for one person applied to another: a pronoun, a possession, a private detail. | "this is him settling up" for two women; "the one she leaves it with" for Bill; two girls with one Honda and one nickname; a son at the viewpoint for a girl with none; "drinks his own stock" of two men who don't; the same colleague review from three mouths. |
| **N. The town can't say what it does** | The engine computes a schedule, a price, a rule — and no character answers a question about it. | Closing time (thirteen shrugs); the league (chalked on four walls, "not my story" from the woman at the table); Mort's own column; Tan on a venue by name; the soapy's tiers; TAO RAI in a cabaret. |

The older classes are still present but thinner: two promise defects (a bell in a "no
bells" club, "a third cheaper" that wasn't), one absence (the affair crisis modulo that
dealt one crisis in 22 nights), one economy line (the ฿40 crisps twice), one modal (a
bare `n` answering NO). None of the twelve found a crash, a soft-lock, or a lost save.

**Severity has fallen; count has not.** A persona pointed at an unplayed system finds
15–25 things because a system is written once and consulted from thirty places, and the
writing never co-locates the places. That is the same sentence as `prose-defects.md`'s
founding observation about prose, now true of *mechanics*.

## 2. Why the existing instruments don't see these

Every instrument the project has is bounded by an artifact somebody authored — a list, a
convention, a call sequence (`testing-gap-analysis.md` §3). Classes I–N sit outside those
bounds for a specific reason each:

- **I** is a *set membership* problem. The fix is always "add the predicate to one more
  consumer". Nothing enumerates the consumers, so each round finds the next three.
- **J** is a *lifecycle* problem. The suite tests a node at one flag state; the persona
  walks the quest end to end and meets the node after its gate has closed.
- **K** is a *literal* problem. Prose is reviewed on its own page, where "3am" is fine.
  The hour-blind lint (`references.test`) covers `revisit` lines only.
- **L** is a *naming* problem. `G.known` and `G.talked` both read as "knows her".
- **M** is a *template* problem. The pool is reviewed as text; the pronoun is a variable.
- **N** is an *inverse* problem. Every audit checks that what the prose PROMISES is
  deliverable. Nothing checks that what the engine KNOWS is askable.

## 3. Six instruments, in order of value per hour

### 3.1 A predicate–consumer registry (class I) — build first

A test file, `tests/js/predicates.test.js`, holding for each relationship predicate the
list of functions that MUST consult it, and asserting by source inspection that each
function body does:

```
_onRide()      → _sayDrizzle-site, _salengTick, _railTick, _lastBusWarn, _thaiOverheard
G.party.ids    → _bfResolve (jilt loop), _maybeIncomingText (away), police resolver,
                 _nursed, _describeRoom (Here:), _doBarfine, _lightNotice, _maybeEncounter (solo)
_affairLive()  → _ownBarTalk, _relGreeting, _maybeIncomingText, colleague review, _affairNight
_atOwnBar()    → _addHeat, lady-drink busy/contested, _ladyDrinkCharge, _nursed, _pushyBar,
                 _lastBusWarn, _endNight same-stool
```

This is `docs/prose-defects.md`'s doctrine ("a claim needs co-location") applied to code:
the registry IS the co-location. It does not find a new consumer on its own — but the
rule that goes with it does: **any new `_say` site that describes a bar, a girl, the
police or the room must be added to the registry for every predicate it could be wrong
under, at authoring time.** Half the class-I findings were sites written after the
predicate existed.

### 3.2 A dialogue lifecycle audit (class J)

`tools/dialogue-lifecycle.mjs`: for every quest, derive the flag trajectory (nothing →
offered → active → doneFlag set, plus each `sets:` along the chain); for every NPC the
quest touches, for every topic alias on any of their nodes, evaluate `_pickDialogue`
under each stage. **Report any topic that answers at an earlier stage and misses at a
later one with no successor node.** That is Wimon, Diamond, Mala, Bill and Tan's Eddy
node, found mechanically. Gate it in `promises.test.js` beside the ask-topic audit.

### 3.3 A time-claim lint (class K)

Extend `references.test`'s hour-blind regex from `revisit` lines to the whole corpus
(`prose-corpus.mjs --json` already reaches engine pools and `_say` bodies): flag
`\b\d{1,2}\s?(am|pm)\b`, `\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b`, `\d+ hours ago`,
`\d+ (different )?nights`, `never once`, `every night`, `morning already` in any string
that is not built from `_clockStr()`/`_weekday()`/`_leagueIn()`. Keep a reasoned
allow-list (a bar *called* Sunset Dreams). And one invariant test for multi-stop scenes:
**every re-enterable encounter (`nightride`, `bfhop`, `bfparty`, the tonic shop) must
advance `G.nightTurn` by more than one per step**, asserted through `doCommand`.

### 3.4 Named predicates for the questions the code keeps asking (class L)

Four helpers, and a lint that the raw form is not used outside them:
`_met(id)` (talked, not merely named in print), `_texts(id)` (a contact who sends
messages — role-carriers plus the authored offmap women), `_inTown(room)` (the
region set Tan means, not `!== "Jomtien"`), `_underRoof(room)` (already exists — the
lint is that `_sheltered` is never used to mean it). The names are the fix; the lint
keeps them the fix.

### 3.5 Pronoun-safe templates (class M)

`_pr(id)` returning `{s, o, p}` for any NPC (it exists in pieces — `_patronHis`,
`pronoun ===` checks). A lint over `_fmt`/template strings: **a string that interpolates
a variable person AND contains a bare `he|she|him|her|his` is a finding** unless the
pronoun comes from `_pr`. Advisory list first (the corpus has hundreds of legitimate
fixed-person lines), then a hard gate on new strings.

### 3.6 The inverse audit — can the town say it? (class N)

A table of (fact the engine computes → question a player would type → who should answer):
closing time, quiz, league, roast, checkpoint window, bus lines from here, the price list,
a venue's class, a fixture's rule. `tools/askable-audit.mjs` plays each question at a
staff member, a manager and a regular and reports the ones that land on the miss oracle.
Round 47 hand-built the closing and league answers; the audit makes the rest a list.

## 4. What stays with the personas

None of the six catches what a persona catches first: the class that does not exist yet.
Every instrument above was written *after* a persona named its class. The order of work
is therefore unchanged — **personas find the class, an instrument stomps the class, the
next persona goes where no instrument reaches** — with one adjustment the last four waves
earned: **aim the next persona at the newest predicate, not the emptiest room.** The
party, the affair and the ride were each written in one session and consulted from
thirty places; the persona that walked each one found twenty edges in a night. The next
such predicate is whatever ships next.

## 5. Two honest limits

- **The instruments are bounded by their lists** (3.1, 3.6) or their regexes (3.3, 3.5),
  exactly as the last generation was. They convert a *recurring* class into a cheap
  deterministic check; they do not find the class that hasn't recurred yet.
- **The dossier pass is still the only thing that sees a contradiction between two
  mouths**, and it is a human or a persona reading a page. An LLM judge over each
  `--dossiers` subject (an assertion auditor pointed at the corpus rather than at play)
  is the one instrument on this list that is not bounded by a list — and the one that
  costs tokens every run. Worth building when the mechanical six have stopped paying.
