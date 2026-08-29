#!/usr/bin/env node
// ERRAND audit — the game tells you to do a thing TO A PERSON. Can you?
//
//   node tools/errand-audit.mjs            # full report
//   node tools/errand-audit.mjs --json
//   node tools/errand-audit.mjs --who rose
//
// THE THIRD SIBLING. tools/asktopic-audit.mjs plays every ASK the prose
// promises; tools/afford-audit.mjs plays every thing the prose says you can
// HAVE. Neither sees the shape that two personas hit independently in round 23:
// an instruction naming a PERSON and a VERB that is not "ask".
//
//   Candy   "you tell Rose: som tam at Rompho, she pay for the crab"
//           — Rose has no node that receives it. The persona called this the
//             single most disappointing moment of her session, because the
//             outward half is the best-written link in the game.
//   engine  "(These men see the whole town and tell nobody. BUY PIWIN A BEER —
//            then ask him about somebody.)"
//           — BUY PIWIN A BEER works. BUY BANK A BEER, using the name the game
//             itself taught you, answers "this calls for a bar stool".
//
// WHY THE EXISTING LINTS ARE BLIND TO IT, precisely, because that is the part
// worth keeping. The promise lint (tests/js/promises.test.js) asserts a
// parenthesised CAPS hint PARSES — and "buy bank a beer" parses perfectly
// before being refused, so it goes green. asktopic-audit only ever plays ASK.
// afford-audit judges by money/hunger/item, and an errand delivered is a
// CONVERSATION, which moves none of them. Three instruments, one gap, and the
// gap is exactly the shape of "the game gave me an instruction and I obeyed it".
//
// HOW A PASS IS JUDGED, and why it is not string matching. The engine's own miss
// pools are the oracle: _topicMiss, _askAgain and the parser's dead ends are
// enumerable, so this asks whether the reply came out of one of THOSE rather
// than comparing against a hand-written list of good words. Same reasoning as
// the soak's liveness ledger and afford-audit's state check — derive the
// instrument's reach from the engine, never from a list somebody remembered to
// keep up to date.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(ROOT, "web", "js", f), "utf8"), { filename: f });
}
const out = [];
engineInit(t => out.push(String(t)), null, () => {});

const asJson = process.argv.includes("--json");
const wi = process.argv.indexOf("--who");
const onlyWho = wi !== -1 ? process.argv[wi + 1] : null;

