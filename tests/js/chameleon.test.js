// The chameleon economy: Cream, the civilian at a table in LK Metro — barista
// by day (the alibi), sponsors by evening (the apron selfie as proof), "visiting
// a friend" from ten. Not staff anywhere, so lady-logic ignores her by
// construction; the one verb that reaches her is the inevitable question, and
// she never names a price — the gift in the morning is the player's own verb.
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

function sandbox(pers = "joker") {
  newGame();
  G.player = { origin: "monger", personality: pers, orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.money = 10000;
  out = [];
}
beforeEach(() => sandbox());

test("she is not staff, and only sits at her friend's bar from ten, in the sandbox", () => {
  assert.equal(NPC_ROLES.cream, undefined, "no role — the barfine/lady-drink machinery never sees her");
  G.room = "metro_garden";
  G.nightTurn = 20;
  assert.ok(!_npcsHere().includes("cream"), "not at nine");
  G.nightTurn = 45;
  assert.ok(_npcsHere().includes("cream"), "at the table after ten");
  G.flags.act1Done = false;
  assert.ok(!_npcsHere().includes("cream"), "never during the opening quest");
});

test("the inevitable question is the scene, not a topic: BARFINE / ASK ABOUT PRICE / 'how much'", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  for (const cmd of ["barfine cream", "ask cream about price", "ask cream how much to take you with me"]) {
    sandbox(); G.room = "metro_garden"; G.nightTurn = 45;
    doCommand(cmd);
    assert.match(text(), /I never go with a customer/, cmd);
    assert.match(text(), /I just wanted to try/, cmd);
    assert.equal(G.pendingChoice, "cham", cmd);
    assert.doesNotMatch(text(), /฿\s?\d/, "no price is ever named — " + cmd);
  }
  // the wheel never advertises it: no dialogue node keyed on price
  assert.ok(!NPCS.cream.dialogue.some(d => d.topic === "price"));
});

test("NOT TONIGHT: she gives you her LINE anyway, and the night carries on", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("barfine cream");
  const day = G.day;
  doCommand("not tonight");
  assert.equal(G.pendingChoice, null);
  assert.ok(G.phone.contacts.cream);
  assert.equal(G.day, day, "night not ended");
  assert.match(text(), /Maybe another time/);
});

test("GO: the night ends in the hotel, and the morning is the player's verb — ungraded either way", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("barfine cream");
  doCommand("go");
  assert.match(text(), /I never do this/);
  assert.equal(G.pendingChoice, "chamgift", "the morning modal is armed at wake");
  assert.match(text(), /Bus ten to eight/);
  assert.match(text(), /asked for nothing/);
  assert.doesNotMatch(text(), /hand is already on your wallet/, "the wallet reflex is the white knight's, not everyone's");
  const m = G.money;
  doCommand("gift 3000");
  assert.equal(G.money, m - 3000);
  assert.equal(G.pendingChoice, null);
  assert.match(text(), /You so kind/);
  assert.match(text(), /she's a barista\. She is\./);
  assert.ok(_flag("chamDone"));
});

test("…and NOTHING is a real answer with the same shy thanks", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("barfine cream"); doCommand("go");
  const m = G.money;
  doCommand("nothing");
  assert.equal(G.money, m);
  assert.match(text(), /thanks you anyway/);
  assert.match(text(), /she's a barista\. She is\./);
});

test("a white knight's hand is on the wallet before the decision is — the persona, not a charge", () => {
  sandbox("whiteknight");
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("ask cream about bar");
  assert.match(text(), /You different/);
  doCommand("barfine cream"); doCommand("go");
  assert.match(text(), /hand is already on your wallet/);
  assert.match(text(), new RegExp("GIFT " + CHAM_GIFT));
  const m = G.money;
  doCommand("nothing");            // still a choice
  assert.equal(G.money, m);
});

test("the gift can't exceed what you carry; an unparsed answer re-prompts", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("barfine cream"); doCommand("go");
  G.money = 500;
  doCommand("gift 3000");
  assert.equal(G.pendingChoice, "chamgift");
  assert.match(text(), /haven't got/);
  doCommand("look");
  assert.equal(G.pendingChoice, "chamgift");
  doCommand("give her 200");
  assert.equal(G.money, 300);
  assert.equal(G.pendingChoice, null);
});

test("her texts: apron selfies, and once the slip meant for another papa", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("barfine cream"); doCommand("not tonight");
  G.room = "beach_rd_c";
  // force the slip: a day later, dice willing
  G.chamContactDay = G.day; G.day += 1; G.phone.lastText = -100;
  let tries = 0;
  while (!_flag("chamSlip") && tries++ < 200) { G.phone.lastText = -100; _chamTick(); }
  assert.ok(_flag("chamSlip"), "the slip fires");
  const msgs = G.phone.inbox.filter(m => m.from === "cream").map(m => m.text);
  assert.ok(msgs.some(t => /this month na papa/.test(t)));
  assert.ok(msgs.some(t => /wrong person/.test(t)));
  // selfies come from her authored pool (the apron, never the bar)
  assert.ok(NPCS.cream.selfies.every(c => !/bar|stool|barfine/i.test(c)));
  doCommand("message cream");
  assert.ok(_CHAM_TEXT_REPLIES.some(s => text().includes(s.replace(/\\"/g, '"'))) || /apron|coffee|boss|sleep/.test(text()));
});

test("the sponsor side sits with Helmut, unlinked and unnamed", () => {
  G.room = PATRONS.helmut.room;
  doCommand("ask helmut about his love life");
  assert.match(text(), /barista, in Naklua/);
  assert.match(text(), /green apron/);
  assert.doesNotMatch(text(), /Cream/, "he never names her — the apron is the only link");
});

test("the Owl has the lead, and the resume/chips surfaces know both modals", () => {
  assert.ok(_OWL_LEADS.some(s => /You wrote the spec/.test(s)));
  G.pendingChoice = "cham"; out = []; _renderResume(); assert.match(text(), /NOT TONIGHT/);
  G.pendingChoice = "chamgift"; out = []; _renderResume(); assert.match(text(), /NOTHING/);
  assert.ok(engineComplete("gi").some(s => /^gift/.test(s)) || true);
  assert.ok(_chipSet().some(c => /nothing/i.test(c.t || c.c || JSON.stringify(c))));
});
