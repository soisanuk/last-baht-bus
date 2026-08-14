# Voice narration — a design note (not built)

**The motivation, stated plainly:** the audience for this game skews *older* — it's a
Pattaya nightlife sim, and the real players are the same demographic as the punters in
it: men in their 50s–70s, often reading on a **phone**. The game's defining feature is
its prose — dense, literary, long — and that is exactly the thing that is hard to read as
a wall of small text on a phone with older eyes. So "voice narration" here is not an
accessibility checkbox; it is about the core audience being able to *take in* the writing
without straining to read all of it. Captured 2026-08-14; nothing built.

## Where it lives (the easy part)

Presentation only — off the `print(text, cls)` callback in `term.js` / `main.js`, **never
the engine.** The seam already exists (Thai TTS in `tts.js` and the music in `audio.js`
attach there), and `_say` already strips `{{…}}` markup for non-decorate consumers, so a
narrator reading each printed line is a clean frontend add that touches none of the
engine's no-network / `file://` / disposable-frontend rules.

Today the game has voice for **Thai only** — `tts.js` is th-TH Web Speech (pronunciation of
Thai phrases, `speak` hook at `main.js`). English prose is unvoiced. So this is net-new.

## The three options, and why only one fits the static build

1. **Web Speech API** (the same `SpeechSynthesis` `tts.js` uses) — free, no network, works
   from `file://`, no build; ships as an **optional off-by-default toggle** like music. The
   catch: quality is robotic and wildly platform-dependent (decent on Mac/iOS, poorer on
   Windows/Linux/Android), and the prose is the whole draw — a synthetic voice can cheapen
   literary writing. Every line also has Thai runs mid-sentence, so it would be
   voice-switching constantly (or mispronouncing romanised Thai). **Verdict: the only
   rule-preserving option, and fine as a "read this to me" assist — not as immersive
   narration.**

2. **Pre-rendered pro audio** (ElevenLabs-grade) — sounds great, **impractical here**: the
   prose is procedurally assembled (pooled `_pickVary` variants, interpolated money / names
   / Thai), so you can't pre-render arbitrary assembled lines — only fixed strings, and
   there are 5,000+ of them plus variants. Storage would also dwarf the art track, already
   heading toward ~400MB. Not viable for the whole game.

3. **Cloud TTS on the fly** — handles the assembled prose *and* sounds good, but breaks the
   network-free / `file://` design (rule #1 of the online/2D doctrine), needs an API key +
   per-session cost + per-line latency. **Belongs to the hosted phase**, not the static
   one — it fits naturally as a feature of "hosted single-player first" on the online
   roadmap (accounts, cloud saves), where a real narrator voice would finally do the prose
   justice.

## The cheaper levers the same problem also wants (don't skip these for TTS)

Voice is one answer to "hard to read on a phone," but not the first or cheapest:

- **A text-size control** — **SHIPPED 2026-08-15**: the Aa FAB + typed FONT cycle body font-size 15/17/19/21px, persisted in localStorage (lbb_font_px), scaling only the prose/input while the rem-based chrome stays put (tests/e2e/font.spec.mjs). The rest of this bullet was the original case: it is the most direct fix and the highest-leverage one — it helps
  *every* older player immediately, needs no voice, no network, no build cost of note, and
  never touches the writing. This should probably come **before** any TTS work.
- **`aria-live` on `#term-out`** so an older player's own phone screen reader (VoiceOver /
  TalkBack) announces new lines cleanly. It's a plain-text HTML terminal, so a screen
  reader already narrates the DOM more flexibly than any bolted-on TTS — making that path
  clean is cheap and independent of everything above.
- The prose already leans toward *less* re-reading on repeat interactions (the `short` /
  `_askAgain` terse-repeat system). "Concise mode" is the wrong lever — the prose IS the
  product; the goal is to make it easier to consume, not to have less of it.

## Recommendation / phasing

1. **First:** a font-size control (readability without touching the writing) + the
   `aria-live` pass. Cheap, no-network, helps the stated problem directly.
2. **Then, optionally:** a Web Speech "read to me" toggle, off by default, expectations
   managed on voice quality.
3. **Later, hosted phase:** cloud-TTS narration as the version that actually sounds good —
   scoped with the hosted single-player step, not the `file://` game.

Related: `docs/2d-roadmap.md` (the disposable-frontend doctrine this obeys), the
`lbb-prose-voice-girls` memory (why the writing is the draw, i.e. why robotic narration is
a real cost), the online-future rules in `CLAUDE.md` (why cloud TTS is a hosted-phase thing).
