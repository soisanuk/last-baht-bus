# The bar that closed next door — making failure a decision

**Status: BUILT 2026-10-01** (Mario: "apply the theme 10 numbers as you see fit and implement"; the numbers and the four open calls are answered in the decision log at the end, the constants are in `world.js` under `BAR_RENT_REVIEW`, and `tests/js/research.test.js` pins each phase). Originally a design note (2026-09-23). From an essay Mario brought in, on the
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

### 3b. The floor is the asset, and the terms are the second lever (added 2026-10-01)

A second essay from the same source (2026-10-01, "why Western KPIs fail here" — names
nobody, structure only) sharpens phase 3 from the owner's side. **The bar's asset is not
its punters; it is its women.** A good hostess is an independent channel with her own
following — the regulars are hers before they are the bar's — and when she goes, she takes
a share of the rail to the next door along. So the owner who manages by **quota, fine and
price rise** (the imported playbook: sixty drinks a week or a deduction) drives out exactly
the staff the takings came from, and reads the drop as a reason for a tighter quota. The
owner who pays a **flat salary with no quota** keeps them, at a visible cost on the wages
line.

That makes the lever two-headed, which is what keeps it from being a button with one
right answer: **prices** (phase 2) move the punters, **terms** move the women, and both are
locally correct and globally fatal. The quota is the right call for one thin month — the
numbers go up — and the reason two of the floor are at the bar opposite by the next.

The pieces already exist as her ledger's numbers and nothing the owner decides touches
them: `BAR_SALARY` and `BAR_QUOTA` are quoted in the tier-two reveal (the cost of you),
`LADY_CUT` is the commission the whole floor lives on, and `_barStaff()`/`_npcActive` are
where a departure lands. What a build adds:

- **`G.bar.terms`** — `commission` (today's model: `BAR_SALARY` base, `LADY_CUT` a drink,
  `BAR_QUOTA` before a bonus) or `salary` (a flat figure per woman per month on the wages
  line, no quota, her lady drinks still ring to the till). Set by a verb at your own bar,
  stated by Bert at the deposit the way the lease is stated, re-settable monthly.
- **A quota the owner can tighten** (`G.bar.quota`), with the fine for a miss that the essay
  names as the characteristic mistake — and the floor's reaction is the women's own
  arithmetic, not a morale meter: a woman whose commission fell below what the bar opposite
  pays leaves, after her notice (§3), and **takes a day-stable share of the rail with her**
  — a named line in BOOKS ("Mew's regulars, three of them, drink across the road now") and a
  takings drop the next settle, so the owner sees the mechanism and not a number.
- **A woman with a following** — a stable hash-picked minority of the filler floor (the
  essay's two-hundred-thousand-follower dancer is the extreme; most have a LINE group of
  twenty regulars), readable in her desc and on her phone, worth more rail than the others
  when she stays and more when she goes. The drinks-only girl (`_drinksOnly`) is already
  the shape of this: her money is the drink, and she decides.

Everything in **What NOT to build** applies. In particular the salary route must not be the
answer: it is a bigger wages line every night of the wet, and an owner who pays it in the
trough is the one in phase 4. The point is the same as the presence dilemma — you pay either
way, and the only question is in which currency.

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
| 2026-10-01 | **BUILT.** The four calls, answered: (1) the neighbour's cycle runs only once you own a bar — it is seen from your own doorway (`_oppTick` in `_describeRoom` at your own bar, five phases of `OPP_CYCLE`/5 days on a day-derived clock, a new man and the cycle again; nothing else in the town has a window on it); (2) the drift is recoverable DURING her notice (`BAR_NOTICE_DAYS` to put the board back to list or go to salary — she says "for now") and one-way after it — a woman gone is gone, and her regulars drink across the road for `BAR_RAIL_DAYS`; (3) the rent caps at `BAR_RENT_CAP` ×1.6 — a good operator lives under it indefinitely; and it rises only on SUCCESS (`BAR_RENT_GOOD` 1.25 over an ordinary half-stood list-price night — the every-night man or a raised board in season, never the alternating operator: at 1.08 a year-long probe lost the bar to three rises and the trough, the exact unavoidable trap §What NOT to build forbids); (4) the lender is Nont (`_nontLoan`: ten percent on the day, a quarter of every night's take off the top, `NONT_LOAN_MAX` ฿50k) — he already holds the "cash with no favour in it" register and the folder on the Dane's table across the road is the same folder. The numbers: `BAR_MARKUPS` cheap ×0.90/1.08, list, up ×1.15/0.90, steep ×1.30/0.75 (take-per-customer / traffic — up nets +3.5% and costs the floor 10% of its money; steep nets less and costs 25%); `BAR_SALARY_NIGHT` ฿500; `BAR_FLOOR_FLOOR` 0.92 on a thirty-night traffic index that a full season (takings ≥ ×1.0) lifts by 6%, so UP is safe in the cool months and a woman a season in the shoulder and the wet; one notice per sixty days, the one you know best, told as a floor moment on a stood shift or by Bert two mornings later; `BAR_RAIL_SHARE` 7% per woman for 90 days. The quota-and-fine of §3b is folded into commission terms (a thin month IS the fine) rather than a third knob. |
| 2026-10-01 | Second essay read (the owner's KPIs): the floor is the asset, a leaving woman takes her regulars, and TERMS is the second lever beside prices — §3b. Names nobody; nothing of its prose taken. Still unbuilt, same go/no-go. |
| — | ~~OPEN: the four questions above~~ — answered and built, above. The intrusion layer is Bangkok's. |
