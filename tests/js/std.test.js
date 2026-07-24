// The clinic thread: you start the week with three condoms; each barfine uses one
// if you have it. Go without and an unprotected night can leave an infection —
// silent for a day or two, then it surfaces in the morning and in DIAGNOSE and
// drags สนุก until you GET TESTED at the free public clinic.
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
const REAL_RAND = _rand;
beforeEach(() => { out = []; newGame(); globalThis._rand = REAL_RAND; _setFlag("act1Done"); });

test("you start the week carrying three condoms", () => {
  assert.equal(G.condoms, 3);
});

test("a carried condom is consumed on a barfine and blocks infection", () => {
  globalThis._rand = () => 0; // would infect if unprotected
  G.condoms = 2;
  _endNight("barfine");
  assert.equal(G.condoms, 1, "one used");
  assert.equal(G.std, null, "protected — no souvenir");
  assert.match(out.join("\n"), /condom|foil|protection/i, "and it says so");
});

test("an unprotected barfine can infect (forced roll)", () => {
  G.condoms = 0;
  globalThis._rand = () => 0; // 0 < STD_RISK → infected
  const day = G.day;
  _endNight("barfine");
  assert.ok(G.std, "the night kept a secret");
  assert.equal(G.std.day, day, "records the day contracted");
});

test("an unprotected barfine that rolls lucky leaves nothing", () => {
  G.condoms = 0;
  globalThis._rand = () => 0.99; // 0.99 >= STD_RISK → safe
  _endNight("barfine");
  assert.equal(G.std, null);
});

test("incubation: silent for a day, symptomatic from day two", () => {
  G.std = { day: 3 };
  G.day = 3; assert.equal(_stdSymptomatic(), false, "day of: nothing");
  G.day = 4; assert.equal(_stdSymptomatic(), false, "next day: still incubating");
  G.day = 5; assert.equal(_stdSymptomatic(), true, "two days on: symptoms");
});

test("DIAGNOSE surfaces the symptom only once symptomatic", () => {
  G.std = { day: 1 }; G.day = 2; // incubating
  out = []; _doDiagnose();
  assert.doesNotMatch(out.join("\n"), /souvenir|itches|clinic job/i, "no tell while incubating");
  G.day = 3; // symptomatic
  out = []; _doDiagnose();
  assert.match(out.join("\n"), /souvenir|itches|GET TESTED/i, "now it shows");
});

test("the morning tick nags and drags สนุก only when symptomatic", () => {
  G.happy = 20; // headroom so the drag is visible (happy floors at 0)
  G.std = { day: 1 }; G.day = 2; // incubating
  const h0 = G.happy; out = []; _stdMorningTick();
  assert.equal(out.length, 0, "silent while incubating");
  assert.equal(G.happy, h0, "no drag yet");
  G.day = 3; out = []; _stdMorningTick();
  assert.match(out.join("\n"), /burn|itch|alarm|souvenir|GET TESTED/i, "the morning nag");
  assert.ok(G.happy < h0, "and the untreated drag");
});

test("GET TESTED clears an infection and lifts the mood", () => {
  G.std = { day: 1 }; G.day = 4; const h0 = G.happy;
  _doClinic();
  assert.equal(G.std, null, "cured — the only cure");
  assert.ok(G.happy > h0, "relief");
  assert.match(out.join("\n"), /antibiotic|pills|tablets|treatable|fixable/i, "the treatment");
});

test("GET TESTED when clean returns a clean bill, no harm", () => {
  G.std = null;
  _doClinic();
  assert.equal(G.std, null);
  assert.match(out.join("\n"), /negative|clean/i);
});

test("BUY CONDOM at a 7-Eleven adds a pack for ฿40", () => {
  const sevenRoom = Object.keys(ROOMS).find(id => ROOMS[id].seven);
  G.room = sevenRoom; G.money = 100; G.condoms = 1;
  _doBuy("condom");
  assert.equal(G.condoms, 1 + CONDOM_PACK, "pack of three");
  assert.equal(G.money, 100 - CONDOM_PRICE, "฿40");
});

test("the full loop: unprotected barfine → symptoms → GET TESTED → clean", () => {
  G.condoms = 0;
  globalThis._rand = () => 0;      // infect
  _endNight("barfine"); assert.ok(G.std);
  G.day = G.std.day + 2;           // fast-forward to symptomatic
  assert.equal(_stdSymptomatic(), true);
  _doClinic();                     // and deal with it
  assert.equal(G.std, null);
});

test("prose pools are stocked and well-formed", () => {
  for (const [nm, pool] of [["safe", _STD_SAFE], ["morning", _STD_MORNING],
    ["clinic+", _CLINIC_POS], ["clinic-clean", _CLINIC_CLEAN]]) {
    assert.ok(pool.length >= 3, `${nm}: depth`);
    assert.ok(pool.every(s => typeof s === "string" && s.trim()), `${nm}: no blanks`);
    assert.equal(new Set(pool).size, pool.length, `${nm}: distinct`);
  }
});
