// The floor staff as records (2026-10-07, Mario: "consolidate them all as NPCs") and the first
// floor written in its own words — The Gilt Cage: Naree and Yada, identical twins; Sasi, who grew
// up in a temple children's home; Wanida on the floor and Nubnab on the book.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const said = () => out.map(o => o.text).join("\n");
const run = c => doCommand(c);
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 9000; G.bank = 30000; G.nightTurn = 30; G.room = "windmill"; out = [];
});
const ask = (id, t) => { out = []; run(`ask ${id} about ${t}`); return said(); };
const GILT = ["naree", "yada", "sasi", "wanida", "nubnab"];

test("every floor woman is a stored record: nothing about her is computed from a hash at load", () => {
  for (const [id, r] of Object.entries(FLOOR_STAFF)) {
    assert.equal(NPCS[id].look, r.look); assert.equal(NPCS[id].desc, r.desc); assert.equal(NPCS[id].room, r.room);
  }
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  for (const fn of ["_floorHostess", "_floorMama", "_floorCashier"]) {
    const body = src.slice(src.indexOf("function " + fn + "("), src.indexOf("\n}\n", src.indexOf("function " + fn + "(")));
    assert.doesNotMatch(body, /_hh\(/, fn + " reads her record, never a hash");
  }
});

test("a woman with her own lines speaks them, and no shared line on a subject she covers survives", () => {
  for (const id of GILT) {
    const own = FLOOR_OWN[id].nodes, keys = d => String(d.topic || "").split("|");
    const shared = NPCS[id].dialogue.slice(own.length);
    for (const d of shared) {
      assert.ok(!own.some(n => d.topic ? keys(n).includes(keys(d)[0]) : !n.topic && !n.bond), `${id}: a shared "${d.topic || "greeting"}" line shadows her own`);
      assert.ok(!d.story, `${id}: the town book would deal over her (${d.story})`);
    }
  }
  assert.match(ask("sasi", "family"), /children home/);
  assert.match(ask("naree", "nails"), /Bangkok Sunset/);
  assert.match(ask("nubnab", "twins"), /ransom note/);
  // the wallet still points at Candy, in her own words
  G.flags.hasWallet = false; assert.match(ask("yada", "wallet"), /Candy/);
});

test("the twins: one face in the portrait prompt, the differences their story gives them, and each names the other", () => {
  const a = NPCS.naree, b = NPCS.yada;
  assert.equal(a.twin, "yada"); assert.equal(b.twin, "naree");
  const face = "Thai woman, mid twenties, big dark eyes, round face";
  assert.ok(a.look.startsWith(face) && b.look.startsWith(face), "the same face, word for word");
  assert.match(a.look, /Buddha/); assert.doesNotMatch(b.look, /Buddha/, "Yada lost hers");
  assert.ok(a.look.split(/\s+/).length <= 20 && b.look.split(/\s+/).length <= 20);
  // Ping and Pong (Mario, 2026-10-07): Thai twins get a matched pair of nicknames. Ids stay naree/yada.
  assert.equal(a.name, "Ping"); assert.equal(b.name, "Pong");
  assert.equal(_findNpc("ping"), "naree", "in the Gilt Cage, Ping is the twin, not the Ping across town");
  assert.match(ask("yada", "ping pong"), /Ping serve —.*Pong return/); assert.match(ask("naree", "ping pong"), /river[\s\S]*the thing with the pen/);   // one hams it up, one disowns her
  assert.match(ask("naree", "pong"), /twenty minute younger/);
  assert.match(ask("yada", "ping"), /temple/);
  assert.equal(FLOOR_STAFF.yada.from, FLOOR_STAFF.naree.from, "one hometown");
  const man = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/portrait-manifest.json", import.meta.url)), "utf8"));
  assert.deepEqual(man.filler.filter(f => f.twin).map(f => f.id + ">" + f.twin).sort(), ["naree>yada", "yada>naree"]);
});

test("her own plan is the exit the town quotes, and a woman with no thing to open never leaves", () => {
  for (const v of [2, 4, 6, 8, 10, 12]) { G.vacation = v; assert.equal(_exited("yada"), false, "Yada stays"); }
  let gone = null;
  for (let v = 2; v <= 12 && !gone; v++) { G.vacation = v; if (_exited("naree")) gone = v; }
  if (gone) {
    assert.equal(_exited("naree"), FLOOR_OWN.naree.exit);
    assert.match(ask("yada", "ping"), /One chair empty/);
  } else assert.equal(_exited("naree"), false);
  assert.ok(FLOOR_OWN.sasi.exit && /children's home/.test(FLOOR_OWN.sasi.exit));
});

test("a bonded regular hears her own warm greeting, not the floor's generic one", () => {
  G.soc.drinks.sasi = 9; G.talked = {}; out = [];
  run("talk to sasi");
  assert.match(said(), /nobody come back|You again/);
});

test("a namesake never leaks a stranger's whereabouts: two Pings, and you have met neither", () => {
  // _elsewhereLine picked the likelier of two namesakes before checking that you may be told
  // where she works; the twin taking the name Ping placed the other Ping for a man who never met her
  G.room = "queen_vic"; G.known = {}; out = []; run("talk to ping");
  assert.doesNotMatch(said(), /Paradise Nights|Gilt Cage/);
  G.known.ping = true; out = []; run("talk to ping");
  assert.match(said(), new RegExp(_barName(NPCS.ping.room)));
});

test("a name that is also a word teaches nobody: MOO PING is pork, not the twins (Lennart, round 68)", () => {
  const learns = text => { G.known = {}; _say(text); return Object.keys(G.known).sort(); };
  assert.deepEqual(learns("(BUY MOO PING ฿40 · BUY NOODLES ฿40)"), [], "the saleng's skewer");
  assert.deepEqual(learns("A tout outside: PING PONG SHOW, upstairs."), []);
  assert.deepEqual(learns("(BUY SOM TAM ฿50)"), []);
  assert.deepEqual(learns("(GIFT 3000 · NOTHING)"), [], "Cream's verb, not Gift at Crystal Palace");
  assert.ok(!learns("(GIVE ROSE TO PIM)").includes("rose"), "the flower, not the mamasan");
  assert.ok(!learns("(ASK BILL ABOUT ICE)").includes("ice"), "the delivery, not the dancer");
  // …and a hint that means the person still teaches her
  assert.ok(learns("(ASK CANDY ABOUT ROSE)").includes("rose"));
  assert.ok(learns("Ping watches her sister.").includes("naree"));
});

test("a portrait line names only what a head-and-shoulders crop can show (the art agent: three passes on Kaew's heels)", () => {
  for (const [id, r] of Object.entries(FLOOR_STAFF))
    assert.doesNotMatch(r.look, /\b(feet|foot|heels?|shoes?|legs?|knees?|ankles?|sandals?|stool|barstool)\b/i, `${id}: "${r.look}"`);
  // …and the character the line carried stays in her desc, where it is read rather than drawn
  assert.match(FLOOR_STAFF.kaew.desc, /sore feet/);
  // a pronoun is the helper's, never the raw field with a default (Diamond was "him", round 68)
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /\.pronoun === "(?:he|she)" \? "(?:him|her|he's|she's)"/);
  assert.equal(_pr("diamond").o, "her");
});
