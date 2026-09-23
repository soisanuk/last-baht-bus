# The bar that closed next door — making failure a decision

**Status: design, nothing built (2026-09-23).** From an essay Mario brought in, on the
five-phase collapse cycle of a Soi 6 bar as watched by the owner opposite. The source names
nobody and describes no specific real event — structure only, which is the one category
`docs/guardrails.md` marks as safe to take. **The shape is taken; none of the prose is.**

## The one-line thesis

The game already lets you prosper and already lets you be re-let for arrears, and the
causal spine between them is missing — so losing the bar is currently **arithmetic rather
than a decision you made.** This puts the decision in.

## The cycle, against what exists

| Essay phase | In LBB today |
|---|---|
| 1. The landlord notices you are doing well and raises the rent | **Missing.** `_barRent()` is a pure function of the room's `barType` — `BAR_RENT × RENT_MULT`, and it never moves |
| 2. The owner raises his prices | **Missing.** The player cannot set a price at their own bar at all |
| 3. The girls leave for better venues | **Missing.** `BAR_SHORT_STAFF` (0.85) thins the floor, but it fires on *arrears* — a debt, not a choice |
| 4. He borrows at punitive interest | **Partly.** Nira's ฿20k at 20% with the cousins garnishing — but it is a *personal* loan, not the bar's |
| 5. It closes quietly | **Built, and good.** `_barLost("landlord")`: nobody wrongs you, the room is simply worth more to somebody who pays on the first |

## Why it is worth building

The essay's argument is that the owner is **a participant in his own decline, not the
victim of a greedy landlord.** That is already this game's philosophy everywhere else — the
presence dilemma, procurement, the affair: no obviously correct option, you pay either way.
The bar's failure is the one system that still runs on a subtraction.

**Prices are the missing lever, and the trap is that raising them is locally correct and
globally fatal** — the right move this month and the reason the floor is empty in four.

The mechanism does not need inventing, because the women's income is already modelled:
their money is lady-drink commission (`LADY_CUT`), so fewer punters is *directly* less money
for them. The floor thins through **their own economics**, not through a penalty flag. That
is the difference between a mechanic and a scold.

## The four pieces

### 1. Rent that reacts (phase 1)

`_barRent()` becomes stateful — `G.bar.rent`, persisted, with the landlord reassessing every
few months against your trailing takings. **Success is what moves it.** He is not a villain
and says why; the rise alone must be survivable, because the essay's point is that the rent
does not kill you, your *answer* to it does.

### 2. Prices you set (phase 2)

A markup at your own bar on beer, lady drink and barfine. Three surfaces as the house rule
requires (parser + `_kwActions` + `_completePool`), and the effects are:

- takings per customer **up**
- traffic **down** — fewer punters through the door
- **her commission down**, which is the causal heart and the thing that feeds phase 3

### 3. Women who leave, and say so first (phase 3)

Persistent, not nightly — `G.soc.leftEarly[id] === G.day` is a one-night device and the wrong
tool. A separate `G.bar.gone[id]`, checked in `_npcActive` beside the existing absence rules.

**She tells you before she goes**, as a floor moment — `_workFloor` is already "the most
reliable place in the game to build bond", which makes it exactly the right place to lose
one. A number leaving the roster is a spreadsheet; a woman you know giving you her notice is
the scene. That is the whole reason this should hurt.

### 4. Money at a punitive rate (phase 4)

Extend the existing shape rather than invent a lender. The note-holder will not; **Nont is
this exactly** — the priced fixer, cash with no favour in it, five percent through an account
that is a mule account in plain sight. A bar-scoped borrow is his register, not Tan's.

## The strongest version: the bar opposite

The essay's frame is not *you fail*. It is **a man watching the bar across the street fail,
knowing he may be next** — and LBB has that only as static scenery, the dead Shamrock on
Khao Talo warning that a bar with no partner has no cushion.

Make it **live**: a neighbouring bar walking the five phases on its own clock while you
trade, visible from your own doorway as describe lines — the rent board, the new prices, the
rail thinning, the shutters. Then the For Rent sign, and then **a new man takes it on and
starts the cycle again**, which is the essay's last beat and the reason the whole thing
lands. You watch it once before you are in it, so your own first price rise means something.

Deterministic — day-derived pure hash, never dice (rule 7), so it is shared-world-safe and
every player sees the same street.

## What NOT to build

- **Not unavoidable.** If the cycle always ends one way it is a cutscene.
- **Not moral-graded.** Nobody schemes and nobody is punished for greed. The position is the
  antagonist, same doctrine as the staff affair.
- **Not a button with one right answer.** There must be situations where raising prices is
  correct — a peak-season rail, covering the note — or it is a trap with a lesson attached
  rather than a judgement call. This is the part most likely to be got wrong.

## Open calls (Mario's)

| Question | Why it matters |
|---|---|
| Does the neighbour's cycle run always, or only once you own a bar? | Always = the town has a life; only-when-owning = it is a tutorial for your own decline |
| Can you lower prices and win the women back, or is the drift one-way? | One-way is truer and much harsher; recoverable makes it a system you can play |
| Does the rent rise cap, or compound? | Compounding guarantees the ending eventually; a cap keeps a good operator alive indefinitely |
| Is the loan Nont's, or a new lender? | Nont fits perfectly, but it hands one character a second structural role |

## Decision log

| Date | Decision |
|---|---|
| 2026-09-23 | Source read and checked against `docs/guardrails.md`: names nobody, describes no specific real event, structure only — safe to take. Prose is ours. |
| 2026-09-23 | Scoped against the codebase: phases 1–3 missing, 4 partial, 5 built. The gap is the causal spine, not the ending. |
| — | **OPEN:** the four questions above, and whether this is built at all before the intrusion layer. |
