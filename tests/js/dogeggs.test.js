// Dog-name easter eggs: name your soi dog after a famous hound or a bit of Pattaya
// slang and he picks up a modest power (G.dog.egg), applied at hooks across the
// engine. Matching is loose — accents stripped, variants covered. XYZZY is refused
// with the Zork treatment.
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
beforeEach(() => { out = []; newGame(); globalThis._rand = REAL_RAND; G.dog = { since: 1 }; });

const nameDog = n => { out = []; doCommand("name dog " + n); };

test("naming maps famous dogs and slang onto eggs", () => {
  const cases = {
    lassie: "rescue", cujo: "guard", cerberus: "guard", rex: "guard",
    hachiko: "loyal", scooby: "snack", butterfly: "butterfly",
    fun: "sanuk", sanuk: "sanuk", buffalo: "buffalo", "white knight": "knight",
  };
  for (const [name, egg] of Object.entries(cases)) {
    nameDog(name);
    assert.equal(G.dog.egg, egg, `${name} → ${egg}`);
  }
});

test("matching is accent- and variant-loose (nobody types ō)", () => {
  nameDog("Hachikō"); assert.equal(G.dog.egg, "loyal", "accented ō still matches");
  nameDog("Hachi");   assert.equal(G.dog.egg, "loyal", "short form matches");
  nameDog("สนุก");    assert.equal(G.dog.egg, "sanuk", "the Thai word matches too");
});

test("a plain name clears any prior egg", () => {
  nameDog("Buffalo"); assert.equal(G.dog.egg, "buffalo");
  nameDog("Bob");     assert.equal(G.dog.egg, null, "renaming to a normal name drops the power");
  assert.equal(G.dog.name, "Bob");
});

test("XYZZY is refused with the Zork hollow-voice and changes nothing", () => {
  nameDog("Rex"); const nm = G.dog.name, egg = G.dog.egg;
  nameDog("xyzzy");
  assert.match(out.join("\n"), /hollow voice says, "Fool\."/i, "the Zork response");
  assert.equal(G.dog.name, nm, "name unchanged");
  assert.equal(G.dog.egg, egg, "egg unchanged");
});

test("sanuk: naming him Fun is its own small lift", () => {
  G.happy = 10; nameDog("Fun");
  assert.ok(G.happy > 10, "+สนุก on the spot");
});

test("buffalo: every barfine stays honest (no scam roll)", () => {
  // find a girl the scam path actually applies to (a "shark", low favor, no wingman)
  const shark = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _bfExploitable(id));
  assert.ok(shark, "there is at least one exploitable girl to test against");
  // control: without the egg, her marked barfine scams at least sometimes
  let scams = 0;
  for (let i = 0; i < 300; i++) if (_bfScamRoll(shark, true)) scams++;
  assert.ok(scams > 0, "the scam path is live when no buffalo dog guards it");
  // with the egg: the dog smells it every time
  G.dog.egg = "buffalo";
  for (let i = 0; i < 60; i++) assert.equal(_bfScamRoll(shark, true), null, "buffalo keeps it honest");
});

test("guard: a guard dog sees the boy-in-brown off — no shakedown", () => {
  G.dog.egg = "guard";
  G.soc.drunk = 8; G.lastPolice = -999; G.turns = 500;
  globalThis._rand = () => 0.01; // would trigger the cop
  out = []; _maybeEncounter();
  assert.equal(G.pendingEnc, null, "no shakedown pending");
  assert.match(out.join("\n"), /boy in brown|melts back|nobody fines/i, "the dog waves him off");
});

test("rescue: a Lassie dog never leaves you rough — you wake home, cash intact", () => {
  _setFlag("act1Done");
  G.dog.egg = "rescue"; G.room = "jomtien_beach"; G.money = 500;
  const day = G.day;
  _endNight("collapse"); // would normally be a rough wake with pockets turned out
  assert.equal(G.room, _hotelRoomId(), "woke at the hotel, not a crash spot");
  assert.equal(G.money, 500, "pockets intact — he stood guard the whole way");
  assert.equal(G.day, day + 1);
  assert.match(out.join("\n"), /brought you back|Lassie|own bed/i);
});

test("loyal: bonds don't cool overnight", () => {
  _setFlag("act1Done");
  G.dog.egg = "loyal"; G.room = _hotelRoomId(); G.soc.drinks = { lek: 4 };
  _endNight("barfine");
  assert.equal(G.soc.drinks.lek, 4, "the bond held");
  // control: a plain dog lets it cool
  newGame(); _setFlag("act1Done"); G.dog = { since: 1 }; G.room = _hotelRoomId(); G.soc.drinks = { lek: 4 };
  _endNight("barfine");
  assert.equal(G.soc.drinks.lek, 3, "normally a notch cools");
});

test("snack: feeding is free — the dog covers it himself", () => {
  G.dog.egg = "snack"; G.money = 0; G.room = "jomtien_beach";
  out = []; doCommand("feed dog");
  assert.match(out.join("\n"), /feeds Scooby|nosing a forgotten skewer|feeds himself/i);
  assert.equal(G.money, 0, "no ฿ spent");
});
