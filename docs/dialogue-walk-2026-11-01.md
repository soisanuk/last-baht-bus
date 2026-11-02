# The dialogue walk of 2026-11-01

The whole node graph walked as a graph, then read character by character with a Fable ear. Fixes are in
`web/js/world.js` only; every one is pinned in `tests/js/dialogue1101.test.js`. Engine-side defects were not
touched — they are listed under *Handed to the code review*, and the wording of any prose fix there goes
through a Fable session (Mario, 2026-11-02: all prose updates from the code review need to go through Fable).

## The graph pass

`node tools/dialogue-walk.mjs` on the branch as found: **2,195 authored nodes across 226 characters, every one
read** — 1,865 proved by state (the walker built the state and the ask landed on the node), 330 by stubbing a
gate (the words proved, the path not). The 330 are the shapes the walker's small grid cannot build: the massage
shops' three-day hellos, the return-trip hellos (`G.vacation > 1` with a previous bond), the laundering
quests' thirty-day epilogues, the bar-sale and heist branches. None of them is a defect.

| class | count | result |
|---|---|---|
| dead (shadowed by an ungated earlier node on the same topic) | 0 | — |
| pre-empt (the engine answers the first alias before the character's list) | 2 | fixed: Jenny's "klaus singapore" and Pensri's "oil" moved to the end of their alias lists, so the printed label reaches the node; the engine still answers the tipper's name and the massage menu on their own |
| gate that can never be true | 1 | Nont's kid-path node tested `!_flag("kidRefused")`, a flag nothing sets; the refusal lives in `G.kidRefusedDay`. Gate now reads `_kidOpen()`, the helper the other five surfaces use |
| `req`/`notFlags` nothing sets | 0 | `world.test`'s `settable` list already gates this |
| `when` atoms on a dstate/mood/know value the engine never writes | 0 | — |
| hour or weekday the game did not compute | 4 | Bert's two opening nights put Gavin's entrance "at half eleven" (now "later"); Colin dated the pre-sale "in March" and the slip "14 March" (now "four months ago") |
| same-room topic collisions | 40 rooms | generic subjects (home, family, plan, money) are answered by every woman on a floor by design; a bare topic goes to the active partner (`G.convo`) and a bare name switches partner, so no wrong-speaker case was found |
| witness claims by someone who could not have seen it | 0 | all 35 `witness`-class claims are engine-side and already classed (`tools/witness-audit.mjs`) |
| promises (asktopic / askable / errand audits) | 0 unanswered | — |
| characters the walker's clock never seats | 3 | Ton is `_awayForSeason` ("harvest") in a November boot; Wilawan and Tul keep office hours. Their nodes were read by direct delivery only |

**The walker's lint** (`--lint --all`): 10 findings. The 2 pre-empts above; 2 `fact` rows that are benign on
reading (View's sisters married into two provinces and sent her a girl each; Ratsamee's partner is "a woman
from Udon", her own home is Loei); 6 `pronoun` rows, all benign — the three known lows included — because the
"he/his" in the narration is a man in her line (the lawyer, Danny, Bill), not her. The lint keys on the first
pronoun after her name; a sharper rule would skip a pronoun that follows another proper noun.

**`--shared --all`**: 430 six-word runs in more than one mouth. Nearly all are narrator constructions or
deliberate relays (Grace quoting Hong's till to Howard, Kyle quoting Bert, Orathai quoting Reginald, Tan
naming Wayne's version before giving his own). Eight were one character's sentence in another's mouth, and
those are fixed:

- Howard said three of Nont's sentences verbatim — the mule list ("they share a list now, and the list follows
  the person"), the risk-policy letter ("wishes you well… nobody to argue with") and Orathai's closing
  ("closes the companies properly, which nobody else bothers with") — and Wayne's "every bar company in this
  town is two or four". Howard now says each in his own register (the bank's two paragraphs and kind regards;
  "the banks pool their names"; "she files the death"; "two, two, four, two — never three").
- Grace read Nigel's aphorism off his own listing ("a man buys the chairs and the sign and the fact that people
  once came"). Grace now says it as a cashier would.
- Somo opened her family line with a `_H_FAMILY` pool sentence word for word, which a colleague can deal the same
  week.
- Terry, Mort and Angela shared the Queen Vic's "has never once asked me" tic; Terry's is reworded.
- Bert, Wayne and Tan all told you to pick "the one you'd hand your passport to". Wayne said it first and Tan
  names Wayne's version before his own; Bert now says "the one you'd leave the keys with".
- Colin used Mort's "squire" twice. Colin says "mate".

## The reader pass

Read in full, as the walker rendered them (every node in order, gates, text and repeat), with `prose-corpus
--about` run on the names a line leaned on: **Bert, Tan, Nont, Fast Eddy, Candy, Lek, Mort, Colin, Grace,
Orathai, Madam Oy, Doyle, Ping, Pong, Kesinee, Reginald, Nigel, Nira, Gavin, Wanida, Angela, Terry, Nid, Sasi,
Tar** — 25 characters, 711 nodes, the whole cast with fifteen nodes or more plus the Queen Vic, the Gilt Cage,
the Silk Rose and the Doghouse as rooms.

The three that needed the most work: **Bert**, **Howard** (through the shared-line report) and **Lek**.

- **Bert** (88 nodes). Voice holds — American, "bud", "math", "trash can", not a British word in him. Fixed: the
  uncomputed hour in both opening nights; the errand node's repeat was the pool brush-off ("we've done that
  one") where a player who forgot where to go needs the three names again — it now has a short naming Terry,
  Kesinee and Gavin; the league rules likewise repeat as the rules; "Not moved off this stool" from a man behind
  the bar; and "owns most of the paper on Soi 6", which contradicts the canon that the group's buying is one
  segment of a hundred fronts (now "more of the paper on Soi 6 than anybody — the inner end, mostly").
  Candy's "quiet piece" of the Stinky is a settled ruling (2026-09-07) and was left.
- **Lek** (33). Her salary node said nine thousand; `BAR_SALARY` is ten (Mario, 2026-10-26). The figure is in words
  because the constant is declared nine thousand lines below her node and cannot be read at load; the pin holds
  the words to the constant, so a change to `BAR_SALARY` fails the test on purpose. The alias "nine thousand"
  is now "ten thousand".
- **Tan** (65). Exempt from the voice axes and consistent with himself. The condo rent was typed in words; it now
  reads `CONDO_RENT` and `CONDO_DEPOSIT_MONTHS`. "Six years in Ohio, film school" sits beside the Stinky's owner
  in Ohio — six strings about Tan say Ohio, so it is canon, not drift.
- **Nont** (42). His lawyer took "ten"; Orathai's lawyer took "three thousand" in one node and "ten times" her
  thousand in another. Orathai now says ten thousand in both (the three thousand is the side letter and the
  closing, which she prices separately).
- **Colin** (18). The two calendar claims and the borrowed "squire".
- **Doyle** (17). "Twenty-six years" opened five nodes; the wallet node now opens on "Listen."
- Clean on reading, no change: Fast Eddy (the eight years, the forty cents, Nuan "hired first" all agree with
  the dossier), Candy (the eighteen/seventeen/thirty-eight timeline is inside the settled ruling), Mort
  (exempt; 1985 + 41 = 2026), Grace, Madam Oy (Roi Et, Hong Kong, three bars and forty girls all agree), Ping
  and Pong (twenty-six, the bet, the chair), Kesinee, Reginald, Nigel, Nira (twenty percent, three days,
  twelve thousand everywhere), Gavin, Wanida, Angela, Terry (2010 + 16), Sasi, Tar.

Reader observations that are not defects, for the record: Orathai's English is crisper than the three axes
usually allow a Thai professional (sons at university, a husband at the land office — plausible, and nobody
has ruled); Gavin's "by Friday" and Nigel's "Thursday, which in this town is a direction rather than a day" are
weekday idioms inside reported speech, left; Kesinee's "the ends inward" and the canon's "inner west" agree once
you read the Kitten Corner as the far end rather than the inner east.

## The place graph (Mario, 2026-11-02: "mapping out connected locations via the graph")

A second graph, built from the EXIT edges of `docs/world-graph.json`: every string that puts one location next
to another ("next door", "across the road", "opposite"), in a direction from another ("south of Soi 7", "Naklua
Road north-east"), or at a closing hour, checked against the walked adjacency (two hops), the survey bearings
(`ROOM_GEO`, ±75°) and `_closeTurn`. It does not repeat what exists: `references.test.js` already joins a venue
to its district and `tools/prose-claims.mjs` already checks "X works at Y"; this is the relation between two
places. Result over 20,991 corpus records: **0 findings in all three classes**, after two rounds of making the
check honest — a direction word bound to the place name it modifies (not the nearest one in sixty characters),
"south **of** X" read as X lying north, and "Soi 7" resolved per district (Jomtien's Soi 7 is not Pattaya's room).
It is now `tests/js/place-graph.test.js`, with a `--mutate`-style test that plants a false "next door" to prove
the check goes red. A fourth check, prose that promises a way out the room lacks ("a lane runs north"), was tried
and dropped: both hits were scenery ("the bay glows west"), and the class has no real member to ratchet.

The 23 adjacent pairs whose own prose names each other were read as pairs (both rooms' strings side by side,
the only way a contradiction between neighbours shows). Clean, with one distance claim checked against the
survey: the foot of Soi 6 has the Dolphin roundabout "a couple of kilometres north" — see the fix list.

## The quest graph (Mario, 2026-11-02: "quest related data in the graph might also need correlation")

The graph carries four quest edges — GIVEN_BY (giver), DONE_BY (the flag), AT (the journal's destination) and
DEPENDS — plus the SETS edges that say which dialogue node fires the flag. Read together, per quest: the giver's
room, the destination's room, the room of the character whose node closes it, and every place or person the
quest's own prose names. What already existed and was not repeated: `world.test` ("every quest is well-formed:
giver, deps, item, and at all resolve"), `journal.test`, `tools/dialogue-lifecycle.mjs` (a topic a quest opens
stays answerable after it closes) and the `prose-corpus --quests` pivot.

Over the 43 quests: 8 raw hits, 4 real. The real class is **a two-leg quest whose `at` is static** — the journal
keeps pointing at the middle stop after it is made. `at` may already be a function of state (`_qAt`; the
safe-cracker and the lake errand do it, "the where-clause follows the step", 2026-08-22), and four quests had not
been given one: Fifty-One kept sending you to Orathai after she had signed ("Where Orathai is tonight is a thing
to ask around for"), the photograph bet kept naming the Bali Hai pier after you had stood on it, the President's
Table kept naming the Orchid Room after you had been through the rope, and the Quiet Side still said ASK NOK after
Nok had told you. All four now turn home — Reginald, Bob, Doyle, Sumalee — the moment the step is done. The pin
is general: any quest whose flag is set by one character's node and whose static destination is somewhere else
fails, with the instruction to make `at` a function of the step.

The noise, for the record: prose naming a place or person outside the quest's three rooms (the Pattaya Leisure
offer names Kesinee and Kitten Corner because the errand is three informants; the President's Table names
Gavin because the door is decided at the Golden Dragon) is correct, and a destination's "never seated at night"
flag was my sandbox missing the quest state, not Barry's absence.

## Encounters, items and people against the graph (Mario, 2026-11-02)

The same correlation for the graph's other node kinds, over the 20,991 corpus records:

- **Encounters** (23): every region name and every person's name in an encounter's prose, against the rooms the
  encounter fires in. 0 findings. Gated in `tests/js/prose-graph.test.js`.
- **People** (419): the description's pronouns against `_pr(id)`. 0 findings. Gated.
- **Items** (45): no item both lies in a room and is handed over by a node (gated). A mention of an item within
  fifty characters of a place or a person, against the item's home and the hand that gives it, was run by hand:
  132 raw hits, 0 real. The class is semantic — an item's prose names its *destination* (the spare helmet "to Pim
  at the Starlight", the som tam "to Ploy at Rainbow") far more often than its home, "bottle" and "Buddha" are
  words before they are items, and "security" is a person — so it stays a reader's query, not a gate.
- **Quests** (43): the where-clause rule above, plus the giver/target/setter table in the walk's scratch notes.

## Handed to the code review (findings only; prose fixes go through Fable)

1. **A kin word in a topic alias steals the repeat.** Nid's "her papa" node (about her daughter's father, in
   Korat) answers correctly the first time; the second ask is taken by the engine's kin pool before `_deliver`
   reaches her authored short — "Papa is papa", then "My papa… I call every Sunday", a different man and a
   weekday. Any node whose alias carries mama/papa/sister/brother is exposed. Reproduce:
   `node tools/probe.mjs 'sandbox(); G.nightTurn=40; G.room=_npcRoom("nid"); run("talk to nid"); run("ask nid about her papa"); out.length=0; run("ask nid about her papa"); show()'`.
2. `_partnerYes` prints "It is done by Tuesday" — a weekday the game did not compute (`engine-systems.js`).
3. The walker's `pronoun` lint reports a pronoun that belongs to another proper noun in the sentence (six false
   positives, zero true ones this run); the `--shared` report would be more useful if it skipped the narrator
   constructions it already knows about ("says it the way…", "looks at you…").
4. The `preempt` lint keys on the first alias only; both pre-empts this run were first-alias-only and were fixed
   by reordering, which is the right fix, but a node whose *every* alias is pre-empted would look the same.

## Deferred, and why

- **201 characters were not read by a reader this round.** Eight reader subagents were launched on the full
  cast and all eight died on the usage limit before writing a line; the pass was then done sequentially by
  hand on the cast with fifteen nodes or more. The floor women with `FLOOR_OWN` sets (the Soi 6 segments, the
  Jade/Peach/Lollipop/Tamarind floors, the Darkside), the massage shops and the smaller patrons have been read
  only by the walker's lint, the shared-line report, the audits and the pre-existing dossier ledger. The method
  that works is in `docs/prose-review-method.md`: one subject list per reader, the rendered scripts from
  `dialogue-walk --script <dir>`, no access to the sources, findings only.
- The dossier sweep (`prose-corpus --dossiers`) was run per name as needed, not seeded: the ledger records who
  read what, and the author of these fixes is the wrong person to mark them read.
- The massage shops' six women share template lines ("you have my number after work", "no boom boom, boss rule")
  across shops; a reader who visits two shops in a week hears the echo. Left for a round that owns the shops.

## Open calls (Mario's)

0. The Pattaya Leisure offer and the President's Table are three-stop errands with one `at`. HINT names the
   closer (Bert, Doyle) and the desc names the informants; `atTargets` could carry all three so the journal's
   where-clause walks the informants too. A design call, not a defect.

1. Lek's salary is now the beer-bar base in words. If `BAR_SALARY` is retuned the pin fails by design; the
   alternative is the engine learning to read a constant in node text (a `text` function), which is a shape
   change.
2. Two PLG-run mamasans (Nee at the Lotus, Jinda at the Jade) both say "they have the paper, I run the room".
   Read as the company's phrasing it is a feature; read cold it is one line in two mouths. Left as is.
3. Orathai's register (above). A ruling either way is cheap; a rewrite is not.
