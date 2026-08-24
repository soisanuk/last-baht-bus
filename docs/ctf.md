# The hidden CTF

**SPOILERS.** This file is the answer key. It lives in the repo because a puzzle
nobody can maintain is a puzzle that breaks silently — but anyone who wants to
solve the thing should stop reading now.

Written 2026-08-13. Stage 1 shipped 2026-08-13; stage 2 shipped 2026-08-15 (game side — the DNS TXT is Mario's to set, see below).

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

## Platform note: this puzzle is WEB-ONLY, and that is structural

Raised 2026-08-24 against the possibility of an iPhone build. The chain does not
port, for reasons that are not fixable by effort:

- **Stage 1's front door is a URL.** `/.well-known/security.txt` is RFC 9116 — a
  file essentially only security people look for. An app has no domain and no
  well-known path, so the thread does not exist to pull.
- **The QR inverts.** `EXAMINE QR` prints a code designed to be scanned BY a
  phone pointed at a screen. On an iPhone the player IS the phone; you cannot
  scan your own display. The pointer that exists to catch players who don't check
  `/.well-known/` becomes a dead end precisely where it is most needed. (Rendering
  risk too: the half-block glyphs and `line-height: 1` are verified in headless
  Chromium, not WKWebView, which does its own font substitution — a substituted
  mono face could open the white stripe that stops it scanning, and no current
  test would see it.)
- **Stage 2 turns on `dig TXT`.** iOS does not have it. A security pro can find a
  lookup tool, so it is a barrier rather than a wall — but it is a barrier at the
  exact step meant to feel like *"this is what a security person checks."*
- **The probe gate would silently stop arming.** `_PROBE_RE` reads the TRUE raw
  input specifically to catch the quotes and braces that make a probe a probe;
  iOS smart punctuation turns `' OR 1=1--` into `’ OR 1=1--`. A WKWebView build
  needs `autocorrect="off" autocapitalize="off"` on the input regardless.
- **The founding constraint inverts.** "Visible ciphertext, earned key" exists
  because the whole game is public unminified source, so hiding a string would be
  a `grep`. In an `.ipa` the JS is less public but still trivially extractable —
  the elegance's reason is gone while the exposure isn't.

**The fix is free, and the design already paid for it.** This content is inert to
the game — nothing calls it, no quest gates on it, no playthrough touches it — so
an iOS build can drop the solving chain and keep the artefacts (the poster, Box
15, Eddy at the White Rabbit) as pure flavour at zero mechanical cost. The
CTF-independence firewall in `docs/rabbit-arc.md` is what makes that painless, and
is the best argument for having drawn it.

## Stage 2 — the wrong number (SHIPPED 2026-08-15)

**The chain:**

1. **The gate.** The player types an *obvious security probe* at the game prompt
   — `' OR 1=1--`, `<script>`, `../../../etc/passwd`, `${jndi:`, `%00`, `A`×80,
   `nmap`/`sqlmap`/`nikto`, `; ls`, `| sh`, `whoami`/`sudo`/`curl` at the start,
   `robots.txt`, `.git/`, `.env`, `wp-admin`… (`_PROBE_RE`, engine-systems.js).
   Nobody types those by accident, and the person it's for announces themselves
   in the first five minutes. **Read off the TRUE raw input**, before `_norm`
   strips the quotes and braces that make a probe a probe (that was the first
   bug). The parser then falls through to the ordinary *"That one didn't parse"*
   — **the cover IS the answer.** Arms `probeArmed` once per game.
2. **The wrong number.** 8–15 turns later (`_wrongNumberTick`, in `_tick` beside
   `_maybeIncomingText`; needs `act1Done` + battery), a text from an unknown
   `+66 6x ••• ••••`, in canon-accurate Thai-scam register from an **in-world
   brand** — `[SanukPay] Your parcel could not be delivered — customs fee ฿19
   unpaid… blacksite.org  Ref: WR-0x1E`. To everyone else it reads as flavour
   (the game already runs mama-sick asks and the tonic fleece). Never a real
   bank/carrier — a test asserts it.
3. **The domain is where the un-greppable half lives.** `blacksite.org` is
   Mario's. **The site itself redirects** (today: to the White Rabbit's Google
   Maps pin) — so a normal clicker sees a scam page that's been taken down, and
   a solver who follows the redirect gets a coordinate with no explanation. The
   real clue is the **DNS TXT record**, which is what a security pro checks and
   a normal player never will. `dig TXT blacksite.org`.
