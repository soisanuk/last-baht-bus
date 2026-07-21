# The Last Baht Bus — Economy Review

**Reviewed:** 2026-07-20 · **Status:** ✅ Economy kept as-is. **Revisit after a few more trip reports.**

The question that prompted this: *is pricing realistic, and is ฿3,000/night actually reasonable?*
**Short answer: yes, as currently priced.** The one lever worth a future decision is the
all-in cost of a lady (see [§4](#4-the-one-open-lever-the-cost-of-a-lady)).

---

## 1. The income model (what flows in)

| Source | Amount | Cadence | Constant |
|---|---|---|---|
| **Daily ATM allowance** | **฿3,000** | once/day on hotel exit (vacation stage only); *unspent carries over* | `SAFE_CASH` |
| Sell bottles (Auntie Nok) | ฿5 each | Act 1 bootstrap only (~฿10–15) | `_doSellBottles` |
| Quiz-night prize | ฿500 (1st) / ฿200 | Thursdays, 20:00–22:00, one bar | `engine-play.js` |
| Bar games | stake ×2 (jackpot ×3), can lose | anytime | `C4_STAKE 20 · POOL_STAKE 50 · JP 10–100` |
| COMPLAIN / freelancer refunds | recover scam losses | situational | `engine-systems.js` |
| Expat lump | ฿20,000 once, **then no daily income** | on moving to Pattaya | `EXPAT_SAVINGS` |

**The ฿3,000 ATM *is* the economy** — everything else is marginal. Because money carries
across nights, ฿3,000/day is a **budget you can bank**, not a hard nightly cap: a thrifty
player saves 2–3 quiet nights to fund a go-go barfine night.

Net daily spending money = ฿3,000 − ฿400 Sabai rent (charged at wake) = **~฿2,600**.

---

## 2. Price sheet vs. typical 2020s Pattaya

| Item | Game | Typical real | Verdict |
|---|---|---|---|
| Baht-bus hop (`BUS_FARE`) | ฿15 | ฿10–30 (farang) | ✅ realistic |
| Motosai town / far (`MOTOSAI_TOWN/FAR`) | ฿50 / ฿100 | ฿50–100 | ✅ |
| Late "stranded tax" (`LATE_MOTO_MULT`) | ×1.6 after 02:00 | plausible gouge | ✅ |
| Big beer, bar (`BEER_PRICE`) | ฿80 | ฿70–140 | ✅ (low-mid) |
| Lady drink (`LADY_DRINK`) | ฿150 | ฿120–200 | ✅ spot-on |
| Water / toastie | ฿10–20 / ฿35 | same | ✅ |
| Street food (`FOOD_STALLS`) | ฿30–89 | ฿40–90 | ✅ |
| Hotels vac. (`_HOTELS` rate) | ฿400 / 700 / 1300 | ฿400–1500 budget→mid | ✅ |
| Hotels expat (`expatRate`) | ฿270 / 400 / 730 | monthly-discounted nightly | ✅ |
| Bell / bra / charger | ฿300 / 200 / 59 | ✅ | ✅ |
| Scams: tonic / book / fortune | ฿6,000 / 2,500 / 1,900 | intentionally punishing, avoidable | ✅ |
| Robbed (freelancer downside) | ฿800–3,000 | — | ✅ |
| **Barfine** (`BF_BEER/SOI6/GENTS/GOGO`) | 400 / 700 / 900 / 1000 | **bar-release fee only** | ⚠️ see §4 |

**Everything is realistic except the cost of a lady.** Minor note: Soi 6 base ฿700 reads a
touch high for its ST-cheap reputation, but works fine as an all-in figure.

---

## 3. Is ฿3,000/night reasonable? — modeled nights

All figures after the ฿400 Sabai rent (or bank the surplus for later):

| Night | Rough spend | Fit |
|---|---|---|
| Explorer / cultural (transport, food, a few beers, quiz) | ~฿450 | **saves ~฿2,000** |
| Full social bar night, no barfine (4 beers + 5 lady drinks + a bell + food) | ~฿2,000 | fits, ~฿1,000 spare |
| Beer-bar barfine night (favor-drinks + barfine + extras) | ~฿2,100 | fits |
| Go-go barfine night (drinks + ฿1,000–1,500 barfine) | ~฿2,500–3,000 | **at the ceiling** |
| Two barfines / a scam | ฿4,000–8,000 | busts it → debt/consequences *(intended)* |

**Verdict:** ฿3,000/day buys "one full social night **or** a single indulgence," rewards
frugality, and reinforces the hedonic-treadmill design (สนุก comes from presence/courtship,
not spend). It sits on the *modest* end of a real monger budget (฿3–6k/day) — but that's
papered over precisely *because* the lady's fee is under-modeled (§4). **The two errors
cancel, so ฿3,000 feels right in play.** Keep it.

---

## 4. The one open lever: the cost of a lady

The barfine models only the **bar-release fee** — the girl's own ST/LT fee (฿1,000–2,500 in
reality) is never charged. So a full night with a lady costs **฿400–1,500 in-game** vs.
**฿2,000–3,000 all-in** for real. This is the single realism gap, and it's *why* ฿3,000
stretches as far as it does.

**Deferred decision (revisit after more trip reports):** if we want realism, fold her fee in
— bump the LT multipliers, or add a "her price" line to the `_bfResolve` negotiation — so LT
reads ฿1,800–2,800. **But then ฿3,000 gets tight for a barfine night**, which may be exactly
the tension we want, or may argue for a ฿4,000 daily allowance instead. **The daily-allowance
and barfine knobs move together** — that's the real design question, not ฿3,000 in isolation.

### What to watch for in future trip reports
- Real all-in ST/LT figures (bar fine **+** her fee) by venue type → calibrates §4.
- Real daily monger budgets → calibrates `SAFE_CASH`.
- Any prices that have drifted (beer/lady-drink inflation, barfine creep, Soi 6 specifics).
- Whether scams/gouges match reported amounts.

*Per the trip-report protocol: mine figures, anonymise, discard the raw report.*
