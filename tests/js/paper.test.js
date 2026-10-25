// THE PAPER AND THE JOBS (Mario, 2026-10-20, the expat economy's second step): G.paper is one scalar —
// tourist / longstay / permit — set by the origin when you don't board, changed only by a job, costing one
// line a month, gating the Thai bank book, and READ only at an incident. Two jobs: online English (grey, the
// mornings pay for it) and bar manager (a beer bar's envelope on nobody's paper, four nights; a company bar
// through the books, six nights, the permit after thirty stood nights). Every one a presence trade. No dice.
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
  run("move to pattaya"); const moved = said(); G.nightTurn = 30; out = []; return moved;
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };
const knownAt = (room) => { for (const id of _staffAt(room)) if (NPC_ROLES[id] === "hostess") { G.soc.drinks[id] = 8; G.talked[id] = [0]; } };
const cashBar = "stinky_bar", companyBar = "pink_lotus";

beforeEach(() => { newGame(); });

test("the paper is the origin's when you don't board, and the bank book follows the paper, not the move", () => {
  let mv = moveIn("pension"); assert.equal(G.paper, "longstay"); assert.ok(G.thaiAccount); assert.match(mv, /long-stay visa comes with a bank book/);
  mv = moveIn("monger"); assert.equal(G.paper, "tourist"); assert.ok(!G.thaiAccount, "no book on a tourist stamp"); assert.match(mv, /No bank book/);
  assert.ok(_atmFee() > 0, "the foreign card's fee stays");
  for (const o of ORIGINS) assert.ok(["tourist", "longstay"].includes(_originMoney(o.id).paper || "tourist"), o.id);
});

test("the agent's line is on the month, and MONEY names the paper", () => {
  moveIn("monger"); G.day = G.payDay + 30; const b = G.bank; sleep();
  assert.match(said(), new RegExp(`The agent's ฿${_num(PAPER_COST.tourist)} for a tourist stamp`));
  assert.ok(G.bank <= b - PAPER_COST.tourist + 1, "paid from the account");
  assert.match(t("money"), /Paper: a tourist stamp — no bank book/);
  moveIn("pi"); assert.match(t("money"), /Paper: a long-stay visa — a bank book/);
});

