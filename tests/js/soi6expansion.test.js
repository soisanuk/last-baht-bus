// SOI 6, THE INNER SEGMENTS (2026-10-09; docs/soi6-expansion.md). Mario's calls: two segments between
// the middle and each end; the reasonable maximum of venues each (four); Soi 6 hostess bars with rooms
// upstairs; the group's buying concentrated in the inner west, nearest its flagship, and the inner east
// clean; the Soi 6 challenge includes them; every hostess hand-authored (engine.test). These pins are
// the expansion's, and the last one is the TEMPLATE's: the staff generator is a pure function of the
// floor outside the expansion, so the next round can re-run it without moving a face.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const WEST = ["jade_lounge", "peach_lounge", "lollipop_bar", "sweet_tamarind"];
const EAST = ["firecracker_bar", "hot_pepper", "hula_hula", "ladybird_bar"];

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; out = [];
});

test("the soi is five segments, Beach Road to Second Road and back, the middle still in the middle", () => {
  const path = ["beach_rd_n", "soi6_street", "soi6_west_in", "soi6_mid", "soi6_east_in", "soi6_deep", "second_rd_soi6"];
  G.room = path[0];
  for (const want of path.slice(1)) { run("e"); assert.equal(G.room, want); }
  for (const want of path.slice(0, -1).reverse()) { run("w"); assert.equal(G.room, want, "every step walks back"); }
  assert.deepEqual(ROOMS.soi6_west_in.venues, WEST);
  assert.deepEqual(ROOMS.soi6_east_in.venues, EAST);
  for (const b of [...WEST, ...EAST]) {
    assert.equal(ROOMS[b].barType, "soi6", b + " is a Soi 6 hostess bar");
    assert.ok(/stair/i.test(ROOMS[b].desc + (ROOMS[b].revisit || []).join(" ")), b + " has its staircase");
    assert.ok(SOI6_ROOMS.has(b), b + " is inside the challenge's pocket");
  }
  assert.ok(SOI6_ROOMS.has("soi6_west_in") && SOI6_ROOMS.has("soi6_east_in"), "the challenge walks the whole soi");
});

test("the group's buying is concentrated in the inner west, nearest its flagship; the inner east and the middle are nobody's", () => {
  const plg = b => _PLG_ROOMS.includes(b) || ROOMS[b].owner === "plg";
  assert.deepEqual(WEST.filter(plg), ["jade_lounge", "peach_lounge"]);
  assert.deepEqual(EAST.filter(plg), [], "the inner east is clean");
  assert.deepEqual(ROOMS.soi6_mid.venues.filter(plg), [], "the middle is neutral ground");
  assert.ok(plg("pink_lotus") && ROOMS.soi6_street.exits.e === "soi6_west_in", "the frontier is the flagship's next door");
  // the paper by the till agrees: the group's company on its rooms, a woman's own name across the soi
  for (const b of ["jade_lounge", "peach_lounge"]) assert.equal(_licenceOf(b).kind, "company");
  for (const b of [...EAST, "sweet_tamarind", "lollipop_bar"]) assert.notEqual(_licenceOf(b).kind, "company", b + " is somebody's own");
});

test("the frontier is seen from the street — one front at a time, once a phase, and only while the fronts are open", () => {
  G.room = "soi6_west_in"; out = []; _describeRoom(true);
  assert.ok(_FRONTIER_LINES.flat().some(l => said().includes(l)), "a line about the front being bought");
  out = []; _describeRoom(true);
  assert.ok(!_FRONTIER_LINES.flat().some(l => said().includes(l)), "once a phase, not every look");
  G.frontierSaid = {}; G.nightTurn = 70; out = []; _describeRoom(true);
  assert.ok(!_FRONTIER_LINES.flat().some(l => said().includes(l)), "no painters under the late paint of grilles");
  G.room = "soi6_east_in"; G.nightTurn = 30; G.frontierSaid = {}; out = []; _describeRoom(true);
  assert.ok(!_FRONTIER_LINES.flat().some(l => said().includes(l)), "the inner east is not for sale");
  const phases = new Set(); for (let d = 1; d <= FRONTIER_CYCLE; d++) { G.day = d; phases.add(_frontierPhase().phase); }
  assert.deepEqual([...phases].sort(), [0, 1, 2], "folder, paint, reopened");
});

test("the holdouts answer for the offer, and the two tastes on offer are verbs, once a night", () => {
  for (const [room, word, rx] of [["lollipop_bar", "folder", /Not yet is not no/], ["sweet_tamarind", "cards", /not for sale/i]]) {
    G.room = room; const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan");
    assert.ok(mama, room + " has her mamasan"); out = []; run(`ask ${NPCS[mama].name} about ${word}`);
    assert.match(said(), rx);
  }
  G.room = "sweet_tamarind"; out = []; run("eat tamarind"); assert.ok(_TAMARIND_LINES.some(l => said().includes(l.slice(0, 40))));
  out = []; run("eat tamarind"); assert.match(said(), /had your pod/);
  G.room = "hot_pepper"; const t = G.thirst; out = []; run("eat som tam");
  assert.ok(_SOMTAM_TEST_LINES.some(l => said().includes(l.slice(0, 40)))); assert.ok(G.thirst > t, "thirsty work");
});

