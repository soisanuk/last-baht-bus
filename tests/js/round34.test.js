// Round 34 — three personas: Marcus (Sonnet, the man who won't wai — drove the
// safe route blind and found the hint misdirecting it), Frank (Fable, the
// one-woman man — the courtship register), Gerry (Opus, the after-hours hunt).
// One test per finding, so none of them can come back.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"));
}

let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };

beforeEach(() => {
  out = []; newGame();
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  for (const k in ENCOUNTERS) G.encDone[k] = true;
});

// The Act One hint says, verbatim, "Candy, Ploy, Pim and Daeng each hold a
// piece — ASK ANY OF THEM ABOUT OY." Marcus obeyed it literally for three
// nights: Candy answered OY with reminiscence (her som tam — the one true key
// to the safe route — hung on topic WALLET), Ploy answered OY with flavor (her
// nudge lived only on the waiedPloy path, unreachable for a man who won't
// wai), and the DJ's gate fell through to a generic miss whose line — "Not
// yet, na. Maybe later" — reads on that ask as a TIMING gate, so he retried at
// different hours all night. The game's own hint misdirected its own puzzle.
// This walks his exact strategy and asserts the route now assembles.
test("the literal hint-follower's strategy reaches the office (Marcus)", () => {
  G.stage = "act1"; _setFlag("knowMot"); _setFlag("knowOyHasIt"); G.money = 0;
  G.room = "candy_bar";
  out = []; run("ask candy about oy");
  assert.equal(G.itemLoc.som_tam, "inventory", "asking Candy ABOUT OY yields the som tam");
  assert.match(text(), /Ploy/, "…and names who it's for");
  G.room = "rainbow_girls";
  out = []; run("ask ploy about oy");
  assert.match(text(), /dinner|Candy know my order/i, "Ploy's OY answer points at her stomach, no wai required");
  out = []; run("ask dj about sabai sabai");
  assert.match(text(), /cage|Ploy/, "the DJ's refusal names the gate, not a fake 'later'");
  assert.doesNotMatch(text(), /Not yet, na/, "the generic miss no longer answers this ask");
  run("give som tam to ploy");
  assert.ok(_flag("knowDoorTrick"), "fed, she gives the trick");
  run("ask dj about sabai sabai");
  assert.ok(_flag("sabaiPlaying"), "and now he plays it");
  out = []; run("go office");
  assert.equal(G.room, "oy_office", "the door forgets to lock, exactly as promised");
});

// …and the polite-route asker keeps her original node: WALLET still works.
test("the wallet-topic route to the som tam is untouched (Marcus)", () => {
  G.stage = "act1"; _setFlag("knowMot"); _setFlag("knowOyHasIt");
  G.room = "candy_bar";
  run("ask candy about wallet");
  assert.equal(G.itemLoc.som_tam, "inventory", "the scripted playthrough's path still pays");
  // and a second ask by either topic doesn't double-give
  G.itemLoc.som_tam = "nowhere"; G.talked.candy = [];
  run("ask candy about oy");
  assert.notEqual(G.itemLoc.som_tam, "inventory", "somTamAccepted guards the re-give");
});

// A proud man offering the one respectful gesture he owns got "I didn't
// understand that." — the house rule is that a plausible verb never dead-ends
// in a parse miss.
test("SHAKE HAND gets a voiced answer, not a parse miss (Marcus)", () => {
  G.room = "rainbow_girls";
  out = []; run("shake hand with oy");
  assert.doesNotMatch(text(), /didn't understand/, "no bare miss");
  assert.match(text(), /handshake|wai/i, "a voiced, cultural answer");
});
