// ROUND 77 (2026-10-09) — the first persona round on Soi 6's new inner segments, both on TODAY'S SOI:
// Siobhan Keane (Fable, one-bar-week: six nights on the Sweet Tamarind's stool, checking whether the women
// agree — "the people are real for exactly as long as you don't ask them twice") and Dirk Haverkamp (Opus,
// street-survey: the soi walked end to end five nights, an ownership map from every source — "the paper
// tells me who owns each building; the people do not").
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.filter(l => !/^·/.test(l)).join("\n");
const run = c => doCommand(c);
const ask = (room, who, what) => { G.room = room; run("talk to " + who); out = []; run(`ask ${who} about ${what}`); return said().split("\n")[0]; };   // her answer, not the room's ambient after it

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; out = [];
});

test("a review is an opinion, and an opinion is kept: stable across nights, never borrowed, never mirrored, never false", () => {
  const a = ask("sweet_tamarind", "view", "ple");
  const b = ask("sweet_tamarind", "view", "jiab"), c = ask("sweet_tamarind", "view", "alisa");
  assert.ok(new Set([a, b, c]).size === 3, "one line per woman");
  G.day++; G.soc = { ...newGame().soc }; Object.assign(G.soc, {}); out = [];
  assert.equal(ask("sweet_tamarind", "view", "ple"), a, "the next night, the same opinion");
  const jp = ask("sweet_tamarind", "jiab", "ple"), pj = ask("sweet_tamarind", "ple", "jiab");
  assert.notEqual(jp.replace(/Ple|Jiab/g, "X"), pj.replace(/Ple|Jiab/g, "X"), "not one sentence said both ways");
  assert.doesNotMatch(ask("sweet_tamarind", "jiab", "alisa") + ask("sweet_tamarind", "alisa", "jiab"), /same village/, "Khon Kaen and Surin are not one bus");
  assert.doesNotMatch(a, /cousin works somewhere else/, "a written woman's family is her own");
});

test("a heard node reached by another word is a retelling — the gist, not the speech again", () => {
  const full = ask("sweet_tamarind", "alisa", "regulars");
  assert.ok(full.length > 200);
  const again = ask("sweet_tamarind", "alisa", "norway");
  assert.ok(again.length < 80 && /Six man/.test(again), "the first sentence she said: " + again);
});

test("the street's questions: next door is the neighbours, the old owner is remembered, the group and the soi are subjects", () => {
  assert.match(ask("pink_lotus", "nee", "the bar next door"), /Golden Dragon/, "not this bar's door");
  assert.match(ask("ladybird_bar", "ratsamee", "the bar next door"), /Hula Hula/);
  assert.match(ask("peach_lounge", "noot", "the old owner"), /Australian/);
  assert.match(ask("peach_lounge", "farida", "the group"), /one of theirs/i, "the group's own cashier knows the group");
  assert.match(ask("firecracker_bar", "napa", "the group"), /Nobody's bought this side/);
  assert.match(ask("sunset_rail", "bussaba", "the middle"), /Five stretches/);
  assert.match(ask("golden_dragon", "gavin", "the folder"), /not yet is a price/i, "the group's man on the group's buying");
});

test("a bar by name, from any mouth, says where it is from HERE and whose paper — and cannot contradict itself", () => {
  const t = ask("sweet_tamarind", "view", "jade lounge");
  assert.match(t, /A few doors along this street/); assert.doesNotMatch(t, /bike|motosai/i);
  assert.match(ask("lollipop_bar", "duang", "sweet tamarind"), /View bar — her name, her till|View's — her name on the paper/, "the one bar where paper and owner agree says so");
  assert.match(ask("pink_lotus", "nee", "jade lounge"), /One of ours/, "the flagship's mamasan on a sister bar");
  assert.match(ask("stinky_bar", "bert", "blue dog"), /Pen's/, "the Blue Dog is a bar, not Bert's dog speech");
  assert.doesNotMatch(ask("sweet_tamarind", "ple", "pink lotus"), /Ltd\.\./, "one full stop");
  assert.doesNotMatch(ask("sweet_tamarind", "ple", "lollipop bar"), /\(Inner West\)/, "a room label is not something anybody says");
});

test("the holdouts know each other, the owners own, and the floor answers what it volunteers", () => {
  assert.match(ask("sweet_tamarind", "view", "khing"), /same year/);
  assert.match(ask("lollipop_bar", "khing", "view"), /cards/);
  assert.match(ask("sweet_tamarind", "view", "tamarind"), /My bar/, "View owns it; it is not 'the owner's headache'");
  assert.match(ask("sweet_tamarind", "tukta", "cards"), /I count them/);
  assert.match(ask("peach_lounge", "keng", "nails"), /pay me in drinks/);
  assert.match(ask("lollipop_bar", "duang", "keng"), /nails/);
  assert.match(ask("jade_lounge", "taan", "cat"), /Ginger/);
  assert.doesNotMatch(ask("sweet_tamarind", "ple", "cousin"), /daughter/, "her cousin is on the till, not an invented daughter");
});

test("the soi measures one way, the map is right, and the close looks answer", () => {
  for (const r of Object.keys(ROOMS)) for (const l of [ROOMS[r].desc, ...(ROOMS[r].revisit || [])]) assert.doesNotMatch(String(l || ""), /hundred metres in Thailand/, r);
  G.mode = "soi6"; out = []; run("map"); const m = said();
  assert.match(m, /the\s+north\s+beach|~ the\s+Blue Dog/); assert.match(m, /\* the group's paper/); assert.match(m, /Ruby Kiss\s+\n?.*7-11/);
  G.room = "sweet_tamarind"; out = []; run("count cards"); assert.match(said(), /Business cards/);
  out = []; run("examine sign"); assert.match(said(), /hand-lettered/);
  G.room = "soi6_west_in"; out = []; run("examine man in the good shirt"); assert.match(said(), /good shirt/);
  G.room = "soi6_mid"; out = []; run("who owns this bar"); assert.match(said(), /till of every bar/, "not the black book");
  G.room = "sweet_tamarind"; G.convo = null; out = []; run("do you remember me"); assert.match(said(), /ASK <name> ABOUT ME/);
});
