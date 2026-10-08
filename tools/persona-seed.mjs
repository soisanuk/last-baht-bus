#!/usr/bin/env node
// Persona SEEDS, built through the game's own functions — never hand-assembled JSON.
// Round 54's seed carried G.syn as {friction: 0} without its books, which threw inside
// _tick from 21:00 every night and silently masked the very systems the persona was
// sent to test (the affair, procurement, the presence count). So a seed is made the
// way the game makes the state (_goExpat, _partnerYes, _barDeposit, _endNight,
// _startEnc), then RELOADED into a fresh game and its key path played headlessly; a
// seed that cannot reach its drive fails here, before any persona is spent on it.
//
//   node tools/persona-seed.mjs <outdir>          # writes <outdir>/persona-<name>/{seed-save.json,inject.js}
//
// Seeds (round 55): rolf — owner, high season, a her-farang hostess (the affair);
// hennie — owner in the September trough (procurement, refusing); saoling — an expat
// with the Bangkok tourist in front of him (the Sao arc). Add a seed by adding a builder
// and a proof below. inject.js is what the playtest driver's `raw` evaluates; then
// `location.reload()` and `cmd yes` at the continue prompt.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
const REPO = new URL("../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(REPO + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t) => out.push(t));
const OUTDIR = process.argv[2];
if (!OUTDIR) { console.error("usage: node tools/persona-seed.mjs <outdir>"); process.exit(2); }
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.pendingEnc = null; };

function expatOwner({ season0, day, money, bank, bonds }) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  if (season0 != null) G.season0 = season0;
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  out = []; _goExpat();
  // the chain to ownership, as its quests complete it (barchain.test's walk)
  G.quests.plg_deal = "done"; _setFlag("plgResolved");
  G.quests.bar_premises = "done"; _setFlag("barPremises");
  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  G.quests.bar_licence = "done"; _setFlag("barLicence");
  G.room = _npcRoom("tan"); G.nightTurn = 30;
  G.partnerWho = "tan"; G.pendingChoice = "partner"; out = []; _partnerYes();   // the fork, confirmed the real way
  G.quests.bar_partner = "done";
  G.room = "stinky_bar"; G.bank = 200000; G.money = 5000; out = []; _barDeposit();
  if (!_flag("barPaid")) throw new Error("deposit did not clear: " + out.join(" | "));
  out = []; if (G.bar.lease && !G.bar.lease.paid) _leaseTransfer();
  _setFlag("barOpen"); G.quests.bar_opening = "done";
  // a few nights of trading behind it, on the real settle path
  for (let n = 0; n < day - G.day; n) { G.room = "stinky_bar"; G.nightTurn = 12; out = []; _doWork(); G.bar.stoodTurns = WORK_MIN_STOOD; G.room = _hotelRoomId(); _endNight("sleep"); }
  for (const [id, n] of Object.entries(bonds)) G.soc.drinks[id] = n;
  for (const id of Object.keys(bonds)) G.phone.contacts[id] = true;
  G.money = money; G.bank = bank; G.room = _hotelRoomId(); G.nightTurn = 0; G.battery = 100;
  G.hunger = 10; G.thirst = 10; G.soc.drunk = 0; G.hurt = 0; G.pendingChoice = null;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false;   // the vacation's stash fired on a day-14 expat (Rolf, round 66)
  quiet(); G.encDone = {};   // the town comes back on for the persona
  _nightSnapshot();   // the first morning's ledger measures from here, not from nothing ("up ฿8,350 · met 2")
  return serializeGame();
}

