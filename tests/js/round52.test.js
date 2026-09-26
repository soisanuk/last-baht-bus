// Round 52 (2026-09-26) — the rest of Graham's round (lens: identifiability). The
// real-world findings shipped as the rename of 2026-09-26; these are the ordinary
// bugs a man collects while walking every soi looking for a sign he recognises.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});
const huh = new RegExp(_HUH.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));

test("a choice label typed after the conversation lapsed is 'that moment's passed', never a verb", () => {
  // Kesinee's greeting prints (… · PRESS HER FOR NAMES); Graham typed it back after
  // walking out and got TRAVEL's "you only know the way to bars". A label the game
  // printed is answered by the game, live partner or none.
  G.room = _npcRoom("kesinee"); doCommand("talk to kesinee");
  assert.ok(_convoChoices("raw").some(c => /press her for names/i.test(c.label)), "the label was offered");
  G.room = "beach_rd_c"; out = [];
  doCommand("press her for names");
  assert.match(text(), /moment's passed/, "the lapsed label is answered");
  assert.doesNotMatch(text(), /only know the way|didn't understand/);
  assert.equal(G.room, "beach_rd_c", "and nobody walked anywhere");
});

test("the No. 71 poster reads under every noun its room advertises, and the staff point at it", () => {
  G.room = "crystal_palace";
  for (const c of ["examine dancers", "examine 71", "examine no. 71", "examine lineup"]) {
    out = []; doCommand(c);
    assert.match(text(), /dancers in numbered order/, `${c} reads the poster`);
  }
  // before Oy's office it is a circle; after, it is her
  out = []; doCommand("examine poster"); assert.doesNotMatch(text(), /Madam Oy/);
  _setFlag("hasWallet"); out = []; doCommand("examine poster"); assert.match(text(), /Madam Oy/);
  // the mamasan under it does not shrug — she points (EXAMINE POSTER)
  doCommand("talk to rin"); out = []; doCommand("ask rin about 71");
  assert.match(text(), /\(EXAMINE POSTER\)/, "a fixture of her own room is not 'not my story'");
  assert.doesNotMatch(text(), /wrong mama|don't know about that/);
  // and only for fixtures the room actually has — nonsense still misses
  out = []; doCommand("ask rin about photosynthesis");
  assert.doesNotMatch(text(), /EXAMINE/);
});

test("ASK <him> ABOUT HIMSELF, from a man with no self-topic, is his hello — the gist once heard", () => {
  G.room = "stinky_bar"; G.nightTurn = 30;
  doCommand("talk to doug"); out = [];
  doCommand("ask doug about himself");
  assert.doesNotMatch(text(), /No idea, mate|somebody who was there/, "not a miss from the man himself");
  assert.match(text(), /Doug, Calgary/, "his own introduction, terse");
});

test("TRAVEL stops at the last lit room before the dark with the torch off; the same TRAVEL again walks it", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;
    G.room = "jomtien_beach"; G.visited.queen_vic = true; G.lightOn = false; G.nightTurn = 50;
    const route = _path("jomtien_beach", "queen_vic");
    const firstDark = route.findIndex(r => ROOMS[r].dark);
    assert.ok(firstDark > 0, "the route has a lit stretch then a dark one");
    out = []; doCommand("travel queen vic");
    assert.equal(G.room, route[firstDark - 1], "stopped at the threshold, not in the dark");
    assert.match(text(), /LIGHT ON first/, "where LIGHT ON is a thing you can do");
    // insisting is allowed — the same order from the threshold walks it blind
    out = []; doCommand("travel queen vic");
    assert.equal(G.room, "queen_vic", "the second TRAVEL walks the dark");
    assert.match(text(), /soi dogs pick the route/, "and says so");
    // with the light ON there is no stop at all
    newGame(); _setFlag("act1Done"); G.stage = "vacation";
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
    G.room = "jomtien_beach"; G.visited.queen_vic = true; G.lightOn = true; G.battery = 80; G.nightTurn = 50;
    out = []; doCommand("travel queen vic");
    assert.equal(G.room, "queen_vic");
  } finally { _rand = saved; }
});

test("a place the truck doesn't serve, typed off its own list, is the driver's no — not a parse failure", () => {
  G.room = "beach_rd_c"; doCommand("ride bus"); out = [];
  doCommand("soi buakhao");
  assert.match(text(), /not this truck/, "the driver shakes his head");
  assert.doesNotMatch(text(), huh);
});

test("a bare venue name is a TRAVEL or an ENTER, never 'I didn't understand'", () => {
  G.room = "beach_rd_c"; G.visited.queen_vic = true;
  out = []; doCommand("queen vic");
  assert.equal(G.room, "queen_vic", "a bar you have found: TRAVEL");
  G.room = "beach_rd_c"; out = []; doCommand("tequila queen");
  assert.equal(G.room, "tequila_queen", "a door on this street: ENTER");
  G.room = "beach_rd_c"; out = []; doCommand("photosynthesis");
  assert.match(text(), huh, "nonsense still misses");
});

test("Soi 6's middle after midnight does not say the grilles are down beside three open beer bars", () => {
  G.room = "soi6_mid"; G.nightTurn = 70;
  const open = _venuesHere(_room()).filter(id => !_closedNow(id));
  assert.ok(open.length >= 3, "the drinking end is open");
  out = []; _describeRoom(true);
  assert.doesNotMatch(text(), /either side of it the grilles are down/);
  assert.match(text(), /Step inside:/, "and the doors are listed");
});
