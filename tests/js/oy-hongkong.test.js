// MADAM OY'S HONG KONG (Mario, 2026-10-18): the reader's pass on the named house women found her the most polished
// voice in the game with no reason in her story. Mario's call was the opposite of a rewrite — give her the reason:
// eight years in Hong Kong in the nineties, shown in the office (a fourth photograph, a calendar) and on the back of her left shoulder (a
// single character under the blouse, glimpsed once, never read out — a wrist is where you put one to be seen), said in two nodes and no more. What else she learned
// there is a hook for later and is never named; no real club, company or society (docs/guardrails.md).
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

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.nightTurn = 30; G.room = "rainbow_girls"; out = [];
});

test("her English has a reason now: Oy is fluent-for-a-reason, so the house pools stay fluent for her", () => {
  assert.ok(_FLUENT_THAI.has("oy"));
  assert.equal(_thaiHouse("oy"), false, "not the Thai house voice");
  assert.match(NPCS.oy.desc, /Hong Kong/); assert.match(NPCS.oy.desc, /not in Thai/); assert.doesNotMatch(NPCS.oy.desc + ROOMS.rainbow_girls.reads.tattoo, /wrist/, "not where it would be seen");
});

test("the office shows it: the fourth photograph and the calendar; the wrist is a close look at her bar", () => {
  G.room = "oy_office"; out = []; run("examine photos");
  assert.match(said(), /Hong Kong/); assert.match(said(), /Kowloon/); assert.match(said(), /farm gate/, "the old frames stay");
  out = []; run("examine calendar"); assert.match(said(), /Hong Kong/); assert.match(said(), /inked out/);
  G.room = "rainbow_girls"; out = []; run("examine tattoo"); assert.match(said(), /left shoulder/); assert.doesNotMatch(said(), /didn't understand|don't see/);
  out = []; run("examine her shoulder"); assert.match(said(), /left shoulder/);
});

test("Hong Kong is hers to tell after a proper hello, and a stranger gets the chit look", () => {
  run("talk to oy"); out = []; run("ask oy about hong kong");
  assert.match(said(), /reading my photographs/); assert.doesNotMatch(said(), /Eight years/);
  _setFlag("waiedOy"); out = []; run("ask oy about hong kong");
  assert.match(said(), /Eight years/); assert.match(said(), /Wan Chai/); assert.match(said(), /The English I kept/);
  out = []; run("ask oy about your english"); assert.match(said(), /Eight years|English I kept/, "her English is the same subject");
});

test("the shoulder: a customer is told a young woman's mistake; the detective is told he knows what it is", () => {
  run("talk to oy"); out = []; run("ask oy about tattoo");
  assert.match(said(), /young enough to make and old enough to keep/);
  G.player.origin = "pi"; G.talked.oy = []; out = []; run("ask oy about your shoulder");
  assert.match(said(), /you know what it is/i); assert.match(said(), /Detective/);
});

test("nothing names what she left there: no society, no real club, the character never read out", () => {
  const text = [NPCS.oy.desc, ...NPCS.oy.dialogue.map(d => d.text + " " + (d.short || "")),
    ...Object.values(ROOMS.oy_office.reads), ROOMS.rainbow_girls.reads.tattoo].join("\n");
  assert.doesNotMatch(text, /triad|14k|sun yee on|wo shing|society|gang|mafia|[一-鿿]/i);
});
