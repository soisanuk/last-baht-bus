// THE STUCK NUDGE. Tan texts a player who is going round in circles — the first
// system in this game that watches the player for failure, which makes its
// failure mode nagging a competent one. These tests are mostly about SILENCE:
// what must never trigger it matters more than what does.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");
const fired = () => G.stuckDay === G.day;

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 5000;
  G.phone.contacts.tan = true;     // he has had your number since the airport
  G.room = "queen_vic";
  out = [];
}
beforeEach(() => sandbox());

const junk = n => { for (let i = 0; i < n; i++) doCommand("frobnicate" + i); };

// ── it must not fire on people playing well ──

test("a completionist working one man's whole repertoire is never nudged", () => {
  // A topic that misses is ordinary conversation — this is what Rosa and Ken
  // both spent their sessions doing, and it is the false positive that would
  // make the feature obnoxious.
  for (let i = 0; i < 15; i++) doCommand("ask mort about notatopic" + i);
  assert.equal(fired(), false, "asking a man fifteen things he doesn't know is exploring, not flailing");
  assert.equal(G.stuck.n, 0, "a topic miss must not even count as friction");
});

test("ordinary play never trips it", () => {
  doCommand("look"); doCommand("talk to mort"); doCommand("ask mort about column");
  doCommand("buy beer"); doCommand("time"); doCommand("out"); doCommand("look");
  assert.equal(fired(), false);
});

test("a run of misses broken by progress starts over", () => {
  junk(8);
  assert.ok(G.stuck.n >= 6, "the run was building");
  doCommand("talk to mort");            // a new line landed: the world moved
  assert.equal(G.stuck.n, 0, "progress clears the counter");
  junk(8);
  assert.equal(fired(), false, "…so eight more is still under the bar");
});

// ── …and it must fire for somebody genuinely lost ──

test("ten hard misses across more than one place brings the text", () => {
  junk(7);
  G.room = "beach_rd_c";                // wandered off, still flailing
  junk(6);
  assert.equal(fired(), true);
  assert.match(text(), /phone buzzes/i);
  out = [];
  doCommand("check messages");
  assert.match(text(), /Tan/, "it is Tan who noticed");
});

test("a man calling for a whole cast that isn't there gets the locator, not HELP", () => {
  for (const n of ["bee", "rose", "nong", "wilai", "ping", "noi", "mem", "bank", "nira", "kwan", "dao"])
    doCommand("talk to " + n);
  assert.equal(fired(), true);
  assert.match(text(), /ASK TAN ABOUT/, "the hint is the locator he actually needs");
  out = [];
  doCommand("check messages");
  assert.match(text(), /i drive everybody/, "and Tan says it in his own voice");
});

test("Tan never breaks the fourth wall — the verb lives in the narrator's parenthetical", () => {
  junk(7); G.room = "beach_rd_c"; junk(6);
  out = [];
  doCommand("check messages");
  const his = text().match(/Tan: “([^”]+)”/);
  assert.ok(his, "he texted");
  assert.doesNotMatch(his[1], /\bHELP\b|\btype\b|\bcommand\b|\bpress\b/i,
    "the fixer talks like a fixer; the game's instructions are the narrator's job");
});

// ── the gates ──

test("no phone, no number, no nudge — and never twice in a night", () => {
  G.battery = 0;
  junk(7); G.room = "beach_rd_c"; junk(6);
  assert.equal(fired(), false, "the phone IS the mechanism");

  sandbox();
  delete G.phone.contacts.tan;
  junk(7); G.room = "beach_rd_c"; junk(6);
  assert.equal(fired(), false, "he can't text a man whose number he hasn't got");

  sandbox();
  junk(7); G.room = "beach_rd_c"; junk(6);
  assert.equal(fired(), true);
  out = [];
  junk(9); G.room = "soi6_street"; junk(6);
  assert.doesNotMatch(text(), /phone buzzes/i, "once a night is the whole point");
});

test("a modal is not being stuck — you are being asked something", () => {
  for (let i = 0; i < 14; i++) { G.pendingEnc = "peddler"; doCommand("frobnicate" + i); }
  assert.equal(fired(), false);
});

test("during Act One his rescue keeps its entrance", () => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.phone.contacts.tan = true;
  G.room = "jomtien_beach";
  junk(8); G.room = "jomtien_beach_rd"; junk(8);
  assert.equal(fired(), false, "the wallet-night rescue is his first contact, not this");
});
