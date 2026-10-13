#!/usr/bin/env node
// THE MEMORY AUDIT — does a woman remember a night she spent with you?
//
// Class J/B came back in fourteen rounds as "she doesn't remember me" (ledger, 2026-10-13): Alisa two
// nights after his bed said "you watch, you don't talk to me"; Kluay forty minutes after the short time
// asked if he would buy her a drink; three women denied he was in their bar the night he bought them
// drinks; a colleague who went home with him was "not mine to know" to her own floor. Every fix was an
// instance, because nothing tested the class: a relationship EVENT, the night after, and the people who
// should know.
//
// For each woman on the Soi 6 floor (and, with --all, every hostess in town) and each KIND of night —
//   drink   two lady drinks, then the night ends
//   st      a short time, then the night ends
//   lt      a long time (the night ends inside it)
//   out     TAKE HER OUT, home together (SLEEP)
//   home    TAKE HER OUT, then SEND HER HOME, then the night ends
// — the event is played through the game's own verbs, and the next evening at her bar three questions
// are put: a bare TALK to her, ASK her ABOUT LAST NIGHT, and ASK a colleague ABOUT her. The same three
// are put in a CONTROL game with no event (same day, same hour, same dice). The judgements:
//   hello      her greeting must not be her first-meeting one (the control's opening) nor a stranger line
//   lastnight  her answer must not be the stranger's answer (the control's) — a night spent with her is news
//   colleague  her colleague must not shrug her off (the floor's miss lines)
// `drink` asks only that she not be a stranger: two drinks are not a night, and a return hello is enough.
//
//   node tools/memory-audit.mjs             the Soi 6 floor (the gate runs --quick)
//   node tools/memory-audit.mjs --quick     eight women, every kind
//   node tools/memory-audit.mjs --all       every hostess in town
//   node tools/memory-audit.mjs --mutate wenthello   prove it goes red: she forgets the night
//   --verbose prints every probe
//
// MEMORY_OK: a finding that is not a defect, with the reason. A new finding fails the test.
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
const QUICK = args.includes("--quick"), ALL = args.includes("--all"), VERBOSE = args.includes("--verbose"), AS_JSON = args.includes("--json");
const argOf = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || "") : ""; };
const MUTATE = argOf("--mutate");

const MEMORY_OK = {
  // (none)
};

// the stranger's register, quoted from the engine's own first-meeting lines
const STRANGER = /first time (this bar|I see you|in this bar)|new face|never seen you|you watch, you don't talk|I don't know you yet|Ask me again next week|Everybody new one time/i;
// the floor shrugging off a colleague
const SHRUG = /Not mine to know|Not my story|wrong girl|wrong woman|Not a thing I know|That one I don't know|cannot help you with|Never heard of/i;

const MUTATIONS = {
  wenthello: () => { globalThis._wentWithHello = () => false; globalThis._wentWithTalk = () => false; },
  witness: () => { const o = globalThis._endNight; globalThis._endNight = function (...a) { const r = o.apply(this, a); if (G.lastNightWas) G.lastNightWas.bars = {}; return r; }; },
};
if (MUTATE) { if (!MUTATIONS[MUTATE]) { console.error("no mutation " + MUTATE); process.exit(2); } MUTATIONS[MUTATE](); }

const KINDS = ["drink", "st", "lt", "out", "home"];
const savedRand = _rand;
_rand = () => 0.42;   // a constant: event and control see identical dice (CLAUDE.md rule 2)

function fresh(room) {
  newGame();
  G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic";
  _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 50000; G.nightTurn = 40; G.flowerDay = G.day;
  G.room = room;
}
const nm = id => String(NPCS[id].name).toLowerCase();
function event(id, kind) {
  const n = nm(id);
  if (kind === "drink") { doCommand("buy drink for " + n); doCommand("buy drink for " + n); _endNight("sleep"); return; }
  G.soc.drinkCount = Object.assign(G.soc.drinkCount || {}, { [id]: 2 });
  G.soc.drinks = Object.assign(G.soc.drinks || {}, { [id]: 4 });
  doCommand("barfine " + n);
  if (!G.pendingBf) return "no barfine";
  if (kind === "st") { doCommand("short time"); if (G.day === 1 || G.nightTurn < 120) _endNight("sleep"); return; }
  if (kind === "lt") { const d = G.day; doCommand("long time"); if (G.day === d) doCommand("long time"); if (G.day === d) _endNight("barfine"); return; }
  doCommand("take her out");
  if (!(G.party && G.party.ids && G.party.ids.includes(id))) return "not out";
  if (kind === "home") { doCommand("send " + n + " home"); _endNight("sleep"); return; }
  _endNight("sleep");
}
function probes(id, room, colleague) {
  G.nightTurn = 20; G.room = room; G.convo = null; G.convoQ = null;
  const r = {};
  out = []; doCommand("talk to " + nm(id)); r.hello = said();
  out = []; doCommand("ask " + nm(id) + " about last night"); r.lastnight = said();
  if (colleague) { G.convo = null; out = []; doCommand("ask " + nm(colleague) + " about " + nm(id)); r.colleague = said(); }
  return r;
}
const head = t => String(t || "").split("\n").map(l => l.replace(/^.*?“[^”]*” \([^)]*\)\s*\|?\s*/, "")).find(l => l.trim() && !/^[·(]/.test(l.trim())) || "";

const sample = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess" && ROOMS[NPCS[id].room] && ROOMS[NPCS[id].room].barType &&
  (ALL || ROOMS[NPCS[id].room].region === "Soi 6") && !(typeof _drinksOnly === "function" && _drinksOnly(id)) && !NPCS[id].offmap);
