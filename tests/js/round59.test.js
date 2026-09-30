// Round 59 (2026-09-30): Malcolm (the loss adjuster — every con once, a claims ledger,
// reloads mid-prompt), Anand (introductions only — goes where he is sent and reports
// back), Wiremu (the passenger — says yes to every ride, clocks every trip).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});

// ── Wiremu ─────────────────────────────────────────────────────────────────
test("FOLLOW the girl on your arm: she picks the next door, never 'working, not leading a tour'", () => {
  G.room = "buakhao_s"; G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} };
  out = []; run("follow lek");
  assert.doesNotMatch(said(), /not leading a tour/);
  assert.notEqual(G.room, "buakhao_s", "she led you in");
  assert.ok(_servesDrinks(G.room));
  out = []; run("follow lek");
  assert.match(said(), /\(OUT, then FOLLOW LEK\)/, "inside a bar she takes you out first");
});
test("the night ride's late stops keep their hours", () => {
  G.nightTurn = 12;
  for (let i = 0; i < 80; i++) { G.rodeVenues = {}; const v = _pickRideVenue([]); assert.ok(!v.after || v.after <= 12, v.key); }
  assert.ok(_RIDE_VENUES.find(v => v.key === "afterhours").after >= 60);
});
test("the dark-sky ride close never says morning is coming", () => {
  G.nightTurn = 66; G.money = 5000;
  const saved = _endNight; _endNight = () => {};
  try { for (let i = 0; i < 6; i++) { out = []; _endRide({ id: "lek", stops: 6, seen: [] }, "dawn"); assert.doesNotMatch(said(), /[Mm]orning is coming|[Mm]orning already/); } }
  finally { _endNight = saved; }
});
test("ask lek about after hours reaches the ride she remembers", () => {
  G.rideLog = { lek: { count: 2, day: G.day - 1, stops: 6, great: true } };
  G.room = _npcRoom("lek"); run("talk to lek"); out = [];
  run("ask lek about after hours");
  assert.doesNotMatch(said(), /Some night you take me home|You not friend yet/);
});
test("Bank answers for his own fares, and names the mates' rate he charges you", () => {
  _setFlag("helmetDelivered");
  G.room = _npcRoom("bank"); run("talk to bank"); out = [];
  run("ask bank about fare");
  assert.match(said(), /Fare is fare/); assert.match(said(), /twenty/);
});
test("Tan answers a lift: once a trip, after the last bus or in the rain", () => {
  G.phone.contacts.tan = true; G.room = _npcRoom("tan"); run("talk to tan"); out = [];
  run("ask tan about a lift");
  assert.match(said(), /\(CALL TAN\)/);
  G.phone.tanRideVac = G.vacation; out = [];
  run("ask tan about a ride AGAIN");
  assert.match(said(), /had yours this trip/);
});
test("the girl on your arm pushes the torch down once, then switches it off", () => {
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} }; G.room = _npcRoom("lek");
  G.lightOn = true; G.battery = 90;
  out = []; _lightNotice(); _lightNotice();
  assert.equal(G.lightOn, false);
  // a room with nobody on your arm notices once a night, not at every step in
  G.party = null; G.lightOn = true; out = []; _lightNotice(); const n1 = out.length; _lightNotice();
  assert.equal(out.length, n1);
});
test("the jealous text wants another bar behind it", () => {
  G.soc.drinks.lek = 20; G.phone.contacts.lek = true; G.room = "naklua_rd";
  G.soc.barTurns = { [_npcRoom("lek")]: 40 };
  for (let k = 0; k < 3000; k++) { G.turns += 30; G.phone.lastText = -999; G.phone.invite = null; _maybeIncomingText(); G.phone.inbox.forEach(m => { m.read = true; }); }
  const hers = G.phone.inbox.filter(m => m.from === "lek");
  assert.ok(hers.length > 5, "she texted");
  assert.ok(!hers.some(m => /other bar/.test(m.text)), "no accusation without another bar");
  G.phone.inbox = []; G.soc.barTurns.stinky_bar = 20;
  for (let k = 0; k < 3000; k++) { G.turns += 30; G.phone.lastText = -999; G.phone.invite = null; _maybeIncomingText(); G.phone.inbox.forEach(m => { m.read = true; }); }
  assert.ok(G.phone.inbox.some(m => /other bar/.test(m.text)), "…and with one, she may");
});

