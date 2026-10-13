#!/usr/bin/env node
// THE CHORUS AUDIT — two women must not say one sentence.
//
// Class M came back in sixteen rounds as "the same line from two mouths" (ledger, 2026-10-13): one goodbye
// speech from Pukky and Nina, "You again. Same chair, same face" from two bars, Nina's and Somo's "last
// night SO funny 5555", Kesinee and Joy's killer-pool sentence, a phone-post reveal from Mercedes and Praewa.
// The game's doctrine is that a pooled line is DEALT — a woman gets the next line nobody in town has said to
// you — and every fix was an instance because nothing played the doctrine across a cast.
//
// One game, one evening: the audit walks the women a man would actually meet in a week (the Soi 6 floor,
// every hostess by default, or --quick for twenty), makes each of them known to you (met, a drink's worth of
// bond), and puts the same subjects to every one of them — a bare TALK, the town's small talk, family, home,
// plan, last time, remember me, the closing hour, the league, the goodbye — and then the texts and the
// leaving line the phone and the night's end deal. Every answer is reduced to its SENTENCES (her name and
// the bar's blanked), and a sentence of eight words or more that two different women said is a finding.
//
//   node tools/chorus-audit.mjs            the Soi 6 floor, every subject
//   node tools/chorus-audit.mjs --quick    twenty women (the gate)
//   node tools/chorus-audit.mjs --mutate leaving   prove it goes red: every woman one goodbye
//   --verbose prints each woman's lines
//
// CHORUS_OK: a sentence that is MEANT to be shared (a house rule every member of staff recites, a price
// read off the board), each with its reason. A new shared sentence fails the test.
import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const said = () => out.join("\n");

const args = process.argv.slice(2);
const QUICK = args.includes("--quick"), VERBOSE = args.includes("--verbose"), AS_JSON = args.includes("--json");
const argOf = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || "") : ""; };
const MUTATE = argOf("--mutate");

// A sentence that is meant to be the same in every mouth, with the reason. Keyed by its normalised text.
const CHORUS_OK = {};

const MUTATIONS = {
  leaving: () => { for (const k of Object.keys(_LEAVING_TALK)) _LEAVING_TALK[k] = [_LEAVING_TALK[k][0]]; G.leaveLine = {}; },
};

const SUBJECTS = ["", "family", "home", "plan", "what did you do before this", "day off", "favourite food", "are you tired",
  "last time", "remember me", "closing", "league", "i fly home tomorrow", "the bar"];

const savedRand = _rand;
_rand = () => 0.42;
newGame();
G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" };
G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic";
_setFlag("act1Done"); _setFlag("hasWallet");
for (const k in ENCOUNTERS) G.encDone[k] = true;
G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 900000; G.flowerDay = G.day;
if (MUTATE) { if (!MUTATIONS[MUTATE]) { console.error("no mutation " + MUTATE); process.exit(2); } MUTATIONS[MUTATE](); }

const pool = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess" && ROOMS[NPCS[id].room] && ROOMS[NPCS[id].room].barType &&
  ROOMS[NPCS[id].room].region === "Soi 6" && !NPCS[id].offmap);
// a week's acquaintance is about ten women; the gate asks that no two of THEM share a sentence
const women = QUICK ? pool.filter((_, i) => i % Math.max(1, Math.floor(pool.length / 10)) === 0).slice(0, 10) : pool;

