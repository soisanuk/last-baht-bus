// DESTITUTION (Mario, 2026-10-20, the expat economy's fifth step): the expat stage can be lost. No roof — the Sabai has
// stopped writing you down — and nothing for one night, counted at the wake, consecutive; three mornings and the
// consulate has your name: an emergency loan against the passport and a plane, VISIT PATTAYA closed. The way out is the
// people: a woman who knows you keeps you (her offer, once, a modal; five nights on her mat; her face is the rent and her
// floor says so). A bar owner with a bar is exempt. Structural, never a morality tale.
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
const broke = (origin = "running") => {
  newGame(); G.player = { origin, personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "expat"; _setFlag("expatLife"); G.paper = "tourist"; G.payDay = 5; G.day = 20; G.hotel = "sabai"; G.room = "hotel_room"; G.nightTurn = 30;
  G.hotelDebt = _DEBT_CAP; G.money = 0; G.bank = 0; G.phone.contacts = { tan: true }; G.talked.tan = [0]; out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };

beforeEach(() => { newGame(); });

test("three roofless mornings and the plane: the count, Tan's word, the loan against the passport, VISIT PATTAYA closed, START OVER open", () => {
  broke(); let s = sleep(); assert.equal(G.destitute, 1); assert.match(s, /No roof and nothing for one\. The first morning/); assert.match(s, /Nira lends/);
  assert.equal(G.pendingChoice, null, "nobody knows him well enough to keep him");
  assert.match(t("money"), /No roof: morning 1 of 3/);
  s = sleep(); assert.equal(G.destitute, 2); assert.match(s, /The second morning/); assert.ok((G.phone.inbox || []).some(m => /desk in Bangkok/.test(m.text)), "Tan's word");
  s = sleep(); assert.equal(G.pendingChoice, "gameend"); assert.equal(G.endKind, "repatriated");
  assert.match(s, /emergency loan/); assert.match(s, /flagged until it is repaid/); assert.doesNotMatch(s, /jail|prison|cellb/i); assert.match(s, /THE LAST BAHT BUS — the plane/);
  assert.match(t("visit pattaya"), /loan against your passport comes first/); assert.equal(G.pendingChoice, "gameend");
  assert.deepEqual(_chipSet().map(c => c.cmd), ["visit pattaya", "start over", "share"]);
  run("start over"); assert.equal(G.pendingChoice, "intro", "a new first night starts at the taxi"); assert.ok(G.day <= 2);
});

test("a night paid resets the count; a bar owner is exempt; a condo tenant is evicted to the Sabai first, never roofless in the condo", () => {
  broke(); sleep(); assert.equal(G.destitute, 1); G.money = 2000; sleep(); assert.equal(G.destitute, 0, "the room paid, the count gone"); assert.doesNotMatch(said(), /No roof/);
  G.money = 0; sleep(); assert.equal(G.destitute, 1, "starts again from one");
  broke(); G.flags.barOpen = true; G.bar.room = "stinky_bar"; G.bar.cash = 0; sleep(); assert.equal(G.destitute, 0, "a bar is a roof"); assert.doesNotMatch(said(), /No roof/);
  broke(); G.hotel = "condo"; G.room = "condo_room"; G.condo = { since: 1, deposit: 18000, short: 1, guestsTold: true }; G.hotelDebt = 0; sleep(); assert.equal(G.destitute, 0);
});

test("her offer: a woman who knows you keeps you — once, a modal; five nights on her mat with no folio; then her mama has noticed, and her floor says what it cost her", () => {
  broke(); G.soc.drinks.lek = 8; G.talked.lek = [0]; G.phone.contacts.lek = true;
  let s = sleep(); assert.equal(G.pendingChoice, "keptby"); assert.match(s, /you stay me/); assert.equal(G.keptOffer, "lek");
  assert.deepEqual(_chipSet().map(c => c.cmd), ["yes", "no"]); assert.ok(engineComplete("y").some(c => /^yes/.test(c)));
  assert.match(t("what does it cost?"), /her mama, her sister and her floor/); assert.equal(G.pendingChoice, "keptby");
  out = []; run("yes"); assert.equal(G.pendingChoice, null); assert.ok(G.keptBy && G.keptBy.id === "lek"); assert.equal(G.destitute, 0); assert.match(said(), /a mat on the floor by a fan/i);
  const b0 = G.bank, m0 = G.money; sleep(); assert.equal(G.keptBy.nights, 1); assert.equal(G.money, m0); assert.equal(G.bank, b0, "no folio"); assert.match(said(), /4 nights more/);
  G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek"); assert.match(t("ask lek about your room"), /sister snore/);
  const col = _staffAt(NPCS.lek.room).find(i => i !== "lek" && NPC_ROLES[i] === "hostess"); if (col) { run("talk to " + col); assert.match(t("ask " + col + " about the farang in her room"), /keep you|Brave/); }
  const bond = G.soc.drinks.lek; for (let i = 0; i < 4; i++) { G.room = "hotel_room"; sleep(); }
  assert.equal(G.keptBy, null); assert.match(said(), /It is five night/); assert.ok(G.soc.drinks.lek <= bond - 2, "the cost is hers, and some of it is yours to carry: " + G.soc.drinks.lek + " from " + bond); assert.ok(G.keptByLog && G.keptByLog.id === "lek");
  assert.equal(G.hotel, "sabai"); sleep(); assert.equal(G.destitute, 1, "the count starts again from one"); assert.equal(G.pendingChoice, null, "her offer comes once");
});

test("NO keeps the count; nothing in it rolls dice", () => {
  broke(); G.soc.drinks.lek = 8; G.talked.lek = [0]; sleep(); assert.equal(G.pendingChoice, "keptby");
  out = []; run("no"); assert.equal(G.pendingChoice, null); assert.equal(G.destitute, 1); assert.match(said(), /The count stands/);
  const rng = G.rng; G.roofless = G.day; _destituteTick(); assert.equal(G.rng, rng);
});
