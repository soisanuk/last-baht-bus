#!/usr/bin/env node
// ASK-PROMISE audit — every "(ASK <who> ABOUT <what>)" the game prints must be
// a question that character actually answers.
//
//   node tools/asktopic-audit.mjs            # full report
//   node tools/asktopic-audit.mjs --json
//
// WHAT THIS IS, AND WHAT IT IS NOT — the honest version, because the first
// design of this tool was wrong and the wrongness is worth recording.
//
// The persona rounds kept reporting a wider class: "an NPC volunteers a subject
// in their own greeting and then misses on it" (Bob's wife, Nok's bottles,
// Nont's SIM, Bert's Soi 6). I tried to lint that by harvesting candidate nouns
// from each character's greeting and testing them. It does not work, for a
// reason that only shows up when you measure it: the candidate nouns have to
// come from somewhere, and the only mechanical source is the game's own topic
// vocabulary — but **the real findings are precisely the words that are NOT in
// it yet**. "bottles", "sim" and "tour" are topics nowhere in the game, which is
// exactly why they miss. A vocabulary-based harvest can only find "answered by
// someone else but not here", which is a different and far noisier class: it
// returned 4,236 findings out of 4,284 pairs, and 207 of 208 after three rounds
// of tightening. Identifying content nouns without a vocabulary needs real POS
// tagging or a hand-curated noun list, and neither is cheap or in keeping with
// the tooling here. So THAT class stays a judgement call for a human or a
// persona, and this file does not pretend otherwise.
//
// What IS mechanical is the subset where the game makes the promise ITSELF: a
// parenthesised (ASK <WHO> ABOUT <WHAT>) hint, or a quest description that names
// the ask. Those are exact — no guessing what a character "should" answer, just
// checking that what the game told the player to type actually works. That is
// the same contract promises.test.js applies to command hints, except that lint
// only checks a hint PARSES, and "ask X about Y" always parses — it just lands
// on the miss pool. Glam's own quest text says "let him tell you about the
// tour"; ASK GLAM ABOUT TOUR misses.

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

