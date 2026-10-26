// ROUND 108 (2026-10-27) — three Fable personas: Kemal (a publican owner who counts his till every night), Lorna (a
// bookkeeper with a price notebook on the Soi 6 week), Oskar (a location scout who does everything through Tan).
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
const t = c => { out = []; run(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000;
  G.nightTurn = 30; G.visited.jade_lounge = G.visited.pink_lotus = G.visited.peach_lounge = true;
};
const nextNight = () => { _endNight("sleep"); quiet(); G.nightTurn = 30; };
const withJoy = () => { _arriveAt("pink_lotus"); quiet(); G.soc.drinks.joy = 8; run("barfine joy"); run("take her out"); run("out"); quiet(); };
const _ownerBar = () => { sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 20000; };
const _shortDay = (kind) => { for (let d = 3; d < 400; d++) { G.day = d; const s = _tillShort(d); if (s && (!kind || s.kind === kind)) return d; } };

// ── Kemal ──
test("Kemal: a short the count found and got all back is still named in BOOKS", () => {
  _ownerBar(); const d = _shortDay("slate"); G.room = "stinky_bar"; G.nightTurn = 65; run("count the till");
  _barNight(d); assert.ok(G.bar.lastShort && G.bar.lastShort.found > 0 && G.bar.lastShort.amt === 0);
  out = []; run("books"); assert.match(said(), /The count found the drawer ฿[\d,]+ short — a regular's slate/);
});
test("Kemal: the morning headline's out includes the short, and the till keeper says it", () => {
  _ownerBar(); const d = _shortDay(); G.bar.countedDay = null; const n = _barNight(d);
  assert.ok(n.short > 0 && n.costs >= n.short);
  G.room = "stinky_bar"; const tk = _tillKeeper("stinky_bar"); out = []; run("ask " + NPCS[tk].name.toLowerCase() + " about last night");
  assert.match(said(), /short/);
});
test("Kemal: COUNT THE TILL away from the bar points at it; MOTOSAI TO CLUB asks which club", () => {
  _ownerBar(); G.room = "soi6_mid"; assert.match(t("count the till"), /Stinky Pinky/);
  G.room = "soi6_street"; G.nightTurn = 30; const r0 = G.room; assert.match(t("motosai to club"), /Which club/); assert.equal(G.room, r0);
});

// ── Oskar ──
test("Oskar: 'ask me about the town' is answered; the car on the Soi 6 week; the katoey answer assumes no car talk", () => {
  sandbox(); G.mode = "soi6"; G.nightTurn = 30; G.room = _npcRoom("tan"); run("talk to tan");
  assert.match(t("ask tan about the town"), /nobody forgets a face/i);
  assert.match(t("ask tan about your car"), /whole of your week is this one street/);
  assert.doesNotMatch(t("ask tan about katoey"), /what I said in the car/);
  assert.ok(!JSON.stringify(NPCS.tan.dialogue.map(d => d.text)).includes("comes off the car"));
});
test("Oskar: Tan says when he walks on or arrives; CALL TAN on the week says where he is; THANK TAN is said", () => {
  sandbox(); G.mode = "soi6"; G.nightTurn = 8; G.room = "soi6_street"; G.soc.tanWas = undefined; out = [];
  for (let i = 0; i < 25; i++) run("wait");
  assert.ok(_TAN_LEAVES.concat(_TAN_COMES).some(l => said().includes(l.slice(0, 20))), "a walk is narrated");
  G.nightTurn = 30; G.phone.contacts.tan = true; assert.match(t("call tan"), /I am on Soi 6/);
  G.room = _npcRoom("tan"); assert.doesNotMatch(t("thank tan"), /pay grade|blinks/);
});
test("Oskar: Tan's last night knows a short time; a Soi 6 bar is read with whose paper it is", () => {
  sandbox(); G.mode = "soi6"; G.nightTurn = 40; _arriveAt("hula_hula"); quiet();
  let g; for (const x of _npcsHere().filter(i => NPC_ROLES[i] === "hostess")) { (G.soc.drinkCount = G.soc.drinkCount || {})[x] = 1; G.soc.drinks[x] = 6; run("barfine " + NPCS[x].name.toLowerCase()); if (G.pendingBf) { run("short time"); g = x; break; } }
  assert.ok(g); G.room = "hotel_room"; _endNight("sleep"); quiet(); G.nightTurn = 10; G.room = _npcRoom("tan"); run("talk to tan");
  assert.match(t("ask tan about last night"), new RegExp("Upstairs with " + NPCS[g].name + "|" + NPCS[g].name + ".* took you upstairs"));
  assert.match(t("ask tan about pink lotus lounge"), /group's/);
});

// ── Lorna ──
test("Lorna: the week card's 'spent' is the money gone start to end — a deposit is not spending", () => {
  sandbox(); G.mode = "soi6"; G.money = 1000; G.bank = 100000; G.weekStart = 101000;
  G.atmTotal = 35000; G.atmFees = 1200; G.money = 190; G.bank = 81450;
  assert.ok(_shareCard().some(l => l.includes("฿19,360 spent")), _shareCard().join(" | "));
});
test("Lorna: TIME's barfine lines follow the kind of bar you're in", () => {
  sandbox(); G.nightTurn = 70; G.room = "pink_lotus"; assert.match(t("time"), /room upstairs costs what it did/);
  const beer = Object.keys(ROOMS).find(k => ROOMS[k].region === "Soi 6" && ROOMS[k].barType === "beer");
  G.room = beer; assert.match(t("time"), /beer bars/);
  G.nightTurn = 10; G.room = "pink_lotus"; assert.doesNotMatch(t("time"), /half again/);
});
test("Lorna: after midnight a hostess says her own money in her own words", () => {
  sandbox(); G.nightTurn = 65; const beer = Object.keys(ROOMS).find(k => ROOMS[k].region === "Soi 6" && ROOMS[k].barType === "beer" && Object.keys(NPCS).some(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === k));
  _arriveAt(beer); quiet(); const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  run("talk to " + NPCS[g].name.toLowerCase()); const s = t("ask " + NPCS[g].name.toLowerCase() + " about barfine");
  assert.doesNotMatch(s, /I let a girl go/);
});
test("Lorna: the Vic quotes its bell; a cart's goods after it has gone are the cart's; darts names its stake; one tile of a forced pair flips it", () => {
  sandbox(); G.room = "queen_vic"; G.nightTurn = 10; assert.match(t("tao rai"), /the bell ฿/);
  G.room = "pink_lotus"; G.nightTurn = 30; assert.doesNotMatch(t("buy heels for joy"), /Not for sale here/);
  G.game = { type: "jp", tiles: jpNew(), pending: [[2, 3]], stake: 0, taught: {} };
  const before = G.game.tiles.join(""); run("flip 2"); assert.ok(!G.game || G.game.tiles.join("") !== before);
});