function saoSeed() {
  newGame();
  G.player = { origin: "nomad", personality: "whiteknight", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  out = []; _goExpat();
  G.money = 30000; G.bank = 90000; G.day = 10;
  G.room = "beach_rd_c"; G.nightTurn = 20; G.battery = 90; G.lightOn = false;
  quiet(); G.encDone = {};
  out = []; _startEnc("bkktourist");   // she is in front of you; your first word is the answer
  if (G.pendingEnc !== "bkktourist") throw new Error("bkktourist did not arm");
  return serializeGame();
}

// gilt (2026-10-08): a holidaymaker on night three, standing at the door of The Gilt Cage —
// the first floor written woman by woman (FLOOR_OWN). The opening quest is done so the
// persona's tokens go to the bar, not the wallet.
function giltSeed() {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 3;
  G.money = 15000; G.bank = 120000; G.battery = 95;
  G.room = "soi_diamond"; G.visited.soi_diamond = true; G.nightTurn = 8;
  _setFlag("roomSafeOpened");   // a day-three man opened his room safe on night two (round 69: the stash was paid to Henrik on night three)
  quiet(); G.encDone = {};
  _nightSnapshot();             // the night's ledger baseline, which the real path takes at every wake (round 69: "first morning in town" on day four)
  return serializeGame();
}
// silk (round 71): a week on one stool at the Silk Rose, the second floor written woman by woman.
// March, so nobody on that floor is home for the harvest or up in Bangkok.
function silkSeed() {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 3; G.season0 = 2;
  G.money = 15000; G.bank = 120000; G.battery = 95;
  G.room = "buakhao_market"; G.visited.buakhao_market = true; G.nightTurn = 8;
  _setFlag("roomSafeOpened");
  quiet(); G.encDone = {};
  _nightSnapshot();
  return serializeGame();
}
// lamon (round 71): an owner ten days into the affair, honeymoon nearly spent — the night out
// and its costs. Built by the game's own path: the owner chain, a stood shift to the affair's door,
// STAY through _affairYes; then the clock moved so the honeymoon ends in play.
function lamonSeed() {
  reload(expatOwner({ day: 14, money: 14000, bank: 60000, bonds: { manow: 15, lamai: 6, cake: 5, tan: 3 } }));
  const saved = _rand;
  try {
    _rand = () => 0.99;
    G.room = "stinky_bar"; G.nightTurn = 12; out = []; doCommand("work");
    for (let i = 0; i < 80 && G.pendingChoice !== "affair"; i++) {
      out = []; doCommand("wait");
      if (G.pendingChoice === "tanfavour" || G.pendingChoice === "shift" || G.pendingChoice === "synjob") doCommand("no");
    }
    if (G.pendingChoice !== "affair") throw new Error("lamon: the affair's door never opened");
    _affairYes();
    G.room = _hotelRoomId(); _endNight("sleep");
  } finally { _rand = saved; }
  G.affair.since = G.day - 10; G.affair.crisDay = G.day;
  quiet(); G.encDone = {};
  _nightSnapshot();
  return serializeGame();
}
// skint (round 72, the dark cells): a day-four tourist running low — Nira's loan, the street food, the
// police on a drunk walk home, Cream after ten. Low pocket, a thin account, the opening done.
function skintSeed() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 4; G.season0 = 10;
  G.money = 2200; G.bank = 6500; G.battery = 80;
  G.room = "beach_rd_c"; G.visited.beach_rd_c = true; G.nightTurn = 6;
  _setFlag("roomSafeOpened");
  quiet(); G.encDone = {};
  _nightSnapshot();
  return serializeGame();
}
function reload(blob) { newGame(); deserializeGame(blob); }

// ── build ──
const seeds = {
  rolf: expatOwner({ day: 14, money: 9000, bank: 60000, bonds: { manow: 15, lamai: 6, cake: 5, tan: 3 } }),
  hennie: expatOwner({ season0: 8, day: 12, money: 4000, bank: 25000, bonds: { tan: 3 } }),
  saoling: saoSeed(),
  gilt: giltSeed(),
  silk: silkSeed(),
  skint: skintSeed(),
  // greta (round 61): an owner at the top of the shoulder — March, the rail thinning, the
  // note due — with the two levers in front of her (docs/bar-failure-cycle.md)
  greta: expatOwner({ season0: 2, day: 16, money: 12000, bank: 40000, bonds: { manow: 8, jiap: 4, lamai: 5, tan: 3 } }),
  // ossie (round 70, composition): an October owner on the Tan route — procurement live,
  // a girl on his floor he likes, money for the massage shops, the clinic and the Orchid
  ossie: expatOwner({ season0: 9, day: 13, money: 15000, bank: 45000, bonds: { manow: 9, lamai: 4, tan: 3 } }),
  lamon: lamonSeed(),
};

