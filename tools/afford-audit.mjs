#!/usr/bin/env node
// AFFORDANCE audit — finds things the prose says you can HAVE that no
// transactional verb will actually give you. Sibling of tools/examine-audit.mjs
// (which does the same for the curiosity verb) and built for the same reason:
// the promise lives in world.js prose and the delivery lives in the parser, so
// the only honest check is to play the verb.
//
//   node tools/afford-audit.mjs               # full report
//   node tools/afford-audit.mjs --json        # machine-readable
//   node tools/afford-audit.mjs --room mama_yai
//
// WHY THIS EXISTS (docs/testing-gap-analysis.md §2.4). The promise lint
// (tests/js/promises.test.js) harvests parenthesized ALL-CAPS hints and asserts
// they parse. Round 12's playtest found three promise defects and the lint was
// structurally blind to every one of them:
//
//   Moonshine Bar  "dare you to try the house infusion"   — ya dong unbuyable
//   Mama Yai's     "the som tam arrives unasked"          — unobtainable
//   Naklua Thai    "foot 250, Thai 300, herbal compress"  — one flat ฿300
//
// None carried a CAPS hint, so none was ever harvested. And the lint passes a
// VOICED REFUSAL by design ("Not for sale here" beats a parser dead-end), so
// even with a hint it would have gone green on a bar that cannot sell the thing
// it dares you to try. The lint checks that a promise PARSES; this checks that
// it is KEPT.
//
// DELIVERY IS DETECTED BY STATE CHANGE, NOT BY STRING MATCHING — money spent,
// hunger or thirst eased, an item gained, a drink drunk. Refusal prose is
// pooled and varies by room and mood; the state either moved or it didn't. Same
// reasoning as the soak's liveness ledger: assert what happened, not what was said.
//
// Not a gate. Prose legitimately names food nobody should be able to order (a
// patron's supper, a memory, a smell from next door), so the output is for
// triage. A real finding is fixed by wiring the purchase, or by softening the
// prose so it stops promising.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const out = [];
engineInit(t => out.push(String(t)), null, () => {});

const args = process.argv.slice(2);
const asJson = args.includes("--json");
// indexOf returns -1 when the flag is absent, and args[-1 + 1] is args[0] — so
// a bare `--json` run silently became `--room --json`, matched no room, and
// reported a clean tree having examined nothing. An instrument that does no
// work reports no findings; the test asserts `tested > 0` for exactly this.
const _roomAt = args.indexOf("--room");
const onlyRoom = (_roomAt >= 0 ? (args[_roomAt + 1] || "") : "").trim();

