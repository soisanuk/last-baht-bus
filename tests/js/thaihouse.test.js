// THE THAI HOUSE VOICE (Mario, 2026-10-18): the house register was a farang manager's English and every Thai mamasan
// and cashier borrowed it. A Thai house speaker gets the Thai variant; the managers keep theirs; a mama never reaches
// for a phone, never says "tilac", never speaks a British or American idiom; a cashier with no English is translated.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.nightTurn = 30; out = [];
});

test("who speaks the Thai house voice: Thai mamasans and cashiers yes, the farang managers no", () => {
  const mamas = Object.keys(NPCS).filter(i => NPC_ROLES[i] === "mamasan" && !NPCS[i].fluent);
  assert.ok(mamas.filter(_thaiHouse).length > mamas.length * 0.8, "nearly every mamasan");
  for (const m of ["bert", "bill", "bob", "fast_eddy"]) if (NPCS[m]) assert.equal(_thaiHouse(m), false, m);
  assert.equal(_hv("bert", { house: ["h"], thai: ["t"] })[0], "h");
  assert.equal(_hv(mamas.find(_thaiHouse), { house: ["h"], thai: ["t"] })[0], "t");
});

test("a mamasan answers the town in the Thai voice; Bert keeps his", () => {
  G.room = "sunset_dreams"; doCommand("talk to malai"); out = [];
  doCommand("ask malai about the season");
  assert.ok(_TOWN_THAI.season.some(l => said().includes(l.replace(/\{[^}]+\}/g, "").slice(3, 18).trim())) || !/\bbud\b/.test(said()), said());
  assert.doesNotMatch(said(), /\bbud\b|landlords\./);
  G.room = "stinky_bar"; doCommand("talk to bert"); out = []; doCommand("ask bert about the season");
  assert.ok(_TOWN.season.house.some(l => said().includes(l.slice(-20).replace(/[{}A-Za-z]+\}/g, "").slice(0, 8))) || /landlord/.test(said()), said());
});

test("the Thai house voice has no hostess word, no phone and no farang idiom", () => {
  const thai = [].concat(...Object.values(_TOWN_THAI), _M_GREET, _M_GIRLS, _M_FAMILY, _M_PLAN, _C_GREET, _C_MONEY, _C_FAMILY,
    _TOPIC_MISS_THAI.map(f => f("X")), _NOT_UNDERSTOOD.house, ...Object.values(_REMARK.house), ...Object.values(_HEARD.house)).join("\n");
  assert.doesNotMatch(thai, /\btilac\b|google translate|\b(?:bud|buddy|mate|love,|sweetheart|reckon|blimey|bloody|innit|gonna)\b/i);
  const spoken = _NOT_UNDERSTOOD.house.map(l => (l.match(/"[^"]*"/g) || []).join(" ")).join("\n");   // her words, not the narration
  assert.doesNotMatch(spoken, /say (?:it )?again|slowly|don'?t understand/i, "a mama talks around it");
});

test("a cashier with no English is translated by a girl, once a night", () => {
  const none = Object.keys(NPCS).find(i => NPC_ROLES[i] === "cashier" && _englishOf(i) === "none" && _npcRoom(i));
  assert.ok(none, "about one cashier in seven has none");
  G.room = _npcRoom(none); out = [];
  doCommand("talk to " + NPCS[none].name.toLowerCase());
  assert.match(said(), /next to no English|English stops at numbers/);
  out = []; doCommand("talk to " + NPCS[none].name.toLowerCase());
  assert.doesNotMatch(said(), /next to no English|English stops at numbers/, "once a night");
});