// sentences, normalised: her name, the bar's name and digits blanked, punctuation and quotes dropped
const norm = (t, id) => String(t).replace(/\b(?:Mama|Mae|Khun) [A-Z][a-z]+\b/g, "X").replace(new RegExp("\\b" + NPCS[id].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), "X")
  .replace(new RegExp((_barName(NPCS[id].room) || "@@").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "BAR")
  .replace(/[“”"«»]/g, "").replace(/\d[\d,]*/g, "N");
const sentences = (t, id) => norm(t, id).split(/\n/).filter(l => l.trim() && !/^\s*[·(]/.test(l) && !/^[^\s]+ [^:]+: “/.test(l))
  .flatMap(l => l.split(/(?<=[.!?])\s+/)).map(s => s.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim())
  .filter(s => s.split(" ").length >= 8);

const by = new Map();   // sentence -> Set of women
const record = (id, subject, text) => { for (const s of sentences(text, id)) { if (!by.has(s)) by.set(s, new Map()); by.get(s).set(id, subject); } };

for (const id of women) {
  G.room = NPCS[id].room; G.nightTurn = 30; G.convo = null; G.convoQ = null;
  if (!_npcsHere().includes(id)) continue;
  (G.metDay = G.metDay || {})[id] = G.day - 2;   // a woman you have met before…
  G.soc.drinks[id] = 4;                          // …and bought a few drinks
  for (const sub of SUBJECTS) {
    G.nightTurn = 30; G.hunger = 0; G.thirst = 0; G.soc.drunk = 0; G.room = NPCS[id].room;   // the body and the clock held: no night ends mid-survey
    out = []; doCommand(sub ? `ask ${String(NPCS[id].name).toLowerCase()} about ${sub}` : `talk to ${String(NPCS[id].name).toLowerCase()}`);
    record(id, sub || "hello", said());
    G.soc.leavingSaid = {};
  }
  // the phone deals her texts: three, from her own pool
  G.phone.contacts[id] = true;
  { const t = _floorTextPick(id, (NPCS[id].textVoice && NPCS[id].textVoice.chatter) || _CHATTER); record(id, "text", t); }   // a contact's text, one each
  if (VERBOSE) console.log(id);
}
// …and THE HOUSE ON ITS GIRLS: four mamasans gave one character reference for four women (Bernard, round 88) — the
// audit only asked the women about themselves, so the review pools were never in it. Each room's mamasan and cashier
// is asked about a woman they work with; a sentence three of them say is a chorus.
for (const room of [...new Set(women.map(id => NPCS[id].room))]) {
  G.room = room; G.nightTurn = 30; G.convo = null; G.convoQ = null;
  const here = _npcsHere(), girl = here.find(i => NPC_ROLES[i] === "hostess");
  for (const h of here.filter(i => NPC_ROLES[i] === "mamasan" || NPC_ROLES[i] === "cashier")) {
    if (!girl) continue;
    G.hunger = 0; G.thirst = 0; G.soc.drunk = 0; G.convo = null;
    out = []; doCommand(`ask ${String(NPCS[h].name).toLowerCase()} about ${String(NPCS[girl].name).toLowerCase()}`);
    record(h, "review:" + girl, said().replace(new RegExp("\\b" + NPCS[girl].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), "X"));   // the subject's name too, or four bars never collide
  }
}
_rand = savedRand;

// the floor's brush-offs are a REGISTER, not a voice: "not my story" from three women is the soi
// declining, not a chorus — read off the engine's own miss pools so a rewrite stays covered
const REGISTER = new Set();
for (const pool of [typeof _TOPIC_MISS_EN !== "undefined" && _TOPIC_MISS_EN, typeof _TOPIC_MISS_TH !== "undefined" && _TOPIC_MISS_TH,
  typeof _TOPIC_MISS_HOUSE !== "undefined" && _TOPIC_MISS_HOUSE].filter(Boolean))
  for (const f of pool) for (const s2 of sentences(typeof f === "function" ? f("X") : f, women[0] || Object.keys(NPCS)[0])) REGISTER.add(s2);

// a CHORUS is three or more of a week's women saying one sentence (the gate); two is a pair (reported)
const findings = [], pairs = [];
for (const [s, who] of by) {
  if (who.size < 2 || CHORUS_OK[s] || REGISTER.has(s)) continue;
  (who.size >= 3 ? findings : pairs).push({ sentence: s, women: [...who.entries()].map(([id, sub]) => `${id}(${sub})`) });
}
findings.sort((a, b) => b.women.length - a.women.length);
if (AS_JSON) { console.log(JSON.stringify({ women: women.length, findings, pairs })); process.exit(0); }
for (const f of findings.slice(0, 60)) console.log(`  ${String(f.women.length).padStart(2)}× "${f.sentence.slice(0, 90)}"\n      ${f.women.slice(0, 6).join(", ")}${f.women.length > 6 ? " …" : ""}`);
if (VERBOSE) for (const f of pairs) console.log(`  pair "${f.sentence.slice(0, 90)}"  ${f.women.join(", ")}`);
console.log(`\nchorus audit: ${women.length} women · ${SUBJECTS.length} subjects + texts · ${findings.length} choruses (3+ women) · ${pairs.length} pairs`);
process.exitCode = findings.length ? 1 : 0;
