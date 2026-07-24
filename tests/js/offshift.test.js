// Off-shift meet: the SPECIAL massage writes you a number (once per girl), which
// you carry as a note item and cash in with MEET when the night's old — a genuine,
// cheaper-than-barfine night, OR she ghosts you (a day-stable 50/50, no retry-scum).
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
engineInit(t => out.push(t), null, () => {});
const S = () => G;
const last = () => out.join("\n");
beforeEach(() => { out = []; newGame(); S().lastSaleng = 99999; S().lastPeddler = 99999; });

test("the ghost coin is day-stable and 50/50-ish (no retry-scum)", () => {
  const roll = (girl, day) => _hh(girl + ":" + day + ":offshift", 71) % 2 === 0;
  assert.equal(roll("waan", 2), roll("waan", 2), "same girl+day always resolves the same");
  let ghosts = 0, N = 200;
  for (let i = 0; i < N; i++) if (roll("g" + i, 2)) ghosts++;
  assert.ok(ghosts > N * 0.35 && ghosts < N * 0.65, `~50/50, got ${ghosts}/${N}`);
});

test("SPECIAL writes her number once per girl and only one thread at a time", () => {
  S().room = "smile_massage"; S().money = 5000;
  _massageSpecial("waan", "Waan");
  assert.equal(S().itemLoc.masseuse_note, "inventory", "you pocket the note");
  assert.ok(S().offShift && S().offShift.id === "waan", "the thread records the girl");
  assert.ok(_flag("gaveNumber_waan"), "once-ever flag set");

  // a second special from her (same girl) while you still carry it: no new number
  S().soc.special = {}; // clear the one-per-day gate so the scene runs again
  const before = JSON.stringify(S().offShift);
  _massageSpecial("waan", "Waan");
  assert.equal(JSON.stringify(S().offShift), before, "no second thread while carrying one");

  // thread resolved (note gone), special her again: the flag means no re-issue
  S().soc.special = {}; S().offShift = null; S().itemLoc.masseuse_note = null;
  _massageSpecial("waan", "Waan");
  assert.equal(S().itemLoc.masseuse_note, null, "she doesn't write it twice ever");
  assert.equal(S().offShift, null);
});

function armNote(ghost) {
  S().offShift = { id: "waan", name: "Waan", home: "smile_massage", day: 2, ghost };
  S().itemLoc.masseuse_note = "inventory";
}

test("MEET too early keeps the thread; MEET with no note does nothing", () => {
  S().offShift = null;
  _doMeetOffShift("");
  assert.match(last(), /nobody's number/i);

  armNote(false); S().nightTurn = 10; out = [];
  _doMeetOffShift("waan");
  assert.match(last(), /too early/i);
  assert.equal(S().itemLoc.masseuse_note, "inventory", "note stays in your pocket");
  assert.ok(S().offShift, "thread still live");
});

test("MEET late, she answers: a cheaper-than-barfine night, note spent", () => {
  armNote(false); S().nightTurn = 60; S().money = 1000;
  _doMeetOffShift("waan");
  assert.equal(S().money, 700, "small cost (฿300), not a barfine");
  assert.equal(S().itemLoc.masseuse_note, null, "note spent");
  assert.equal(S().offShift, null, "thread closed");
  assert.ok(/real one|off the floor/i.test(last()), "the softer road");
});

test("MEET late, she ghosts: thread dies, not a baht moves", () => {
  armNote(true); S().nightTurn = 60; S().money = 1000;
  _doMeetOffShift("waan");
  assert.equal(S().money, 1000, "no charge — she never showed");
  assert.equal(S().itemLoc.masseuse_note, null, "the number's binned");
  assert.equal(S().offShift, null);
  assert.match(last(), /grey|just numbers|no reply|meant and/i);
});

test("DROP the note walks away from the thread", () => {
  armNote(false);
  doCommand("drop note");
  assert.equal(S().itemLoc.masseuse_note, null);
  assert.equal(S().offShift, null);
});
