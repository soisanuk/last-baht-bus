# The hidden CTF

**SPOILERS.** This file is the answer key. It lives in the repo because a puzzle
nobody can maintain is a puzzle that breaks silently — but anyone who wants to
solve the thing should stop reading now.

Written 2026-08-13. Stage 1 shipped; stage 2 designed, not built.

## Why it exists

Mario is a security professional and likes CTFs. The brief: *hide something that
looks out of place and will make another security pro start pulling a thread.*

## The constraint that shapes everything

**The entire game is public, unminified, unbuilt source.** No compilation step, a
public repo, classic script tags. Anyone can read every line.

So "a secret string hidden in the JS" is not a challenge, it is a `grep`. The
design rule is **visible ciphertext, earned key**: the encoded thing sits in plain
sight, and what decodes it is either in-world knowledge or lives somewhere the
source cannot reveal.

A corollary worth stating: `CHEATS_ENABLED` is currently `true` on the live site,
so `twoweekmillionaire` is already findable by anyone who opens devtools. That is
fine — it is an easter egg, not a puzzle — but it is the reason the real puzzle
cannot depend on source obscurity.

## Stage 1 — Box 15 (SHIPPED)

**The chain:**

1. **`/.well-known/security.txt`** — RFC 9116, a file essentially only security
   people ever look for. It is a genuine, useful security.txt (real contact, real
   scope statement), and at the bottom it points at the column and names the flag
   format. This is the tell.
2. **`READ COLUMN`** in game — the Nite Owl's classifieds carry **Box 15**, a
   standing personal ad ending in eight groups of ciphertext.
3. **The cipher** is Vigenère. The ad supplies the key as a riddle: *"I have
   signed off with the same four letters in every issue I have ever written and
   not one of you has asked me why."* Every column ends `BUT, I DON'T GIVE A
   HOOT!` → key **`HOOT`**.
4. **Plaintext:** `TOTHESOLVERTELLTHEOWLYOUCOUNTEDTHEHOOTS`
5. **The answer is a command.** Type `I COUNTED THE HOOTS` at the prompt (also
   accepted without the "I", and with trailing punctuation).
6. **Flag:** `sanuk{the_owl_gave_a_hoot_after_all}` — his catchphrase is that he
   doesn't give one. Answering the ad in front of Mort himself, at the Queen Vic,
   gets a different and better scene than answering it anywhere else.
7. **Trophy:** `G.flags.owlBox15`, surfaced as one line in `WHO AM I` — the only
   line in the game that cannot be earned from inside the game.

**Target difficulty: about an hour.** The crypto is deliberately weak — any online
Vigenère solver cracks a 4-letter key instantly. The *challenge* is the discovery
chain, not the maths, and that is the honest shape for this length.

### Three deliberate rule-breaks, and why

| Rule | Break | Reason |
|---|---|---|
| Repeatable prose is pooled (`_pickVary`) | Box 15 is a **fixed string** | Solvers compare notes. A ciphertext that varied by day or seed would be unsharable and unverifiable. A paid classified running unchanged for years is also what real ones do, so the fiction covers it. |
| Every option lives on three surfaces | The answer phrase is on **none** | A secret that autocompletes is not a secret. Same treatment as `twoweekmillionaire` and the `TOGGLE_V0` switches. |
| Hidden codes sit behind `CHEATS_ENABLED` | This one **does not** | That switch grants advantages and is meant to ship `false`. Gating here would retire the puzzle on release day. The Box 15 answer grants no money, no สนุก, no turn — a trophy only, which is what makes it safe to leave ungated. |

### What the tests defend

The content is **inert to the game** — nothing calls it, no quest gates on it, no
playthrough touches it — so ordinary coverage would never notice it rotting. A
well-meaning tidy-up could regenerate the gibberish, rename the phrase, or pool
the ad, and only strangers would ever find out.

`tests/js/engine.test.js` therefore asserts: the ciphertext decodes to the exact
plaintext (using its own Vigenère, not a game helper — otherwise it only proves
self-consistency); the key is still printed in the column it unlocks; the ad is
byte-identical across days and vacations; the decoded phrase is still accepted;
it costs no turn and moves no money; **it still works with `CHEATS_ENABLED =
false`**; and no surface leaks it. `tests/js/decorate.test.js` asserts the
ciphertext renders verbatim with zero tappable words and no `{{…}}` leakage —
a solver transcribes that string by hand, so markup in it would make the puzzle
unsolvable for whoever copied it.

### Maintenance

- **`Expires:` in security.txt is 2027-08-01** and must be pushed forward before
  then; a stale one makes the file technically invalid. Not tested, because a
  test that fails on a date would break a deploy at random.
- **`Contact:`** is the repo's issue tracker, deliberately, so a personal email
  isn't published into a public repo. Swap it for a real address or a role
  mailbox if you'd rather.
- **Canonical location caveat:** RFC 9116 wants security.txt at the *domain*
  root. This is a GitHub **project** page, so ours is served at
  `/last-baht-bus/.well-known/security.txt` and the domain root belongs to a
  different repo. Anyone poking *this game* will find it; a scanner sweeping the
  domain will not. The fix, when wanted, is a copy at the root of the personal
  web server.

## Stage 2 — the wrong number (DESIGNED, NOT BUILT)

**The gate is the good part:** it arms when the player types an *obvious security
probe* at the game prompt — `' OR 1=1--`, `<script>alert(1)</script>`,
`../../../etc/passwd`, `${jndi:ldap://…}`, `%00`, a long `A`×500. Nobody types
those by accident. A normal player never sees this content exist; the person it
is for announces themselves in the first five minutes.

The parser currently answers those with the ordinary "I didn't understand that",
which is the correct cover. On a hit, arm a delayed text from an unknown number —
precedented machinery, since the daily joke drip already texts from one.

**Content rules, non-negotiable:**

- **In-world brand only.** Never an imitation of a real bank, carrier, or service.
  Same doctrine as White Dish: structural pattern, no real names.
- The link resolves to **Mario's own domain**, which is where the un-greppable
  part of the chain lives (a static path and DNS TXT are both available).
- The payload is fiction end to end. A Thai scam SMS is canon-accurate — the game
  already runs mama-sick asks, the tonic fleece, and barfine scams — so it reads
  as flavour to everyone else.

**Open:** whether stage 2 ends in a second flag or hands back something in-game;
and whether the probe-detector logs (it would be the single most interesting row
in the metrics design note, and the most obviously personal — see
`docs/metrics-design.md`).

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | Stage 1 shipped: security.txt tell → Box 15 Vigenère → typed phrase → flag + `WHO AM I` trophy. Difficulty target one hour, met by making discovery the work and the crypto trivial. |
| 2026-08-13 | Answer phrase ungated by `CHEATS_ENABLED`, because that switch ships `false`. |
| 2026-08-13 | Stage 2 (wrong number) deferred, gated on security probes typed at the prompt. |
| open | Canonical domain-root security.txt on the personal server. |
| open | Whether the probe detector reports anything. |
