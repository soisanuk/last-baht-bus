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

### The secondary pointer: the QR at the LK Metro mouth

`security.txt` only works on a player who thinks to check `/.well-known/`. The
in-game pointer catches everyone else, and it is a two-step that mirrors the
puzzle's own shape:

1. `lk_entrance`'s description now carries **a sun-bleached film poster** on the
   corner wall. The description says no more than that — deliberately, because
   room prose feeds the scene-art generator through `docs/scene-manifest.json`,
   and "QR code" in an art prompt would produce exactly the unreadable garbage
   text the art rules forbid.
2. **`EXAMINE POSTER`** reveals it as *The Matrix*, twenty-odd years of sun, and
   the one thing on the wall that is newer than everything else: a QR sticker
   with no bar name and no price on it — *the only advertisement on this street
   that is not selling anything.*
3. **`EXAMINE QR`** prints a real, scannable QR encoding
   `https://soisanuk.github.io/last-baht-bus/.well-known/security.txt`, and
   underneath it, in biro, somebody has drawn a small rabbit.

The rabbit is the whole joke and the entire signal: a QR stuck on a Matrix
poster is *follow the white rabbit*, drawn rather than quoted.

**It is baked, never encoded at runtime.** The game has no build step and no
dependencies, so `tools/gen-qr.mjs` (dev-only, needs `npm i qrcode jsqr` in a
scratch dir) generates the block offline and **round-trips it** — it parses the
exact characters the game will print back into a bitmap and decodes *that*, so a
rendering bug cannot ship. Re-run it only if `_QR_TARGET` changes.

Rendering facts that are load-bearing rather than cosmetic, all in the `.t-qr`
class:

| Choice | Why |
|---|---|
| Black on **white**, always | The terminal is neon on black. A light-on-dark QR is inverted and many scanners refuse it outright. It also reads as a paper sticker, which is what it is. |
| **Half-block** glyphs (`█▀▄`) | One text row carries two module rows, so 33 modules + quiet zone fits **41 columns × 21 rows** — narrow enough for a phone. Full blocks would be twice as wide and twice as tall. |
| `line-height: 1` | Any leading opens a white stripe between every pair of module rows and the code stops scanning. |
| ECC level **L** | Read off a clean screen, not a greasy bar wall; every level up costs modules, which costs columns. |

Verified end to end: the rendered element was screenshotted at desktop and at
390px phone width, and **both screenshots decode back to the target URL**.
`tests/e2e/qr.spec.mjs` guards what the vm suite structurally cannot see — the
text surviving the DOM byte-for-byte, computed luminance (light field, dark
modules), `white-space: pre`, line-height equal to font-size, and no horizontal
overflow on a 390px viewport.

One knock-on fix: the go-go `POSTER` verb answered a bare `POSTER` with *"No
poster in here worth the name"*, which became a lie in a room that visibly has
one. It now falls through to `EXAMINE POSTER` so room `reads` answer first.

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
| 2026-08-13 | Secondary in-game pointer added: the QR sticker on the Matrix poster at the LK Metro mouth, baked (never runtime-encoded) and verified by decoding the rendered screenshot at desktop and phone width. |
| open | Canonical domain-root security.txt on the personal server. |
| open | Whether the probe detector reports anything. |
