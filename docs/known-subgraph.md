# The known subgraph: a derived world graph as test substrate and as the player's map

*Design paper and public record, 2026-09-15. Written after the system shipped in this
repository (`tools/gen-world-graph.mjs`, `_frontier()`, `JOURNAL`, `tests/js/journal.test.js`,
commits `3072301e` … `7e533f8b`). Published deliberately: the ideas below are placed on the
public record on this date, with their prior art named, so that they stay usable by anyone.*

## 1. The problem it came from

A large generated interactive world — 243 rooms, 365 people, 2,875 lines of dialogue, 37
quests — was tested by code review, a randomised soak, five audits, and a running programme
of blind persona playtests. Twelve personas in one round still found ~200 defects. Reviewed
by class (`persona-findings-systemic.md`), nearly all of them had one shape: **a fact the
system already held, consulted in some places and not in others.** A relationship known at
its core and forgotten at its edges; a dialogue branch gated on a state that later closed;
a clock that a sentence asserted and the engine did not compute; a name learned from print
and treated as met.

The instruments the project had were each bounded by a list a human wrote, and every list
encoded the same mental model as the code. What was missing was a single derived picture of
what the system holds, that queries could be written against.

## 2. The two ideas

### 2.1 A derived graph, never an authored one

Generate a graph from the sources — rooms, people, dialogue nodes, quests, flags, items,
encounters, constants, and the code's own predicates — with typed edges (exits, location,
requires / forbids / sets a flag, given-by, done-by, depends-on, set-by-engine,
read-by-engine, consults). Hold it to a reproducibility test: the committed graph must equal
a fresh generation, or the build is red. Nothing is hand-maintained; a second source of
truth drifts inside a week, and this project had already learned that with a typedef and
three manifests.

Queries over it replace hand-written harvesters: orphaned flags, nodes whose gates can never
hold, rooms nothing leads to; a **lifecycle audit** that walks each quest's state trajectory
and reports a topic that answers at one stage and goes dark at a later one with no
successor; a **predicate registry** listing which functions must consult each relationship
predicate, asserted by source inspection, with the graph printing the unregistered
consumers as the work queue.

### 2.2 The known subgraph, and its frontier

The player's state already records what has been shown: rooms stood in, names printed,
people spoken to and which lines, venues named, fixtures examined. Filtering the world
graph by that state gives the **known subgraph**. Its **frontier** — every edge from a known
node to an unknown one, ranked by distance from where the player stands — is the answer to
"what should I do next" that needs no authoring: a name that printed and a face never met; a
way out of a room you stood in, never taken; a venue whose name you heard and never found;
a topic never asked of somebody met; an invitation not yet kept.

Two additions make it honest:

- **Provenance.** When a name first prints, record where and by whom (`namedBy[id] = {room,
  by, day}`), so the frontier can say "Candy mentioned her, at Candy Bar" instead of
  "somebody mentioned Bee".
- **The never-spoils law.** The frontier may name only what the transcript has printed — a
  known person, a visited room, a heard-of venue, a region, a direction — and never the far
  side of an edge. It is pinned by a test that walks the output looking for any proper noun
  the player has not been shown. The first implementation leaked the bar a stranger drinks
  at; the test caught it.

Two further rules from the project's doctrine: it **observes and never grades** (reading
your own map moves no meter), and it is **a projection, not state** (the journal keeps no
record of its own; two views — what's open, what's done — over one subgraph).

## 3. What is prior art, and what is not

Named honestly, because the value of this document is partly that it is dated.

- Keyword conversation gated on words heard: Ultima IV–VII, Morrowind's topic journal.
- A knowledge graph shown to the player with undiscovered neighbours marked: Outer Wilds'
  ship log ("there's more to explore here"); Return of the Obra Dinn's book.
- Knowledge as gating state: Fallen London / StoryNexus qualities; Emily Short's Threaded
  Conversation library (known facts, recommended quips).
- Adaptive hints keyed on state: Inform 7 hint extensions.
- The frontier of a searched graph, and "next best action" over a user's history, are old.
- Provenance graphs are a field of their own.

What the project believes is new is the **combination**: the graph is derived from the
source and reproducibility-gated rather than authored; the same graph is the substrate for
the test instruments and for the player-facing map; the frontier is a pure projection of
existing state under a machine-checked never-spoils law with provenance. Each piece is known;
the assembly, to the author's knowledge, is not. It is offered as a design, not a claim.

## 4. Where it travels

The two halves travel separately.

**The derived graph as test substrate** fits any system with gated content and state — a
dialogue tree, a workflow engine, a feature-flag system, an onboarding flow. The lifecycle
audit ("this branch answers at stage n and is dark at n+1 with no successor") and the
predicate registry ("this relationship exists and these consumers must consult it") transfer
verbatim; so does the rule that reach is derived from the system, never hand-listed, and
that a promise is judged by running it.

**The known subgraph** fits any setting where a person learns a structured world
incrementally and the system knows what they have been shown:

- *Learning and onboarding.* The learner's known subgraph is what they have read and done;
  the frontier is the nearest concept whose prerequisites have printed. Never-spoils becomes
  "never name a concept whose prerequisite the learner hasn't met".
- *Investigation.* Entities and who-mentioned-whom with provenance; the frontier is the lead
  not yet followed; the record is the case file. In incident response the nodes carry an
  epistemic status — named in an artifact, examined, confirmed, cleared — and the frontier
  is ranked by distance from confirmed compromise (see the companion note when written).
- *Documentation and support.* Suggest the next article whose terms the reader has met.
- *Relationship tooling.* The contact named in a meeting and never met is a frontier edge.

## 5. Status

Built and pinned in this repository on the date above. The first blind test of the
player-facing half (a cold first-timer told to lean on the notes) is in progress; its
findings will be appended to `persona-findings-systemic.md`.
