#!/usr/bin/env node
// EXAMINE-promise audit — finds objects the prose advertises that the curiosity
// verb dead-ends on. Third instance of the class (candy_bar photos, the bar
// shrine, the beach spirit house) prompted this: per-string review can't catch
// it because the promise lives in world.js prose and the delivery lives in the
// parser, so the only honest check is to PLAY the verb — harvest the nouns each
// room's desc/revisit mentions, stand in the room, run EXAMINE, and classify
// the answer. Sibling of tools/prose-corpus.mjs (claims) and tools/soak.mjs
// (commands); loader copied from tools/probe.mjs (cwd-proof).
//
//   node tools/examine-audit.mjs             # full report, noun-frequency first
//   node tools/examine-audit.mjs --json      # machine-readable findings
//   node tools/examine-audit.mjs --room soi6_mid   # one room, all its nouns
//
// A DEAD verdict means: standing in the room, lit, EXAMINE <noun> printed one
// of the _NO_SUCH_THING brush-offs or "You don't see that here." Everything
// else (item desc, reads entry, scenery answer, NPC desc) counts as answered —
// the audit checks delivery, not quality.
//
// Not a test and not a gate: prose legitimately mentions plenty of atmosphere
// nobody should examine ("the arithmetic", "a mercy"). The stoplist keeps the
// noise down; the output is for triage, and the fix for a real finding is an
// ITEMS entry, a room `reads:`, a _SCENERY noun, or softening the prose.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
const FILES = ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"];
for (const f of FILES)
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const out = [];
engineInit(t => out.push(String(t)), null, () => {});

// ── candidate nouns ──────────────────────────────────────────────────────────
// Article + one or two lowercase words. Two-word phrases keep "spirit house" and
// "pool table" whole; the final word is also tried alone so "a battered jukebox"
// still tests "jukebox". Possessives (his/her/its) count — "her ledger" is as
// much a promise as "a ledger".
const PHRASE = /\b(?:a|an|the|its|his|her|their)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)\b/g;

// Function words: never the object, whether they end a two-word capture ("the
// shrine sits" → trim "sits") or stand alone ("a while"). One set serves both.
const FUNCTION_WORDS = new Set([
  // aux/copula/common verbs the second word slot swallows
  "is", "are", "was", "were", "has", "have", "had", "been", "being", "does", "do",
  "did", "will", "would", "could", "should", "can", "may", "might", "must",
  "sits", "sit", "goes", "go", "going", "gone", "runs", "run", "running", "keeps",
  "keep", "keeping", "leans", "lean", "hangs", "hang", "stands", "stand", "gets",
  "get", "comes", "come", "coming", "starts", "start", "stops", "stop", "stopped",
  "drops", "drop", "spills", "spill", "works", "working", "worked", "doing",
  "makes", "make", "means", "mean", "takes", "take", "gives", "give", "looks",
  "look", "looking", "sees", "see", "says", "say", "tells", "tell", "knows", "know",
  "opens", "open", "closes", "close", "leads", "lead", "turns", "turn", "waits",
  "wait", "watches", "watch", "passes", "pass", "holds", "hold", "carries", "carry",
  "wears", "wear", "sells", "sell", "buys", "buy", "pours", "pour", "plays", "play",
  // pronouns, relatives, conjunctions, prepositions, particles
  "and", "or", "of", "in", "on", "at", "to", "with", "that", "this", "these",
  "those", "it", "its", "itself", "you", "your", "he", "his", "she", "her", "they",
  "their", "them", "who", "whom", "whose", "which", "where", "when", "while",
  "what", "how", "why", "than", "then", "though", "since", "because", "if",
  "still", "here", "there", "not", "no", "nor", "so", "but", "as", "up", "down",
  "out", "off", "over", "under", "behind", "past", "along", "into", "onto",
  "from", "by", "for", "like", "about", "between", "without", "before", "after",
  "against", "through", "around", "across", "beside", "above", "below", "near",
  "already", "also", "just", "only", "even", "ever", "never", "always", "again",
  "once", "twice", "too", "very", "quite", "rather", "enough", "yet", "now",
  "that's", "it's", "he's", "she's", "there's", "what's", "who's",
  "the", "an",
  // bare adjectives & quantities (fine inside "little figures"; noise alone)
  "cold", "warm", "hot", "long", "short", "same", "new", "old", "good", "bad",
  "big", "small", "little", "high", "low", "real", "whole", "own", "next", "last",
  "first", "second", "third", "late", "early", "far", "further", "deep", "wide",
  "narrow", "full", "empty", "half", "best", "worst", "wrong", "right", "left",
  "loud", "louder", "quieter", "cheap", "cheaper", "dear", "bright", "dim",
  // directions & measures (compass answers live on the exits, not EXAMINE)
  "north", "south", "east", "west", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "dozen", "hundred", "thousand", "metre",
  "metres", "meter", "meters", "kilometre", "kilometres", "baht", "percent",
]);
const TRAIL = FUNCTION_WORDS;

