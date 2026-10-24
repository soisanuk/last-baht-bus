// THE MANAGER WHO TURNS THE FLOOR (Mario, 2026-10-24): Pukky's own reaction to another bar's woman on his arm is
// kept, and the house adds its own — "in Pattaya it's far easier to replace a bar manager than a good hostess."
// A trouble a night (another bar's woman on his floor, an insult to one of his girls); MGR_COUNSEL of them and the
// mama has a word; one more inside MGR_TROUBLE_DAYS and the keys go back. Walked out of his own bar is the keys at once.
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
const t = c => { out = []; doCommand(c); return said(); };
const resident = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); _setFlag("expatLife"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.lastSaleng = 1e9; G.salengCart = null; G.flowerDay = 20; G.rain = 0;
  G.stage = "expat"; G.day = 20; G.money = 5000; G.bank = 50000; G.soc.drinks.pukky = 10;
  G.job = { kind: "manager", room: "sunset_rail", corp: false, nights: 4, stood: 3, weekStood: 1, weekStart: 20, strikes: 0, since: 15 };
  G.room = "sunset_rail"; G.nightTurn = 30;
};
const bring = () => { G.party = { ids: ["wilai"], stops: 0, spent: 0, seen: {} }; G.soc.rivalSaw = {}; out = []; _partyArrive("sunset_rail"); return said(); };
beforeEach(() => { newGame(); });

test("the girl keeps her own reaction, and the house notes it once a night", () => {
  resident();
  const a = bring();
  assert.match(a, /Pukky/); assert.match(a, /Bussaba saw it/);
  assert.equal(G.job.trouble.length, 1);
  bring(); assert.equal(G.job.trouble.length, 1, "one trouble a night");
});

test("two troubles and the mama has her word — said at his bar, alone; MONEY and 'am I in trouble' carry the gauge", () => {
  resident(); bring(); G.day = 21; bring();
  assert.equal(G.job.counselDue, "brought"); assert.equal(G.job.counseled, undefined, "not with the woman on his arm");
  G.party = null; G.day = 22; out = []; doCommand("look");
  assert.match(said(), /keys/); assert.match(said(), /manager|Manager/); assert.equal(G.job.counseled, 22);
  assert.match(t("money"), /The mama has had a word/);
  assert.match(t("am i in trouble?"), /One more/);
});

test("one more after the word and the keys go back: the job, the envelope, a named loss, and the girl he is weighed against stays", () => {
  resident(); bring(); G.day = 21; bring(); G.party = null; G.day = 22; doCommand("look");
  const h = G.happy; G.day = 23; const a = bring();
  assert.equal(G.job, null); assert.equal(G.jobFired.room, "sunset_rail");
  assert.match(a, /Pukky stay|Pukky I keep|I don't put a paper for Pukky/);
  assert.match(a, /keys to The Shady Lady went back/); assert.ok(G.happy < h + 2);
  assert.match(a, /envelope for the nights you stood/);
});

test("a clean month and the word wears off", () => {
  resident(); bring(); G.day = 21; bring(); G.party = null; G.day = 22; doCommand("look");
  G.day = 22 + MGR_TROUBLE_DAYS; bring();
  assert.ok(G.job, "a trouble a month later is a first trouble again"); assert.equal(G.job.counseled, null);
});

test("an insult to one of his girls is a trouble; walked out of his own bar is the keys at once", () => {
  resident(); doCommand("insult pukky"); assert.equal(G.job.trouble[0].kind, "insult");
  resident(); out = []; _kickOut(); assert.equal(G.job, null); assert.equal(G.jobFired.kind, "kicked");
});

test("sacked: no rail hires him as a manager for a while, the bar that let him go never; the other jobs still do; the town answers 'my job'", () => {
  resident(); G.job = null; G.jobFired = { room: "sunset_rail", day: 19, kind: "brought" }; G.firedBars = { sunset_rail: 19 };
  assert.match(t("ask bussaba about a job"), /I have manager now/);
  G.room = "stinky_bar"; G.soc.drinks.manow = 10; assert.match(t("ask lamai about a job"), /Manager, no\. Not now/); assert.equal(G.jobOffer, null);
  G.day = 19 + _mgrBanDays(); assert.match(t("ask lamai about a job"), /remembers The Shady Lady/); assert.ok(G.jobOffer, "after a while, elsewhere");
  G.jobOffer = null; G.room = "sunset_rail"; G.day = 19 + 400; assert.match(t("ask bussaba about a job"), /I have manager now/, "never at the same bar");
  G.day = 25; G.room = _npcRoom("tan"); assert.match(t("ask tan about my job"), /Shady Lady/);
  G.room = _npcRoom("doyle"); assert.doesNotMatch(t("ask doyle about my job"), /\bsacked|the push|ten a penny\b/, "an American's mouth");
  G.game = null; G.nightTurn = 50; G.room = "sunset_rail"; assert.match(t("am i fired?"), /never take you back/);
});

test("the firing itself records the bar for good", () => {
  resident(); out = []; _kickOut(); assert.equal(G.firedBars.sunset_rail, 20);
});

test("how long the rail stays shut depends on the man's name on the soi, read when he asks", () => {
  resident(); G.job = null; G.jobFired = { room: "sunset_rail", day: 20, kind: "brought" }; G.firedBars = { sunset_rail: 20 };
  G.room = "stinky_bar"; G.soc.drinks.manow = 10;
  G.rep = 0; assert.equal(_mgrBanDays(), 60);
  G.rep = 12; assert.equal(_mgrBanDays(), 30); G.day = 20 + 35; assert.match(t("ask lamai about a job"), /remembers The Shady Lady/); assert.ok(G.jobOffer, "a good name: hired again after a month");
  G.jobOffer = null; G.rep = -12; assert.equal(_mgrBanDays(), 120); assert.match(t("ask lamai about a job"), /Not for a long time/); assert.equal(G.jobOffer, null);
  G.rep = 4; G.day = 20 + 10; assert.match(t("ask lamai about a job"), /People say you are okay/);
  G.room = "sunset_rail"; G.rep = 20; G.day = 20 + 400; G.nightTurn = 50; assert.match(t("ask bussaba about a job"), /I have manager now/, "no name buys back the bar that let him go");
});
