// THE ADVERSARIAL CODE REVIEW (2026-11-01), the tools group: the instruments that are meant to go red when the engine
// drifts. Each defect here was an oracle that could not see what it guards — an extractor that read one shape of
// answerer, an audit that judged with the engine's own regex, a manifest no test compared, a harvest that kept the first
// match, a parse-failure list from before the miss lines were rewritten.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { talkOrder } from "../../tools/talk-order.mjs";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const t = c => { out = []; doCommand(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = (stage = "vacation") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  if (stage !== "act1") { _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.stage = stage; quiet(); G.money = 5000; G.bank = 20000;
};
const dice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
beforeEach(() => { newGame(); });
const tool = (path, ...args) => spawnSync(process.execPath, [fileURLToPath(new URL(`../../${path}`, import.meta.url)), ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
const PARSER = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");

test("S10-1: the talk order sees an answerer in every shape, and moving one changes the order", () => {
  const order = talkOrder();
  // the shapes the one-line extractor could not see: `const said = _x(npc)`, a predicate first on the line, `_say(_x(npc))`,
  // the second line of a multi-line if
  for (const n of ["_poolTalk", "_barfineTalk", "_priceTalk", "_kitchenTalk", "_workTalk", "_afterWorkTalk", "_selfNamedNode",
    "_wentWithHello", "_streamBusy", "_dogTalk", "_badgeTalk", "_venueAnswer", "_paperTalk", "_foodWhereTalk", "_keptTalk", "_exitSlip"])
    assert.ok(order.includes(n), n + " is in the talk order");
  // the reviewer's mutation: _priceTalk, in the `const said` shape, moved above every answerer
  const at = PARSER.indexOf("{", PARSER.indexOf("function _doTalkCore(")) + 1;
  const moved = PARSER.slice(0, at) + `\n  if (/\\b(price|how much)\\b/.test(String(topic))) {\n    const said = _priceTalk(npc);\n    if (said) { _say(said); return; }\n  }\n` + PARSER.slice(at);
  assert.equal(talkOrder(moved)[0], "_priceTalk", "an answerer moved to the top is first in the order");
  assert.notDeepEqual(talkOrder(moved), order);
  // and the real entry point: the answerer the order names is the one that answers
  sandbox(); G.mode = "soi6"; G.room = "orchid_room"; G.nightTurn = 30; G.metDay = { nune: G.day - 2 }; G.soc.drinks.nune = 4;
  assert.match(t("ask nune about price"), /Johnnie Walker/, "Nune's price list comes from _priceTalk");
});

test("S10-2: the go-go audit judges with its own vocabulary, so a bar line the filter misses goes red", () => {
  const line = "The mamasan leans against the bar and claps, and the cashier props herself at the counter.";
  assert.equal(_FIT_GOGO.test(line), false, "the engine's filter lets this line through");
  const r = tool("tools/gogo-audit.mjs", "--json", "--quick", "--room", "hyper", "--mutate", "bell");
  assert.ok(JSON.parse(r.stdout || "[]").some(x => x.line === line), "the audit saw the planted line");
});

test("S10-3: a test compares the portrait manifest with its generator, and it is in sync today", () => {
  const art = readFileSync(fileURLToPath(new URL("./art.test.js", import.meta.url)), "utf8");
  assert.match(art, /gen-portrait-manifest\.mjs"\), "--check"\]/, "art.test runs the portrait manifest's --check");
  const r = tool("scripts/gen-portrait-manifest.mjs", "--check");
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
