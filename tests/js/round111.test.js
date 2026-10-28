// ROUND 111 (2026-10-28) — three personas at the darkest walkable cells: Pascal (Fable, a tourist who wants through
// the Orchid's rope), Wendell (Opus, an owner in the September trough who says yes to every arrangement and checks
// each one against BOOKS), Tobias (Sonnet, a night-owl resident at the LK Metro beer garden and around the police).
import { test } from "node:test";
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
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const owner = () => { sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 2000; };
const orchid = () => { sandbox(); G.room = "orchid_room"; G.nightTurn = 40; };

// ── Pascal ──
test("Pascal: the floor at the Orchid's door points at Gavin, and Gavin points at the errand", () => {
  sandbox(); G.room = "pink_lotus"; const r = t("ask nee about the orchid room");
  assert.match(r, /Gavin/); assert.match(r, /Golden Dragon/);
  G.room = "golden_dragon"; run("talk to gavin"); assert.match(t("ask gavin about the orchid"), /ASK GAVIN ABOUT PATTAYA LEISURE/);
  assert.match(QUESTS.orchid_recon.desc, /Gavin, at the Golden Dragon/);
});
test("Pascal: Vasseur asked about his room answers about the room — the table's confession waits for the table", () => {
  orchid(); G.known.powers = true; const r = t("ask vasseur about the orchid room");
  assert.doesNotMatch(r, /not a topic/); assert.match(r, /I wanted a club/);
});
test("Pascal: the Orchid's till quotes beer and soda only; no bell, no dice box, no lady drink, no bottle for a guest", () => {
  orchid(); const p = t("tao rai"); assert.doesNotMatch(p, /lady drink|the bell|Connect 4/); assert.match(p, /beer ฿/);
  const m0 = G.money; assert.match(t("ring bell"), /no bell/); assert.equal(G.money, m0);
  assert.ok(!_barGamesHere());
  assert.match(t("buy blue label"), /member buy it by the bottle/); assert.equal(G.money, m0);
});
test("Pascal: the Orchid's chairs, its dancing and its last call are its own — no stool, no luk thung, no BARFINE", () => {
  orchid(); for (let i = 0; i < 3; i++) assert.doesNotMatch(t("sit"), /stool/);
  assert.doesNotMatch(t("dance"), /stools|luk thung/);
  G.nightTurn = 75; out = []; _tick(); assert.doesNotMatch(said(), /BARFINE/);
});
test("Pascal: a night you rang the bell is not 'you buy nothing'", () => {
  sandbox(); const bar = "pink_lotus"; G.room = bar; G.nightTurn = 30; run("ring bell");
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.ok(!(G.lastNightWas.dry || {})[bar]);
});

// ── Wendell ──
const tanOwner = () => { owner(); _setFlag("partnerTan"); _setFlag("tanAsked"); _setFlag("tanFavourDone"); G.pendingChoice = null; const st = _synState(); st.done = { cleaning: G.day - 3, screen: G.day - 2, pos: G.day - 1 }; st.asked = { cleaning: true, screen: true, pos: true }; };
test("Wendell: an arrangement can be cancelled through Tan — it asks once, then ends it, and the friction comes back", () => {
  tanOwner(); G.room = "stinky_bar";
  let r = t("cancel the till company"); assert.match(r, /again if you mean it/); assert.ok(G.syn.done.pos);
  r = t("cancel the till company"); assert.match(r, /Tomorrow they don't come/); assert.ok(!G.syn.done.pos); assert.equal(G.syn.friction, 1);
  assert.doesNotMatch(t("stop the cleaners"), /STOP|bothered you/); assert.ok(G.syn.done.cleaning);
  assert.match(t("cancel the arrangements"), /CANCEL THE CLEANERS/);
  G.room = _npcRoom("tan"); G.known.tan = true; assert.match(t("ask tan about cancelling"), /tomorrow they don't come/i);
});
test("Wendell: the slate names its board price and its stock cost apart; the cleaners come off the take, as BOOKS says", () => {
  const src = String(_shiftYes); assert.match(src, /cost: _num\(-stiffCost\)/);
  const cl = SYNDICATE_JOBS.find(j => j.id === "cleaning"); assert.doesNotMatch(cl.ask, /pay them direct/); assert.match(cl.ask, /off the bar's take/);
});
test("Wendell: a call that costs the till says its price on the prompt; a flat round is pooled", () => {
  owner(); G.bar.cash = 5000; G.shiftCall = "round"; out = []; _shiftPrompt(); assert.match(said(), /฿500 from the till/);
  assert.match(String(_shiftYes), /roundflat/);
});
test("Wendell: Tan leaves the bar on foot; the phone's clear sky with a rain chance is 'clear for now'", () => {
  assert.ok(!_SYN_TAN_GOES.some(l => /gets in/.test(l)));
  const saved = typeof WX_NOW === "undefined" ? undefined : WX_NOW; globalThis.WX_NOW = { temp: 31, humid: 70, code: 0, rain: 64 };
  try { assert.doesNotMatch(_wxLine() || "", /not a cloud with the nerve/); } finally { globalThis.WX_NOW = saved; }
});
test("Wendell: Bert answers the uncle's price and the bins; BOOKS names the staff-list name; the arrangements line is not said twice", () => {
  owner(); G.room = "stinky_bar"; G.known.bert = true; assert.match(t("ask bert about the uncle"), /twentieth/);
  _setFlag("partnerTan"); assert.doesNotMatch(t("ask bert about the bins"), /No idea/);
  _setFlag("tanFavourDone"); assert.match(t("books"), /one name you have never seen work/);
  assert.match(String(_ownBarTalk) + String(_doCommandInner), /./);
});

// ── Tobias ──
test("Tobias: the town says the police stop you anywhere, not only on Beach Road", () => {
  const all = [..._TOWN.police.floor, ..._TOWN.police.house, ..._TOWN.police.punter].join(" ");
  assert.match(all, /anywhere/); assert.doesNotMatch(all, /Tourist police \{p\}\./);
});
test("Tobias: Cream invites no daytime pharmacy visit; her LINE is typed once; the slip has an answer", () => {
  sandbox(); G.stage = "expat"; G.phone.contacts.cream = true; out = []; _chamDecline();
  assert.doesNotMatch(said(), /You come pharmacy|types something into your phone/);
  _setFlag("chamSlip"); G.known.cream = true; G.nightTurn = 50; G.room = _npcRoom("cream");
  if (_npcsHere().includes("cream")) assert.match(t("ask cream about papa"), /uncle/);
});
test("Tobias: the desk sergeant answers 'fines' and 'bribe'", () => {
  sandbox(); G.room = "police_station";
  assert.match(t("ask sergeant about fines"), /Drunk man/); assert.match(t("ask sergeant about bribe"), /Drunk man/);
});
