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
  _setFlag("roomSafeOpened"); G.act1SafeDue = false;   // a month-old resident's stash, not a day-10 windfall (Ruairi, round 75)
  quiet(); G.encDone = {}; _nightSnapshot();   // and his first morning has a night to measure
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
// frames (round 74, the paper by the till): a retired detective on day three of a holiday, the opening done,
// money for a bar crawl of reading frames. jobs (round 74, the laundering quests): a new expat, a month of
// calendar in front of him, money for the four jobs and the walks between them.
function framesSeed() {
  newGame();
  G.player = { origin: "pi", personality: "blunt", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 3; G.season0 = 1;
  G.money = 12000; G.bank = 40000; G.battery = 100;
  G.room = "buakhao_klang"; G.visited.buakhao_klang = true; G.nightTurn = 4;
  _setFlag("roomSafeOpened"); quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// ride (round 75, the happiness ledger and the night ride): day three of a holiday, a regular with one woman (Lek,
// bond 8 — the night ride is offered on a long-time barfine of a bonded lady), money for a few nights out.
function rideSeed() {
  newGame();
  G.player = { origin: "redundancy", personality: "charmer", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 3; G.season0 = 1;
  G.money = 18000; G.bank = 30000; G.battery = 100;
  G.soc.drinks.lek = 8; G.phone.contacts.lek = true; G.talked.lek = [0];
  G.phone.contacts.tan = true; G.known.tan = true;   // every real player has Tan's number from the taxi (Ines, round 106: "not in the phone")
  G.visited[_npcRoom("lek")] = true;   // her regular has found her door (Pete, round 75: TRAVEL said he never had)
  G.room = "buakhao_klang"; G.visited.buakhao_klang = true; G.nightTurn = 4;
  _setFlag("roomSafeOpened"); quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
function jobsSeed() {
  newGame();
  G.player = { origin: "business", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  if (true) G.season0 = 1;
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  out = []; _goExpat();
  G.money = 25000; G.bank = 80000; G.battery = 100; G.room = _hotelRoomId(); G.nightTurn = 0;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false; quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// wallet2 (2026-10-21, the second wallet): the Soi 6 man who cancelled the ticket — the week played by the
// game's own path, CONTINUE → CANCEL THE TICKET at its end, never Act One, never met Candy, Lek or Oy — with
// money for a night of drinking and two rough mornings already behind him (G.blackouts = 2, so the third
// blackout is certain to take the wallet: the persona pays for one night, not a lottery).
function wallet2Seed() {
  newGame(); startSoi6Mode();
  doCommand("1"); doCommand("3"); doCommand("1");   // the taxi's three picks
  G.player.origin = "pension"; G.season0 = 1;
  quiet(); G.day = 8; G.pendingChoice = "vacation_end"; out = []; doCommand("continue"); doCommand("cancel the ticket");
  if (G.stage !== "expat" || G.mode) throw new Error("wallet2 seed: the ticket was not cancelled");
  G.money = 6000; G.bank = 40000; G.battery = 100; G.blackouts = 2;
  G.room = "qv_room"; G.nightTurn = 0; quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// hill (round 102): the Soi 6 man who cancelled the ticket, a pension and a long-stay visa, already
// renting the condo through the real lease (RENT A CONDO twice at the tower), with Pukky at the Shady
// Lady at regular — so her floor knows his face and her mamasan can offer him the manager's job there.
function stayedSeed(origin, money, bank) {
  newGame(); startSoi6Mode();
  doCommand("1"); doCommand("3"); doCommand("1");
  G.player.origin = origin; G.season0 = 1;
  if (G.player.said) delete G.player.said._label_origin;   // the taxi's answer was "1"; WHO AM I read that label, not the origin we set (Desmond, round 106)
  quiet(); G.day = 8; G.pendingChoice = "vacation_end"; out = []; doCommand("continue"); doCommand("cancel the ticket");
  if (G.stage !== "expat" || G.mode) throw new Error(origin + " seed: the ticket was not cancelled");
  G.money = money; G.bank = bank; G.battery = 100;
}
function hillSeed() {
  stayedSeed("pension", 12000, 60000);
  G.room = "pratumnak_soi5"; G.nightTurn = 2; out = []; doCommand("rent a condo"); doCommand("rent a condo");
  if (G.hotel !== "condo") throw new Error("hill seed: the lease did not sign: " + out.join(" | "));
  G.soc.drinks.pukky = 9; G.phone.contacts.pukky = true; G.talked.pukky = [0]; (G.metDay = G.metDay || {}).pukky = 3; (G.seenDay = G.seenDay || {}).pukky = G.day - 1;
  G.room = "condo_room"; G.nightTurn = 0; G.hunger = 10; G.thirst = 10; quiet(); G.encDone = {}; _nightSnapshot(); G.monthAdj = 0;   // the lease was signed before the snapshot: its deposit is not tomorrow's adjustment (the seed zeroed night one, round 102)
  return serializeGame();
}
// hunter (round 102): the same man on a redundancy pot that is running down — no job, no bonds,
// a little money — so every way to earn in town has to be found by asking.
function hunterSeed() {
  stayedSeed("redundancy", 3500, 22000);
  G.room = "qv_room"; G.nightTurn = 0; G.hunger = 10; G.thirst = 10; quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// bench (round 104): the pensioner who cancelled the ticket and went broke — the Sabai has stopped writing him down,
// two roofless mornings behind him, Pukky's offer already spent, his pension's payday about ten days out — so the
// third morning is the consulate's plane, and STAY is the bench until the payday is a roof again.
function benchSeed() {
  stayedSeed("pension", 0, 0);
  G.hotel = "sabai"; G.hotelDebt = _DEBT_CAP; G.room = _hotelRoomId(); G.payDay = G.day - (INCOME_DAYS - 10);
  G.destitute = 2; G.destituteDay = G.day; G.keptByUsed = true;   // counted this morning: the next is the third
  G.soc.drinks.pukky = 4; G.phone.contacts.pukky = true; G.talked.pukky = [0]; (G.metDay = G.metDay || {}).pukky = 3;
  G.nightTurn = 30; G.hunger = 40; G.thirst = 40; quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// remote (round 104): the condo tenant who knows the camera bars — the Jade, the Golden Dragon, the Lucky Tiger, the
// Honey Trap — with money in the account and a face at the Jade, so the phone is his barstool
function remoteSeed() {
  stayedSeed("pension", 3000, 80000);
  G.room = "pratumnak_soi5"; G.nightTurn = 2; out = []; doCommand("rent a condo"); doCommand("rent a condo");
  if (G.hotel !== "condo") throw new Error("remote seed: the lease did not sign: " + out.join(" | "));
  for (const r of ["jade_lounge", "golden_dragon", "lucky_tiger", "honey_trap"]) { G.visited[r] = true; (G.visitDay = G.visitDay || {})[r] = G.day - 2; }
  G.soc.drinks.jade_lounge_cartoon = 4; G.phone.contacts.jade_lounge_cartoon = true; G.talked.jade_lounge_cartoon = [0]; (G.metDay = G.metDay || {}).jade_lounge_cartoon = 4;
  G.room = "condo_room"; G.nightTurn = 0; G.hunger = 10; G.thirst = 10; quiet(); G.encDone = {}; _nightSnapshot(); G.monthAdj = 0;
  if (G.month) G.month.spent = Math.max(G.month.spent || 0, G.month.rent || 0);   // the lease was signed outside any ledger: its month is spent, or the clamp eats the next nights (Desmond, round 106)
  return serializeGame();
}
// steady (round 109): a full-game tourist on his third night, already Nan's farang at the Candy Bar (her-farang:
// she squares the fine, her time is PAY HER / DON'T PAY), and a regular at a go-go and a Soi 6 bar, so the
// take-out price can be read across venues and hours
function steadySeed() {
  newGame();
  G.player = { origin: "monger", personality: "charmer", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.season0 = 1; G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 3;
  for (const [id, n] of [["nan", 14], ["mind", 8], ["joy", 8]]) {
    G.soc.drinks[id] = n; G.phone.contacts[id] = true; G.talked[id] = [0];
    (G.metDay = G.metDay || {})[id] = 1; (G.seenDay = G.seenDay || {})[id] = G.day - 1;
  }
  G.money = 30000; G.bank = 120000; G.battery = 100; G.room = _hotelRoomId(); G.nightTurn = 0;
  G.hunger = 10; G.thirst = 10; _setFlag("roomSafeOpened"); G.act1SafeDue = false; quiet(); G.encDone = {}; _nightSnapshot();
  return serializeGame();
}
// month (round 109): the Soi 6 man who cancelled the ticket on a redundancy pot big enough for a condo — no
// roof of his own yet, no job, the thirty-day clock at its start
function monthSeed() {
  stayedSeed("redundancy", 8000, 90000);
  G.room = "qv_room"; G.nightTurn = 0; G.hunger = 10; G.thirst = 10; quiet(); G.encDone = {}; _nightSnapshot();
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
  frames: framesSeed(),
  jobs: jobsSeed(),
  ride: rideSeed(),
  wallet2: wallet2Seed(),
  hill: hillSeed(),
  hunter: hunterSeed(),
  bench: benchSeed(),
  remote: remoteSeed(),
  steady: steadySeed(),
  month: monthSeed(),
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
  // Frames: the detective reads a frame and the house notices; the name is on two walls
  reload(seeds.frames); G.room = "the_bucket"; G.nightTurn = 30; out = []; doCommand("examine licence");
  const fr = { pi: _isOrigin("pi"), frame: /Benjawan|BENJAWAN/.test(out.join(" ")), stamp: /Second Road/.test(out.join(" ")) };
  console.log("frames:", JSON.stringify(fr));
  if (!fr.pi || !fr.frame || !fr.stamp) throw new Error("frames seed cannot reach its drive");
  // Ride: a regular with Lek; her long-time barfine can turn into the night ride
  reload(seeds.ride); G.room = _npcRoom("lek"); G.nightTurn = 60; out = []; doCommand("talk to lek");
  const rd = { tier: _bondTier("lek"), here: _npcsHere().includes("lek") };
  console.log("ride:", JSON.stringify(rd));
  if (rd.tier < 2) throw new Error("ride seed cannot reach its drive");
  // Jobs: an expat; Grace, Reginald, Nont and Colin each have a job for him
  reload(seeds.jobs); const offered = [];
  const d0 = G.day;
  for (const [who, q] of [["grace", "covers"], ["nont", "verification"], ["colin", "presale"]]) {
    for (const d of [d0, d0 + 1, d0 + 2, d0 + 3, d0 + 4, d0 + 5, d0 + 6]) { G.day = d; G.room = _npcRoom(who); G.nightTurn = 50; if (_npcsHere().includes(who)) break; }   // a regular has his nights off
    out = []; doCommand("talk to " + who); if (G.quests[q] === "offered") offered.push(q);
  }
  console.log("jobs:", G.stage, JSON.stringify(offered));
  if (G.stage !== "expat" || offered.length < 3) throw new Error("jobs seed cannot reach its drive");
  // Gilt: through the door, the twins and Sasi answer in their own words
  reload(seeds.gilt); out = []; doCommand("enter gilt cage");
  const gilt = { room: G.room, ping: /twenty minute younger/.test((doCommand("ask ping about pong"), out.join(" "))) };
  console.log("gilt:", JSON.stringify(gilt));
  if (gilt.room !== "windmill" || !gilt.ping) throw new Error("gilt seed cannot reach its drive");
  // Sao: answered kindly, she leaves her number
  reload(seeds.saoling); out = []; doCommand("hello");
  console.log("saoling:", !!G.phone.contacts.sao, JSON.stringify(G.bkk));
  if (!G.phone.contacts.sao || !G.bkk) throw new Error("sao seed cannot reach its drive");
  // Wallet2: a street blackout takes the wallet (the third is certain), the chain is live, the machine refuses, Candy is a stranger
  reload(seeds.wallet2); G.room = "beach_rd_c"; G.nightTurn = 50; G.soc.drunk = 9; out = []; _endNight("blackout");
  const w2 = { lost: _flag("walletLost"), quest: G.quests.wallet_again, act1: _flag("act1Done"), candy: !!G.talked.candy, atm: /does not know your face/.test((out = [], G.nightTurn = 30, doCommand("withdraw 1000"), out.join(" "))) };
  console.log("wallet2:", JSON.stringify(w2));
  if (!w2.lost || w2.quest !== "active" || !w2.act1 || w2.candy || !w2.atm) throw new Error("wallet2 seed cannot reach its drive");
  // Hill: a tenant; Pukky's mamasan offers the manager's job at her bar
  reload(seeds.hill); G.room = "sunset_rail"; G.nightTurn = 30; out = []; doCommand("talk to bussaba"); doCommand("ask bussaba about a job");
  const hl = { tenant: G.hotel === "condo", offer: !!G.jobOffer, tier: _knownTier("pukky") };
  console.log("hill:", JSON.stringify(hl));
  if (!hl.tenant || !hl.offer || hl.tier < 2) throw new Error("hill seed cannot reach its drive");
  // Hunter: a resident on a pot, no job
  reload(seeds.hunter); const om = _originMoney(G.player.origin);
  const hu = { stage: G.stage, pot: om.kind === "pot", job: !!G.job, money: G.money };
  console.log("hunter:", JSON.stringify(hu));
  if (hu.stage !== "expat" || !hu.pot || hu.job) throw new Error("hunter seed cannot reach its drive");
  // Bench: the third morning is the plane; STAY is the bench
  reload(seeds.bench); out = []; doCommand("sleep"); doCommand("sleep");
  const be = { gate: G.pendingChoice }; doCommand("stay"); be.street = !!G.street; be.end = G.endKind || null;
  console.log("bench:", JSON.stringify(be));
  if (be.gate !== "embassy" || !be.street || be.end) throw new Error("bench seed cannot reach its drive");
  // Remote: the phone shows a stream bar and rings its bell
  reload(seeds.remote); G.nightTurn = 30; out = []; doCommand("watch stream jade"); const rw = out.join(" "); out = []; const b0 = G.bank; doCommand("stream bell jade");
  const re = { watch: /Jade Lounge/.test(rw), bell: G.bank < b0, tenant: G.hotel === "condo" };
  console.log("remote:", JSON.stringify(re));
  if (!re.watch || !re.bell || !re.tenant) throw new Error("remote seed cannot reach its drive");
  // Steady: Nan's barfine stops at her time, and DON'T PAY sets her refusal
  reload(seeds.steady); G.nightTurn = 30; G.room = _npcRoom("nan"); out = []; doCommand("barfine nan");
  const st = { here: _npcsHere().includes("nan"), tier: _bondTier("nan") };
  if (G.pendingBf && !G.pendingBf.herPay) doCommand("short time");
  st.herPay = !!(G.pendingBf && G.pendingBf.herPay); doCommand("don't pay");
  st.refuse = !!(G.care && G.care.nan && G.care.nan.refuse);
  console.log("steady:", JSON.stringify(st));
  if (!st.here || st.tier < 3 || !st.herPay || !st.refuse) throw new Error("steady seed cannot reach its drive");
  // Month: an expat on a pot who can afford the condo's lease
  reload(seeds.month); G.room = "pratumnak_soi5"; G.nightTurn = 2; out = []; doCommand("rent a condo"); doCommand("rent a condo");
  const mo = { stage: G.stage, pot: _originMoney(G.player.origin).kind === "pot", condo: G.hotel === "condo", job: !!G.job };
  console.log("month:", JSON.stringify(mo));
  if (mo.stage !== "expat" || !mo.pot || !mo.condo || mo.job) throw new Error("month seed cannot reach its drive");
} finally { _rand = saved; }

for (const [name, blob] of Object.entries(seeds)) {
  const dir = OUTDIR + "/persona-" + name;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "/seed-save.json", blob);
  writeFileSync(dir + "/inject.js", "localStorage.setItem('lbb_save', " + JSON.stringify(blob) + "); 'ok'");
  console.log("wrote", dir);
}
