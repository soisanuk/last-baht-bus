// Comped drinks land on the meter, and at a pushy bar the free one is the
// interview: a heavy pour, then a lady drink chalked to you once you're past
// the line where you'd notice. See _compDrink / _pushyBar (engine-play.js).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
const text = () => out.join("\n");
const run = c => doCommand(c);
beforeEach(() => {
  engineInit((t) => out.push(String(t)));
  newGame(); out = [];
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
});

engineInit(() => {}); newGame();   // _npcRoom reads G
const beerBars = Object.keys(ROOMS).filter(id => ROOMS[id].barType === "beer" &&
  Object.keys(NPCS).some(n => _npcRoom(n) === id && NPC_ROLES[n] === "hostess"));
const pushy = beerBars.find(id => _pushyBar(id));
const plain = beerBars.find(id => !_pushyBar(id));

test("the town has both kinds of bar, by hash", () => {
  assert.ok(pushy && plain);
  const share = Object.keys(ROOMS).filter(_pushyBar).length / Object.keys(ROOMS).filter(id => ROOMS[id].barType).length;
  assert.ok(share > 0.1 && share < 0.4, "roughly a quarter: " + share);
});

test("the bell's comped bottle at a beer bar is a drink on the meter", () => {
  G.room = plain; const d = G.soc.drunk;
  run("ring bell");
  assert.equal(G.soc.drunk, d + 1);
  assert.ok(!G.soc.padded || !G.soc.padded[plain], "an honest bar pads nobody");
});

test("every beer-bar bell line hands a bottle back, so the tick is never silent", () => {
  for (const l of _BELL_BEER) assert.match(l, /cold one|bottle|comped/i, l);
});

test("a pushy bar pours heavy, and pads the tab once you're three in — once a night", () => {
  G.room = pushy; G.soc.drunk = 2; const m = G.money;
  out = []; _compDrink(1);
  assert.equal(G.soc.drunk, 4, "one plus the heavy pour");
  assert.ok(_COMP_HEAVY.some(l => text().includes(l)), "the pour is narrated");
  assert.equal(G.money, m - _ladyPrice(pushy), "a lady drink chalked");
  const id = G.soc.padded[pushy];
  assert.equal(NPC_ROLES[id], "hostess");
  assert.equal(G.soc.drinkCount[id], 1, "the bar's book says you bought her one");
  assert.ok(G.soc.drinks[id] >= 1, "and she is grateful");
  assert.match(text(), new RegExp(NPCS[id].name));
  out = []; _compDrink(1);
  assert.equal(G.money, m - _ladyPrice(pushy), "not twice in a night");
});

test("sober, you'd notice: no padding under three drinks, and never when broke", () => {
  G.room = pushy; G.soc.drunk = 0; const m = G.money;
  _compDrink(1);
  assert.equal(G.soc.drunk, 2); assert.equal(G.money, m);
  G.soc.drunk = 5; G.money = 10; _compDrink(1);
  assert.equal(G.money, 10);
});

test("your own bar never works you, and a lock-in is a bar that loves you", () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen");
  G.bar = G.bar || {}; G.bar.room = pushy; G.bar.cash = 0;
  assert.equal(_pushyBar(pushy), false);
  newGame(); _setFlag("act1Done"); G.money = 5000;
  G.room = pushy; G.soc.drunk = 4; G.soc.lockIn = { [pushy]: true }; const m = G.money;
  _compDrink(2);
  assert.equal(G.soc.drunk, 6, "no heavy pour behind a bolted door");
  assert.equal(G.money, m);
});

test("the manager's welcome shot and the lock-in party both go through the meter", () => {
  G.room = "stinky_bar"; G.soc.drunk = 0; G.nightTurn = 30;
  _managerWelcome();
  assert.ok(G.soc.drunk >= 1, "Bert's shot counts");
  const d = G.soc.drunk;
  G.room = "night_heron"; G.soc.lockIn = { night_heron: true }; G.pendingEnc = "lockdare";
  _lockInDare("join in");
  assert.ok(G.soc.drunk >= d + 2, "the party is drinks: " + G.soc.drunk);
});
