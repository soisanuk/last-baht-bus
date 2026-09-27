// The town answers for its own furniture (class N, the coverage map's dark N column,
// 2026-09-27): where a bar is, the nearest cash machine and its fee, the clinic, the
// station and its ฿300, the two Beach Road cons — computed from what the engine holds,
// in the register of whoever you asked. The askable-audit gates the same facts.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});
const ask = (who, t) => { out = []; doCommand(`ask ${who} about ${t}`); return text(); };

test("a venue by name is placed: region and street, from a girl, the house and a man on a stool", () => {
  G.room = "lucky_tiger"; doCommand("talk to lek");
  assert.match(ask("lek", "stinky pinky"), /Beach Road/);
  assert.doesNotMatch(ask("lek", "candy bar"), /Beach Road, Beach Road/, "the region is not said twice");
  G.room = "queen_vic"; doCommand("talk to terry");
  assert.match(ask("terry", "candy bar"), /Soi Buakhao/);
  // the room you are standing in is not "placed" — and nonsense still misses
  G.room = "lucky_tiger"; assert.doesNotMatch(ask("lek", "lucky tiger"), /Beach Road/);
  assert.equal(_townTalk("lek", "photosynthesis"), false, "nonsense is not a place");   // the miss pool is a pool; ask the function, not a regex
});

test("the ATM: right here, the nearest on this side of town, and the fee the card pays", () => {
  G.room = "lucky_tiger"; doCommand("talk to lek");
  const a = ask("lek", "atm");
  assert.match(a, new RegExp("฿" + ATM_FEE), "the foreign-card fee, from the constant");
  G.thaiAccount = true; assert.match(ask("lek", "cash machine"), /No fee/);
  G.room = "beach_rd_c"; G.thaiAccount = false;
  const piwin = _npcsHere()[0];
  if (piwin) assert.match(ask(NPCS[piwin].name.toLowerCase(), "atm"), /right here/);
});

test("the clinic, the police and the cons answer with the numbers the engine charges", () => {
  G.room = "lucky_tiger"; doCommand("talk to lek");
  assert.match(ask("lek", "the clinic"), /Second Road.*GET TESTED/s);
  assert.match(ask("lek", "police"), /฿300/);
  const c = ask("lek", "hair tonic");
  for (const n of [TONIC_PRICE, FORTUNE_READ]) assert.match(c, new RegExp("฿" + n));
  assert.match(c, new RegExp("฿" + TONIC_FLEECE.toLocaleString()));
  assert.match(c, /REPORT/, "and the way back");
  G.room = "queen_vic"; doCommand("talk to mort");
  assert.match(ask("mort", "fortune teller"), /฿1,900|฿199/);
});
