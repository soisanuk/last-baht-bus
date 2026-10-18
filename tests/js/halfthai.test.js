// THE HALF-THAI PLAYER (Mario, 2026-10-18): the ninth origin — a Thai mother, grown up in Perth, kitchen Thai on an
// Australian passport — after Anan's Thai-only week was called farang throughout and told "in this car we speak
// English". The minimum build: the taxi choice, Tan's read, the canned answers, no "poot Thai geng" (he is clocked
// once instead), and the English-switch register from the first word. His own Soi 6 character and the sweep of
// "farang" said to his face are the next pass.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);

beforeEach(() => { newGame(); out = []; });

test("the ninth origin is appended last, so the eight before keep their numbers; the intro takes 9", () => {
  assert.equal(ORIGINS.length, 9); assert.equal(ORIGINS[8].id, "halfthai"); assert.equal(ORIGINS[7].id, "nomad");
  G.player = {}; G.pendingChoice = "intro"; G.introStep = 0; G.introAfter = "beach";
  out = []; run("9");
  assert.equal(G.player.origin, "halfthai"); assert.match(said(), /Luk khrueng/); assert.match(said(), /kitchen/i);
});

test("Thai in the car from a luk khrueng gets no party-trick compliment and no 'farang whatever you say'", () => {
  G.player = { origin: "halfthai" }; G.pendingChoice = "intro"; G.introStep = 1; G.introAfter = "beach";
  out = []; run("ผมเป็นลูกครึ่งครับ");   // Thai the table cannot read reaches Tan as Thai (a number is translated first)
  assert.match(said(), /Kitchen Thai/); assert.doesNotMatch(said(), /พูดไทยเก่งมาก|farang whatever you say/);
});

test("his Thai starts at the register the room answers in English; nobody says poot Thai geng — he is clocked, once", () => {
  G.player = { origin: "halfthai", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true;
  assert.equal(_thaiRegister(), "adequate");
  G.room = "sunset_rail"; run("talk to pukky"); G.convoQ = null;
  out = []; run("สวัสดีครับ"); assert.doesNotMatch(said(), /poot Thai geng|Poot Thai dai|You speak Thai!/, said());
  assert.match(said(), /Luk khrueng|you are half|Khon Thai/, "clocked");
  out = []; run("ขอบคุณครับ"); assert.doesNotMatch(said(), /Luk khrueng|you are half|Khon Thai|poot Thai/, "once");
});

test("his canned answers and Tan's ride question carry the origin", () => {
  for (const k of ["home", "job", "here"]) assert.ok(ASK_REPLIES[k].some(r => r.origin === "halfthai"), k);
  const s = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(s, /halfthai: "whether the town has decided yet what you are"/);
});