4. **The close.** The TXT hands back a phrase — **`KNOCK, KNOCK FARANG`** — said
   **at the White Rabbit** (and nowhere else — the wrong room gets *"the street,
   correctly, ignores you"*). Eddy stops wiping the glass: *"That number's been
   dead three years. The domain's been dead longer. And you walked in here off a
   TXT record."*
5. **Flag:** `sanuk{3d190498fc4a2399ed773457}` — **derived**, not stored: the first
   24 hex of `SHA-256("rabbit:" + normalised phrase)`. **Trophy:** `G.flags.ctfRabbit`,
   one more line in `WHO AM I`.

**How the phrase is protected in a fully-public source (the founding rule,
finally honoured for stage 2):** the engine holds only
`_RABBIT_KNOCK_SHA = SHA-256("knock knock farang")` (the phrase lowercased,
punctuation stripped, whitespace collapsed — `_knockNorm`), and every prompt
input is hashed and compared. **The phrase appears nowhere in the repo except
this answer-key doc and the tests.** Grepping the source yields a hex string;
the flag can't be printed without the phrase because it is computed from it.
`_sha256` is a ~40-line pure-JS FIPS 180-4 implementation (sync, dependency-
free, no browser APIs — the vm can run it; verified against the `abc` test
vector). FNV-1a was rejected: 32 bits is a lunch break to brute against a short
phrase. A 3-word phrase is still brute-forceable *in principle* — but so is
Box 15's 4-letter key; the doctrine has always been that **the challenge is the
discovery chain, not the maths**, and the hash closes the one shortcut that
actually mattered: `grep`.

This is how the White Rabbit is *meant* to be found: no quest points at it (the
Naklua pull is deliberately the Orchid intro), no map hint — the bar the town
never mentions is the reward for pulling the thread. And it's the front door to
the Rabbit heist arc (`docs/rabbit-arc.md`).

### What Mario sets (not in the repo — that's the point)

**DNS TXT on `blacksite.org`** — the phrase is Mario's: **`KNOCK, KNOCK FARANG`**.
Proposed record, one line:

```
sanuk-ctf: The number was dead. The rabbit was not. Find the bar the map never mentions, north of the Dolphin, and knock: KNOCK, KNOCK FARANG
```

Wording around it is Mario's call; the game only cares that the solver arrives
at the White Rabbit and types the phrase (case-insensitive, punctuation and
spacing forgiven — `_knockNorm`). *"North of the Dolphin"* is enough of a
pointer without naming the bar outright — the redirect's Maps pin is the belt to
that brace. **If the phrase ever changes, recompute `_RABBIT_KNOCK_SHA`** with the
game's own function (`node tools/probe.mjs 'console.log(_sha256(_knockNorm("…")))'`)
and update the flag in this doc + the tests.

Keep the redirect: a scam link that lands somewhere real-but-baffling is better
cover than a 404, and the pin is a second path to the same room.

### Difficulty and shape

Longer than stage 1 by design — a player has to (a) think to probe a text
adventure, (b) recognise the scam text as *not* flavour, (c) know to `dig` a
domain rather than click it, (d) walk to Naklua and find a bar no quest points
at. Each step is the security-pro reflex, none is the general player's.

### The tests defend (engine.test.js, "stage 2:" block)

The gate's **precision both ways** — a probe list that must arm, an
ordinary-play list that must NOT (a false positive would ambush a normal player;
that list includes `cat`, `ls`, `select a girl`, `union jack`, `she said sh`);
the cover holds (brush-off, no leak); the text comes **later**, names the
domain, carries the in-world brand and no real one; the phrase pays only at
`white_rabbit`, burns no turn, moves no money/happy; the trophy prints;
survives `CHEATS_ENABLED = false`; no autocomplete leak.

**Same three rule-breaks as Box 15, same reasons:** fixed strings (solvers
compare notes), on no surface, not gated by `CHEATS_ENABLED`.

### The probe detector reports nothing — decided, not deferred (2026-08-17)

Ruled out on purpose. It would be the single most interesting row in
`docs/metrics-design.md` and that is exactly why it is the wrong one to build:
it fingerprints a *person's profession* from their keystrokes, silently, on the
first night — the most surveillance-shaped datum the game could collect, in a
project whose metrics ethic rejected GA4 for putting a cookie banner in front of
the taxi intro. The gate's contract is fair as it stands: *your probe, my scam
SMS* — the player announces themselves and the game answers **in fiction**. A
beacon would change that trade without telling them, and the person it fires on
is precisely the person who will read the source afterwards and find it. So the
detector's only output is the wrong-number text. If first-party metrics ever
exist, this row goes in last or never (the note's own ordering).

### Input safety (audited 2026-08-17 — why the gate is pure observation)

The prompt is **structurally inert**: no `eval`/`Function`/string-timer/
`document.write`, no `location`/`window.open`/`fetch` from input anywhere in
game code; the parser is regex + string compares over a closed verb table, so
there is no interpreter for input to escape into. The one `innerHTML` sink that
matters (`term.js` `print` → `decorate`) runs `_escapeHtml` on the **whole**
string before any `<b class="kw">` wrapping; the player's own line is echoed via
`textContent`; the one place player text *persists and re-renders* (the dog's
name) is additionally stripped, capped at 24 chars, and still flows through the
escape. Verified in a real headless DOM against `<script>`, `<img onerror>`,
`<svg onload>`, and the authored `{{…}}` hatch: nothing executes, no element is
created, zero dialogs, zero page errors. There is nothing behind the prompt to
reach — static files, no server, no cookies of value; a tampered `lbb_save` can
only break its owner's game. Two seams to re-audit if a server ever exists: the
`{{…}}` convention (safe today because it is stripped *after* escaping — it must
never become a trusted-HTML path), and the vendored wordcard/suggest sinks that
`innerHTML` template strings from trainer-authored data.

**CSS-injection surface (checked 2026-08-17 against PortSwigger's "CSS — the
bomb inside your inbox").** That attack class needs the victim to render
HTML/CSS it did not author (webmail rendering a sender's email); LBB never does.
The only interpolation into a `style=` context (the scene HUD meters) uses a
fixed colour palette and a `0–100`-clamped numeric percent — no data, no input;
the wordcard `innerHTML` templates run every value through `_wcEsc` over
game-authored Thai vocab; `data-v` holds only matched game-entity names from
already-escaped text; there is no fetch/WebSocket/EventSource, so nothing remote
renders. So attribute-selector token exfiltration, `:has()`/`:checked`
keyloggers, and CSSOM-mutation sandbox escapes all require an ingress we don't
have. **Where it WILL apply is the hosted/shared-world phase**: the moment a
second player's text (name, chat, a note left in a room) is rendered into your
DOM, you are a webmail client rendering a stranger's content, and escaping is
necessary but NOT sufficient — CSS attribute selectors leak secrets with zero
JS. The doctrine there must stay **plain-text only, no player-authored
HTML/CSS ever**; if rich text is ever wanted, it goes in a **sandboxed iframe**
(the article's own top mitigation), never behind a bigger allowlist.

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | Stage 1 shipped: security.txt tell → Box 15 Vigenère → typed phrase → flag + `WHO AM I` trophy. Difficulty target one hour, met by making discovery the work and the crypto trivial. |
| 2026-08-13 | Answer phrase ungated by `CHEATS_ENABLED`, because that switch ships `false`. |
| 2026-08-13 | Stage 2 (wrong number) deferred, gated on security probes typed at the prompt. |
| 2026-08-13 | Secondary in-game pointer added: the QR sticker on the Matrix poster at the LK Metro mouth, baked (never runtime-encoded) and verified by decoding the rendered screenshot at desktop and phone width. |
| open | Canonical domain-root security.txt on the personal server. |
| 2026-08-15 | Stage 2 shipped (game side): probe gate on true raw input → 8–15-turn SanukPay scam text naming blacksite.org → DNS TXT (Mario's) → phrase at the White Rabbit → second flag + trophy. TXT-only for now; the site keeps its Maps-pin redirect as cover and a second path. |
| 2026-08-17 | Probe detector reports NOTHING — decided. Its only output is the in-fiction text; a beacon would be the most surveillance-shaped row in the game and break the fair trade the gate makes. Input path audited inert (see above). |
