// ROUND 102 (2026-10-21) — aimed by the corrected coverage map: composition hot on the condo and the jobs, edge-blindness dark
// on the old "home" systems, reachability dark on the paid work. Brendan (Opus, the manager on the hill: the job at the bar where
// the woman he courts works, the condo, her staying over — "four in the morning came and nobody collided; they just never heard
// of each other"), Laurie (Opus after Fable's limit, every way home to the condo — "the flat's real, the neighbours just haven't
// been told"), Dmitri (Sonnet, the job hunter).
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
const SL = "sunset_rail";   // the Shady Lady: Pukky, Bussaba (mamasan), Numfon (cashier)
// the hill seed, the game's own way: the Soi 6 man who cancelled the ticket, the lease signed at the tower, Pukky at regular
const hill = () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1");
  G.player.origin = "pension"; quiet(); G.day = 8; G.pendingChoice = "vacation_end"; run("continue"); run("cancel the ticket");
  G.money = 12000; G.bank = 60000; G.room = "pratumnak_soi5"; G.nightTurn = 2; run("rent a condo"); run("rent a condo");
  assert.equal(G.hotel, "condo", "the lease signed");
  G.soc.drinks.pukky = 9; G.phone.contacts.pukky = true; G.talked.pukky = [0]; (G.metDay = G.metDay || {}).pukky = 3; (G.seenDay = G.seenDay || {}).pukky = G.day - 1;
  quiet(); out = [];
};
const hire = () => { G.room = SL; G.nightTurn = 20; run("talk to bussaba"); run("ask bussaba about a job"); run("take the job"); assert.ok(G.job && G.job.room === SL, "hired"); };

beforeEach(() => { newGame(); });

test("Brendan: the manager's own floor treats him as staff on his shift — no Bert, no 'work or drink' after WORK, no customer hello on the second word", () => {
  hill(); hire(); run("work"); G.soc.jobHello = {};
  const a = t("talk to bussaba"); assert.doesNotMatch(a, /Bert/); assert.doesNotMatch(a, /work or you drink/);
  const b = t("talk to bussaba"); assert.doesNotMatch(b, /owns the stool|Keep the chair|A regular/); assert.match(b, /Bussaba/);
  run("talk to numfon"); const c = t("talk to numfon"); assert.doesNotMatch(c, /Cold one\? I ring it in/);
});

test("Brendan: last call and the shutter are his only on a night he declared it", () => {
  hill(); hire(); G.job.shiftDay = G.day - 1;   // a night off
  assert.equal(_onShift(), false); G.nightTurn = _closeTurn(SL) - 5; out = []; _lastCall(SL);
  assert.doesNotMatch(said(), /yours to call/);
  G.job.shiftDay = G.day; G.soc.lastCall = {}; out = []; _lastCall(SL); assert.match(said(), /yours to call/);
});

test("Brendan: 'pukky come home with me' is said to Pukky — the name in front is who it is said to, never the mamasan", () => {
  hill(); G.room = SL; G.nightTurn = 40; G.soc.drinks.pukky = 14; const r = t("pukky come home with me");
  assert.doesNotMatch(r, /barfine Bussaba|Numfon taps the till|blinks/); assert.equal(_convoActive(), "pukky");
});

test("Brendan: a staff text names her own bar's till keeper and furniture, and none comes on a night he stood her rail", () => {
  hill(); hire(); G.phone.contacts.pukky = true;
  const pool = String(_maybeIncomingText);   // the source: the Stinky's Cake and its pool table are not written into it any more
  assert.doesNotMatch(pool, /"cake count the float/);
  G.job.shiftDay = G.day; const n0 = G.phone.inbox.length;
  const saved = _rand; try { _rand = () => 0.01; for (let i = 0; i < 30; i++) _maybeIncomingText(); } finally { _rand = saved; }
  assert.equal(G.phone.inbox.slice(n0).filter(x => x.from === "pukky").length, 0);
});

test("Brendan: the month's spend is never smaller than its room, and the gauge says every night rather than 9.8", () => {
  hill(); assert.match(_nightsSay(200000), /every night out/); assert.match(_nightsSay(20000), /nights? out a week/);
  G.month = { spent: 0, rent: 9000, rough: 0, days: 0 }; G.room = "condo_room"; G.nightTurn = 30; run("sleep"); run("sleep");
  assert.ok(G.month.spent >= G.month.rent, `spent ${G.month.spent} < room ${G.month.rent}`);
});

test("Brendan: LAST NIGHT after his shift is the manager's night, not a customer's 'what you do after, nobody know'", () => {
  hill(); hire(); G.soc.jobHello = {};
  G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: SL, barTurns: 70, bars: { [SL]: 70 }, shift: SL, with: null };
  run("talk to bussaba"); const r = t("ask bussaba about last night");
  assert.match(r, /rail|lock up|shutter|count/i); assert.doesNotMatch(r, /What you do after/);
});