// ── Anand ──────────────────────────────────────────────────────────────────
const _asks = (id, topic) => { G.room = _npcRoom(id); run("talk to " + NPCS[id].name.split(" ").pop().toLowerCase()); out = []; run("ask " + NPCS[id].name.split(" ").pop().toLowerCase() + " about " + topic); return said(); };
const MISS = /Not my story|wrong (man|mama|girl)|I don't know about that|That one I don't know|not my department|above my pay grade/i;
test("the senders can hear the report: Oy on Pim and Lek, Candy on Tan, Pim on Bank, Kesinee on Gavin, Terry on Bert, Tan on the wallet", () => {
  for (const [id, t] of [["oy", "pim"], ["oy", "lek"], ["candy", "tan"], ["pim", "bank"], ["kesinee", "gavin"], ["terry", "bert"], ["tan", "wallet"]]) {
    const s = _asks(id, t);
    assert.doesNotMatch(s, MISS, id + " on " + t + ": " + s);
  }
});
test("Candy's sending answers to the name of the place, and after the vouch she hears it went", () => {
  let s = _asks("candy", "notty's place");
  assert.match(s, /You get sent/); assert.ok(_flag("orchidSent"));
  _setFlag("orchidVouched");
  s = _asks("candy", "notty's");
  assert.match(s, /You went/);
});
test("Notty's bell: the sent man rings it and the gate opens; the unsent man is told no", () => {
  G.room = "naklua_rd"; run("ring bell"); assert.equal(G.room, "naklua_rd");
  _setFlag("orchidSent"); out = []; run("ring bell");
  assert.equal(G.room, "nottys_place");
});
test("a piwin knows the town's doors by name", () => {
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road");
  out = []; run("ask piwin about rainbow girls"); assert.match(said(), /Tree Town/);
  out = []; run("ask piwin about notty's place"); assert.match(said(), /The wall, I cannot open/);
  out = []; run("ask piwin about zzqx"); assert.match(said(), /Who\?/);
});
test("MOTOSAI TO HOTEL ends at the hotel's door, and IN is the door", () => {
  G.hotel = "sabai"; G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road");
  const saved = _rand; try { _rand = () => 0.99; run("motosai to hotel"); } finally { _rand = saved; }
  assert.equal(G.room, "hotel_soi");
  run("in"); assert.equal(G.room, "hotel_room");
});
test("the lost man in the maze is a different man on different nights", () => {
  assert.ok(Array.isArray(ENCOUNTERS.maze.intro) && ENCOUNTERS.maze.intro.length >= 3);
});

// ── Malcolm ────────────────────────────────────────────────────────────────
test("a loan is a debt on the morning ledger, not a win, and a repayment is named", () => {
  G.room = _hotelRoomId(); G.money = 1000; _setFlag("act1Done");
  // the snapshot the game takes at dusk, then a night: borrow 5,000, spend 2,000
  G.lastNight = { vacation: G.vacation, happy: G.happy, money: G.money, tillDrawn: 0, atm: G.atmTotal || 0, atmFees: G.atmFees || 0,
    loanB: G.loanBorrowed, loanR: G.loanRepaid, known: 0, talked: 0, nums: 0, faces: 0 };
  G.room = "neon_paradise"; run("borrow 5000"); G.money -= 2000;
  out = []; _morningLedger();
  assert.match(said(), /down ฿2,000/); assert.match(said(), /borrowed from Nira/);
  G.money = 10000;
  G.lastNight = { vacation: G.vacation, happy: G.happy, money: G.money, tillDrawn: 0, atm: G.atmTotal || 0, atmFees: G.atmFees || 0,
    loanB: G.loanBorrowed, loanR: G.loanRepaid, known: 0, talked: 0, nums: 0, faces: 0 };
  G.room = "neon_paradise"; run("repay");
  assert.ok(!G.loan || !G.loan.owed, "repaid");
  out = []; _morningLedger();
  assert.match(said(), /paid to Nira/);
});
test("Nira answers a borrower's debt with his own loan, and knows the man she sends you after", () => {
  G.room = "neon_paradise"; run("talk to nira"); run("borrow 5000"); out = [];
  run("ask nira about debt");
  assert.match(said(), new RegExp("฿" + _num(G.loan.owed))); assert.doesNotMatch(said(), /Twelve thousand/);
  out = []; run("ask nira about fergie");
  assert.doesNotMatch(said(), MISS);
});
test("the town quotes the police's three prices, and the encounter charges them", () => {
  const h = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess");
  G.room = _npcRoom(h);
  for (let i = 0; i < 4; i++) { out = []; assert.ok(_townTalk(h, "police")); assert.match(said(), new RegExp("฿" + POLICE_WAI)); assert.doesNotMatch(said(), /\{/); }
  G.room = "police_station"; out = []; run("ask sergeant about fine");
  assert.match(said(), new RegExp("฿" + POLICE_PAY));
});
test("REPORT hears what you came to report, and names what the desk can do", () => {
  G.room = "police_station";
  out = []; run("report pickpocket"); assert.match(said(), /No face, no name/);
  out = []; run("report police fine"); assert.match(said(), /The fine is the fine/);
  out = []; run("report"); assert.match(said(), /hair-tonic shop/);
});
test("the clinic bike charges its fare, and the clean result assumes nothing", () => {
  G.room = "stinky_bar"; G.money = 1000;
  const saved = _priewMeet; _priewMeet = () => {};
  try { out = []; run("get tested"); } finally { _priewMeet = saved; }
  assert.equal(G.room, "second_rd_c"); assert.equal(G.money, 1000 - MOTOSAI_TOWN);
  assert.ok(!_CLINIC_CLEAN.some(l => /should have used|bad decisions/.test(l)));
  assert.ok(!_CLINIC_POS.some(l => /off Soi Buakhao/.test(l)));
});
test("a reload mid-cleansing does not replay the ฿199", () => {
  G.room = "beach_rd_c"; G.money = 3000; _startEnc("fortune"); run("yes");
  if (G.pendingEnc === "fortune") assert.ok(!(G.encPrompt || []).some(l => /You hand over/.test(l[0] || l)));
});
test("the brit gives the chip bar its answers", () => {
  G.room = "ws_gate"; _startEnc("brit");
  assert.ok(_chipSet().some(c => c.cmd === "sorry"));
});
