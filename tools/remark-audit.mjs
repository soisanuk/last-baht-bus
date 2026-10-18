#!/usr/bin/env node
// THE REMARK AUDIT — the other half of the question audit: the things a man SAYS to the woman he is talking to.
//
// Mario's fallback calls (2026-10-18): a remark nothing reads gets a neutral beat from her in its tone; she steers to
// her subjects; tone is flavour only; she remembers your news. A question nothing reads is honestly "I don't
// understand" — a remark is not a question, and "great night tonight" answered with "Sorry, I not understand" was the
// sixth baseline run's commonest stop. Each remark is typed, as a man types it, to each sampled woman mid-conversation
// (Soi 6 week, 20:00, day 3), and the answer is classed:
//   ANSWER   a beat, her subject, a mechanic that fits (the leaving, the compliment)
//   NOTUND   "I don't understand" in her voice                                    — a FAILURE for a remark
//   MISS     a topic miss ("That one I don't know") — the remark was asked as a subject — a FAILURE
//   VERB     a verb took the remark                                               — a FAILURE
//   PARSE    "didn't understand"                                                  — a FAILURE
//   METER    สนุก, her bond or the money moved on a remark                        — a FAILURE (tone is flavour)
//
//   node tools/remark-audit.mjs            Soi 6's hostesses
//   node tools/remark-audit.mjs --quick    four women (the gate)
//   node tools/remark-audit.mjs --mutate beat   prove it goes red: every beat replaced by "I don't understand"
import vm from "node:vm"; import fs from "node:fs";
const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
let out = []; engineInit(t => out.push(String(t)), null, () => {});
const args = process.argv.slice(2), QUICK = args.includes("--quick"), AS_JSON = args.includes("--json");
const mut = args.includes("--mutate") ? args[args.indexOf("--mutate") + 1] : "";
if (mut === "beat") globalThis._remarkBeat = c => _say(_fmt(_NOT_UNDERSTOOD.floor[0], { n: NPCS[c].name }));

export const REMARKS = `great night tonight|this is fun|i love this place|good music|the beer is cold|it's so hot tonight|i'm tired|this beer is warm|it's too loud in here|my feet hurt|i'm bored|everything is expensive|i'm lonely|my wife left me|i miss my kids|i had a bad week|my dog died|haha|lol|that's funny|just kidding|wow|no way|crazy|yeah|exactly|me too|fair enough|i know|pattaya is crazy|thailand is beautiful|thai people are so friendly|this town is mad|you're trouble|you're cheeky|you're funny|i used to be a teacher|i went to the beach today|i've been here three days|my son is getting married|i'm drunk|i've had a few|too much beer|the traffic was terrible|i saw an elephant today|the taxi driver was mad|i lost my sunglasses|my hotel is nice|i'm retired|the food here is great|i'm having a good time|i like your bar|i'm learning thai|the band is ok|my name is dave|i'm from leeds|i have a dog|i'm a plumber|nice weather tonight|long day`.split("|");
const REMARK_OK = {
  "i like your bar": "a compliment is the COMPLIMENT verb, which pays once a night by design",
};
const VERB_ATE = /You'd have to ask around|black book's empty|nobody here who takes that kind|give it your best shot|Telling isn't the verb|only know the way to bars|Nothing special about that|down the side of the building/;
const PARSE = /didn't understand|didn't parse|soi blinks|No idea what you're after/;
const MISS = /That one I don't know|You ask the wrong girl|not my story|Not my story/i;
const all = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess" && ROOMS[NPCS[id].room] && ROOMS[NPCS[id].room].region === "Soi 6" && !NPCS[id].offmap);
const women = QUICK ? ["kwan", "pukky", "may"].concat(all.filter(i => NPCS[i].filler).slice(0, 1)) : all;
const notUnd = Object.values(_NOT_UNDERSTOOD).flat().map(x => String(x).replace(/\{n\} ?/g, "").slice(0, 28));
function fresh(id) {
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 99; G.lastSaleng = 99999; G.money = 50000; G.nightTurn = 20; G.day = 3;
  G.room = _npcRoom(id); doCommand("talk to " + id); G.convoQ = null; out = [];
}
const saved = _rand; _rand = () => 0.42;   // a constant: the answer, not the dice (rule 2)
const findings = []; let said = 0;
for (const id of women) {
  fresh(id); if (!_npcsHere().includes(id)) continue;
  for (const r of REMARKS) {
    fresh(id);
    const h = G.happy, b = (G.soc.drinks || {})[id] || 0, m = G.money;
    doCommand(r); said++;
    const o = out.join(" ").replace(/\s+/g, " ");
    let c = "ANSWER";
    if (PARSE.test(o)) c = "PARSE"; else if (VERB_ATE.test(o)) c = "VERB"; else if (MISS.test(o)) c = "MISS";
    else if (notUnd.some(n => o.includes(n.replace(/\\"/g, '"').slice(0, 24)))) c = "NOTUND";
    else if (G.happy !== h || ((G.soc.drinks || {})[id] || 0) !== b || G.money !== m) c = "METER";
    if (c !== "ANSWER" && !REMARK_OK[r]) findings.push({ id, r, c, o: o.slice(0, 120) });
  }
}
_rand = saved;
if (AS_JSON) { console.log(JSON.stringify({ women: women.length, said, findings })); process.exit(0); }
for (const f of findings) console.log(`  ${f.c.padEnd(6)} ${f.id.padEnd(14)} ${f.r}  →  ${f.o}`);
console.log(`\nremark audit: ${women.length} women · ${REMARKS.length} remarks · ${said} said · ${findings.length} findings`);
process.exitCode = findings.length ? 1 : 0;