test("Brendan and Laurie: she remembers the flat — a night out that ended there, the long time there, and its own words", () => {
  hill(); G.room = SL; G.nightTurn = 30;
  G.partyLog = { pukky: { day: G.day - 1, rooms: ["queen_vic"], end: "home" } }; G.homeSeen = { pukky: { day: G.day, nights: 1 } };
  run("talk to pukky"); G.convoQ = null; assert.match(t("ask pukky about last night"), /your place|your flat|your hill|your fridge/i);
  for (const w of ["the condo", "the balcony", "the cooking"]) { G.convoQ = null; assert.doesNotMatch(t("ask pukky about " + w), /not my story|I don't know|Lost me/i, w); }
  // a long time to the flat writes her night there
  G.homeSeen = {}; G.room = "condo_room"; G.lastBfId = "pukky"; out = []; _endNight("barfine");
  assert.ok(G.homeSeen.pukky && G.homeSeen.pukky.nights >= 1, "the long time in the flat is remembered");
});

test("Brendan: no bench-and-zip dawn coda for the woman who is yours and came home for free; her own home is not a hotel that forgets", () => {
  const src = String(_endNight);
  assert.match(src, /_bondTier\(G\.lastBfId\) >= 3\)\) _cinderellaCoda\(\)/);
  assert.match(src, /The tower has heard all of it before/);
});

test("Laurie: SEE HOME walks a woman with a bike to her bike, and she was seen tonight", () => {
  hill(); G.room = SL; G.nightTurn = LAST_BUS_TURN + 2; G.soc.drinks.pukky = 9; G.rideLog = { pukky: { count: 1, day: G.day - 2 } };
  const r = t("see pukky home"); assert.match(r, /bike/); assert.doesNotMatch(r, /songthaew|the truck/i);
  assert.equal(G.seenDay.pukky, G.day - 0 || G.day);
});

test("Laurie: a night on her stool is a night she saw you — no '4 night I keep your seat' the evening after, and the count is nights missed", () => {
  hill(); G.room = SL; G.nightTurn = 30; G.soc.barTurns = { [SL]: 60 }; G.seenDay = { pukky: G.day - 5 };
  G.room = "condo_room"; out = []; _endNight("sleep"); assert.ok(G.seenDay.pukky >= G.day - 1, "seen last night");
  G.seenDay = { pukky: G.day - 4 }; G.soc.drinks.pukky = 9; G.room = SL; G.soc.awaySaid = {}; out = []; _relGreeting("pukky");
  assert.doesNotMatch(said(), /\b4 night/);
});

test("Laurie: no truck goes up the hill — said before the kerb wait; the way home is answerable; the piwin's menu says home", () => {
  hill(); G.room = "pattaya_tai"; G.nightTurn = LAST_BUS_TURN + 5; const t0 = G.nightTurn;
  const r = t("ride bus home"); assert.match(r, /no truck goes up the hill|MOTOSAI HOME/); assert.ok(G.nightTurn - t0 <= 1, "no wait at the kerb");
  G.nightTurn = 30; assert.match(t("how do i get home"), /tower on Pratumnak Soi 5|TRAVEL HOME/);
  assert.match(t("where do i live"), /Pratumnak|ninth floor/);
});

test("Laurie: the flat's own lines — no wok or chilli 'somebody left', no three-o'clock fridge, the waiting is the bay, the app reaches the tower", () => {
  hill(); G.room = "condo_room"; G.nightTurn = 20;
  assert.doesNotMatch(t("examine fridge"), /three in the morning/);
  for (let i = 0; i < 3; i++) assert.doesNotMatch(t("cook"), /somebody left/);
  assert.ok(ENCOUNTERS.booking.rooms.includes("condo_room"));
  const w = t("wait 2"); assert.doesNotMatch(w, /soi warming up below the window/);
});

test("Laurie: the robbery's advice names no hotel safe to a tenant; the motel mirror is not 'for the floor' with a woman out for the night", () => {
  hill(); assert.doesNotMatch(String(_HOSP_WHY ? "" : ""), /x/);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /putting her face back on for the floor/);
  G.hotel = "condo"; const why = (typeof _WAKE_WHY !== "undefined" ? _WAKE_WHY : null);
  const playSrc = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.match(playSrc, /G\.hotel === "metropole" \? " The Metropole safe/);
});