test("every new woman is a person: an authored hostess with her province in her own words, house staff from the floor", () => {
  const people = Object.keys(NPCS).filter(i => [...WEST, ...EAST].includes(NPCS[i].room));
  const hostesses = people.filter(i => NPC_ROLES[i] === "hostess");
  assert.equal(hostesses.length, 26);
  for (const id of hostesses) {
    const n = NPCS[id];
    assert.ok(!n.filler && n.look && n.dialogue.length >= 4, id + " is written: a look and four nodes");
    assert.equal(id, n.room + "_" + n.name.toLowerCase(), "the namesake-safe id");
  }
  for (const id of people.filter(i => NPC_ROLES[i] !== "hostess")) assert.ok(FLOOR_STAFF[id], id + " is a floor record");
  // a name may repeat across the town, never within one bar (namesake.test)
  for (const b of [...WEST, ...EAST]) {
    const names = people.filter(i => NPCS[i].room === b).map(i => NPCS[i].name);
    assert.equal(new Set(names).size, names.length, b);
  }
});

test("THE TEMPLATE: the staff generator reproduces the house staff from its spec without moving a face", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const txt = execFileSync("node", ["tools/gen-floor-staff.mjs", "docs/soi6-expansion-staff.json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const recs = Function(`return ({${txt.split("\n// SCAFFOLD")[0]}})`)();
  assert.equal(Object.keys(recs).length, 14);
  for (const [id, r] of Object.entries(recs)) assert.deepEqual(r, FLOOR_STAFF[id], id + " regenerates exactly");
  const scaffold = JSON.parse(txt.split("// SCAFFOLD — hostesses to author:")[1]);
  for (const s of scaffold) assert.ok(NPCS[s.id] && !NPCS[s.id].filler, s.id + ": the scaffold's id is the written woman's");
});

// ── THE DEEPENING PASS (2026-10-09, after round 77) ────────────────────────────────────────────────
test("a look is what a RENDERER reads: no tap markup in any look (the art agent, 2026-10-09)", () => {
  const bad = Object.keys(NPCS).filter(id => /\{\{|\}\}/.test(NPCS[id].look || ""))
    .concat(Object.keys(FLOOR_STAFF).filter(id => /\{\{|\}\}/.test(FLOOR_STAFF[id].look || "")));
  assert.deepEqual(bad, [], "markup in a look reaches the image model verbatim");
});

test("the house is written: every new mamasan and cashier has her own words, a return greeting and the two-fee price", () => {
  const house = Object.keys(FLOOR_STAFF).filter(i => [...WEST, ...EAST].includes(FLOOR_STAFF[i].room));
  assert.equal(house.length, 14);
  for (const id of house) {
    const own = FLOOR_OWN[id]; assert.ok(own, id + " is written");
    assert.ok(own.nodes[0].when && !own.nodes[0].topic, id + ": a return greeting first");
    assert.ok(own.nodes.some(n => /wallet/.test(n.topic || "") && /Candy/.test(n.text)), id + ": the wallet points at Candy");
    if (FLOOR_STAFF[id].role === "cashier") assert.match(own.nodes.find(n => /^money/.test(n.topic || "")).text, /barfine/i, id + ": the bar's number and hers");
    assert.ok(own.nodes.filter(n => /^last time/.test(n.topic || "")).length === 2, id + ": LAST TIME, both ways");
  }
  G.room = "sweet_tamarind"; out = []; run("ask tukta about view"); assert.match(said(), /Auntie View/, "Tukta is View's niece");
  G.room = "firecracker_bar"; out = []; run("ask pang about napa"); assert.match(said(), /Mum/, "Pang is Napa's daughter");
});

test("the old soi knows the new stretches", () => {
  for (const [room, who, what, rx] of [["pink_lotus", "nee", "jiab", /Tamarind/], ["golden_dragon", "peung", "jinda", /Jade/],
    ["sunset_dreams", "malai", "the folder", /folder/], ["cherry_pop", "toi", "napa", /Firecracker/], ["ruby_kiss", "saeng", "hula hula", /grass skirts/]]) {
    G.room = room; run("talk to " + who); out = []; run(`ask ${who} about ${what}`); assert.match(said(), rx, `${who} on ${what}`);
  }
});

test("round 77's leftovers: the till is the till-keeper's, the frame's reactions are town-wide, the chit is the cashier's", () => {
  // a mamasan with a cashier beside her goes back to the floor, never the till
  G.room = "sunset_dreams"; G.soc.licLook = {}; out = []; run("examine licence");
  if (_tillKeeper("sunset_dreams") !== "malai") assert.doesNotMatch(said(), /Malai[^.]*back to the till/);
  // four owners do not give one reaction, word for word, while an unsaid one remains
  const seen = [];
  for (const r of ["firecracker_bar", "hot_pepper", "hula_hula"]) { G.room = r; G.soc.licLook = {}; out = []; run("examine licence"); seen.push(said().split("\n\n").pop()); }
  const owners = seen.map(x => x.replace(/^\S+/, "").slice(0, 50));
  assert.notEqual(owners[0], owners[1], "the second owner does not repeat the first while an unsaid line remains");
  // the chit is written by whoever keeps the till
  G.room = "sweet_tamarind"; assert.notEqual(_tillRef(), _L("the mamasan"), "Tukta keeps the Tamarind's till");
});