// ── harvest: the promises the game prints ────────────────────────────────────
// (a) parenthesised CAPS hints, the decorate() tap idiom; (b) quest descriptions,
// which are prose the player reads in QUESTS and follows literally.
const SRC = ["world", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"]
  .map(f => fs.readFileSync(new URL(f + ".js", JS), "utf8")).join("\n");

const promises = new Map();   // "who|topic" → {who, topic}
const add = (who, topic) => {
  who = String(who).trim().toLowerCase().replace(/\s+/g, " ");
  topic = String(topic).trim().toLowerCase().replace(/\s+/g, " ")
    .replace(/^(the|his|her|a|an)\s+/, "");
  if (!who || !topic || topic === "the") return;
  promises.set(who + "|" + topic, { who, topic });
};
for (const m of SRC.matchAll(/\bASK\s+([A-Z][A-Z' ]{1,20}?)\s+ABOUT\s+([A-Z][A-Z0-9' ]{1,24})/g))
  add(m[1], m[2]);
// lower-case instruction prose: "ask Lek at the Lucky Tiger what he did with it"
// is NOT a topic promise, so only the explicit "ask X about Y" shape counts.
for (const m of SRC.matchAll(/\bask\s+([A-Z][a-z]{2,12})\s+about\s+(?:the\s+|his\s+|her\s+)?([a-z][a-z' ]{2,22}?)(?=[.,;"”)]|$)/gm))
  add(m[1], m[2]);
// …and the SUBJECT NAMED IN THE SAME SENTENCE as an ASK hint. Glam's quest reads
// "Sit with Glam a while and let him tell you about the tour (ASK GLAM ABOUT
// MUSIC)" — the hint is honest and works, but the sentence around it names a
// different subject, and that is the one a player types (persona report,
// 2026-08-23). Bounded and precise: the sentence is explicitly about asking THIS
// person, so no vocabulary guessing is involved.
for (const line of SRC.split(/\n/)) {
  const hint = /\bASK\s+([A-Z][A-Z' ]{1,20}?)\s+ABOUT\s+[A-Z]/.exec(line);
  if (!hint) continue;
  for (const m of line.matchAll(/\b(?:about|tell you about|talk to (?:him|her) about)\s+(?:the|his|her)\s+([a-z][a-z']{2,18})\b/g))
    add(hint[1], m[1]);
}

function isMiss(lines) {
  const t = lines.join("\n");
  return /not my story|ask me something|wrong girl|wrong man|wrong one|couldn't tell you|no idea, mate|don't know about that|shakes (his|her) head|not one I know|try somebody who was there|can't help you there/i.test(t);
}

// A promise is only broken if it misses in EVERY state where it could be live.
// Act One's own hints ("ASK LEK ABOUT MOT") are answered by nodes gated on the
// wallet still being lost, so testing only the sandbox reported Lek as broken
// when she answers perfectly at the moment the hint is printed. Stage-gating is
// the norm here, not the exception, so try both and report only a double miss.
const STAGES = [
  ["act one", () => {
    delete G.flags.act1Done; delete G.flags.hasWallet; G.stage = "act1";
    for (const f of ["knowWasHere", "knowMot", "knowOyHasIt", "officeOpen"]) _setFlag(f);
  }],
  ["sandbox", () => {
    _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
    for (const f of ["expatLife", "barPremises", "barLicence", "wdgResolved", "nomineeWarned"]) _setFlag(f);
  }],
];

function askIn(setup, id, who, topic) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.money = 5000;
  setup();
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
  // One cast since the patron fold. `isPat` used to be `!NPCS[id]` — that test
  // would now be permanently FALSE, so it keys on the flag: a rail regular has
  // absences the staff don't (his teaching night, a low-season evening in), and
  // _npcWhere is the presence-aware lookup that reports them as null.
  const isPat = !!(NPCS[id] && NPCS[id].patron);
  const room = isPat ? _npcWhere(id)
    : ((typeof _npcRoom === "function" ? _npcRoom(id) : NPCS[id].room) || NPCS[id].room || (NPCS[id].bars || [])[0]);
  if (!room || !ROOMS[room]) return { skip: "no room" };
  G.room = room;
  const here = _npcsHere();
  if (!here.includes(id)) return { skip: "not in tonight" };
  (G.known = G.known || {})[id] = true;
  out.length = 0; doCommand("talk to " + who);
  out.length = 0; doCommand(`ask ${who} about ${topic}`);
  return { miss: isMiss(out), reply: (out[0] || "").slice(0, 120), room };
}

const findings = [];
let tested = 0, unresolved = [];

for (const { who, topic } of promises.values()) {
  const find = src => Object.keys(src).find(k => src[k].name.toLowerCase() === who) ||
                      Object.keys(src).find(k => src[k].name.toLowerCase().split(" ").pop() === who);
  const id = find(NPCS); // one cast
  if (!id) { unresolved.push(who + " / " + topic + " (no such character)"); continue; }
  const name = NPCS[id].name;
  let played = false, allMissed = true, lastReply = "", lastRoom = "";
  for (const [, setup] of STAGES) {
    const r = askIn(setup, id, who, topic);
    if (r.skip) continue;
    played = true;
    lastReply = r.reply; lastRoom = r.room;
    if (!r.miss) { allMissed = false; break; }
  }
  if (!played) { unresolved.push(who + " / " + topic + " (never reachable)"); continue; }
  tested++;
  if (allMissed) findings.push({ id, name, room: lastRoom, topic, reply: lastReply });
}

if (asJson) { console.log(JSON.stringify({ tested, dead: findings.length, findings, unresolved }, null, 1)); process.exit(0); }

console.log(`asktopic-audit: ${promises.size} promises harvested, ${tested} played, ${findings.length} unanswered\n`);
for (const f of findings) {
  console.log(`✗ ASK ${f.name.toUpperCase()} ABOUT ${f.topic.toUpperCase()}   [${f.room}]`);
  console.log(`    ${f.reply}`);
}
if (!findings.length) console.log("Every ASK the game promises is a question that character answers.");
if (unresolved.length) {
  console.log(`\n(${unresolved.length} not played — name didn't resolve, or not working tonight:)`);
  console.log("  " + unresolved.join(" · "));
}
