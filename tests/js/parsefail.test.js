// A PARSE FAILURE ESCALATES (Mario, 2026-10-18): "when input isn't parseable we should throw a clear warning that
// the input needs to be properly phrased. three failed parses in a row triggers an examples modal" — and then "on
// first parse failure 'The soi blinks at you' is fine, second gets the new warning, third gets the examples card".
// The engine prints each step; the third arms _examplesDue(), which term.js reads after each command to open the
// card (tests/e2e/examples.spec.mjs drives that half).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text: String(text), cls }));
const said = () => out.map(o => o.text).join("\n");
const run = c => doCommand(c);
const huh = () => out.some(o => _HUH.includes(o.text) || o.text === _HUH_THAI || o.text === _HUH_THAI_SOFT);

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day;
  G.room = "sunset_dreams"; _examplesDue(); run("look"); out = [];
});

test("the first miss is the soi's shrug; the second in a row is the plain warning, with commands that work here", () => {
  run("flibber wobble");
  assert.ok(out.some(o => o.text === _HUH_SOFT[0]), said());
  assert.ok(!out.some(o => o.cls === "warn"), "no warning for one typo");
  assert.doesNotMatch(said(), /\(Try:/);
  out = []; run("zzk qq");
  const w = out.find(o => _HUH_WARN.includes(o.text));
  assert.ok(w, said()); assert.equal(w.cls, "warn", "the game's own voice, styled as a warning");
  assert.match(w.text, /didn't (understand|parse)/); assert.match(w.text, /verb/, "it says how to phrase it");
  assert.match(said(), /\(Try: [A-Z]/, "with examples to tap");
  assert.equal(_examplesDue(), false, "two is not three");
});

test("three in a row arm the examples modal once; anything that works in between resets the count", () => {
  run("flibber"); run("wobble wobble"); assert.equal(_examplesDue(), false);
  run("look"); run("zzk qq"); run("blorp"); assert.equal(_examplesDue(), false, "a good command broke the run");
  run("snorf"); assert.equal(_examplesDue(), true, "the third in a row");
  assert.equal(_examplesDue(), false, "asked once, cleared");
  assert.match(said(), /Three in a row/);
});

test("a nested hand-off is one failure per thing typed, not two", () => {
  run("talk to kwan"); G.convoQ = null; out = [];
  run("great night tonight"); run("lovely shoes in the moonlight"); assert.equal(_examplesDue(), false);
});

test("a sentence to the woman you are talking to: her own line first, then the game says plainly it couldn't read it", () => {
  run("talk to kwan"); G.convoQ = null; out = [];
  run("great night tonight");
  assert.match(said(), /Kwan/); assert.ok(!out.some(o => o.cls === "warn"), "the first time, her shrug is the answer");
  out = []; run("the purple sky is grumpy");
  assert.match(said(), /didn't parse|couldn't read|didn't follow/, said());
  assert.match(said(), /ASK KWAN ABOUT/, "the examples are hers");
});

test("Thai the game cannot read: the soi's line first, the plain warning second", () => {
  run("ไก่ทอดหอมมาก"); assert.ok(out.some(o => o.text === _HUH_THAI_SOFT), said());
  out = []; run("ไก่ทอดอร่อยมาก"); assert.ok(out.some(o => o.text === _HUH_THAI && o.cls === "warn"), said());
});

test("every example the game offers is a command it takes, in a street, a bar, a conversation and a prompt", () => {
  const states = [
    () => { G.room = "soi6_street"; },
    () => { G.room = "sunset_dreams"; },
    () => { G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null; },
    () => { G.room = "queen_vic"; },
  ];
  for (const set of states) {
    newGame(); G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
    G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
    for (const k in ENCOUNTERS) G.encDone[k] = true; G.nightTurn = 40; G.money = 20000;
    set();
    const snap = serializeGame();
    for (const e of _examples(8)) {
      deserializeGame(snap); out = []; run(e.cmd);
      assert.ok(!huh(), `${G.room}: "${e.cmd}" (${e.what}) did not parse: ${said()}`);
      assert.ok(out.length, `"${e.cmd}" said something`);
    }
  }
});
