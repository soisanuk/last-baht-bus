// ROUND 98 (2026-10-20) — Dougal (Fable, the slide: a Soi 6 regular who cancelled the ticket, managed Pukky's bar on
// the envelope, lost the roof and slept five nights on her mat — "the till remembers my bar; the people in it only
// know what is in front of them this minute"). The money reconciled to the baht; the defects were a floor that
// forgot the man managing it, a short shift nobody named, the agent's fee that swallowed an envelope unnamed, and
// a hotel's lullaby printed on her floor.
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
const moveIn = (origin) => {
  newGame(); G.player = { origin, personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "vacation"; G.day = 8; G.pendingChoice = "vacation_end"; G.room = "hotel_room"; G.money = 3000; G.bank = 50000; out = [];
  run("move to pattaya"); G.nightTurn = 30; out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };
const cashBar = "stinky_bar";
const knownAt = (room) => { for (const id of _staffAt(room)) if (NPC_ROLES[id] === "hostess") { G.soc.drinks[id] = 8; G.talked[id] = [0]; } };
const hireAt = (room) => { G.room = room; knownAt(room); run("talk to bert"); run("ask bert about a job"); run("take the job"); assert.ok(G.job && G.job.room === room, "hired"); };

beforeEach(() => { newGame(); });

test("SEVERE: a manager's stood shift is a night the floor SAW him — no 'N night you no come' to the man on its rail", () => {
  moveIn("monger"); hireAt(cashBar);
  const her = _staffAt(cashBar).find(i => NPC_ROLES[i] === "hostess"); G.seenDay = { [her]: G.day - 9 };
  run("work"); for (let i = 0; i < 3; i++) run("wait 1");
  assert.equal(G.seenDay[her], G.day, "the first turn on the rail marks the floor");
  G.room = "hotel_room"; sleep(); G.room = cashBar; G.nightTurn = 30; out = []; _relGreeting(her);
  assert.doesNotMatch(said(), /night you no come/, "a day's gap is not an absence: " + said());
});

test("SEVERE: a declared shift stood short of the house's count is SAID at the wake, with the turns and the rule", () => {
  moveIn("monger"); hireAt(cashBar); run("work"); for (let i = 0; i < 4; i++) run("wait 1");
  assert.ok(G.job.shiftStood < WORK_MIN_STOOD); G.room = "hotel_room"; const s = sleep();
  assert.match(s, /You declared a shift at The Stinky Pinky and stood \d+ turns? of it; the house counts a night from 2 hours on the rail\. It did not count\./);
  assert.equal(G.job.stood, 0);
  // and a full one says nothing of the kind
  G.room = cashBar; G.nightTurn = 30; run("work"); for (let i = 0; i < 25; i++) run("wait 1"); G.room = "hotel_room"; assert.doesNotMatch(sleep(), /It did not count/); assert.equal(G.job.stood, 1);
});

test("the agent's fee is NAMED on the morning ledger (it had swallowed the envelope unnamed)", () => {
  moveIn("monger"); hireAt(cashBar); G.room = "hotel_room"; sleep(); G.job.stood = 9; G.day = G.payDay + 30; const s = sleep();
  assert.match(s, /envelope — ฿.*is at the bar/); assert.match(s, new RegExp(`฿${_num(PAPER_COST.tourist)} to the visa agent`));
});

test("the hotel's lullaby does not print on her mat; the sleep there is hers", () => {
  moveIn("monger"); G.money = 0; G.bank = 0; G.soc.drinks.lek = 8; G.talked.lek = [0]; G.hotelDebt = _DEBT_CAP; G.roofless = G.day;
  G.room = "hotel_room"; sleep(); if (G.pendingChoice === "keptby") run("yes");
  assert.ok(G.keptBy, "on her mat: " + G.pendingChoice);
  out = []; run("sleep"); run("sleep"); assert.doesNotMatch(said(), /air-con rattles its lullaby/); assert.match(said(), /the fan, the mat, her phone glowing on the shrine shelf|A mat in Lek's room|Five night/);
});

test("'i cancelled my ticket, i'm staying' is heard by the woman you tell, in her tier's register, once a trip", () => {
  moveIn("monger"); G.room = NPCS.lek.room; G.nightTurn = 30; G.soc.drinks.lek = 8; G.talked.lek = [0]; run("talk to lek");
  const a = t("i cancelled my ticket, i'm staying"); assert.match(a, /Stay\?|No ticket|You stay/); assert.doesNotMatch(a, /repeats a word|don't understand/i);
  assert.match(t("tell lek i'm staying"), /You tell me\. I remember/);
  moveIn("monger"); G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek"); assert.match(t("i'm not going home"), /first week|cheap if you have money|like a landlord/);
});

test("her offer has nobody's sister in it (her family line is her own), and the mat is askable in more words", () => {
  const texts = [String(_keptByPrompt), String(_keptByYes), String(_destituteTick)];
  for (const s of texts) assert.doesNotMatch(s, /sister/);
  assert.doesNotMatch(readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8").match(/const kb = G\.keptBy[\s\S]{0,3000}/)[0], /sister/);
  moveIn("monger"); G.keptBy = { id: "lek", since: G.day, nights: 1 }; G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek");
  for (const q of ["ask lek about staying", "ask lek about her floor", "ask lek about where i sleep"]) assert.match(t(q), /One fan\. You snore/, q);
});

test("the month's room is what was PAID for it, never the folio at its cap", () => {
  moveIn("pension"); G.money = 0; G.bank = 0; G.hotelDebt = _DEBT_CAP; G.room = "hotel_room"; const r0 = G.month.rent || 0; sleep();
  assert.equal(G.month.rent || 0, r0, "nothing paid, nothing on the month's book: " + JSON.stringify(G.month));
  moveIn("pension"); G.money = 5000; G.room = "hotel_room"; sleep(); assert.equal(G.month.rent, _hotelRate("sabai"));
});

test("'my job' is answered with the manager's own figures by the floor he manages, not her work node", () => {
  moveIn("monger"); hireAt(cashBar); G.job.stood = 3; const her = _staffAt(cashBar).find(i => NPC_ROLES[i] === "hostess"); run("talk to " + her);
  const a = t("ask " + her + " about my job"); assert.match(a, /4 night a week\. This month you stand 3/); assert.match(a, /฿30,000/);
  run("talk to bert"); assert.match(t("ask bert about my nights"), /4 a week, ฿30,000 a month in an envelope/);
  G.room = "candy_bar"; const c = _staffAt("candy_bar").find(i => NPC_ROLES[i] === "hostess"); run("talk to " + c); assert.doesNotMatch(t("ask " + c + " about my job"), /night a week\. This month/);
});

test("LAST NIGHT to the woman who rode you home twelve nights ago is not the ride", () => {
  moveIn("monger"); G.rideLog = { lek: { count: 1, day: G.day - 12, stops: [], great: false, seen: ["disco"] } }; G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek");
  assert.doesNotMatch(t("ask lek about last night"), /bike|ride|disco/i);
  assert.match(t("ask lek about the ride"), /bike|ride/i, "the ride by its own word is still hers");
});

test("the her-farang hello is never the same line two nights running", () => {
  moveIn("monger"); G.soc.drinks.lek = 14; G.talked.lek = [0]; G.room = NPCS.lek.room; const seen = new Set(); const lines = [];
  // cycling dice, not real ones: a three-line pool with a one-deep memory can alternate two lines over six nights
  // by chance (it did, once in ~30 suite runs) — the property is that consecutive hellos differ
  const saved = _rand; let k = 0; const seq = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2];
  try {
    _rand = () => seq[k++ % seq.length];
    for (let i = 0; i < 6; i++) { G.day++; G.soc.greeted = {}; G.seenDay = { lek: G.day }; out = []; _relGreeting("lek"); const l = said(); assert.ok(l); seen.add(l); lines.push(l); }
  } finally { _rand = saved; }
  for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i], lines[i - 1], "the same hello two nights running");
  assert.ok(seen.size >= 3, "a pool, dealt: " + seen.size);
});

test("nothing in the round rolls dice", () => {
  moveIn("monger"); hireAt(cashBar); const rng = G.rng; G.job.shiftDay = G.day - 1; G.job.shiftStood = 3; _jobNight(); assert.equal(G.rng, rng);
});
