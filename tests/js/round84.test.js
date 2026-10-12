// ROUND 84 (2026-10-13) — Kevin Albright (Opus), 46, a divorced accountant from Ballarat who came for the
// conversation: three women on Soi 6, the same three every night, talked to in his own sentences.
// "Lovely women, well written… But they only remember me if I stayed in their bar longer than in the
// other two, and the game can't hear me say anything about myself unless I tap a numbered answer."
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
const huh = /didn't parse|didn't understand|blinks at you|No idea what/;

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "charmer", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 20; G.flowerDay = G.day; out = [];
});

test("LAST NIGHT: every bar you sat in or bought a woman a drink in saw you, not only the longest", () => {
  G.room = "bay_watch"; run("buy drink for somo");
  G.room = "sunset_rail"; G.soc.barTurns = { sunset_rail: 40, bay_watch: 3 };
  _endNight("sleep"); G.nightTurn = 20;
  G.room = "bay_watch"; run("talk to somo"); out = []; run("ask somo about last night");
  assert.doesNotMatch(said(), /I would remember|You not here|Not here last night/);
});

test("a question to the woman you're talking to reaches her; small talk has her own answer, not her colleague's", () => {
  G.room = "bay_watch"; run("talk to somo");
  for (const c of ["where are you from?", "do you have kids?", "what did you do before this?", "what do you do on your day off?", "are you tired?", "how old are you?", "will you miss me?"]) {
    out = []; run(c); assert.doesNotMatch(said(), huh, c); assert.doesNotMatch(said(), /You'd have to ask around|wrong girl|Not my story/, c);
  }
  G.room = "sandy_toes"; run("talk to nina"); out = []; run("what did you do before this?");
  const nina = said(); G.room = "bay_watch"; run("talk to somo"); out = []; run("what did you do before this?");
  assert.equal(said().replace(/Somo|Nina/g, ""), said().replace(/Somo|Nina/g, ""));   // her own line is stable…
  assert.notEqual(nina.replace(/Nina/g, "X").split("\n")[0], said().replace(/Somo/g, "X").split("\n")[0], "…and not her colleague's");
});

test("what you tell her about yourself is kept, and she can say it back", () => {
  G.room = "sunset_rail"; run("talk to pukky");
  for (const c of ["I'm divorced", "I'm an accountant", "my name is Kev"]) { out = []; run(c); assert.doesNotMatch(said(), huh, c); }
  assert.equal(G.player.told.status, "divorced"); assert.equal(G.player.told.job, "accountant");
  out = []; run("what's my name?"); assert.match(said(), /"Kev\."/);
  out = []; run("what do I do?"); assert.match(said(), /Accountant/);
});

test("hi <name>, can I buy you a drink, goodnight — said the way a man says them", () => {
  G.room = "bay_watch"; out = []; run("hi somo, how are you?"); assert.equal(G.convo, "somo");
  const m = G.money; out = []; run("can I buy you a drink?"); assert.ok(G.money < m);
  out = []; run("goodnight, see you tomorrow"); assert.doesNotMatch(said(), huh); assert.equal(G.convo, null);
});

test("the three women answer for what they say: Somo's home, family, uncle, rubber, chit and your team; Nina's; Pukky's", () => {
  G.room = "bay_watch"; run("talk to somo"); run("Geelong Cats, but that's Aussie rules.");
  out = []; run("ask somo about my team"); assert.match(said(), /"Geelong Cats\./);
  for (const t of ["nakhon phanom", "husband", "uncle", "rubber", "lady drink"]) { out = []; run("ask somo about " + t); assert.doesNotMatch(said(), /wrong girl|Not my story|don't know/, t); }
  G.room = "sandy_toes"; G.hunger = 50; run("talk to nina"); assert.ok(G.hunger < 50, "the food she promises arrives");
  for (const t of ["nong bua lamphu", "the baby's father", "laundry", "food", "money"]) { out = []; run("ask nina about " + t); assert.doesNotMatch(said(), /wrong girl|Not my story|don't know/, t); }
  out = []; run("ask nina about family"); assert.doesNotMatch(said(), /one baby, no papa/);
  G.room = "sunset_rail"; run("talk to pukky");
  for (const t of ["sister", "thai bar", "the job offer", "lonely", "kids"]) { out = []; run("ask pukky about " + t); assert.doesNotMatch(said(), /papa sick|wrong girl|Not my story/, t); }
});

test("a text is not the answer to 'goodbye pukky'; the taxi takes the printed answer typed back", () => {
  G.phone.contacts.pukky = true; G.phone.inbox = [{ from: "pukky", text: "bar quiet tonight 😴 other girls go home", day: G.day, read: true }];
  G.room = "sunset_rail"; run("talk to pukky"); out = []; run("ask pukky about the other bars");
  assert.doesNotMatch(said(), /I text you/);
  assert.equal(_introMatch("Someone easy to like.", PERSONALITIES).id, "charmer");
  assert.equal(_introMatch("straight talk, take me or leave me", PERSONALITIES).id, "blunt");
});

test("the shared lines are each woman's own: the goodbye speech, the remembered face, the texts; the toast pool is deep", () => {
  assert.ok(_TOAST_LINES.length >= 12);
  assert.ok(!_TOAST_LINES.some(f => /deciding what to ask/.test(f("X"))));
  for (const id of ["pukky", "nina"]) { G.room = _npcRoom(id); run("talk to " + id); }
  G.soc.drinks = { pukky: 4, nina: 4 }; const lines = [];
  for (const id of ["pukky", "nina"]) { G.room = _npcRoom(id); G.soc.leavingSaid = {}; out = []; run(`ask ${id} about i fly home tomorrow`); lines.push(said().replace(/Pukky|Nina/g, "X")); }
  assert.notEqual(lines[0], lines[1], "two women, two goodbyes");
});
