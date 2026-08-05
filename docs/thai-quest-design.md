# The Thai-Ability Bonus Quest — Design Note

A bonus quest that rewards *actual Thai language ability*, designed against the
obvious cheat: Google Translate on the phone in the player's other hand. Written
2026-08; not yet scheduled — pairs naturally with character-creation Phase B
(see placement, bottom). The core finding: **input forensics can't carry this;
the task design has to.** And the canon already contains the right answer.

## Threat model (honest)

| Cheat path | Beaten by typed-vs-pasted detection? | Real counter |
|---|---|---|
| Copy-paste into the input | yes (`insertFromPaste`) | cheap outer layer, keep it |
| Phone translate → hand-type the Thai | **no** — it arrives as honest keystrokes | soft time pressure; production checks matter less than comprehension checks |
| Google Lens / camera-translate on any *displayed* Thai | **no** — instant, no typing | **audio-only beats** (TTS, no script printed) |
| Live speech-translate on the TTS audio | mostly — clunky, slow, error-prone | acceptable friction; combined with the conversation moving on |

Two consequences drive everything below: **audio is the strong channel** (the
game already ships th-TH TTS), and **comprehension-under-flow beats production**
— reacting correctly to what she *said* is much harder to outsource than
producing a phrase.

## The design key: the phone is diegetic, never banned

The canon already contains the answer: the filler girls themselves run Google
Translate on their phones the moment talk gets past small, and a farang holding
his phone up to a bar girl is the most recognizable gesture on the soi. So —
**no arms race.** Detected phone-assistance (a paste, a suspiciously instant
answer after a long stall) is not rejected; it is *narrated*: you showed her
the phone. She reads it, smiles, answers — and the quest takes the **lesser
path**: reduced reward, a fond-but-knowing outcome. Genuine Thai gets the
different smile — the thing money can't buy, which is precisely this game's
recurring theme. Cheating isn't blocked; it's *seen*, exactly as it would be at
the bar. No hard fails, no accusations, and both paths are canon.

This also future-proofs it: any cheat we can't detect simply lands on the
honest path, and all it cheats is the player's own สนุก — single-player, no
server, no leaderboard stake (if the share-card ever grows a competitive edge,
integrity comes from seed-replay verification, never from input forensics).

## Quest shape (every seam already exists)

1. **Draw only from Thai the player has seen.** `G.thaiSeen` already journals
   every Thai run `_say` prints (deduped, serialized) — the quest's material
   comes from there, so it is fair by construction. And the trainer reads the
   same journal for "words from the bus" practice: **play → see → practice →
   pass** closes the two-product loop. The quest hint can point at the trainer
   explicitly — the one place cross-promotion is also game design.
2. **The listening beat (anchor):** she speaks — TTS audio only, *no script
   printed*. Lens-proof by construction. The response is an **action or
   choice**, not a translation ("เอาเผ็ดไหม?" → what you do next answers it).
   Needs a frontend nicety: a replay affordance (she'll say it again once —
   "จริงๆ นะ" — then the moment passes tonight).
3. **The reading beat:** Thai-numeral prices/amounts — the house precedent is
   already law (*Thai numerals are never tap-decorated; the safe PIN stays a
   puzzle*). Quest-critical Thai script prints undecorated the same way (the
   `{{…}}` suppression already exists), or the word-card would hand the answer
   over.
4. **The production beat:** `SAY <phrase> [TO <person>]` (the verb exists),
   in context. Here the input detection earns its keep: IME composition
   (`insertCompositionText`) = typed Thai; paste = the diegetic phone path.
   Typing cadence is a *soft* signal at most — slow careful typing is what
   learners do; never gate on it.
5. **Soft time pressure, always fiction-framed:** a translate round-trip costs
   30+ seconds; the conversation moves on ("the moment passes — she's laughing
   at something down the bar"). Retry another night via the normal day cycle.
   **Never a hard fail** — the do-or-die slot in this game is Act One's and
   stays unique.
6. **Reward shape:** สนุก through `_addHappy` (non-jading — language is
   presence, not conquest), possibly bond with the quest's NPC, and the full
   path could gate one small unique thing (a phrase she teaches back, a
   nickname, a standing greeting in Thai) that the phone path never yields.

## Architecture

- **One deliberate seam:** the engine must learn how SAY's input arrived — an
  optional metadata argument on `doCommand(cmd, meta)` where term.js passes
  `{ input: "typed" | "pasted" | "tap" }` and every headless caller (vm tests,
  soak, probe, a future 2D frontend) omits it → neutral default, byte-identical
  behavior. The engine treats it as *input* metadata, not presentation — the
  frontend-agnostic rule survives. Absent meta must never punish: headless =
  honest path.
- **Frontend collection (term.js):** the source tag attaches in `submit()` —
  chips/wheel/hotspots already set input programmatically (they're `"tap"` for
  free); `paste`/`input`-event listeners classify the rest. ~20 lines.
- **The quest itself is data + one resolver family** — QUESTS schema per
  doctrine (quests observe flags), with the beats as dialogue/encounter nodes
  setting flags. No new subsystem; the beats reuse `_deliver`, `pendingEnc`,
  and `_engineSpeak`.
- **Soak/tests:** the soak plays neutral-meta and must be able to complete or
  skip the quest without Thai (the phone path guarantees completability); the
  promise lint covers any new hints; an i18n note — the quest's *Thai* is the
  content, so German mode translates only the English scaffolding around it.

## What NOT to build

Keystroke biometrics; hard timers; any "cheating detected" messaging (the
phone path is legitimate, lesser, and warmly written); camera detection
(impossible); server-side verification (no server); decorating quest-critical
Thai (the whole point is that the player reads it themselves).

## Placement

Pairs with **character-creation Phase B**: Tan is the natural giver (the
fixer who switched to your language in the intro is exactly the character to
notice you learning theirs), or the quest rides a bonded regular (bond tier 2+
— she teaches, you learn, the bond pays). After the share-card in priority;
before bar-owning. The trainer tie-in makes it the one feature that grows both
products at once.