// ── prove each reaches its drive, from a fresh reload ──
const saved = _rand;
try {
  _rand = () => 0.99;
  // Rolf: a stood shift reaches the favour, then the affair door at last call, with no throw
  reload(seeds.rolf); G.room = "stinky_bar"; G.nightTurn = 12; out = []; doCommand("work");
  let saw = { favour: false, affair: false, stood: 0 };
  for (let i = 0; i < 70 && G.nightTurn < 70; i++) {
    out = []; doCommand("wait");
    if (G.pendingChoice === "tanfavour") { saw.favour = true; doCommand("no"); }
    if (G.pendingChoice === "shift") doCommand("no");
    if (G.pendingChoice === "synjob") doCommand("no");
    if (G.pendingChoice === "affair") { saw.affair = true; break; }
  }
  saw.stood = G.bar.stoodTurns;
  console.log("rolf:", JSON.stringify(saw), "syn", JSON.stringify(G.syn));
  if (!saw.favour || !saw.affair || saw.stood < WORK_MIN_STOOD) throw new Error("rolf seed cannot reach its drive");
  // Hennie: favour, then a procurement job on a later evening, in the wet
  reload(seeds.hennie); G.room = "stinky_bar"; G.nightTurn = 20;
  let h = { favour: false, job: false, tier: _seasonTier() };
  for (let night = 0; night < 4 && !h.job; night++) {
    for (let i = 0; i < 40; i++) {
      out = []; doCommand("wait");
      if (G.pendingChoice === "tanfavour") { h.favour = true; doCommand("no"); }
      if (G.pendingChoice === "synjob") { h.job = true; break; }
      if (G.pendingChoice) doCommand("no");
    }
    if (!h.job) { G.room = _hotelRoomId(); _endNight("sleep"); G.room = "stinky_bar"; G.nightTurn = 20; }
  }
  console.log("hennie:", JSON.stringify(h));
  if (!h.favour || !h.job || !/low/.test(h.tier)) throw new Error("hennie seed cannot reach its drive");
  // Greta: the board goes up, and inside two months of Bert's nights in the shoulder a woman gives notice
  reload(seeds.greta); G.room = "stinky_bar"; G.nightTurn = 30; out = []; doCommand("prices up");
  let g = { board: /Fifteen on top/.test(out.join(" ")), notice: null, tier: _seasonTier() };
  for (let n = 0; n < 60 && !g.notice; n++) { G.day++; _barSettle(G.day - 1); if (G.bar.notice) g.notice = G.bar.notice.id; }
  console.log("greta:", JSON.stringify(g), "rent", _barRent());
  if (!g.board || !g.notice || g.tier !== "shoulder") throw new Error("greta seed cannot reach its drive");
  // Ossie: a procurement job on a wet evening at his own rail, and a massage shop takes his money
  reload(seeds.ossie); G.room = "stinky_bar"; G.nightTurn = 20;
  let o = { job: false, tier: _seasonTier() };
  for (let night = 0; night < 4 && !o.job; night++) {
    for (let i = 0; i < 40; i++) {
      out = []; doCommand("wait");
      if (G.pendingChoice === "synjob") { o.job = true; break; }
      if (G.pendingChoice) doCommand("no");
    }
    if (!o.job) { G.room = _hotelRoomId(); _endNight("sleep"); G.room = "stinky_bar"; G.nightTurn = 20; }
  }
  console.log("ossie:", JSON.stringify(o));
  if (!o.job || !/low/.test(o.tier)) throw new Error("ossie seed cannot reach its drive");
  // Silk: through the door, the floor answers in its own words and all five are there
  reload(seeds.silk); out = []; doCommand("enter silk rose");
  const silk = { room: G.room, here: ["ton", "nid", "wa", "waew", "grace"].every(i => _npcsHere().includes(i)), ton: /referee/.test((doCommand("talk to ton"), out = [], doCommand("ask ton about football"), out.join(" "))) };
  console.log("silk:", JSON.stringify(silk));
  if (silk.room !== "silk_rose" || !silk.here || !silk.ton) throw new Error("silk seed cannot reach its drive");
  // Lamon: the affair is live, and TAKE MANOW OUT goes on the second ask
  reload(seeds.lamon); G.room = "stinky_bar"; G.nightTurn = 30; out = []; doCommand("take manow out"); while (G.pendingChoice) doCommand("no"); doCommand("take manow out");
  const lam = { live: _affairLive(), out: !!(G.party && G.party.ids.includes("manow")) };
  console.log("lamon:", JSON.stringify(lam));
  if (!lam.live || !lam.out) throw new Error("lamon seed cannot reach its drive");
  // Skint: Nira lends on Walking Street, and Cream is at the Metro Beer Garden after ten
  reload(seeds.skint); G.room = "neon_paradise"; out = []; doCommand("talk to nira"); doCommand("borrow 5000");
  const sk = { loan: !!G.loan, cream: (() => { G.room = "metro_garden"; G.nightTurn = 45; return _npcsHere().includes("cream"); })() };
  console.log("skint:", JSON.stringify(sk));
  if (!sk.loan || !sk.cream) throw new Error("skint seed cannot reach its drive");
  // Gilt: through the door, the twins and Sasi answer in their own words
  reload(seeds.gilt); out = []; doCommand("enter gilt cage");
  const gilt = { room: G.room, ping: /twenty minute younger/.test((doCommand("ask ping about pong"), out.join(" "))) };
  console.log("gilt:", JSON.stringify(gilt));
  if (gilt.room !== "windmill" || !gilt.ping) throw new Error("gilt seed cannot reach its drive");
  // Sao: answered kindly, she leaves her number
  reload(seeds.saoling); out = []; doCommand("hello");
  console.log("saoling:", !!G.phone.contacts.sao, JSON.stringify(G.bkk));
  if (!G.phone.contacts.sao || !G.bkk) throw new Error("sao seed cannot reach its drive");
} finally { _rand = saved; }

for (const [name, blob] of Object.entries(seeds)) {
  const dir = OUTDIR + "/persona-" + name;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "/seed-save.json", blob);
  writeFileSync(dir + "/inject.js", "localStorage.setItem('lbb_save', " + JSON.stringify(blob) + "); 'ok'");
  console.log("wrote", dir);
}
