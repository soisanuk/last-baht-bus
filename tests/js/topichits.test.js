// A TOPIC KEY TAKES AN INFLECTION, NEVER ANY THREE LETTERS (2026-10-23, Alun's round 104: ASK TAN ABOUT WATER got his
// temple — "wat" + "er"). The class, not the instance: a key of three letters or more reaches its plurals, tenses and
// possessive, and no other word that happens to start with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));

test("a key reaches its inflections and not its neighbours", () => {
  for (const [k, yes] of [["kid", "kids"], ["marry", "married"], ["drink", "drinking"], ["tan", "tan's"], ["child", "children"], ["family", "families"], ["work", "worked"]])
    assert.ok(_topicHits(k, yes), k + " → " + yes);
  for (const [k, no] of [["wat", "water"], ["tan", "tanks"], ["bar", "barry"], ["ice", "icelandic"], ["car", "cartoon"], ["mama", "mamasan's job"]])
    assert.ok(!_topicHits(k, no), k + " ↛ " + no);
});

test("ASK TAN ABOUT WATER is not his temple", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.room = _npcRoom("tan"); G.nightTurn = 30; doCommand("talk to tan"); out = []; doCommand("ask tan about water");
  assert.doesNotMatch(out.join("\n"), /Temple\?|Big Buddha/);
});

// THE FARANG WHO NEVER FLEW IN (2026-10-23, the canon essay — pattern only): a quarter of the women whose exit trip has
// come stay one more; asked, she says her mother needed money and changes the subject; her floor says it the floor's way
test("the plan that slipped: she is still here, says only that her mother needed money, and her colleague does not tell", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; for (const k in ENCOUNTERS) G.encDone[k] = true;
  let who = null, trip = 0;
  for (const id of Object.keys(NPCS)) { if (!NPCS[id].filler || NPC_ROLES[id] !== "hostess") continue;
    for (let v = 2; v <= 12 && !who; v++) { G.vacation = v; if (_exitSlip(id)) { who = id; trip = v; } } if (who) break; }
  assert.ok(who, "some woman's plan slips");
  G.vacation = trip; assert.equal(_exited(who), false, "she has not gone"); G.vacation = trip + 1; assert.ok(_exited(who), "she goes a trip later");
  G.vacation = trip; G.room = NPCS[who].room; G.nightTurn = 30; for (const k in ENCOUNTERS) G.encDone[k] = true;
  const n = NPCS[who].name.toLowerCase(); doCommand("talk to " + n); out = []; doCommand("ask " + n + " about your plan");
  const a = out.join("\n"); assert.match(a, /mama|family|Family|trust/i); assert.doesNotMatch(a, /฿|matchmak|scam/i);
  const mate = _npcsHere().find(x => x !== who && (NPC_ROLES[x] === "hostess" || NPC_ROLES[x] === "mamasan"));
  if (mate) { doCommand("talk to " + NPCS[mate].name); out = []; doCommand("ask " + NPCS[mate].name + " about " + n); assert.match(out.join("\n"), /mama|mother|money|Facebook|family/i); }
});
