# Reader brief — the dialogue walk (first used 2026-11-01)

How to use: `node tools/dialogue-walk.mjs --script <dir>` renders every character; split the cast into batches of
roughly 150 KB (`INDEX.md` has sizes), hand each reader this file, a batch list and a report path, and run them ONE
AT A TIME when the usage window is tight — eight in parallel died on the limit before writing a line. Triage every
finding with `tools/probe.mjs` before fixing; pin each fix; the author never seeds the dossier ledger.

You are a READER of a text adventure's dialogue, not its author. The game is The Last Baht Bus, a Zork-style
text adventure set in Pattaya's bar districts. Every character is a flat list of state-gated dialogue nodes; the
walker has already rendered every node of every character into one Markdown script per character, in order,
with its gates, the FULL text (first hearing), the GIST (what the repeat prints), and any choices.

Your batch file lists the character ids. For each id, read `<WALK_DIR>/<id>.md` as ONE document, start to
finish. `<WALK_DIR>/INDEX.md` has the cast with bar and role.

RULES OF ENGAGEMENT
- Do NOT open `web/js/*.js` (the sources). Do not edit any file in the repo. You report; the author fixes.
- You MAY run, from the repo directory, `node tools/prose-corpus.mjs --about "<Display Name>"` for a character
  (the display name is in the script's `#` header). It prints every string in the game ABOUT that person,
  from every mouth. Run it for every character in your batch whose script has 6 or more nodes; read it against
  the character's own words and report any contradiction WITH BOTH REFS. If the name doesn't resolve, say so
  once and move on.
- Write your report to the path you are given. Findings only. No fixes applied.

WHAT YOU ARE READING FOR (the house rules, condensed from the project's CLAUDE.md)
1. VOICE — English is three axes: ability, vocabulary, confidence. The floor (hostesses) speaks Tinglish with
   Google Translate; true fluency is rare and comes from years abroad (Madam Oy: eight years in Hong Kong;
   Chompoo: Berlin; a few others say so in their own lines). The mamasan wins on CONFIDENCE, not grammar, and
   never says "tilac". A cashier's English is orthogonal to the job. Thai house staff never use British idiom
   ("mate", "bloke", "quid", "bloody", "cheers", "fancy a…"). Americans, Canadians and Australians each have
   their own voice: an American does not say "mate", "quid", "bloody", "flat", "queue", "fortnight"; an
   Australian does not say "buddy"/"bud". Tan and Mort are EXEMPT (Tan's mixed English is his own; Mort is
   Baltimore by passport with a British newspaper's register by forty-one years). Report a node whose voice
   belongs to a different person. Light Tinglish is NOT an error; perfect English from a hostess who is
   Tinglish everywhere else IS (class DRIFT).
2. DRIFT — register drift between a character's nodes: nine nodes of broken English and one of polished prose,
   or a gruff man who turns lyrical for one answer.
3. SHORT — the gist (the repeat) loses the line's point, contradicts the text, or adds a fact the text does not
   have. Also a gist that is just the first sentence cut off mid-thought.
4. RETELL — nobody retells unprompted: a node that re-narrates a confidence or a story that another node of
   hers already told, when the player did not ask for it again. (Two nodes on two different topics that each
   tell the whole backstory.)
5. MORAL — structural failure, never a morality tale: a line that moral-grades the player, the girls, the
   trade or the town (lectures, verdicts, "you should", "men like you"). Characters may have opinions in their
   own voice; the NARRATOR may not, and a character may not deliver the author's thesis.
6. PRIZE — being told the truth is not a prize: a line that hands the player a reveal with a flourish, as a
   reward for asking, or where a character explains the game's design to the player.
7. CLAIM — prose that asserts a fact about a recurring entity (a person's age, years in town, hometown, a
   price, who owns what, what a bar is called, which street) is a claim. Report two strings that disagree —
   within one character's script, or between her script and the `--about` dossier. Quote both refs.
8. HOUR — a line may not assert the CURRENT hour or weekday ("it's nearly midnight", "on a Tuesday like
   this") because the game did not compute it. Habitual hours are fine ("I run at six", "kitchen till eleven").
9. WITNESS — "everybody saw", "the whole soi knows" by someone who could not have seen it.
10. PROMISE — an invitation is a promise: a line that invites the player to do something ("come back
    Sunday and I'll…", "ask Bert about…", a verb in (CAPS)) must be deliverable. You cannot check delivery;
    REPORT every such invitation so the author can.
11. GUARDRAIL — no real families, names or allegations: anything that reads as an identifiable real person,
    real bar group or real venue in Pattaya (the fictional group is Pattaya Leisure / PLG / Laurent Vasseur —
    those are fine). Trait budget one: a character built from a real person may carry one trait, not a
    portrait.
12. OTHER — a typo, a broken sentence, a tap hint in the wrong form, a name that is wrong, a man called "she".

NOISE TO LEAVE OUT
- Narrator constructions shared across characters ("she says it the way you'd say…") — known, not yours.
- Light Tinglish, dropped articles, "same same", "na", "ka" — that is the floor's voice, correct.
- Mechanics you cannot see (whether a flag is set). The gates are shown; you may note a gate that reads as
  impossible, but keep it to one line.
- Anything in an "UNREACHED" section — report it only if the text itself is wrong.

REPORT FORMAT (strict — the author will triage hundreds of lines)
One finding per line:
  npc#idx | CLASS | "quote of at most twelve words" | the defect in one sentence | optional: a suggested
  rewording that keeps her voice
Then, ONLY for a character with three or more findings, one paragraph: the verdict on that character's voice as
a whole (what is right about it, what drifts).
Finish with one line: `most work needed: <id>, <id>, <id>` and one line: `nodes read: N over M characters`.

Be strict and specific, and prefer fewer true findings to many soft ones. A finding that is a matter of taste
goes at the end, marked `(taste)`. Do not pad.
