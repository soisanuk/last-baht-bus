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

// ── class N, the gap Desmond mapped (round 63): Bangkok, last night, the ride's stops, Sao ──
const tanRoom = () => _npcWhere("tan") || NPCS.tan.room;
test("Bangkok is a fact the town answers — the floor, the house, a man on a stool, and Tan, who knows which Bangkok you saw", () => {
  G.room = "lucky_tiger"; doCommand("talk to lek"); assert.match(ask("lek", "bangkok"), /Bangkok|Krung Thep/);
  G.room = "queen_vic"; doCommand("talk to terry"); assert.match(ask("terry", "bangkok"), /Bangkok|bus/);
  G.room = "stinky_bar"; doCommand("talk to bert"); assert.match(ask("bert", "bangkok"), /Bangkok|motorway|North station/);
  G.room = tanRoom(); doCommand("talk to tan");
  assert.match(ask("tan", "bangkok"), /Bangkok/, "Tan's own node on the word outranks the town row, as every authored node does");
  assert.equal(_townTalk("lek", "bangkokian"), false, "a word that merely contains it is not the question");
});
test("last night is a witness question: the bar you sat in saw you and who you left with, another bar did not, she knows you were there, and Tan knows how it ended", () => {
  G.lastNightWas = { day: G.day - 1, reason: "barfine", bar: "lucky_tiger", barTurns: 25, with: "lek", endRoom: "lucky_tiger" };
  G.room = "lucky_tiger"; doCommand("talk to rung");
  const r = ask("rung", "last night"); assert.match(r, /hour/); assert.match(r, /Lek/);
  doCommand("talk to lek"); assert.match(ask("lek", "last night"), /You were there|bike|ride/);
  G.room = "stinky_bar"; doCommand("talk to bert"); assert.match(ask("bert", "last night"), /weren't in here|Not this room|somebody else's/);
  G.room = tanRoom(); doCommand("talk to tan"); assert.match(ask("tan", "last night"), /went home with Lek|Lek went home with you/);
  G.lastNightWas.reason = "blackout"; G.lastNightWas.endRoom = "beach_rd_c"; assert.match(ask("tan", "yesterday"), /did not make it home/);
  G.lastNightWas.reason = "sleep"; assert.match(ask("tan", "last night"), /own feet|own bed/);
  G.lastNightWas.day = G.day - 3; assert.equal(_townTalk("tan", "last night"), false, "a snapshot older than last night is not last night");
});
test("the woman who drove remembers the stop you name, and denies one you did not make", () => {
  G.rideLog = { lek: { count: 1, day: G.day - 1, stops: 3, great: true, seen: ["disco", "somtam", "ranlao"] } };
  G.room = "lucky_tiger"; doCommand("talk to lek");
  for (const [q, key] of [["thai disco", "disco"], ["som tam", "somtam"], ["ran lao", "ranlao"]]) {
    const a = ask("lek", q);   // asked ONCE — the pool's no-repeat memory hands the next ask the other line
    assert.ok(_RIDE_STOP_MEMORY[key].some(f => a.includes(f("Lek").slice(0, 30))), a);
  }
  assert.match(ask("lek", "the viewpoint"), /We no go there/);
  assert.match(ask("lek", "the ride"), /bike|ride/, "the generic memory still answers the ride itself");
  assert.equal(_rideStopKey("the market"), "market"); assert.equal(_rideStopKey("photosynthesis"), null);
});
test("Sao is nobody's business on Soi 6 — except Tan's, once you have met her", () => {
  G.room = tanRoom(); G.known.sao = true; doCommand("talk to tan");
  assert.match(ask("tan", "sao"), /finds you/, "before you have met her she is the offmap line");
  G.phone.contacts.sao = true; const t = ask("tan", "sao"); assert.match(t, /Sathorn/); assert.doesNotMatch(t, /ate at that table/);
  G.bkk = { went: true, stage: 6 }; assert.match(ask("tan", "sao"), /across the river/, "after the dinner his authored read on her takes the word");
});