const women = QUICK ? sample.filter((_, i) => i % Math.max(1, Math.floor(sample.length / 8)) === 0).slice(0, 8) : sample;

const findings = [];
let plays = 0;
for (const id of women) {
  const room = NPCS[id].room;
  for (const kind of KINDS) {
    // the control: a man who never met her, the same evening
    fresh(room); G.day += 1; G.rng = 12345; G.nightTurn = 20;
    const col0 = _npcsHere().find(x => x !== id && NPC_ROLES[x] === "hostess");
    // the node a stranger gets, full text AND its gist: a heard first-meeting hello comes back as its gist,
    // and the gist of "first time this bar?" is still a stranger's line
    const _hn = typeof _pickDialogue === "function" ? _pickDialogue(id, null) : null;
    const _snip = x => String(x || "").replace(/^[“"]/, "").replace(/\{\{|\}\}/g, "").slice(0, 36);
    const strangerHello = _hn ? [_snip(_hn.text), _snip(_hn.short)].filter(x => x.length > 12) : [];
    if (!_npcsHere().includes(id)) continue;   // not on the floor the next night (a season away, a day off)
    const ctl = probes(id, room, col0);
    // the event
    fresh(room); G.nightTurn = 65;   // after midnight: a draw is barfineable, Soi 6 still open till two
    const why = event(id, kind);
    if (why) { if (VERBOSE) console.log(`  skip ${id} ${kind}: ${why}`); continue; }
    if (G.pendingChoice === "vacation_end") continue;
    G.rng = 12345; G.room = room; G.nightTurn = 20;
    if (!_npcsHere().includes(id)) { if (VERBOSE) console.log(`  skip ${id} ${kind}: not on the floor next night`); continue; }
    const col = _npcsHere().find(x => x !== id && NPC_ROLES[x] === "hostess");
    const ev = probes(id, room, col);
    plays++;
    const bad = [];
    if (STRANGER.test(ev.hello)) bad.push(["hello", `a stranger's greeting: "${(ev.hello.match(STRANGER) || [""])[0]}"`]);
    else if (kind !== "drink" && ((head(ctl.hello) && head(ev.hello) === head(ctl.hello)) || strangerHello.some(x => ev.hello.includes(x))))
      bad.push(["hello", `her first-meeting greeting (or its gist), unchanged by the night: "${head(ev.hello).slice(0, 70)}"`]);
    if (kind !== "drink" && head(ev.lastnight) && head(ev.lastnight) === head(ctl.lastnight)) bad.push(["lastnight", `the stranger's answer to LAST NIGHT: "${head(ev.lastnight).slice(0, 70)}"`]);
    if (kind !== "drink" && ev.colleague && SHRUG.test(ev.colleague)) bad.push(["colleague", `${NPCS[col].name} shrugged her off: "${(ev.colleague.match(SHRUG) || [""])[0]}"`]);
    for (const [probe, msg] of bad) {
      const key = `${id}|${kind}|${probe}`;
      if (MEMORY_OK[key]) continue;
      findings.push({ key, id, kind, probe, msg });
    }
    if (VERBOSE) console.log(`${id} ${kind}\n  hello: ${head(ev.hello).slice(0, 90)}\n  last night: ${head(ev.lastnight).slice(0, 90)}\n  colleague: ${head(ev.colleague).slice(0, 90)}`);
  }
}
_rand = savedRand;

if (AS_JSON) { console.log(JSON.stringify({ women: women.length, plays, findings })); process.exit(0); }
for (const f of findings) console.log(`  ${f.key.padEnd(46)} ${f.msg}`);
console.log(`\nmemory audit: ${women.length} women · ${KINDS.length} kinds · ${plays} nights played · ${findings.length} findings`);
process.exitCode = findings.length ? 1 : 0;
