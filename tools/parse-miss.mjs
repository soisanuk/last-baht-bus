// THE PARSER'S MISS LINES, read from the engine for the instruments that judge a reply as "the game did not
// understand that" (soak, dialogue-lifecycle, errand-audit, askable-audit). A typed copy of them went stale when the
// escalation rewrote them (2026-10-18): the lists named "That one didn't parse", which no longer exists, and missed
// "The soi blinks at you" (the usual first miss) and "That didn't parse". Every miss the parser can print is here:
// _HUH (the soft line and the warnings), the Thai pair, and the talk misses up to their first placeholder.
// Call it after the tool has loaded the engine: the pools are the engine's top-level consts, read bare.
export function parseMissLines() {
  return [..._HUH, _HUH_THAI_SOFT, _HUH_THAI, ..._HUH_TALK.map(s => s.split("{")[0])];
}
export function isParseMiss(line) {
  const l = String(line);
  return parseMissLines().some(h => l.includes(h));
}
