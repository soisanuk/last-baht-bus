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
  quiet(); G.encDone = {};   // the town comes back on for the persona
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

function reload(blob) { newGame(); deserializeGame(blob); }

// ── build ──
const seeds = {
  rolf: expatOwner({ day: 14, money: 9000, bank: 60000, bonds: { manow: 15, lamai: 6, cake: 5, tan: 3 } }),
  hennie: expatOwner({ season0: 8, day: 12, money: 4000, bank: 25000, bonds: { tan: 3 } }),
  saoling: saoSeed(),
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
