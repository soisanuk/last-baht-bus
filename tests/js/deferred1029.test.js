// THE DEFERRED SWEEP (2026-10-29) — the four serious rows left deferred: the President's Table nobody said how to
// start (Dmitri, round 102), Priew's "after the round" that never came (Lorraine, round 95), "today is day one" from
// a woman who knew you (Cormac, round 100 — the floor was fixed in round 101; the house was not), and ordering food
// in Thai (Anan, the Thai-only week).
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
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 20000; G.nightTurn = 30;
};
beforeEach(() => { newGame(); });

test("Dmitri: the man who gave the Orchid job says how the rope lifts, and the way through Gavin is real", () => {
  sandbox(); G.room = "queen_vic"; _npcState("doyle").trust = 3;
  for (const q of ["orchid", "the rope", "how to get in", "gavin"]) {
    const r = t("ask doyle about " + q);
    assert.match(r, /Gavin/, q); assert.doesNotMatch(r, /No idea|not my department|above my pay grade/i, q);
  }
  // the path the line points down: Gavin's pitch, then "tell him you're in", then his errand
  G.room = "golden_dragon"; run("talk to gavin"); assert.match(t("ask gavin about pattaya leisure"), /Gavin's Errand/);
  assert.ok(!_orchidOpen()); _align("plg", 2); assert.ok(_orchidOpen());
});

test("Lorraine: the hostess who said she would tell Priew to sit with you after the round — Priew sits, once, and no money moves", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;
    sandbox(); _setFlag("metPriew"); G.priewDay = G.day - 3; G.nightTurn = 40;
    G.room = "hyper"; assert.equal(ROOMS.hyper.barType, "gogo");
    out = []; _priewReveal(); assert.match(said(), /sit with you after/);
    const m0 = G.money, h0 = G.happy;
    out = []; run("look"); run("look"); assert.doesNotMatch(said(), /Priew sits|sits on the edge|stops, which on this floor/);
    out = []; run("look"); run("look");
    assert.match(said(), /One minute/);
    assert.equal(G.money, m0); assert.equal(G.happy, h0);   // being told the truth is not a prize
    out = []; for (let i = 0; i < 4; i++) run("look"); assert.doesNotMatch(said(), /One minute/);   // once
    const her = G.priewSeen.by; if (her) assert.match(t("ask " + NPCS[her].name.toLowerCase() + " about priew"), /already|minute/);
    // elsewhere, she does not come
    sandbox(); _setFlag("metPriew"); G.priewDay = G.day - 3; G.nightTurn = 40; G.room = "hyper"; _priewReveal();
    G.room = "stinky_bar"; out = []; for (let i = 0; i < 5; i++) run("look"); assert.doesNotMatch(said(), /One minute/);
  } finally { _rand = saved; }
});

test("Cormac: no house says 'no last time' to a man it met on an earlier night — the night he sat, else the night he met", () => {
  const houses = Object.keys(NPCS).filter(id => ["mamasan", "cashier"].includes(NPC_ROLES[id]) &&
    (NPCS[id].dialogue || []).some(d => d.topic && /^last time\|/.test(d.topic) && !d.when));
  assert.ok(houses.length >= 10);
  for (const id of houses) {
    for (const sat of [true, false]) {
      sandbox(); const r = _npcRoom(id); if (!r) continue; G.room = r;
      run("talk to " + NPCS[id].name.toLowerCase());
      G.day += 3; G.barSat = sat ? { [r]: G.day - 1 } : {};
      G.room = _npcRoom(id) || r; if (G.room !== _npcRoom(id)) continue;
      const a = t("ask " + NPCS[id].name.toLowerCase() + " about last time");
      assert.doesNotMatch(a, /no last time|wasn't one|isn't one|there was no|first time|you are new|not in it|no page|not yet|new customer|not in my/i, id + (sat ? " sat" : " met"));
      assert.match(a, sat ? /last night/i : /three nights ago/i, id);
    }
  }
  // and a stranger still hears that there was none
  sandbox(); G.room = _npcRoom("wanida"); assert.match(t("ask wanida about last time"), /no last time/i);
  // the floor kept its round-101 memory: Sasi, six nights on
  sandbox(); G.room = _npcRoom("sasi"); run("talk to sasi"); G.day += 6; G.room = _npcRoom("sasi");
  assert.doesNotMatch(t("ask sasi about last time"), /day one/);
});

test("Anan: a hungry man orders at the stall in Thai — each stall's own dish by its Thai name, and หิวข้าว", () => {
  const cases = { tt_deep: "ขอปลาหมึก", jomtien_beach_rd: "ขอมะม่วง", lake_bar: "ขอปลา", naklua_rd: "ขอไก่ย่าง", kiss: "ขอกะเพรา",
    tt_lane_2: "ขอหมูปิ้ง", cheap_charlies: "ขอข้าวผัด", buakhao_market: "หิวข้าว", pattaya_soi_9: "ขอก๋วยเตี๋ยว" };
  for (const [room, cmd] of Object.entries(cases)) {
    sandbox(); G.room = room; G.hunger = 60; const m0 = G.money;
    run(cmd);
    assert.ok(G.hunger < 60, room + " " + cmd); assert.equal(G.money, m0 - FOOD_STALLS[room].price, room);
  }
  // ไก่ alone stays Kai's name
  assert.equal(_thaiToCmd("ไก่"), "kai");
});
