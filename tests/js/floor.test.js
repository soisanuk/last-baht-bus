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
  assert.match(ask("naree", "yada"), /twenty minute younger/);
  assert.match(ask("yada", "naree"), /temple/);
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
    assert.match(ask("yada", "naree"), /One chair empty/);
  } else assert.equal(_exited("naree"), false);
  assert.ok(FLOOR_OWN.sasi.exit && /children's home/.test(FLOOR_OWN.sasi.exit));
});

test("a bonded regular hears her own warm greeting, not the floor's generic one", () => {
  G.soc.drinks.sasi = 9; G.talked = {}; out = [];
  run("talk to sasi");
  assert.match(said(), /nobody come back|You again/);
});
