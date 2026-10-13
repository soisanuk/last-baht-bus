// ROUND 88 (2026-10-13) — Bernard Okafor (Opus), a widowed Croydon quantity surveyor on the Soi 6 week who gave
// every night and checked the next evening what each gift bought. "The game kept the account better than I did…
// Hand her two thousand and she's forgotten before you've sat back down." The money reconciled to the baht; the
// defects were memory and chorus. THE GIFT BOOK (_giftNote / G.gifts): a cart item, a rose, a tip, money given
// for a reason, a send kept or sent back, on her page for three days, answered by its own word, latest first,
// and by a colleague who was in the room. The morning ledger names who a send went to and what went into whose hand.
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
const MISS = /Not my story|not my story|Not mine to know|wrong woman|wrong girl|don't know about that/;
const lc = id => NPCS[id].name.toLowerCase();

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "whiteknight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.flowerDay = G.day; out = [];
  G.room = "sweet_tamarind";
});
const floor = () => _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
const nextEvening = () => { _endNight("sleep"); G.room = "sweet_tamarind"; G.nightTurn = 20; out = []; };

test("a tip, money given for a reason and a send are remembered the next evening by their own word", () => {
  const [a, b] = floor(); G.phone.contacts[a] = true;
  run(`tip ${lc(a)} 500`); run(`give ${lc(b)} 300 for her taxi home`); run(`send 400 to ${lc(a)}`);
  nextEvening();
  run(`ask ${lc(a)} about the tip`); assert.doesNotMatch(said(), MISS); assert.match(said(), /฿500/);
  out = []; run(`ask ${lc(a)} about the money`); assert.match(said(), /฿400/, "the latest money is the send");
  out = []; run(`ask ${lc(b)} about the taxi`); assert.doesNotMatch(said(), MISS); assert.match(said(), /taxi home/);
});

test("the morning ledger names who a send went to, what went into whose hand, and that the headline leaves sends out", () => {
  const [a, b] = floor(); G.phone.contacts[a] = true;
  _endNight("sleep"); G.room = "sweet_tamarind"; G.nightTurn = 30;
  run(`tip ${lc(a)} 500`); run(`give ${lc(b)} 300 for her taxi home`); run(`send 400 to ${lc(a)}`);
  out = []; _endNight("sleep");
  const l = said();
  assert.match(l, /not counting what you sent/); assert.match(l, new RegExp(`sent from the account[^·]*${NPCS[a].name} ฿400`));
  assert.match(l, new RegExp(`฿800 of it into the women's hands \\(${NPCS[a].name} ฿500, ${NPCS[b].name} ฿300\\)`));
});

test("a send back from a woman on the next stool is said, not texted; and a face is not told 'i not know you'", () => {
  const id = floor().find(i => _hh(String(i) + ":krengjai", 113) % 2 === 0);
  if (!id) return;
  G.phone.contacts[id] = true; G.soc.drinks[id] = 3;   // a face
  const inbox = (G.phone.inbox || []).length;
  run(`send ${GIFT_BIG} to ${lc(id)}`);
  assert.equal((G.phone.inbox || []).length, inbox, "no text from beside you");
  assert.doesNotMatch(said(), /i not know you/);
  nextEvening(); run(`ask ${lc(id)} about the money`); assert.doesNotMatch(said(), MISS);
});

test("four mamasans do not give one character reference: the review book is the town's", () => {
  const lines = [];
  for (const r of Object.keys(ROOMS).filter(r => ROOMS[r].region === "Soi 6" && ROOMS[r].barType)) {
    G.room = r; const here = _npcsHere(); const m = here.find(i => NPC_ROLES[i] === "mamasan"), g = here.find(i => NPC_ROLES[i] === "hostess");
    if (!m || !g || lines.length >= 6) continue;
    out = []; run(`ask ${lc(m)} about ${lc(g)}`);
    lines.push(said().replace(new RegExp(NPCS[g].name, "g"), "X").replace(new RegExp(NPCS[m].name, "g"), "M").split("\n")[0].slice(0, 70));
  }
  assert.ok(lines.length >= 4, "found mamasans: " + lines.length);
  assert.equal(new Set(lines).size, lines.length, lines.join(" | "));
});

test("Alisa greets a man she knows as one, not as the one who only watched", () => {
  const id = "sweet_tamarind_alisa"; if (!_npcsHere().includes(id)) return;
  G.soc.drinks[id] = 3; (G.metDay = G.metDay || {})[id] = G.day - 2;
  run("talk to alisa"); assert.doesNotMatch(said(), /you watch, you don't talk|didn't talk/);
});

test("a question walked away from is not re-asked five nights later", () => {
  const [a] = floor();
  G.convoLapsed = { [a]: { key: "barfirst", q: "\"First time this bar?\"", day: G.day - 5 } };
  run(`ask ${lc(a)} about the weather`); assert.doesNotMatch(said(), /was actually asking/);
});

test("her family is her own subject, not the medicine text that said mama", () => {
  const [a] = floor(); G.phone.contacts[a] = true;
  G.phone.inbox = [{ from: a, text: "mama sick na 🙏 need ฿400 for medicine", day: G.day, read: true }];
  run(`ask ${lc(a)} about her family`); assert.doesNotMatch(said(), /I text you|medicine/);
});

test("my name is said to the floor, I'm <name> and TELL <her> my name are kept; a cart gone a minute ago says so", () => {
  const [a] = floor();
  run("my name is bernard"); assert.match(said(), /Bernard/); assert.equal((G.player.told || {}).name, "bernard");
  G.player.told = {}; out = []; run(`tell ${lc(a)} i am bernard`); assert.equal(G.player.told.name, "bernard");
  out = []; run(`talk to ${lc(a)}`); run("i am tired"); assert.notEqual(G.player.told.name, "tired");
  G.salengCart = null; G.salengRoom = G.room; G.salengUntil = G.turns - 2; out = []; run(`buy heels for ${lc(a)}`);
  assert.match(said(), /cart|saleng/i); assert.doesNotMatch(said(), /Not for sale here/);
});

test("a colleague in the room saw the sandals", () => {
  const [a, b] = floor(); if (!b) return;
  G.salengCart = "shoes"; G.salengRoom = G.room; G.salengUntil = G.turns + 20;
  run(`buy sandals for ${lc(a)}`); nextEvening();
  run(`ask ${lc(b)} about the sandals`); assert.doesNotMatch(said(), MISS); assert.match(said(), new RegExp(NPCS[a].name));
});

test("the cart's thank-you says aroy, and the lady-drink line has no barman where there is none", () => {
  assert.ok(!readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8").includes('"Aoy, so sweet!"'));
  assert.ok(!readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8").includes("tonight you no pay for nothing"), "a text's promise the till never kept");
});

test("every dog line names him, so a renamed dog is named (the round-87 pool deepening forgot two)", () => {
  for (const pool of [_DOG_TALK_TH, _DOG_TALK_TH_HE, _DOG_TALK_EN]) for (const f of pool) assert.match(f("X"), /Sai Krok/, f("X").slice(0, 60));
});