test("Brendan: ASK HER ABOUT US / LOVE at her-farang tier has an answer", () => {
  hill(); G.room = SL; G.nightTurn = 30; G.soc.drinks.pukky = 14; run("talk to pukky");
  for (const w of ["us", "love"]) { G.convoQ = null; assert.doesNotMatch(t("ask pukky about " + w), /not my story|I don't know|Lost me/i, w); }
});

test("nothing in the round rolls dice on a lookup", () => {
  hill(); const rng = G.rng; _onShift(); _nightsSay(50000); assert.equal(G.rng, rng);
});

// ── Dmitri (Sonnet, the job hunter: every way to earn found by asking) ──
const hunter = () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1");
  G.player.origin = "redundancy"; quiet(); G.day = 8; G.pendingChoice = "vacation_end"; run("continue"); run("cancel the ticket");
  G.money = 3500; G.bank = 22000; G.room = "qv_room"; G.nightTurn = 20; quiet(); out = [];
};

test("SEVERE (Dmitri): a command typed at the hair-tonic man is a command — MOTOSAI TO SOI 6 does not follow him into the shop", () => {
  hunter(); G.room = "beach_rd_c"; G.money = 3000; G.encDone.tonic = false; _startEnc("tonic");
  const m0 = G.money; out = []; run("motosai to soi 6");
  assert.notEqual(G.pendingEnc, "tonic"); assert.ok(!_flag("tonicShop"), "not in the shop"); assert.doesNotMatch(said(), /bead curtain/);
  assert.ok(G.money >= m0 - 200, "no shop money");
  // the follow still works when he means it
  G.encDone.tonic = false; G.room = "beach_rd_c"; _startEnc("tonic"); out = []; run("follow him to the shop"); assert.ok(_flag("tonicShop") || /bead curtain/.test(said()));
});

test("Dmitri: a man who holds a job hears the next offer's terms — QUIT JOB first to take it, and Jerry says his", () => {
  hunter(); G.job = { kind: "teach", since: G.day };
  G.room = "sunset_rail"; G.nightTurn = 30; G.soc.drinks.pukky = 9; run("talk to bussaba"); const r = t("ask bussaba about a job");
  assert.match(r, /฿30,000|a month/); assert.match(r, /QUIT JOB first/); assert.ok(!G.jobOffer, "no offer armed while employed");
  G.room = NPCS.david.room; for (const d of [G.day, G.day + 1, G.day + 2, G.day + 3, G.day + 4, G.day + 5, G.day + 6]) { G.day = d; if (_npcsHere().includes("david")) break; }
  run("talk to jerry"); assert.match(t("ask jerry about a job"), /Thirty-five|thirty-five/);
});

test("Dmitri: the town's job answer is deep and names the school; a teacher answers as a teacher; Tan's own work stays his", () => {
  hunter(); const heard = new Set();
  for (const id of ["terry", "angela", "pete", "doyle", "mort", "helmut", "kyle", "reginald"].filter(i => NPCS[i])) {
    for (const d of [G.day, G.day + 1, G.day + 2, G.day + 3, G.day + 4]) { G.day = d; G.room = NPCS[id].room; G.nightTurn = 40; if (_npcsHere().includes(id)) break; }
    if (!_npcsHere().includes(id)) continue;
    run("talk to " + id); G.convoQ = null; const r = t(`ask ${id} about a job`); heard.add(r.split("\n")[0].replace(new RegExp(NPCS[id].name, "g"), "X"));
    if (id === "helmut") assert.doesNotMatch(r, /\bmate\b/);
  }
  assert.ok(heard.size >= 3, "a chorus: " + heard.size);
  G.room = NPCS.waen.room; G.nightTurn = 30; run("talk to waen"); assert.doesNotMatch(t("ask waen about a job"), /First the floor has to know your face/);
});

test("Dmitri: MONEY on a pot with a job says the job is the payday, not 'No payday'", () => {
  hunter(); G.job = { kind: "school", since: G.day }; const r = t("money");
  assert.doesNotMatch(r, /No payday/); assert.match(r, /the job is the payday/);
});

test("Dmitri: 'how much does it pay' is not the drinks board", () => {
  hunter(); G.room = NPCS.doyle.room; G.nightTurn = 40; for (const d of [G.day, G.day + 1, G.day + 2, G.day + 3]) { G.day = d; if (_npcsHere().includes("doyle")) break; }
  run("talk to doyle"); assert.doesNotMatch(t("how much does it pay"), /Beer ฿|lady drink ฿|the price list/i);
});
