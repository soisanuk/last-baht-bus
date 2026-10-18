// THE FALLBACK CALLS (Mario, 2026-10-18 — "go for it"): a remark nothing reads gets a neutral beat from her, in its
// TONE; every other beat she steers you to one of her subjects, with the tap; tone is flavour and moves nothing; and
// what you tell her — your name, where you are from, your job, your dog — she keeps, herself, and brings up on a later
// night once a trip. tools/remark-audit.mjs plays sixty remarks at the Soi 6 floor; this file gates it and pins the
// pieces.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const tool = fileURLToPath(new URL("../../tools/remark-audit.mjs", import.meta.url));
const audit = (...a) => JSON.parse(execFileSync(process.execPath, [tool, "--json", ...a], { encoding: "utf8" }));

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.flowerDay = G.day;
  G.room = "sunset_rail"; run("talk to pukky"); G.convoQ = null; out = [];
});

test("every remark reaches her as a remark: no 'I don't understand', no topic miss, no verb, no meter moved", () => {
  const r = audit("--quick");
  assert.ok(r.said > 150);
  assert.deepEqual(r.findings, [], r.findings.map(f => `${f.c} ${f.id}: ${f.r} → ${f.o}`).join("\n"));
});

test("the audit goes red when the beat is 'I don't understand'", () => {
  assert.ok(audit("--quick", "--mutate", "beat").findings.length > 50);
});

test("the beat is in the remark's tone, and moves nothing", () => {
  const h = G.happy, b = G.soc.drinks.pukky || 0;
  const tones = { "my wife left me": "sad", "this beer is warm": "bad", "haha": "laugh", "i'm drunk": "drunk", "pattaya is crazy": "town", "you're trouble": "tease" };
  for (const [r, tone] of Object.entries(tones)) {
    assert.equal(_remarkTone(r), tone, r);
    out = []; run(r); assert.ok(_REMARK.floor[tone].some(l => said().includes(l.replace(/^She\b/, "Pukky").slice(0, 22))), r + ": " + said());
  }
  assert.equal(G.happy, h); assert.equal(G.soc.drinks.pukky || 0, b);
});

test("every other beat she offers a subject you have not asked her, with the tap", () => {
  run("great night tonight"); run("this beer is warm");
  const m = said().match(/\(ASK PUKKY ABOUT ([A-Z ]+)\)/);
  assert.ok(m, said());
  out = []; run(m[0].slice(1, -1).toLowerCase()); assert.doesNotMatch(said(), /don't know about that|wrong girl|didn't parse/, said());
});

test("what you tell her she keeps herself, and says back on a later night, once a trip", () => {
  run("my name is anan"); run("i'm from perth"); run("i have a dog called rex");
  assert.equal(G.toldTo.pukky.name.v, "anan");
  out = []; run("talk to pukky"); assert.doesNotMatch(said(), /Hello, Anan/, "not the same night");
  G.day++; out = []; run("talk to pukky"); assert.match(said(), /Anan/, said());
  out = []; run("what's my dog called"); assert.match(said(), /Rex/);
  out = []; run("where am i from"); assert.match(said(), /Perth/);
  G.day++; out = []; run("talk to pukky"); assert.doesNotMatch(said(), /Hello, Anan|Anan\./, "once a trip for the name");
});

test("another woman does not know what you told Pukky", () => {
  run("my name is anan");
  run("talk to kwan"); G.convoQ = null; G.room = _npcRoom("kwan"); run("talk to kwan"); G.convoQ = null; out = [];
  run("what's my name"); assert.doesNotMatch(said(), /Anan/, said());
});

test("no British idiom in a Thai house mouth; the farang register keeps his own", () => {
  const house = Object.values(_HEARD.house).flat().concat(Object.values(_REMARK.house).flat(), _STEER.house).join("\n");
  assert.doesNotMatch(house, /\blove\b,|\bmate\b|right you are|blimey|bloody|cheers,|innit|beer mat/i);
  assert.ok(Object.values(_HEARD.farang).flat().length > 10);
});
