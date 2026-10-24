// AN AMERICAN DOES NOT SAY "MATE" (Mario, 2026-10-24): the American cast's own lines, and the shared registers
// they speak (the punter on his stool, the farang on the house side), carry no British idiom. Tan is exempt — his
// English is Ohio and the pavement both — and so is Mort, who keeps forty-one years of a British paper's subs and
// says so when asked.
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
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.money = 20000; G.bank = 20000;
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
};
const CORE = /\b(mate|mates|bloke|blokes|fortnight|holiday|lads?|sorted|car park|biro|on the tools|did the sums|mum|squire|motorway|pavement|you'?ve not|they'?ll not|cropper|fair play|(?:i|he|she|we|you|it)'(?:ll|d) not|stand us one|stand a man a drink|punters?|half (?:two|three|ten|eleven)|mind\.|as such|rather the point|haven'?t the room|turns up|cop shop|pot the black|civili[sz]ed|year and a bit|near enough|old boy|dearest|of an? (?:evening|night)|the bins|lying about|poke about|demob|good on you|private ticket|gussy|a one of you|shift the beer|didn't he\.)\b/i;   // and the American reader's classes (2026-10-24)
const speech = s => (String(s).match(/[“"][^”"]*[”"]/g) || []).join(" ");
const AMERICANS = Object.keys(NPCS).filter(id => _americanVoice(id));
beforeEach(() => sandbox());

test("the American cast is found, and Tan and Mort are not in it", () => {
  for (const id of ["bert", "bob", "doyle", "fast_eddy", "kyle", "randy", "angela", "nont"]) assert.ok(AMERICANS.includes(id), id);
  assert.ok(!AMERICANS.includes("tan") && !AMERICANS.includes("mort"));
});

test("an American's own lines carry no British idiom", () => {
  const bad = [];
  for (const id of AMERICANS) (NPCS[id].dialogue || []).forEach((d, i) => {
    for (const f of [d.text, d.short, d.asks && d.asks.q, ...(d.choices || []).flatMap(c => [c.text, c.reply])])
      if (typeof f === "string" && CORE.test(speech(f))) bad.push(`${id}#${i}: ${speech(f).match(CORE)[0]}`);
  });
  assert.deepEqual(bad, []);
});

test("a shared pool speaks American when an American is talking, and British to anyone else", () => {
  const pool = ['"Proper job, mate."', '"Good job."'];
  _talkingTo = "doyle"; assert.deepEqual(_voiceFit(pool), ['"Good job."']);
  assert.doesNotMatch(_voiceFit(['"Heard you came a cropper, mate. Fair play."'])[0], CORE);
  _talkingTo = "nigel"; assert.deepEqual(_voiceFit(pool), pool);
  _talkingTo = "tan"; assert.deepEqual(_voiceFit(pool), pool);
  _talkingTo = "mort"; assert.deepEqual(_voiceFit(pool), pool);
  _talkingTo = null;
});

test("the rail's Americans, asked the town's questions, answer in American", () => {
  const bad = [];
  for (let seed = 1; seed <= 4; seed++) for (const id of ["doyle", "angela", "randy", "bert", "bob", "kyle", "superman"]) {
    sandbox(); G.rng = seed * 7919; const r = _npcRoom(id) || NPCS[id].room; G.room = r; G.nightTurn = 25 + seed;
    if (!_npcsHere().includes(id)) continue;
    const nm = NPCS[id].name.toLowerCase();
    for (const q of ["closing", "massage", "cons", "a job", "bangkok", "the season", "police", "money", "remember me"]) {
      const s = speech(t(`ask ${nm} about ${q}`).replace(/\(.*?\)/g, ""));
      if (CORE.test(s)) bad.push(`${id}/${q}: ${s.match(CORE)[0]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("Mort says why he talks like that", () => {
  G.room = "queen_vic"; G.nightTurn = 20; t("talk to mort");
  assert.match(t("ask mort about accent"), /Baltimore/);
  assert.match(NPCS.mort.desc, /American underneath/);
});