// Abstract nouns, people-words, geography, time — mentioned constantly, never an
// object promise. Curated from the first runs; grow it when a run shows noise.
const STOP = new Set([
  // people & crowds (EXAMINE <person> works via _findNpc; generics aren't promises)
  "man", "men", "woman", "women", "girl", "girls", "lady", "ladies", "boy", "boys",
  "punter", "punters", "farang", "farangs", "tourist", "tourists", "crowd", "crowds",
  "regular", "regulars", "staff", "customer", "customers", "mamasan", "cashier",
  "hostess", "hostesses", "vendor", "vendors", "driver", "drivers", "expat", "expats",
  "couple", "couples", "family", "families", "kid", "kids", "guard", "guards",
  "people", "somebody", "someone", "nobody", "everyone", "wife", "husband",
  // time & abstractions
  "night", "nights", "day", "days", "hour", "hours", "morning", "evening", "afternoon",
  "moment", "while", "time", "year", "years", "week", "weeks", "rest", "way", "ways",
  "kind", "sort", "thing", "things", "one", "ones", "other", "others", "lot", "few",
  "name", "names", "word", "words", "story", "stories", "idea", "question", "answer",
  "reason", "trade", "business", "job", "work", "price", "prices", "money", "change",
  "start", "end", "ends", "beginning", "distance", "difference", "problem", "point",
  "part", "parts", "place", "places", "spot", "spots", "state", "shape", "feel",
  "look", "looks", "life", "lives", "world", "town", "city", "scene", "show", "shows",
  "offer", "promise", "habit", "opinion", "opinions", "attention", "silence", "quiet",
  "mood", "pace", "rhythm", "volume", "hum", "murmur", "roar", "din", "hush",
  // geography & structure the room IS (not objects in it)
  "street", "streets", "soi", "sois", "road", "roads", "lane", "lanes", "alley",
  "alleys", "block", "blocks", "corner", "corners", "junction", "strip", "stretch",
  "row", "rows", "side", "sides", "middle", "top", "bottom", "edge", "edges",
  "front", "back", "beach", "sand", "shore", "promenade", "pavement", "kerb",
  "hill", "dune", "dunes", "headland", "horizon", "skyline", "map", "maps",
  "district", "quarter", "pocket", "maze", "grid", "mouth", "gate", "gates",
  "entrance", "exit", "path", "paths", "walk", "walkway", "steps", "stair",
  "stairs", "staircase", "landing", "floor", "floors", "ceiling", "wall", "walls",
  "roof", "roofs", "doorway", "door", "doors", "window", "windows", "glass",
  "room", "rooms", "hall", "yard", "compound", "premises", "building", "buildings",
  "house", "houses", "shop", "shops", "stall", "stalls", "venue", "venues",
  "bar", "bars", "pub", "hotel", "hotels", "club", "clubs",
  // weather, light, air — scenery in the true sense (sky/sea/neon ARE in _SCENERY;
  // testing them per-room would just re-test the table)
  "air", "heat", "wind", "breeze", "rain", "storm", "sky", "stars", "moon", "sun",
  "sunset", "sunrise", "dark", "darkness", "light", "lights", "lighting", "shadow",
  "shadows", "glow", "shine", "neon", "sea", "gulf", "water", "waves", "surf",
  "tide", "spray", "salt", "smell", "smells", "sound", "sounds", "noise", "music",
  "bass", "beat", "song", "songs", "colour", "color", "sign", "signs", "signage",
  // body & clothing on people in the prose
  "eye", "eyes", "hand", "hands", "face", "faces", "hair", "arm", "arms", "leg",
  "legs", "shoulder", "shoulders", "knee", "knees", "voice", "voices", "smile",
  "smiles", "grin", "laugh", "accent", "shirt", "shirts", "dress", "dresses",
  "uniform", "uniforms", "heels", "shorts", "vest", "bikini", "sarong", "polo",
  // verbs the phrase regex catches as second words standing alone
  "turn", "turns", "pull", "pulls", "press", "wait", "watch", "pass",
  // 2026-08-14 triage of the 211 multi-room rows: abstractions, metaphors,
  // adjectives and geography verified non-objects against their source lines
  "step", "steps", "rumour", "rumours", "foot", "feet", "complex", "line",
  "lines", "length", "knot", "pair", "conversation", "green", "seafront",
  "shopfront", "shopfronts", "arrangement", "loudest", "hip", "hips", "thigh",
  "thighs", "purr", "churn", "elbow", "elbows", "crew", "joke", "jokes", "gap",
  "gaps", "breathing", "eating", "safely", "free", "everybody", "pink",
  "transaction", "transactions", "confidence", "group", "groups", "pitch",
  "smear", "hiss", "easy", "hurry", "exact", "scatter", "straight", "relaxed",
  "neighbours", "younger", "instead", "original", "living", "paint", "simmer",
  "playing", "choice", "choices", "whisper", "whispers", "purpose", "outright",
  "slope", "opposite", "sunburned", "arrives", "climbs", "loop", "river",
  "parade", "party", "gold", "office", "go-go", "go-gos", "fog", "solo",
  "lip-sync", "slow", "suit", "suits", "unit", "open-air", "open-front",
  "put", "lit", "toward", "asleep", "court", "mall", "board", "clock",
  "bucket", "market", "pool", "tam", "grip", "lean", "wave", "waves",
]);

