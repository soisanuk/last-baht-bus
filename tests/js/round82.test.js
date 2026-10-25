// ROUND 82 (2026-10-11) — Mario's hours, then Ron Whitfield (Opus), 71, Geelong: TODAY'S SOI on a
// 390×844 phone at the largest text, thumbs only. "The girls are right… But I'm squinting at the
// money and the time like it's the fine print on a contract."
//
// THE HOURS (Mario, 2026-10-11): everything on Soi 6 shuts at two; the Queen Vic's pub shuts at
// eleven, though a guest still walks through it — the bar is the reception, and after eleven the
// security guard sits behind it and pours nothing; the midnight barfine pricing stays at midnight;
// Soi 6's draws are fine (they lift at midnight like anyone's).
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
const run = c => doCommand(c);

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; G.flowerDay = G.day; out = [];
});

test("the hours: Soi 6 at two, the Vic's pub at eleven, the clubs and the Darkside at midnight, the town at dawn", () => {
  for (const r of Object.keys(ROOMS).filter(r => ROOMS[r].barType && ROOMS[r].region === "Soi 6" && r !== "queen_vic"))
    assert.equal(_closeTurn(r), SOI6_CLOSE, r + " shuts at two");
  assert.equal(SOI6_CLOSE, 80);
  assert.equal(_closeTurn("queen_vic"), 50);
  assert.equal(_closeTurn("nottys_place"), 60);
  assert.equal(_closeTurn("night_heron"), 60);
  assert.equal(_closeTurn("lucky_tiger"), null, "a town beer bar runs to dawn");
  // the midnight pricing stays at midnight: the beer-bar book still closes at 60
  assert.match(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8"), /else if \(G\.nightTurn >= 60\) ltBar = st;/);
});

test("Soi 6 gives last call at half past one and walks you out at two", () => {
  G.room = "ruby_kiss"; G.nightTurn = SOI6_CLOSE - 6; run("wait");
  assert.match(said(), /This place shuts at two/);
  G.nightTurn = SOI6_CLOSE - 1; out = []; run("wait");
  assert.match(said(), /Two o'clock on Soi 6/);
  assert.equal(G.room, ROOMS.ruby_kiss.exits.out);
  G.room = "sunset_rail"; G.nightTurn = 40;
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name.toLowerCase()} about closing`);
  assert.match(said(), /[Tt]wo/, "the staff say two");
});

test("the Vic at eleven: a guest stays and goes up, anyone else is walked out; nobody is served after", () => {
  G.hotel = "queenvic"; G.room = "queen_vic"; G.nightTurn = 49; run("wait");
  assert.ok(_PUB_SHUT_GUEST.some(l => said().includes(l)), "time is called round the guest");
  assert.equal(G.room, "queen_vic");
  assert.ok(!_npcsHere().includes("terry") && !_npcsHere().includes("aoy"), "the rail and the barmaid went home");
  const m = G.money; out = []; run("buy beer");
  assert.ok(_VIC_GUARD.some(l => said().includes(l)), "the guard pours nothing"); assert.equal(G.money, m);
  out = []; run("talk to guard"); assert.ok(_VIC_GUARD.some(l => said().includes(l)));
  assert.deepEqual(_playOptions(), [], "the darts are in the dark");
  out = []; run("up"); assert.equal(G.room, "qv_room");
  out = []; run("down"); assert.equal(G.room, "queen_vic"); assert.match(said(), /guard/);
  out = []; run("out"); run("enter queen vic inn"); assert.equal(G.room, "queen_vic", "the guest gets back in");
  // a man staying elsewhere
  G.hotel = "sabai"; G.room = "soi6_mid"; out = []; run("enter queen vic inn");
  assert.equal(G.room, "soi6_mid"); assert.match(said(), /closes at eleven/);
  G.room = "queen_vic"; G.nightTurn = 49; G.hotel = "sabai"; G.soc.pubShut = null; out = []; run("wait");
  assert.equal(G.room, "soi6_mid", "a non-guest is shown the door with the rail");
});

test("TAKE <her> OUT reaches her in an ordinary bar (it went looking for a woman called 'dokmai out')", () => {
  G.room = "night_heron"; out = []; run("take dokmai out");
  assert.doesNotMatch(said(), /not working this bar/);
});

test("Pukky's 'what did they call you small?' is a question that hears its answer", () => {
  G.room = "sunset_rail"; run("talk to pukky"); run("ask pukky about name");
  out = []; run("Ronnie. Ron now.");
  assert.doesNotMatch(said(), /didn't parse|understand/i);
  assert.match(said(), /"Ronnie\." Pukky tries it out/);
});

// ── Ron's phone ─────────────────────────────────────────────────────────────────────────────────
const src = f => readFileSync(fileURLToPath(new URL(`../../web/${f}`, import.meta.url)), "utf8");

test("a money prompt offers NO first; the ATM and the lady drink say their price on the button", () => {
  G.room = "ruby_kiss"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && i !== "chompoo" && !_isDraw(i));
  G.soc.drinkCount = { [g]: 1 }; run("barfine " + NPCS[g].name.toLowerCase());
  assert.equal(_chipSet()[0].cmd, "no", "no, thanks where the thumb is");
  run("no"); G.room = "soi6_street";
  const atm = _chipSet().filter(c => /^withdraw/.test(c.cmd));
  assert.ok(atm.length && atm.every(c => new RegExp("fee").test(c.label)), "the fee is on the button");
  assert.match(src("js/term.js"), /buy her a drink" \+ \(typeof _ladyPrice/);
});

test("WAIT AN HOUR is an hour; the info menu says so; WHERE IS THE ATM points the way", () => {
  G.room = "soi6_mid"; G.nightTurn = 10; run("wait an hour"); assert.equal(G.nightTurn, 20);
  run("wait 30 minutes"); assert.equal(G.nightTurn, 25);
  assert.ok(engineComplete("").includes("wait an hour") || !engineComplete("").includes("wait 10"));
  G.mode = "soi6"; G.room = "soi6_deep"; out = []; run("where is the atm");
  assert.match(said(), /nearest cash machine is on Soi 6 \(West End\).*head west \(W\)/);
});

test("the Soi 6 map is a list that wraps, not a 92-column picture", () => {
  G.mode = "soi6"; out = []; run("map");
  assert.ok(Array.isArray(_MAP_SOI6) && _MAP_SOI6.every(l => l.length < 200));
  assert.match(said(), /MIDDLE \(quiet, nobody's\)/); assert.match(said(), /shuts at two/);
});

test("the phone CSS: the HUD and the notes grow with A+, the header clears A−/A+, the pill has its own strip", () => {
  const h = src("index.html");
  assert.match(h, /#scene-hud \{[^}]*font-size: calc\(11px \* var\(--fscale/);
  assert.match(h, /header \{ padding: \.45rem 5\.6rem/);
  assert.match(h, /#term-out\.has-more \{ margin-bottom/);
  assert.match(src("js/term.js"), /_out\.classList\.toggle\("has-more", show\)/);
  assert.match(src("js/term.js"), /function _placeFly/);
});

test("the Queen Vic's room rate is said on the first screen of the Soi 6 week", () => {
  out = []; _soi6Opening(); assert.match(said(), new RegExp("฿" + _num(_HOTELS.queenvic.rate) + " a night"));
});
