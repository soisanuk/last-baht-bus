// ROUND 113 (2026-11-02) — the Fable third, on the merged tree of the three November reviews: Keith (a retired ESL
// teacher from Leeds, lens reads-every-line-aloud) played the Soi 6 week and reported every line that rang wrong with
// the room, the speaker and the clock. The Opus and Sonnet personas follow on next week's allowance.
import { test } from "node:test";
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
const t = c => { out = []; run(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const SRC = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");

test("Keith: the sniped regular has been at it 'since he sat down' at twenty to seven, not 'all evening'", () => {
  sandbox(); G.nightTurn = 6; assert.equal(_snipeSince(), "since he sat down");
  G.nightTurn = 40; assert.equal(_snipeSince(), "all evening");
  for (const f of _SNIPE_LINES) {
    const early = f("Pukky", "since he sat down");
    assert.doesNotMatch(early, /all (evening|night)/, early);
    assert.doesNotMatch(early, /temperature/, "the heat line that follows already reads the room's temperature");
    assert.match(f("Pukky", "all evening"), /Pukky/);
  }
  assert.match(SRC, /_pickVary\(_SNIPE_LINES, "snipe"\)\(NPCS\[id\]\.name, _snipeSince\(\)\)/, "the caller passes the clock");
  assert.match(SRC, /the man who was buying \{n\}'s drinks \{s\}/, "…and so does the heat's cause");
});

test("Keith: a ladyboy who said it at hello does not ask 'you didn't know?' at the barfine", () => {
  sandbox(); G.room = _npcRoom("poy"); G.nightTurn = 30;
  assert.equal(_ladyboyToldAtHello("poy"), false, "not before she has said hello");
  run("talk to poy");
  assert.equal(_ladyboyToldAtHello("poy"), true);
  for (let i = 0; i < 4; i++) {
    out = []; assert.equal(_ladyboyGate("poy"), true);
    assert.doesNotMatch(said(), /You didn't know\?|Not for you, tilac/);
    assert.match(said(), /told you at hello|said it first thing|tell you at hello/);
  }
  assert.ok(_LADYBOY_PASS_TOLD.length >= 3);
});

test("Keith: a drink for the woman on your arm is not a smile calibrated to the baht", () => {
  sandbox(); G.room = "sandy_toes"; G.nightTurn = 40; G.party = { ids: ["nina"] }; G.known.nina = 1;
  assert.equal(_outWithMe("nina"), true);
  for (let i = 0; i < 6; i++) {
    const r = t("buy nina drink");
    assert.doesNotMatch(r, /calibrated to the exact value/, r);
    assert.match(r, /Nina/);
  }
});

test("Keith: Somo knows Leeds — the old names off her uncle's radio", () => {
  for (const v of ["Leeds, for my sins", "leeds united", "West Ham", "Forest"]) {
    const r = _somoTeam(v); assert.match(r, /I know them/, v); assert.doesNotMatch(r, /Small club\?/, v);
  }
  assert.match(_somoTeam("Yeovil"), /Small club\?/);
  assert.match(_somoTeam("Liverpool"), /Right answer/);
});

test("Keith: Somsri diagnoses the third night on the third night, not the second", () => {
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 2; let r = t("talk to somsri"); assert.doesNotMatch(r, /Third night\?/, r); assert.match(r, /Early|third night/);
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 3; r = t("talk to somsri"); assert.match(r, /Third night\?/, r);
});