// ── the errand frames ───────────────────────────────────────────────────────
// Each captures (person, and the clause that says WHAT about them). Deliberately
// narrow, same call as the other two audits: a false positive costs a human's
// attention and teaches them to ignore the tool.
//
// NOTE THE COMMAND SHAPE. "You tell Rose: som tam at Rompho" reads like it wants
// TELL, and TELL is not a verb in this game — it answers "telling isn't the verb
// here, this town runs on ASKING". So the obeying command is ASK ROSE ABOUT
// <the subject of the sentence>, and the audit plays every substantial noun in
// the clause: the errand is kept if ANY of them lands. That is the honest bar,
// because a player who was told to tell Rose about lunch will type "lunch".
const FRAMES = [
  { re: /\byou tell ([A-Z][a-z]+)\b([^"”]{0,90})/g },
  { re: /\btell ([A-Z][a-z]+) (?:she|he|they|that)\b([^"”]{0,90})/g },
];

const SUBJ_STOP = new Set(["that", "this", "there", "here", "them", "they", "what", "when",
  "where", "which", "with", "your", "yours", "about", "still", "owes", "said", "says",
  "have", "will", "would", "come", "back", "from", "into", "were", "been", "just",
  "only", "then", "than", "some", "much", "more", "very", "over", "after", "before"]);

function subjectsFrom(clause) {
  return [...new Set(String(clause).toLowerCase().match(/[a-z']{4,}/g) || [])]
    .filter(w => !SUBJ_STOP.has(w)).slice(0, 6);
}

// Every text the game can print at a player, from the data side.
function corpus() {
  const recs = [];
  for (const [id, n] of Object.entries(NPCS))
    for (const d of n.dialogue || [])
      for (const k of ["text", "short"])
        if (typeof d[k] === "string") recs.push({ src: `npc.${id}.${d.topic || "greet"}.${k}`, speaker: id, text: d[k] });
  for (const [id, r] of Object.entries(ROOMS)) {
    if (r.desc) recs.push({ src: `room.${id}.desc`, room: id, text: r.desc });
    for (const v of Object.values(r.reads || {}))
      if (typeof v === "string") recs.push({ src: `room.${id}.reads`, room: id, text: v });
      else if (Array.isArray(v)) for (const e of v) if (e && e.text) recs.push({ src: `room.${id}.reads`, room: id, text: e.text });
  }
  for (const [id, q] of Object.entries(QUESTS))
    if (q.desc) recs.push({ src: `quest.${id}.desc`, text: q.desc });
  // the engine's own printed instructions (the piwin line lives here)
  for (const f of ["engine-play.js", "engine-systems.js", "engine-parser.js", "engine-core.js"]) {
    const code = readFileSync(join(ROOT, "web", "js", f), "utf8");
    for (const m of code.matchAll(/"((?:[^"\\]|\\.){12,400})"/g))
      recs.push({ src: f, text: m[1].replace(/\\u201c|\\u201d/g, '"').replace(/\\"/g, '"') });
  }
  return recs;
}

function findNpcByName(name) {
  const t = String(name).toLowerCase();
  return Object.keys(NPCS).find(i => NPCS[i].name.toLowerCase() === t) ||
    Object.keys(NPCS).find(i => NPCS[i].name.toLowerCase().split(" ").pop() === t) || null;
}

// The engine's own dead ends. Built by RUNNING them, not by transcribing them,
// so a rewritten miss line can never silently turn this audit green.
function missOracle() {
  const lines = new Set();
  const probe = (id) => {
    for (let i = 0; i < 40; i++) {
      fresh(id);
      out.length = 0;
      doCommand(`ask ${NPCS[id].name.toLowerCase()} about quantumfrogsalad`);
      for (const l of out) lines.add(String(l).slice(0, 40));
    }
  };
  for (const id of ["rose", "candy", "terry", "bank"]) if (NPCS[id]) probe(id);
  for (const s of ["I didn't understand", "That one didn't parse", "Not for sale here",
    "isn't around right now", "Nobody by that name", "isn't at this bar",
    "this calls for a bar stool", "You're not carrying that", "They're not here to ask",
    "Telling isn't the verb here"])
    lines.add(s.slice(0, 40));
  return [...lines];
}

function fresh(npcId) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
  G.money = 20000; G.hunger = 50; G.thirst = 50; G.battery = 100; G.nightTurn = 30;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
  const room = (typeof _npcWhere === "function" && _npcWhere(npcId)) || NPCS[npcId].room;
  G.room = room;
  doCommand("talk to " + NPCS[npcId].name.toLowerCase());   // you have to be talking first
}

// ── known-benign, each with a reason ────────────────────────────────────────
const OK = new Map([
  ["mercedes|tell", "RHETORICAL: 'you tell Mercedes she is wrong' is a challenge in her own " +
    "mouth, not an errand handed to the player."],
]);

const oracle = missOracle();
const findings = [];
const suppressed = [];
let played = 0, skipped = 0;

for (const rec of corpus()) {
  for (const frame of FRAMES) {
    frame.re.lastIndex = 0;
    let m;
    while ((m = frame.re.exec(rec.text)) !== null) {
      const who = m[1];
      const id = findNpcByName(who);
      if (!id) { skipped++; continue; }
      if (onlyWho && id !== onlyWho) continue;
      if (rec.speaker === id) continue;          // telling a man about himself is not an errand
      const subjects = subjectsFrom(m[2] || "");
      if (!subjects.length) { skipped++; continue; }
      played++;
      let landed = null;
      const tried = [];
      for (const subj of subjects) {
        fresh(id);
        out.length = 0;
        try { doCommand(`ask ${NPCS[id].name.toLowerCase()} about ${subj}`); } catch (e) { continue; }
        const reply = out.join(" ").trim();
        tried.push(subj);
        if (reply && !oracle.some(o => reply.includes(o))) { landed = subj; break; }
      }
      if (landed) continue;
      const key = id + "|tell";
      if (OK.has(key)) { suppressed.push(key + " — " + OK.get(key)); continue; }
      findings.push({ who: NPCS[id].name, id, cmd: `ask ${NPCS[id].name.toLowerCase()} about …`,
        src: rec.src, reply: "none of: " + tried.join(", ") + " lands — she has no node that receives it" });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ played, skipped, dead: findings.length, findings, suppressed }, null, 1));
} else {
  console.log(`errand-audit: ${played} instructions played, ${findings.length} unobeyable, ` +
    `${suppressed.length} known-benign suppressed`);
  console.log();
  const seen = new Set();
  for (const f of findings) {
    const k = f.id + "|" + f.cmd;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`✗ ${f.cmd.toUpperCase()}   [${f.who}]`);
    console.log(`    told by: ${f.src}`);
    console.log(`    ${f.reply}`);
    console.log();
  }
  if (!findings.length) console.log("Every instruction the game hands the player can be obeyed.");
}
process.exit(0);
