# Source-material policy — public writing about the real town

Adopted 2026-10-01. Applies to every agent and every author who turns an essay, a forum post, a
trip report or a column about Pattaya into content for this game. It sits ON TOP of
`docs/guardrails.md` (what may not be drawn from the real town) and does not relax any of it.

## The one rule

**Take the research. Never take the expression.**

Copyright protects the way something is said, not the facts, ideas, social dynamics or patterns
it describes. So an essay may teach the game how the town works; it may not lend the game a
sentence, a character or a plot.

| From an essay | Use in the game |
|---|---|
| Facts about the town (prices, hours, schedules, geography) | yes — and verify where the game will assert them |
| Social and economic dynamics (who pays whom, what a gift means, how a family decides) | yes |
| Recurring patterns, archetypes, scams, kinds of relationship | yes |
| A situation or conflict, as an idea for a quest or a modal | yes, transformed (see below) |
| Its prose, in any length | **no** |
| Its dialogue, its distinctive phrases, its coinages | **no** |
| Its characters, named or recognisable by description | **no** |
| Its storyline — the sequence of beats — with the names changed | **no** |
| Its photographs or artwork | **no** |

## The transformation chain

Every essay-derived piece of content goes through all of these, in order:

1. **Extract** the pattern in one sentence of your own — the mechanic, the archetype, the pressure.
2. **Verify** anything the game will state as a fact about the real town; the game only asserts what
   it can render as a mechanic or what is common knowledge.
3. **Discard the expression.** Close the essay. Do not reopen it while writing.
4. **Redesign** the situation: different people, a different setting, different beats, and a
   choice for the player where the essay had a narrative.
5. **Write** original characters, original dialogue, original prose — in the game's own registers
   (`docs/prose-review-method.md`, the pool doctrine in CLAUDE.md).

The test at the end: could a reader of the essay recognise the game's scene as *that* essay? If
yes, it is not transformed enough, whatever the names say.

## Vignettes are fiction

Many of these essays are not reporting. They are constructed vignettes with named characters and
a shaped ending. A vignette is expression from its first line to its last, so the only unit that
may be taken from one is the **pattern** it illustrates — never its plot, never its people. The
"distinctive sequence" warning applies to most STORY material, not to the odd case.

## What still applies from the guardrails

Essays sometimes name real venues, real businesses and identifiable people. Even where copying
them would be lawful, `docs/guardrails.md` forbids it: the trait budget is one, there are no real
families, names or allegations, and an identifiable near-miss is worse than the real name. An
essay flagged `guardrail` in `docs/essay-ledger.md` may still be used for its pattern; nothing in
it may be carried over as written.

## Where the ledger lives, and what it may contain

`docs/essay-ledger.md` is the reading list and work queue: titles, links, a paraphrased thesis, a
category, a score and a paraphrased proposal. It never contains essay text. The essays
themselves are not stored in this repository.

## For authoring briefs

A brief that hands an agent an essay must point at this file, and must say which of these it
wants back: the pattern (always), a mechanic sketch, or an original scene. It must never ask
for "a version of" the essay.

## The audit

`tests/js/references.test.js` and the prose corpus tools check the game's claims against its
world; they do not check them against outside writing. A source-overlap scan (shared word runs
between the essay corpus and `tools/prose-corpus.mjs --json`) is run by hand when a batch of
essay-derived content lands. Zero shared runs of six or more words, once stock phrases are
excluded, is the bar.
