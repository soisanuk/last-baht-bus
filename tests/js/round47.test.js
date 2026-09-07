// Round 47 (2026-09-07) — Stuart, the returning save loader (lens: old-save loader).
// The morning ledger is a single frame, and it carries the night's worst news: black
// out, wake rough with your pockets emptied, close the app, come back — and the money
// is gone with the game saying nothing about it. LAST NIGHT reprints it, and because
// the text rides the save it survives exactly the gap that lost it.
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
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// Sleep through to a morning that actually HAS a ledger: the baseline for a
// morning is taken at the previous wake, so the first night of a fresh game has
// nothing to compare against and correctly says nothing.
function sleepToLedger() {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.room = _hotelRoomId(); run("sleep", "sleep");
}

test("LAST NIGHT reprints the morning ledger, word for word", () => {
  sleepToLedger();
  assert.ok(Array.isArray(G.lastNightSaid) && G.lastNightSaid.length,
    "the wake stored what it said");
  const said = G.lastNightSaid.slice();
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "LAST NIGHT says exactly what the morning said, not a paraphrase");
  out = []; run("ledger");
  assert.deepEqual(out.map(o => o.text), said, "LEDGER is the same verb");
});

test("the ledger survives the app being closed — which is the whole finding", () => {
  sleepToLedger();
  const said = G.lastNightSaid.slice();
  // Stuart's actual sequence: rough wake, lock the phone, come back to a save.
  const blob = serializeGame();
  newGame(); deserializeGame(blob);
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "a reloaded save can still be asked what happened last night");
});

test("the rough wake's missing money is in what LAST NIGHT reprints", () => {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.money = 4000; G.room = "beach_rd_c";
  _endNight("blackout");
  assert.ok(G.roughLost > 0, "the rough wake actually lifted something");
  out = []; run("last night");
  assert.match(text(), new RegExp(_num(G.roughLost) + "(?: of it)? lifted"),
    "the figure a returning player came back looking for");
});

test("LAST NIGHT costs no turn and has a truthful answer before you have slept", () => {
  const t0 = G.turns, n0 = G.nightTurn;
  run("last night");
  assert.equal(G.turns, t0, "a readout of what already happened is free");
  assert.equal(G.nightTurn, n0);
  assert.match(text(), /not slept on it yet/);
});

test("LAST NIGHT is reachable by thumb as well as by keyboard", () => {
  assert.ok(engineComplete("last").includes("last night"), "autocomplete offers it");
  assert.ok(engineComplete("__info ").includes("last night"), "the INFO chip carries it");
  assert.match(_HELP, /LAST NIGHT/, "HELP lists it");
  assert.match(_HELP_SOI6, /LAST NIGHT/, "and the challenge card does too");
});

// ── TOPICS: the two ways the list lied ──────────────────────────────────────

test("every label TOPICS can print is a phrase the parser takes", () => {
  // The pinning test in round 44 asked the topic KEY. TOPICS prints
  // _topicLabel(key), and a player types back what they just read — so the one
  // label in the table that differs from its key ("sponsor" → "the kept girls")
  // was unaskable on five characters while the test stayed green. Derived from
  // the cast rather than a list, so a new label cannot ship without its alias.
  const strip = t => String(t).toLowerCase().replace(/^(the|a|an)\s+/, "").trim();
  const bad = [];
  let checked = 0;
  for (const id of Object.keys(NPCS)) {
    const npc = NPCS[id]; if (!npc.dialogue) continue;
    const room = _npcRoom(id); if (!room || !ROOMS[room]) continue;
    G.room = room; G.known[id] = true;
    for (const t of _convoTopics(id, { all: true })) {
      const label = strip(_topicLabel(t));
      checked++;
      let d = _pickDialogue(id, label);
      if (!(d && d.topic)) { const alt = _convoTopic(label); if (alt) d = _pickDialogue(id, alt); }
      if (!(d && d.topic)) bad.push(`${id} prints "${_topicLabel(t).toLowerCase()}" for key "${t}"`);
    }
  }
  assert.ok(checked > 500, `the audit reached the cast (${checked} labels)`);
  assert.deepEqual(bad, [], "TOPICS printed a phrase the parser will not take");
});

test("TOPICS answers for a woman the chip bar has nothing to show", () => {
  // Maureen ran TOPICS PIM twice, bought two lady drinks in between, and was told
  // both times that Pim had nothing open — in the minutes Pim was answering a
  // borrowed-name subplot, a quest turn-in and the safe clue. All three of her
  // subjects were suppressed by CHIP ETIQUETTE (quest-driven nodes, and a topic
  // that is another character's name), none by a gate.
  G.room = _npcRoom("pim"); G.known.pim = true;
  assert.deepEqual(_convoTopics("pim"), [], "the chip bar still shows her none — that part is by design");
  const open = _convoTopics("pim", { all: true });
  assert.ok(open.length >= 2, `TOPICS finds her subjects (${JSON.stringify(open)})`);
  out = []; run("topics pim");
  assert.doesNotMatch(text(), /nothing open|isn't giving you much/,
    "a woman with authored answers is never reported as having none");
  for (const t of open) {
    G.talked = {}; out = []; run(`ask pim about ${t}`);
    assert.match(text(), new RegExp("asked Pim about", "i"), `she takes "${t}"`);
  }
});

test("a person's name still waits on the transcript having printed it", () => {
  // The etiquette that DOES survive into TOPICS: person-name topics stay off the
  // list until you have met them, so the verb can't spoil a name.
  G.room = _npcRoom("pim"); G.known = { pim: true };
  assert.ok(!_convoTopics("pim", { all: true }).includes("oy"), "Oy is not named to a stranger");
  G.known.oy = true;
  assert.ok(_convoTopics("pim", { all: true }).includes("oy"), "once you know her, Pim will discuss her");
});

test("the pager still counts what a thumb can reach, not what TOPICS printed", () => {
  G.room = "stinky_bar"; G.known.bert = true;
  run("talk to bert");
  const chips = _convoTopics("bert");
  out = []; run("topics");
  assert.ok(chips.length > 4, "Bert is deep enough to page");
  const m = /more \((\d+)\/(\d+)\)/.exec(_chipSet().map(c => c.label).join(" "));
  assert.ok(m, "the chip bar offers a pager");
  assert.equal(Number(m[2]), Math.ceil(chips.length / 4),
    "the page count is the chip bar's, since that is what tapping turns");
});
