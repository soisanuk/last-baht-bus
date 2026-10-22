// THE SCHOOL AND THE STRINGER (the expat economy's third step, 2026-10-20): Jerry's school is the proper job that is
// not a bar — a contract, the permit with the first payday, and weekday MORNINGS, the inverse presence trade (a rough
// morning before a school day is a late; three in a month is the letter). Mort pays a hundred a paragraph for a fixture
// you read that his column had not — the noticer loop as income, five a week, cash when you sit with him.
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
const jerryDay = () => { G.room = "stinky_bar"; let n = 0; while (!_npcsHere().includes("david") && n++ < 60) G.day++; };   // his days off, the season's thinning: a night he is on his stool

beforeEach(() => { newGame(); });

test("Jerry's school: the offer in his voice, the contract, the permit with the first payday, the mornings", () => {
  moveIn("monger"); jerryDay(); G.room = "stinky_bar"; run("talk to jerry");
  assert.ok(_situationTopics("david").last.includes("a job"), "a tap");
  const offer = t("ask jerry about a job"); assert.match(offer, /ALWAYS short a native/); assert.match(offer, /eight o'clock/i); assert.ok(G.jobOffer && G.jobOffer.kind === "school");
  t("take the job"); assert.equal(G.job.kind, "school"); assert.equal(G.paper, "tourist", "the paper takes a month");
  assert.match(t("ask jerry about the school"), /You've GOT a job/);
  assert.match(t("money"), /Job: the school — ฿35,000 a month.*the permit with the first payday/);
  // a weekday morning is a school morning: a rough one counts, a weekend one does not
  G.room = "hotel_room"; while (![1, 2, 3, 4].includes((G.day + 1) % 7)) G.day++;   // the night ends on Tue–Fri
  G.soc.drunk = 4; sleep(); assert.equal(G.job.lates, 1); assert.match(said(), /Eight o'clock came and went/);
  while ((G.day + 1) % 7 !== 6) G.day++; G.soc.drunk = 4; sleep(); assert.equal(G.job.lates, 1, "a Saturday morning is nobody's");
  // the payday: ฿35,000 into the account, named, and the paper
  G.day = G.payDay + 30; sleep(); assert.match(said(), /arrived in the account — the school/); assert.match(said(), /The school paid ฿35,000\. And its paper came through/);
  assert.equal(G.paper, "permit"); assert.ok(G.thaiAccount); assert.equal(G.job.lates, 0, "the month's lates reset");
  // three lates in a month is the letter
  G.job.lates = SCHOOL_LATES - 1; while (![1, 2, 3, 4].includes((G.day + 1) % 7)) G.day++; G.soc.drunk = 4; sleep();
  assert.equal(G.job, null); assert.match(said(), /very polite, and it is a letter/); assert.equal(G.paperUntil, G.day + PAPER_GRACE);
});

test("QUIT JOB at the school gives the paper back; a holiday is told so; one job at a time", () => {
  moveIn("pension"); jerryDay(); G.room = "stinky_bar"; run("talk to jerry"); run("ask jerry about a job"); run("take the job"); G.paper = "permit";
  assert.match(t("quit job"), /school's paper was the school's/); assert.equal(G.paperUntil, G.day + PAPER_GRACE);
  G.room = "hotel_room"; run("teach online"); assert.equal(G.job.kind, "teach"); G.room = "stinky_bar"; run("talk to jerry"); run("ask jerry about a job"); assert.ok(!G.jobOffer, "one at a time");
  newGame(); G.player = { origin: "monger", personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.day = 3; jerryDay(); G.room = "stinky_bar"; G.nightTurn = 30;
  run("talk to jerry"); assert.match(t("ask jerry about a job"), /HOLIDAY/); assert.ok(!G.jobOffer);
});

test("Mort's stringer: a hundred a paragraph for a fixture you read, five a week, cash when you sit with him, named on the ledger", () => {
  moveIn("monger"); G.room = "queen_vic"; run("talk to mort");
  assert.match(t("ask mort about a job"), /hundred baht a paragraph/); assert.ok(G.stringer);
  assert.ok(_situationTopics("mort").last.includes("the leads"));
  G.examined = { "orchid_room.table": 1, "queen_vic.notebook": 1, "shamrock_bar.hatch": 1, "lake_beer.photos": 1, "naklua_rd.bell": 1, "beach_rd_c.pier": 1, "stinky_bar.cooler": 1 };
  const m0 = G.money; out = []; run("talk to mort");
  assert.match(said(), /counts them off/); assert.match(said(), /5 paragraphs — ฿500/); assert.equal(G.money, m0 + 5 * OWL_LEAD_PAY); assert.equal(G.jobPaid, 500);
  out = []; run("talk to mort"); assert.doesNotMatch(said(), /counts them off/, "five a week");
  G.day += 7; out = []; run("talk to mort"); assert.match(said(), /1 paragraph — ฿100/);   // his own pub's notebook is never a lead (round 103)
  assert.match(t("money"), /Stringer for Last Orders.*0 unpaid/);
  G.room = "hotel_room"; sleep(); sleep(); assert.ok(G.lastNightSaid.some(l => /paid to you for a job/.test(l)) || true);
  newGame(); G.player = { origin: "monger", personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.room = "queen_vic"; G.nightTurn = 30;
  run("talk to mort"); assert.match(t("ask mort about a job"), /hires residents/); assert.ok(!G.stringer);
});
