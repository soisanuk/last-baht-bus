// ROUND 80 (2026-10-11) — Ilse Brandt (Opus), a release QA lead hunting SEVERE bugs only on the Soi 6
// week: crashes, soft-locks, money, save/reload, the irreversible without warning, contradictions that
// break play. Seven nights, every prompt interrupted and reloaded, the money reconciled to the baht each
// morning. One severe: "send belle home" put both companions in the taxi. "Fix that and I sign off."
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
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});
const two = () => {
  const a = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && _npcRoom(i) === "sunset_dreams");
  const b = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && _npcRoom(i) === "ruby_kiss" && i !== "chompoo");
  G.room = "soi6_mid"; G.party = { ids: [a, b], stops: 1, spent: 0, seen: {} };
  return [a, b];
};

test("SEVERE: sending ONE of two companions home sends only her, at her own half-fare", () => {
  const [a, b] = two(); const m = G.money;
  run(`send ${NPCS[b].name.toLowerCase()} home`);
  assert.deepEqual(G.party.ids, [a], "the other one stays on your arm");
  assert.equal(m - G.money, Math.round(PARTY_TAXI / 2), "one taxi, hers");
  assert.match(said(), new RegExp(`${NPCS[a].name} stays with you`));
});

test("…by every wording: GOODBYE <first>, SEND <second> HOME; HER with two asks which; THEM sends both", () => {
  let [a, b] = two(); run(`goodbye ${NPCS[a].name.toLowerCase()}`); assert.deepEqual(G.party.ids, [b]);
  [a, b] = two(); out = []; run("send her home"); assert.deepEqual(G.party.ids, [a, b], "ambiguous: nobody leaves"); assert.match(said(), /Which of them/);
  [a, b] = two(); run("send them home"); assert.equal(G.party, null, "THEM is both");
  [a, b] = two(); run("goodbye"); assert.equal(G.party, null, "a bare goodbye is everyone, as before");
});

test("a name that is not on your arm parts with nobody", () => {
  const [a, b] = two(); out = [];
  run("send nina home");
  assert.deepEqual(G.party.ids, [a, b]); assert.match(said(), /isn't with you tonight/);
});

test("the night-ending confirmation is disarmed by any other command — a free LOOK included", () => {
  G.room = _hotelRoomId(); G.nightTurn = 30; const d = G.day;
  run("sleep"); assert.ok(G.endWarn); run("look"); assert.equal(G.endWarn, null);
  run("sleep"); assert.equal(G.day, d, "it asks again"); run("sleep"); assert.notEqual(G.day, d);
});

test("HOW MUCH at the noodle girl is a question with her bar's prices, and her pitch stays up", () => {
  G.room = "soi6_street"; G.nightTurn = 30; delete G.encDone.noodle; _startEnc("noodle"); out = [];
  run("how much");
  assert.equal(G.pendingEnc, "noodle");
  const front = ROOMS.soi6_street.venues.find(v => ROOMS[v].barType);
  assert.match(said(), new RegExp("Beer ฿" + _beerPrice(front)));
});
