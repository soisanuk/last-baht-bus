#!/usr/bin/env node
// THE QUESTION AUDIT — the hundred things a man asks the woman he is talking to.
//
// Steve's third baseline run (2026-10-14) was stopped 22 times in a week, and two thirds were the parser grabbing a
// WORD before she got the SENTENCE: "where did you learn English?" got the street directions, "who looks after your
// kids?" opened the black book, "can you speak English?" was SAY. Mario asked what the hundred most common questions
// to a hostess would be, and whether the framework could hold them; this is the measurement that answered it.
//
// Each question is typed, as a man types it, to each sampled woman mid-conversation (Soi 6 week, 20:00, day 3), and
// the answer is classed:
//   ANSWER   something on the subject (her node, the town's row, small talk, a mechanic)
//   BUCKET   the sentence reader's in-character catch-all (affection, question, plan, food, generic) — no subject
//            holds it yet; this list is the WORK QUEUE for writing, never a failure
//   VERB     a verb took the sentence instead of her (the street directions, the black book, SAY, TELL's lecture,
//            "nobody takes that kind of instruction") — a FAILURE
//   PARSE    "didn't understand" — a FAILURE
//
//   node tools/question-audit.mjs            Soi 6's hostesses
//   node tools/question-audit.mjs --quick    four women (the gate)
//   node tools/question-audit.mjs --bucket   list the bucketed questions (the writing queue)
//   node tools/question-audit.mjs --mutate route   prove it goes red: the routing rule switched off
//
// QUESTION_OK: "<question>" → reason, for a VERB or PARSE that is right.
import vm from "node:vm"; import fs from "node:fs";
const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
let out = []; engineInit(t => out.push(String(t)), null, () => {});
const args = process.argv.slice(2), QUICK = args.includes("--quick"), BUCKETS = args.includes("--bucket"), AS_JSON = args.includes("--json");
const mut = args.includes("--mutate") ? args[args.indexOf("--mutate") + 1] : "";
if (mut === "route") globalThis._toHer = () => false;

export const QUESTIONS = `What's your name?|What's your real name?|Is that a nickname?|Where are you from?|Are you from Isan?|What village are you from?|Is it far?|How old are you?|Do you have kids?|How old are your kids?|Who looks after your kids?|Are your mum and dad ok?|Do you have brothers or sisters?|Do you send money home?|Are you married?|Have you been married?|Do you have a boyfriend?|Do you have a farang boyfriend?|How long have you worked here?|Do you like your job?|Where did you work before?|Why do you work in a bar?|Is it hard work?|How much do you earn?|Do you get a salary?|How many hours do you work?|Do you have a day off?|Is the mamasan nice?|Are the other girls your friends?|Where do you live?|Do you live with the other girls?|Are you tired?|How much is the barfine?|How much for short time?|How much for long time?|Can you come with me?|What time do you finish?|Can I take you out?|Do you go with every man?|Do you get money from lady drinks?|How many drinks have you had tonight?|Is the bar busy tonight?|Are you busy later?|Can I have your number?|Do you have LINE?|Do you like me?|Do you have many boyfriends?|Do you love me?|Will you miss me?|Would you come to England?|Do you want to marry a farang?|Are you happy?|Are you lonely?|What kind of man do you like?|Am I handsome?|Am I too old for you?|Do you remember me?|What do you do on your day off?|What do you like to eat?|Do you like spicy food?|Have you eaten?|Do you go out after work?|Do you have a motorbike?|Do you go to the temple?|Are you Buddhist?|Do you like football?|What music do you like?|Can you sing?|Do you like karaoke?|What is your plan?|How long will you work here?|Do you want to go home?|Do you want to open a shop?|Are you saving money?|Did you go to school?|Have you been to Bangkok?|Have you been abroad?|Do you want more children?|Where do you think I'm from?|How old do you think I am?|Do you like farang?|Do you like old men?|Where did you learn English?|Can you speak English?|Where is good to eat?|Where is the toilet?|What time does the bar close?|What does sanuk mean?|How do you say beautiful in Thai?|Can you teach me Thai?|Is it going to rain?|Will you be here tomorrow?|Do you want a drink?|Are you hungry?|What's your favourite drink?|Do you smoke?|Do you like dancing?|Do you have Facebook?|What's your star sign?|Do you believe in ghosts?|You having a good time?`.split("|");
const QUESTION_OK = {
  "Where is the toilet?": "a question about the bar, not her: the room answers it",
};
const VERB_ATE = /You'd have to ask around|black book's empty|nobody here who takes that kind|give it your best shot|Telling isn't the verb|only know the way to bars|Nothing special about that|down the side of the building/;
const PARSE = /didn't understand|didn't parse|soi blinks|No idea what you're after/;

const all = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess" && ROOMS[NPCS[id].room] && ROOMS[NPCS[id].room].region === "Soi 6" && !NPCS[id].offmap);
const women = QUICK ? ["kwan", "pukky", "may"].concat(all.filter(i => NPCS[i].filler).slice(0, 1)) : all;
const bucketLines = new Set(Object.values(_HEARD).flatMap(r => Object.values(r).flat()).map(x => String(x).slice(0, 30)));
function fresh(id) {
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 99; G.lastSaleng = 99999; G.money = 50000; G.nightTurn = 20; G.day = 3;
  G.room = _npcRoom(id); doCommand("talk to " + id); G.convoQ = null; out = [];
}
const saved = _rand; _rand = () => 0.42;   // a constant: the answer, not the dice (rule 2)
const findings = [], bucketed = {}; let asked = 0;
for (const id of women) {
  fresh(id); if (!_npcsHere().includes(id)) continue;
  for (const q of QUESTIONS) {
    fresh(id); doCommand(q); asked++;
    const o = out.join(" ").replace(/\s+/g, " ");
    let c = "ANSWER";
    if (PARSE.test(o)) c = "PARSE"; else if (VERB_ATE.test(o)) c = "VERB";
    else if ([...bucketLines].some(b => o.includes(b.replace(/\\"/g, '"').slice(0, 24)))) c = "BUCKET";
    if (c === "BUCKET") (bucketed[q] = bucketed[q] || []).push(id);
    if ((c === "PARSE" || c === "VERB") && !QUESTION_OK[q]) findings.push({ id, q, c, o: o.slice(0, 120) });
  }
}
_rand = saved;
if (AS_JSON) { console.log(JSON.stringify({ women: women.length, asked, findings, bucketed: Object.keys(bucketed).length })); process.exit(0); }
for (const f of findings) console.log(`  ${f.c.padEnd(6)} ${f.id.padEnd(14)} ${f.q}  →  ${f.o}`);
if (BUCKETS) { console.log("\nBUCKETED (the writing queue):"); for (const [q, ids] of Object.entries(bucketed).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${String(ids.length).padStart(3)}  ${q}`); }
console.log(`\nquestion audit: ${women.length} women · ${QUESTIONS.length} questions · ${asked} asked · ${findings.length} findings · ${Object.keys(bucketed).length} questions still bucketed`);
process.exitCode = findings.length ? 1 : 0;
