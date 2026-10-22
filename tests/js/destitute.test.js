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
  s = sleep(); assert.equal(G.pendingChoice, "embassy", "the plane is offered, and can be refused (2026-10-22)"); assert.match(s, /TAKE THE PLANE/);
  s += t("take the plane"); assert.equal(G.pendingChoice, "gameend"); assert.equal(G.endKind, "repatriated");
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
  G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek"); assert.match(t("ask lek about your room"), /One fan\. You snore/);
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

// THE PLANE REFUSED (Mario, 2026-10-22, from the canon essay "the people who should not be here"): STAY is the bench —
// mornings on a bench, the dawn sweep some days, the lenders shut, the floor looking past him — the plane again every week,
// and a roof paid for again ends it without one.
const toEmbassy = () => { broke(); sleep(); sleep(); sleep(); assert.equal(G.pendingChoice, "embassy"); };
test("STAY on the third morning: the bench, not an ending; the plane is offered again in a week", () => {
  toEmbassy(); const a = t("what happens if i stay?"); assert.match(a, /bench/); assert.equal(G.pendingChoice, "embassy", "a question keeps the gate");
  const s = t("stay"); assert.equal(G.pendingChoice, null); assert.ok(G.street); assert.notEqual(G.endKind, "repatriated");
  assert.match(s, /benches|bench/); assert.match(t("money"), /On the street/);
  for (let i = 0; i < STREET_REOFFER - 1; i++) { sleep(); assert.equal(G.pendingChoice, null, "no plane before the week is out"); }
  const m = sleep(); assert.equal(G.pendingChoice, "embassy"); assert.match(m, /consulate again/);
  run("stay"); assert.ok(G.street.nights >= STREET_REOFFER);
});
test("the bench: a morning on it is named; the sweep comes some mornings; Nira will not lend against it; the floor looks past him", () => {
  toEmbassy(); run("stay"); let swept = 0;
  for (let i = 0; i < 6; i++) { const m = sleep(); assert.ok(_STREET_MORNING.some(l => m.includes(l)), m); if (_STREET_SWEEP.some(l => m.includes(l))) swept++; }
  assert.ok(G.street.swept === swept && swept > 0, "the sweep comes some mornings, and is counted");
  assert.ok(!_isHotelRoom(G.room), "he wakes on a bench, not at the desk");
  G.room = _npcRoom("nira"); G.nightTurn = 30; run("talk to nira"); assert.match(t("borrow 1000"), /room|roof|door/);
  G.room = "stinky_bar"; G.soc.streetLook = {}; out = []; _describeRoom(true); assert.ok(_STREET_LOOK.some(l => said().includes(l)));
});
test("a roof paid for again ends the bench without a plane — the payday is the way back", () => {
  toEmbassy(); run("stay"); sleep();
  G.money = 5000; G.hotelDebt = 0; const s = sleep(); assert.equal(G.street, null); assert.ok(G.streetDone); assert.match(s, /A room again/);
});
test("Henning on the bench answers for himself, and for a man who has joined him", () => {
  broke(); G.room = "beach_rd_c"; G.nightTurn = 30; for (const k in ENCOUNTERS) G.encDone[k] = true;
  assert.match(t("talk to henning"), /not asking you for money/);
  assert.match(t("ask henning about the plane"), /barrier/);
  G.street = { since: G.day, nights: 1, swept: 0, offered: G.day }; G.talked.henning = []; assert.match(t("talk to henning"), /consulate found you/);
});
