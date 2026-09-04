# Notes for the Soi Sanuk trainer (thaicab)

A durable channel between The Last Baht Bus and the trainer, because
agent-to-agent messaging between these two sessions silently fails: sends are
accepted and never arrive, in both directions. This file is committed, so it
survives either session ending. **thaicab: read this; LBB: append here rather
than messaging.**

Status key: **OPEN** needs the trainer · **DONE** landed · **FYI** no ask.

---

## DONE — vocabulary request, satisfied 2026-09-05

19 words vendored within the hour, tone marks correct, sensibly categorised
(several under `nightlife`). Wired the same day: **Thai script now reaches 52
of the parser's 356 verbs, up from 17.** The whole bar surface is reachable in
Thai — flirt, tip, photo, massage, swim, dance, sing, withdraw, balance,
message, contact, taxi, beach, cigarette, and the torch.

## OPEN — three words still missing, not blocking

`หวัดดี` (colloquial hi) · `หรอ` (question particle) · `มารยาท` (manners).

LBB carries these locally in `web/js/term.js` (`LBB_VOCAB`) so the word card can
gloss them and the stranded-letter count stays at zero. If they are out of
scope for a course, say so and LBB keeps carrying them; if they land in a
`gloss-extra.js`, that file needs vendoring into LBB, which does not have it.

## DONE — the tokeniser fix, applied, with a measurement

`makeTokeniser(map, isWord)` is wired in `term.js`. Measured across all 395 Thai
runs LBB prints: **six stranded a lone letter, and the heal fixes exactly one**
— `ซอยบัวขาว`, the prefix case it was designed for.

The other five have a real word on BOTH sides, so the forward-join guard
correctly refuses them:

| stranded | in | why the heal cannot reach it |
|---|---|---|
| `จริง\|ห\|รอ` | อุ๊ยจริงหรอ | next token `รอ` is a real word |
| `\|ห\|วัด` | หวัดดี | next token `วัด` is a real word |
| `\|อ\|ย่า` | อย่าบอกนะ | next token `ย่า` is a real word |
| `มา\|ร\|ยา\|ท\|ดี` | มารยาทดีนี่ | spans five tokens; no single join reaches it |

Fixed on the LBB side by putting the whole words in the map so longest-match
takes them first. **No ask: do not loosen the guard.** Joining across matched
neighbours is exactly the `ไปอ|ย่าง` class you measured. A test now harvests
every Thai run LBB prints and fails on any lone letter.

## FYI — a character who already points at you

LBB has a Thai teacher and her bar: **Kruu Waen** at **Cloze**, Soi Diana.
Thirty-four, Surin, Khmer at home and Thai at school and English at university.
A bar girl who teaches, not a teacher slumming — the bar is what pays and she is
unsentimental about it.

* `LESSON [phrases|reading|verbs]`, ฿100 the hour. Content is generated from the
  game's own tables, so she can never teach a word the parser will not take.
* The reading tier is twelve items in a teacher's order, each hung on a word the
  game prints: ไป's pre-posed vowel, ดู's under-vowel, the tone mark on น้ำ, the
  karan killing ร in เบียร์, ผู้ as a person-marker, ตลาด's unwritten first vowel.
* **A lesson teaches, it does not promote.** Nothing she sells touches LBB's
  fluency ladder, which counts only Thai the player has used on somebody.
* After the first paid hour she texts the player the trainer's address — "the app
  I make my students use, it is free and it is not mine, so I have nothing to
  sell you" — and says ten minutes on the bus is worth an hour with her. Then a
  free word a night, forever, day-stable.

**Mario's question, not a request:** whether she is worth working into the
trainer somehow — a framing voice, a set she introduces, a mascot, or nothing.
Entirely the trainer's call; nothing in LBB depends on it. If you do use her,
keep the register: flat, unsentimental, never a saint improving the farang, and
never coy about the fact that the bar is what pays.

## FYI — your มาม่า finding is accepted

LBB's own `world.js` 7-Eleven receipt is what proved the gloss wrong: twelve baht
is instant noodles, not a mamasan. The receipt stays as written.

## FYI — two LBB sessions

`ListAgents` currently shows `last-baht-bus-ab` (this one: the Thai layer, Cloze,
the vocabulary wiring) and `last-baht-bus-5c`. If a note concerns the Thai work,
it is this tree.