// ── availability frames ──────────────────────────────────────────────────────
// Deliberately narrow. Each frame is prose that ASSERTS the thing is to be had
// here — not merely that it exists in the world. Precision over recall, the same
// call the reference lint and the examine audit both make: a false positive
// costs a human's attention and teaches them to ignore the tool.
const FRAMES = [
  // "…and dare you to try the house infusion" (Moonshine's ya dong)
  /\bdare(?:s)? you to try (?:the |a |some )?([a-z][a-z' ]{2,24}?)(?:[,.]|$)/gi,
  // "the som tam arrives unasked and correct" (Mama Yai's)
  /\bthe ([a-z][a-z' ]{2,24}?) arrives\b/gi,
  // "ya dong in an unlabelled bottle for the brave"
  /\b([a-z][a-z' ]{2,24}?) in an? [a-z' ]{2,20} for the brave\b/gi,
  /\b(?:sells|selling|serves|serving|pours|pouring) (?:the |a |some )?([a-z][a-z' ]{2,24}?)(?:[,.]| and | to | for |$)/gi,
  /\b(?:a|one) (?:plate|bowl|bottle|glass|jug|pint|shot|skewer|bag|packet) of ([a-z][a-z' ]{2,24}?)(?:[,.]| and |$)/gi,
  /\b([a-z][a-z' ]{2,24}?) (?:is|are) on the menu\b/gi,
];

// Words that are never a purchasable noun even inside a frame. The greedy
// frames that needed this ("try the X", "house X") were dropped instead — a
// stoplist patching a bad frame is how a lint rots into decoration.
// A capture containing any of these is a clause, not a thing — the frames catch
// them because prose puts food and grammar in the same sentence.
const FUNCTION = new Set(["is", "are", "was", "were", "be", "being", "been", "am",
  "from", "outside", "inside", "without", "with", "about", "than", "then", "when",
  "while", "because", "asked", "unasked", "already", "still", "just", "only", "even",
  "here", "there", "where", "who", "which", "what", "not", "no", "nor", "so", "as",
  "for", "of", "in", "on", "at", "by", "to", "up", "down", "over", "under"]);

const STOP = new Set(["it", "them", "him", "her", "one", "that", "this", "these", "those",
  "you", "your", "the", "a", "an", "and", "or", "but", "same", "other", "another", "rest",
  "anything", "something", "nothing", "everything", "anyone", "someone", "stuff", "product",
  "lot", "thing", "things", "way", "night", "evening", "morning", "place", "room", "bar",
  "man", "woman", "girl", "girls", "lady", "ladies", "boy", "people", "everyone", "nobody",
  "luck", "trouble", "story", "stories", "joke", "jokes", "music", "song", "songs", "twice",
  "air", "light", "dark", "heat", "noise", "smell", "sound", "view", "sea", "sand", "rain",
  "money", "baht", "price", "prices", "change", "tab", "bill", "round", "rounds", "rules",
  "speciality", "specialty", "trade", "business", "service", "hours", "time", "name"]);

function nounsFrom(text) {
  const found = new Set();
  for (const re of FRAMES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(String(text))) !== null) {
      let n = (m[1] || "").toLowerCase().replace(/\s+/g, " ").trim();
      n = n.replace(/^(the|a|an|some|his|her|its|their)\s+/, "");
      if (!n || n.length < 3 || n.length > 24) continue;
      const words = n.split(" ");
      if (words.length > 3) continue;
      if (words.some(w => FUNCTION.has(w))) continue;   // "bass from outside", "are honest"
      if (words.every(w => STOP.has(w))) continue;
      if (STOP.has(words[words.length - 1])) continue;
      found.add(n);
    }
  }
  return [...found];
}

// ── known-benign, each with a reason ─────────────────────────────────────────
// Same discipline as prose-claims.mjs's AFFORDANCE_OK and the reference lint's
// collision list: a finding is a QUESTION, and a genuine non-finding is recorded
// with WHY. An entry without a reason is how a lint rots into decoration.
// Two shapes recur and are worth naming:
//   · METAPHOR — this prose says things "arrive" that are not goods.
//   · THIRD-PARTY — food and drink on somebody else's table is not an offer to
//     you (the same distinction decorate() draws with `her phone`).
const AFFORD_OK = new Map([
  ["jomtien_beach_m|surf", "the sea, hissing to the west — not a good"],
  ["buakhao_klang|traffic", "METAPHOR: 'the traffic arrives here to die'"],
  ["buakhao_lk|alley mouth", "METAPHOR: 'the noise from the alley mouth arrives'"],
  ["golden_dragon|offer", "METAPHOR: 'the offer arrives before the beer does'"],
  ["shamrock|hatch", "a serving hatch boarded over with ply — the bar is dead"],
  ["thai_massage|nine", "'a town that sells nine' counts kinds of massage, not goods"],
  ["orchid_room|blue label", "THIRD-PARTY: the MC president's bottle, on his table"],
]);

// ── the probe ────────────────────────────────────────────────────────────────
const VERBS = ["buy", "eat", "drink", "order"];

function snap() {
  return {
    money: G.money, hunger: G.hunger, thirst: G.thirst,
    drunk: G.soc.drunk, happy: G.happy,
    inv: Object.values(G.itemLoc).filter(v => v === "inventory").length,
  };
}
// Delivered = the world moved. Any of: paid, fed, watered, drunk, carried.
function delivered(a, b) {
  return b.money < a.money || b.hunger < a.hunger || b.thirst < a.thirst ||
    b.drunk > a.drunk || b.inv > a.inv;
}

function freshIn(roomId) {
  newGame();
  G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
  G.money = 20000; G.hunger = 60; G.thirst = 60;
  G.room = roomId; G.battery = 100; G.nightTurn = 20;
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
}

const findings = [];
const suppressed = [];
let tested = 0;

for (const [roomId, room] of Object.entries(ROOMS)) {
  if (onlyRoom && roomId !== onlyRoom) continue;
  const texts = [room.desc || ""];
  if (Array.isArray(room.revisit)) texts.push(...room.revisit);
  for (const v of Object.values(room.reads || {})) if (typeof v === "string") texts.push(v);
  const nouns = new Set();
  for (const t of texts) for (const n of nounsFrom(t)) nouns.add(n);
  if (!nouns.size) continue;

  for (const noun of nouns) {
    let any = false;
    const replies = [];
    // Try the head word too, but ONLY as a fallback: "ya dong" delivers while
    // "dong" alone does not, and reporting the fragment as a broken promise
    // when the phrase the prose actually prints works fine is a false positive.
    for (const verb of VERBS) {
      freshIn(roomId);
      const before = snap();
      out.length = 0;
      try { doCommand(verb + " " + noun); } catch (e) { replies.push(verb + ": THREW " + e.message); continue; }
      if (delivered(before, snap())) { any = true; break; }
      replies.push(verb + ": " + (out[0] || "").slice(0, 90));
    }
    tested++;
    if (any) continue;
    const key = roomId + "|" + noun;
    if (AFFORD_OK.has(key)) { suppressed.push(key); continue; }
    findings.push({ room: roomId, venue: _barName(roomId) || room.name, noun, replies });
  }
}

if (asJson) {
  console.log(JSON.stringify({ tested, dead: findings.length, findings, suppressed }, null, 1));
  process.exit(0);
}
console.log(`afford-audit: ${tested} (room, noun) pairs played, ${findings.length} undelivered` +
  (suppressed.length ? `, ${suppressed.length} known-benign suppressed` : "") + "\n");
for (const f of findings) {
  console.log(`✗ ${f.venue}  [${f.room}]  — prose offers "${f.noun}"`);
  for (const r of f.replies) console.log("    " + r);
  console.log("");
}
if (!findings.length) console.log("Every advertised affordance is deliverable by some verb.");
