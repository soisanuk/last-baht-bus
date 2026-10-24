// THE VOICES (Mario, 2026-10-24, after the American pass): one filter, a table per kind of English. Americans and
// Canadians lose the British idiom; an Australian keeps "mate" and loses the Englishman's squire and "half ten"; a man
// whose English is his second language (the Germans, the Danes, the Frenchman) speaks plain correct English with
// none of the regulars' British slang. The British and the Irish keep everything; Tan and Mort are exempt.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const t = c => { out = []; doCommand(c); return out.join("\n"); };
const speech = s => (String(s).match(/[“"][^”"]*[”"]/g) || []).join(" ");
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.money = 20000; G.bank = 20000;
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
};
beforeEach(() => sandbox());

test("each regular has the voice of his own English", () => {
  for (const [id, v] of [["dieter", "esl"], ["helmut", "esl"], ["mikkel", "esl"], ["henning", "esl"], ["ron", "au"], ["josey", "au"], ["david", "ca"], ["danny", "ca"], ["bert", "us"]])
    assert.equal(_voiceKind(id), v, id);
  for (const id of ["nigel", "colin", "fergie", "howard", "wilf", "tan", "mort"]) assert.equal(_voiceKind(id), null, id);
});

test("the same pool, four voices: an Australian keeps his mate, a German loses the bloke, a Briton keeps both", () => {
  const pool = ['"Hair tonic bloke, mate? Half ten, squire."'];
  _talkingTo = "ron"; const au = _voiceFit(pool)[0]; assert.match(au, /mate/); assert.doesNotMatch(au, /squire|half ten/i);
  _talkingTo = "dieter"; const de = _voiceFit(pool)[0]; assert.doesNotMatch(de, /bloke|\bmate\b|squire|half ten/i);
  _talkingTo = "danny"; assert.doesNotMatch(_voiceFit(pool)[0], /bloke|squire|half ten/i);
  _talkingTo = "nigel"; assert.deepEqual(_voiceFit(pool), pool);
  _talkingTo = null;
});

test("asked the town's questions, every voiced regular answers in his own English", () => {
  const bad = [];
  for (let seed = 1; seed <= 4; seed++) for (const id of ["mikkel", "helmut", "dieter", "ron", "josey", "danny", "david"]) {
    sandbox(); G.rng = seed * 7919; const r = _npcRoom(id) || NPCS[id].room; G.room = r; G.nightTurn = 25 + seed;
    if (!_npcsHere().includes(id)) continue;
    const re = _VOICES[_voiceKind(id)][0], nm = NPCS[id].name.toLowerCase();
    for (const q of ["closing", "what time do you open", "busy", "massage", "cons", "hotel", "a job", "bangkok", "police"]) {
      const s = speech(t(`ask ${nm} about ${q}`).replace(/\(.*?\)/g, ""));
      if (re.test(s)) bad.push(`${id}/${q}: ${s.match(re)[0]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("a voiced regular's own lines carry nothing his voice would not say", () => {
  const bad = [];
  for (const id of Object.keys(NPCS)) { const k = _voiceKind(id); if (!k || k === "us") continue;
    (NPCS[id].dialogue || []).forEach((d, i) => { for (const f of [d.text, d.short]) if (typeof f === "string" && _VOICES[k][0].test(speech(f))) bad.push(`${id}#${i}`); }); }
  assert.deepEqual(bad, []);
});
