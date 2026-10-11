// ROUND 81 (2026-10-11) — Joost Verhoeven (Opus), a quality engineer on a 390×844 phone testing what
// the previous QA run did not: every surface against its label, determinism, reloads across screens,
// layout. No severe. Determinism held to the last byte of the save. "Nothing here loses a player's week;
// it just occasionally tells him something that isn't so."
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
const src = f => readFileSync(fileURLToPath(new URL(`../../web/${f}`, import.meta.url)), "utf8");

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});

test("JOURNAL RECORD's 'still open' is what you have not heard", () => {
  G.room = "sweet_tamarind"; run("talk to ple");
  for (const t of _convoTopics("sweet_tamarind_ple", { all: true })) run("ask ple about " + t);
  out = []; run("journal record");
  assert.doesNotMatch(said().split("\n").find(l => /Ple/.test(l)) || "", /still open/);
});

test("the house knows a man who sat in its bar earlier this week", () => {
  G.room = "sweet_tamarind"; G.visitDay = { sweet_tamarind: 1 }; G.day = 2;
  run("talk to view"); out = []; run("ask view about last time");
  assert.match(said(), /This week — you sit here already/); assert.doesNotMatch(said(), /No last time/);
  G.day = 1; out = []; run("ask tukta about last time"); assert.doesNotMatch(said(), /This week/, "the first night is still the first night");
});

test("the barfine menu's emphasis is not a tap; the readouts are free; IN offers no shutters", () => {
  assert.doesNotMatch(src("js/engine-systems.js"), /her WHOLE night/);
  G.room = "soi6_mid"; const t = G.turns;
  for (const c of ["contacts", "messages", "column"]) run(c);
  assert.equal(G.turns, t, "three readouts, no turns");
  G.room = "soi6_west_in"; G.nightTurn = 70;
  assert.deepEqual(_navEnter(), [], "every front is shuttered");
});

test("a Soi 6 short time takes the half hour it says; Somo sits, she does not go", () => {
  G.room = "ruby_kiss"; G.soc.drinkCount = { wilai: 1 }; run("barfine wilai"); const t = G.nightTurn; run("short time");
  assert.ok(G.nightTurn - t >= 3, "the clock moved: " + (G.nightTurn - t));
  assert.equal(_drinksOnly("somo"), true);
});

test("the last night's sleep chip says the week ends; a reload at the week's end redraws the card", () => {
  G.room = _hotelRoomId(); G.day = 7;
  assert.ok(_chipSet().some(c => /end the week/.test(c.label || "")));
  G.mode = "soi6"; G.pendingChoice = "vacation_end"; out = []; _renderResume();
  assert.ok(_shareCard().some(l => said().includes(l)), "the card is back");
  assert.match(src("js/main.js"), /Back to your finished week\?/);
});

test("Terry's 'best show in Pattaya' is an evening line; the Vic's drizzle does not empty the soi", () => {
  G.room = "queen_vic"; G.nightTurn = 75; out = []; run("talk to terry");
  assert.doesNotMatch(said(), /Best show in Pattaya/);
  assert.doesNotMatch(src("js/engine-systems.js"), /sprints past the window holding a stool/);
});