function harvest(text) {
  const found = new Set();
  let m;
  PHRASE.lastIndex = 0;
  while ((m = PHRASE.exec(text)) !== null) {
    const words = m[1].split(/\s+/);
    // trim a trailing verb/preposition off two-word captures
    while (words.length && TRAIL.has(words[words.length - 1])) words.pop();
    if (!words.length) continue;
    const phrase = words.join(" ");
    const last = words[words.length - 1];
    if (STOP.has(last) || FUNCTION_WORDS.has(last) || last.length < 3) continue;
    if (words.length === 2) found.add(phrase);
    found.add(last);
  }
  return [...found];
}

// ── the dead-end classifier ──────────────────────────────────────────────────
const DEAD = new Set([..._NO_SUCH_THING, "You don't see that here."]);
const isDead = lines => lines.some(l => DEAD.has(l));

// ── walk every room ──────────────────────────────────────────────────────────
const onlyRoom = process.argv.includes("--room")
  ? process.argv[process.argv.indexOf("--room") + 1] : null;
const asJson = process.argv.includes("--json");

const findings = [];   // {room, noun, reply}
let tested = 0;

for (const [roomId, room] of Object.entries(ROOMS)) {
  if (onlyRoom && roomId !== onlyRoom) continue;
  const prose = [room.desc || "", ...(room.revisit || [])].join(" ");
  const nouns = harvest(prose);
  if (!nouns.length) continue;

  for (const noun of nouns) {
    // Fresh, lit, quiet state per probe: past Act One so nothing is stage-gated,
    // encounters marked done and timers pushed so a tick can't hijack the reply,
    // early nightTurn so the night can't end mid-audit.
    newGame();
    G.flags.act1Done = true; G.stage = "vacation"; G.money = 2000;
    G.room = roomId; G.battery = 100; G.lightOn = true;
    G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
    for (const k in ENCOUNTERS) G.encDone[k] = true;
    G.rain = 0; G.pendingEnc = null;

    out.length = 0;
    doCommand("examine " + noun);
    tested++;
    if (isDead(out)) findings.push({ room: roomId, noun, reply: out[0] || "" });
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ tested, dead: findings.length, findings }, null, 1));
  process.exit(0);
}

// Frequency view first: a noun dead in many rooms is one _SCENERY entry, not
// many room fixes.
const byNoun = new Map();
for (const f of findings) {
  if (!byNoun.has(f.noun)) byNoun.set(f.noun, []);
  byNoun.get(f.noun).push(f.room);
}
const freq = [...byNoun.entries()].sort((a, b) => b[1].length - a[1].length);

console.log(`examine-audit: ${tested} probes, ${findings.length} dead-ends, ` +
  `${byNoun.size} distinct nouns\n`);
console.log("── by noun (breadth first — one _SCENERY entry fixes a whole row) ──");
for (const [noun, rooms] of freq) {
  const shown = rooms.length > 6 ? rooms.slice(0, 6).join(", ") + ` … +${rooms.length - 6}` : rooms.join(", ");
  console.log(`${String(rooms.length).padStart(4)}  ${noun.padEnd(24)} ${shown}`);
}
console.log("\n── singletons by room (the distinctive-object promises) ──");
for (const [noun, rooms] of freq) {
  if (rooms.length !== 1) continue;
  console.log(`  ${rooms[0].padEnd(22)} ${noun}`);
}