test("a beer bar's job: the floor has to know your face, the terms are cash on nobody's paper, WORK stands the shift, the envelope is paid for the nights", () => {
  moveIn("monger"); G.room = cashBar; run("talk to bert");
  assert.match(t("ask bert about a job"), /Knowing a face is not enough/);
  knownAt(cashBar); const offer = t("ask bert about a job");
  assert.match(offer, /฿30,000 a month, in an envelope\. Four nights a week/); assert.match(offer, /No paper/); assert.ok(G.jobOffer && G.jobOffer.room === cashBar && !G.jobOffer.corp);
  assert.ok(_situationTopics("bert").last.includes("a job"), "the offer is a tap: " + JSON.stringify(_situationTopics("bert")));
  t("take the job"); assert.ok(G.job && G.job.kind === "manager" && G.job.nights === MGR_CASH_NIGHTS && !G.job.corp);
  assert.match(t("work"), /Tonight you stand The Stinky Pinky's rail/); assert.equal(G.job.shiftDay, G.day);
  for (let i = 0; i < 25; i++) run("wait 1"); assert.ok(G.job.shiftStood >= WORK_MIN_STOOD, "stood: " + G.job.shiftStood);
  G.room = "hotel_room"; sleep(); assert.equal(G.job.stood, 1, "the night counted at the wake");
  // the month: four nights a week is ~17 a month; one night is a sliver of the envelope, into the pocket, named
  G.job.stood = 9; G.day = G.payDay + 30; const m0 = G.money, jp = _jobPay(); assert.ok(jp > 0 && jp < MGR_CASH_PAY);
  sleep(); assert.match(said(), /envelope — ฿.*is at the bar/); assert.ok(G.envelopeDue && G.envelopeDue.amt === jp, "the envelope waits at the bar"); assert.equal(G.job.stood, 0);
  G.room = cashBar; G.nightTurn = 30; out = []; run("talk to bert"); assert.match(said(), /envelope/); assert.ok(G.money >= m0 + jp - _hotelRate(G.hotel) - 1, "handed over at the rail: " + G.money); assert.equal(G.envelopeDue, null);
  assert.match(t("money"), /Job: manager at The Stinky Pinky — 4 nights a week/);
  assert.match(t("quit job"), /hand the keys back/); assert.equal(G.job, null);
});

test("a company bar: six nights through the books, the permit after thirty stood nights (and the bank book with it), two short weeks and the company counts you out", () => {
  moveIn("monger"); G.room = companyBar; knownAt(companyBar); const mama = _staffAt(companyBar).find(i => NPC_ROLES[i] === "mamasan"); run("talk to " + mama);
  const offer = t("ask " + mama + " about a job"); assert.match(offer, /฿40,000 a month, through the books\. Six nights/); assert.ok(G.jobOffer.corp);
  run("take the job"); assert.equal(G.job.nights, MGR_PERMIT_NIGHTS);
  G.job.stood = MGR_PERMIT_AFTER - 1; G.job.stoodTotal = MGR_PERMIT_AFTER - 1; G.job.shiftDay = G.day; G.job.shiftStood = WORK_MIN_STOOD; G.room = "hotel_room"; const s = sleep();
  assert.equal(G.paper, "permit"); assert.ok(G.thaiAccount, "the book came with the paper"); assert.match(s, /work permit in your name/);
  assert.match(t("money"), /Paper: a work permit through Pink Lotus/);
  // a short week, twice
  G.job.weekStart = G.day - 7; G.job.weekStood = 2; sleep(); assert.equal(G.job.strikes, 1); assert.match(said(), /One more short week/);
  G.job.weekStart = G.day - 7; G.job.weekStood = 1; sleep(); assert.equal(G.job, null); assert.match(said(), /counts you out|new manager/);
  assert.equal(G.paperUntil, G.day + PAPER_GRACE, "the paper was the company's");
  G.day = G.paperUntil; sleep(); assert.equal(G.paper, "tourist"); assert.ok(!G.thaiAccount); assert.match(said(), /permit's paper has run out/);
  assert.match(t("quit job"), /no job to quit/);
});

test("the incident: a stood shift on the wrong paper at a cash bar, on a night the hash says so — a fine and the job, never jail; a company bar then remembers", () => {
  moveIn("monger"); knownAt(cashBar); G.room = cashBar; run("talk to bert"); run("ask bert about a job"); run("take the job");
  let day = G.day; while ((_hm(cashBar + ":" + day + ":paper", 97) % 100) >= MGR_INCIDENT_PCT) day++;   // _hm since the 2026-10-25 review   // the first night it fires, by the same hash
  G.day = day + 1; G.job.shiftDay = day; G.job.shiftStood = WORK_MIN_STOOD; G.money = 5000; G.room = "hotel_room"; const m0 = G.money; out = []; _jobNight();
  assert.equal(G.job, null); assert.ok(G.money <= m0 - POLICE_PAY * 2 + _hotelRate(G.hotel)); assert.equal(G.paperFlag, G.day);
  assert.match(said(), /Nobody is charged/); assert.doesNotMatch(said(), /jail|prison|cell/i);
  G.room = companyBar; knownAt(companyBar); const mama = _staffAt(companyBar).find(i => NPC_ROLES[i] === "mamasan"); run("talk to " + mama);
  assert.match(t("ask " + mama + " about a job"), /The company checked/); assert.ok(!G.jobOffer);
  // on a permit the same night is nothing
  moveIn("pension"); knownAt(cashBar); G.room = cashBar; run("talk to bert"); run("ask bert about a job"); run("take the job"); G.paper = "permit";
  G.day = day + 1; G.job.shiftDay = day; G.job.shiftStood = WORK_MIN_STOOD; out = []; _jobNight(); assert.ok(G.job, "the paper was right");
});

test("online English: from your room, grey, paid by the mornings; one job at a time; Waen's door; a holiday has none", () => {
  moveIn("nomad"); G.room = "beach_rd_c"; assert.match(t("teach online"), /starts from your room/);
  G.room = "hotel_room"; assert.match(t("teach online"), /Nobody in this town will ever ask what paper/); assert.equal(G.job.kind, "teach");
  G.job.since = G.day - INCOME_DAYS;   // a month held: the first payday is prorated by the days held (2026-10-25 review)
  sleep(); G.month.rough = 3; assert.equal(_jobPay(), Math.round(TEACH_PAY * 0.7 / 100) * 100);
  G.day = G.payDay + 30; const b = G.bank; sleep(); assert.match(said(), /The platform paid ฿19,600 \(short — it counted 3 rough mornings\)/); assert.match(said(), /the platform/);
  assert.ok(G.bank > b, "into the account");
  G.room = cashBar; knownAt(cashBar); run("talk to bert"); { const r = t("ask bert about a job"); assert.match(r, /QUIT JOB first/); assert.match(r, /฿30,000|a month/); assert.equal(G.job.kind, "teach", "still the platform"); }   // a floor that knows him tells the terms; taking them needs QUIT JOB (Dmitri, round 102)
  G.room = "cloze"; run("talk to waen"); assert.match(t("ask waen about online"), /TEACH ONLINE/);
  newGame(); G.player = { origin: "nomad", personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.room = "hotel_room"; G.nightTurn = 30;
  assert.match(t("teach online"), /holiday has no mornings|resident/); assert.ok(!G.job);
  assert.ok(_COMPLETE_VERBS.includes("teach online") && _COMPLETE_VERBS.includes("take the job") && _COMPLETE_VERBS.includes("quit job"));
  assert.match(_HELP, /TEACH ONLINE/);
});

test("CANCEL THE TICKET takes the paper with it; nothing in the paper rolls dice", () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); G.player.origin = "pension"; for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.day = 8; G.pendingChoice = "vacation_end"; run("continue"); out = []; run("cancel the ticket");
  assert.equal(G.paper, "longstay"); assert.ok(G.thaiAccount);
  const rng = G.rng; _jobNight(); _incomeTick(); assert.equal(G.rng, rng);
});
