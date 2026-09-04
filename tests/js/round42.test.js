// Round 42 — Hugo (the Thai speaker), Roland (the teetotaller's circuit), Jacko (the 9am survivor).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
const stub = (fn, v = 0.99) => { const saved = _rand; _rand = () => v; try { return fn(); } finally { _rand = saved; } };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

test("no player-facing string is a piece of source code (Jacko)", () => {
  // the filler hostess's after-hours answer printed `" +` and its own indentation
  // on every bar in the game — a concatenation idiom inside a template literal
  const bad = [];
  for (const [id, n] of Object.entries(NPCS)) {
    const strs = [n.desc, n.look, ...(n.dialogue || []).flatMap(d => [d.text, d.short])].filter(x => typeof x === "string");
    for (const s of strs) if (/"\s*\+\s*$|"\s*\+\s*"/.test(s) || /\n\s{6,}"/.test(s)) bad.push(id + ": " + s.slice(0, 60));
  }
  assert.deepEqual(bad, []);
  G.room = "candy_bar"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name} about late`);
  assert.doesNotMatch(text(), /" \+/); assert.match(text(), /Thai (disco|place)|after bar close|khao tom/i);
});

test("a massage shop's price list is not a drinks list (Hugo)", () => {
  G.room = "thai_massage"; out = []; run("examine price list");
  assert.doesNotMatch(text(), /lady drink|Beer, spirits/); assert.match(text(), /Foot, Thai, oil|two languages/);
  G.room = "poseidon_soapy"; out = []; run("examine price list"); assert.doesNotMatch(text(), /lady drink/);
  G.room = "stinky_bar"; out = []; run("examine price list"); assert.match(text(), /two columns|Beer, spirits/);
});

test("the drunk balk looks one room out for a bench before saying there isn't one (Jacko)", () => {
  G.soc.drunk = 8; G.money = 1000;
  G.room = "ws_gate"; G.motoBalkTurn = null; out = []; stub(() => run("motosai to naklua"));
  assert.ok(_MOTO_DRUNK_NO.some(l => text().includes(l.slice(0, 40))), "a hundred metres from Pattaya Tai, there is a truck");
  G.room = "khao_talo"; G.motoBalkTurn = null; out = []; stub(() => run("motosai to naklua"));
  assert.ok(_MOTO_DRUNK_NO_EAST.some(l => text().includes(l.slice(0, 40))), "…and out east there genuinely isn't");
});

test("Nont has no running account with a man he has never done business with (Jacko)", () => {
  _setFlag("hasWallet"); G.room = _npcRoom("nont"); G.nightTurn = 30; G.bank = 50000;
  out = []; run("ask nont about delay");
  assert.match(text(), /not given me anything to be late/);
  G.nontCashed = true; delete G.talked.nont; out = []; run("ask nont about delay");
  assert.match(text(), /Nothing's late|Tomorrow/);
});

test("one dawn, not two: her goodbye is the morning when you have company (Jacko)", () => {
  G.room = "beach_rd_c"; const her = "lek";
  G.party = { ids: [her], stops: 2, spent: 0, seen: {} };
  G.nightTurn = 99; out = []; stub(() => _endNight("allnighter"));
  const skies = (text().match(/sky/gi) || []).length;
  assert.ok(skies <= 1, `two skies and two taxis printed (${skies})`);
  assert.ok(_PARTY_DAWN.some(l => text().includes(l.split("{")[0].slice(0, 30))), "hers is the one that prints");
});

test("a girl who asks you to barfine her cannot then call you a cheap charlie (Jacko)", () => {
  G.room = "las_vegas"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.soc.drinkCount = { [g]: 0 }; G.soc.drinks = { [g]: 4 };
  // the dice that always call it: without the invite this is a refusal…
  G.soc.bfRefused = {}; const before = stub(() => _bfRefusal(g, "gogo"), 0.1);
  assert.match(String(before && before.kind), /cheap|dislike/);
  // …and with it, never (a held refusal is cleared: she asked tonight)
  G.soc.goWith = { [g]: true };
  for (let i = 0; i < 20; i++) {
    G.soc.bfRefused = {};
    const r = stub(() => _bfRefusal(g, "gogo"), 0.1);
    assert.doesNotMatch(String(r && r.kind), /cheap|dislike/, "she opened the subject");
  }
});

test("the massage shop has somebody in it, and Auntie Nok sells the mango she offers (Roland)", () => {
  for (const r of Object.keys(ROOMS).filter(x => ROOMS[x].massage || ROOMS[x].soapy)) {
    G.room = r; out = []; run("talk to masseuse");
    assert.doesNotMatch(text(), /No one here answers|Nobody by that name/, r);
  }
  G.room = "thai_massage"; out = []; run("talk to masseuse"); assert.match(text(), /Pensri/, "the shop with a named woman sends you to her");
  G.room = "jomtien_soi_7_beach_end"; G.money = 500; G.hunger = 60; const m = G.money;
  out = []; run("buy mango"); assert.equal(G.money, m - 30); assert.match(text(), /Auntie Nok/);
  G.room = "jomtien_beach_rd"; G.hunger = 60; out = []; run("buy mango");
  assert.doesNotMatch(text(), /Auntie Nok/, "she is two rooms south, at her pitch");
});

test("the Thai a learner actually types (Hugo)", () => {
  // the number he SAYS, in every form — the driver shouts สิบห้าบาท and would only take ๑๕
  assert.equal(parseThaiWords("sip ha"), 15); assert.equal(parseThaiWords("ยี่สิบ"), 20);
  assert.equal(parseThaiWords("song roi"), 200); assert.equal(parseThaiWords("สองร้อย"), 200);
  assert.equal(parseThaiWords("banana"), null);
  G.room = "jomtien_beach_rd"; G.money = 500;
  run("ride bus to pattaya tai"); out = []; run("pay sip ha");
  assert.equal(G.money, 500 - BUS_FARE); assert.doesNotMatch(text(), /A number would help/);
  // the phrases, and the spellings people use
  for (const p of ["mai pen rai", "chok dee", "sabai dee mai", "khor thot", "suay", "phaeng", "kin khao mai", "jai yen", "aroy"]) {
    assert.ok(matchThaiPhrase(p), `${p} is a phrase the game knows`);
  }
  G.room = "candy_bar"; for (const p of ["mai pen rai", "chok dee", "jai yen"]) {
    out = []; run(p); assert.doesNotMatch(text(), /didn't understand|didn't parse|blinks at you/, p);
  }
  // romanised Thai that misses gets the hint the script always got — while you
  // are still a novice; past that the room switches to English instead, which is
  // what actually happens to a competent-but-not-fluent foreigner
  assert.equal(_thaiRegister(), "adequate", "he has just said several things");
  out = []; run("nit noi"); assert.ok(_THAI_SWITCH.some(l => text().includes(l.slice(0, 40))));
  G.thaiSaid = {}; G.thaiScript = 0; G.room = "beach_rd_c";
  out = []; run("nit noi"); assert.match(text(), /sounded like Thai/);
  out = []; run("i am going to the bar"); assert.doesNotMatch(text(), /sounded like Thai/, "English is not Thai");
  // the ordering words
  G.money = 900; out = []; run("ขอเบียร์"); assert.match(text(), /เข้าใจ — buy beer/);
});

test("somebody wais back, and the empty room is the room you are in (Hugo)", () => {
  G.room = "hotel_room"; out = []; run("wai");
  assert.match(text(), /empty room/); assert.doesNotMatch(text(), /empty street/);
  G.room = "thai_massage"; out = []; run("wai"); assert.doesNotMatch(text(), /street/);
  G.room = "candy_bar"; out = []; run("wai");
  assert.ok(_WAI_BACK.concat(_WAI_BACK_MAMA).some(l => text().includes(l.split("{")[0].slice(0, 20)) || /returns it|wais back/.test(text())), "somebody returns it");
  out = []; run("wai"); assert.doesNotMatch(text(), /returns it exactly as far/, "once a night, not every time");
  // …and SAY to an empty room stops describing a crowd
  G.room = "hotel_room"; out = []; run("sawatdee khrap");
  assert.doesNotMatch(text(), /Faces soften|smiles all round/);
});

test("everybody has a view on som tam, and the register is theirs (Hugo)", () => {
  G.room = "candy_bar"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name} about som tam`); assert.match(text(), /Papaya, chilli, lime/);
  out = []; run(`ask ${NPCS[g].name} about sanuk`); assert.match(text(), /question is the answer/);
  G.room = "queen_vic"; out = []; run("ask terry about sanuk");
  assert.match(text(), /whole country in five letters/, "the expat gets the twenty-years version");
  G.room = "candy_bar"; out = []; run(`ask ${NPCS[g].name} about isan`);
  assert.doesNotMatch(text(), /wrong girl|don't know about that/, "isan is home");
});

test("the streets know what time it is, in a pool (Jacko / Mario)", () => {
  const late = Object.keys(ROOMS).filter(r => ROOMS[r].lateDesc);
  assert.ok(late.length >= 15, `${late.length} rooms carry a late paint`);
  for (const r of late) {
    const d = ROOMS[r].lateDesc;
    if (Array.isArray(d)) assert.ok(d.length >= 3, `${r}: a repeatable line wants a real pool`);
  }
  // the sunset that was still dying over Jomtien at a quarter to two
  G.room = "jomtien_beach"; G.nightTurn = 88; out = []; _describeRoom(true);
  assert.doesNotMatch(text(), /smear of sunset/);
  G.nightTurn = 20; out = []; _describeRoom(true, true); assert.match(text(), /sunset|loungers/, "early, the room reads as itself");
  // and the pool rotates rather than repeating
  const seen = new Set();
  G.nightTurn = 88; for (let i = 0; i < 6; i++) { out = []; _describeRoom(true); seen.add(text().slice(0, 40)); }
  assert.ok(seen.size >= 2, "the late paint varies");
});

test("WATCH SUNRISE is a real thing, and the sun comes up behind the town (Jacko)", () => {
  G.room = "jomtien_beach"; G.nightTurn = 90; const h = G.happy;
  out = []; run("watch sunrise");
  assert.ok(_SUNRISE.some(l => text().includes(l.slice(0, 40))));
  assert.equal(G.happy, h + 2); assert.match(text(), /สบาย/);
  out = []; run("watch sunrise"); assert.equal(G.happy, h + 2, "one sky a night");
  G.nightTurn = 30; out = []; run("watch dawn"); assert.match(text(), /Too early|Not yet/);
  G.room = "candy_bar"; G.nightTurn = 95; out = []; run("watch sunrise"); assert.match(text(), /Not from in here|No window/);
  // it never claims the sun rises out of the sea: Pattaya faces west
  for (const l of _SUNRISE) assert.doesNotMatch(l, /sun (rises?|coming up) (out of|from) the sea|over the sea/);
  // three surfaces: the parser has it, the completion offers it late and outdoors, HELP names it
  G.room = "jomtien_beach"; G.nightTurn = 95;
  assert.ok(engineComplete("watch ").some(c => /sunrise/.test(c)), "offered at dawn, outdoors");
  G.nightTurn = 20; assert.ok(!engineComplete("watch ").some(c => /sunrise/.test(c)), "…and not at eight in the evening");
  assert.match(_HELP, /WATCH SUNRISE/);
});

test("the town's standard compliment: once per person, and never from Nont (Mario)", () => {
  G.room = "candy_bar"; out = []; run("sawatdee khrap");
  assert.ok(_THAI_PRAISE.some(l => text().includes(l.split("{")[0].slice(0, 15)) || /Poot Thai|poot Thai|speak Thai/.test(text())), "somebody says it");
  const said = text();
  out = []; run("khop khun khrap");
  assert.notEqual(text(), said, "…a different person, or nobody twice");
  const praised = Object.keys(G.soc.thaiPraised || {});
  out = []; for (let i = 0; i < 6; i++) run("chok dee");
  for (const id of Object.keys(G.soc.thaiPraised || {})) assert.ok(_thaiVoice(id), `${id} is a Thai speaker`);
  assert.ok(Object.keys(G.soc.thaiPraised).length >= praised.length);
  // Nont is bilingual and unimpressed — his register is switching to English first
  _setFlag("hasWallet"); G.room = _npcRoom("nont"); G.nightTurn = 30;
  out = []; run("sawatdee khrap"); run("khop khun khrap"); run("chok dee");
  assert.ok(!(G.soc.thaiPraised || {}).nont, "not from Nont");
  // and the counter is there for whatever the second tier turns out to be
  assert.ok(G.thaiUsed >= 3);
});

test("adequate is not fluent, and fluency is a cost on the floor (Mario)", () => {
  G.room = "candy_bar";
  assert.equal(_thaiRegister(), "novice");
  for (const p of ["sawatdee khrap", "khop khun", "chok dee"]) run(p);
  assert.equal(_thaiRegister(), "adequate", "three distinct phrases is a phrasebook");
  // repetition is not learning
  const pts = _thaiPoints(); for (let i = 0; i < 8; i++) run("chok dee");
  assert.equal(_thaiPoints(), pts, "saying the same thing forever moves nothing");
  // script counts double — a Thai keyboard is the strongest signal the parser has
  G.money = 900; run("ซื้อเบียร์");
  assert.ok(_thaiPoints() >= pts + 2, "script is worth a phrase and a point");
  for (const p of ["mai pen rai", "suay", "phaeng", "jai yen", "kin khao mai", "aroi"]) run(p);
  assert.ok(_thaiFluent());
  // …and now the compliments stop and the floor gets careful
  G.soc.thaiSpy = false; G.room = "lucky_tiger"; out = []; run("sanuk");
  assert.ok(_THAI_SPY.some(l => text().includes(l.split("{")[0].slice(0, 12)) || /spy|police|English more easy|understand everything/i.test(text())));
  assert.ok(!_THAI_PRAISE.some(l => /Poot Thai geng/.test(text()) && text().includes("geng!")), "no more poot Thai geng");
  // the deflection she used to have is gone
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name} about her sponsor's name`);
  assert.ok(_THAI_NO_DEFLECT.some(l => text().includes(l.split("{")[0].slice(0, 12))) || /don't want to talk|not going to say|changed it|deciding, in front of you/.test(text()));
  // and the rail is comprehensible, including the part about being careful
  G.thaiHeardTurn = -99; let heard = false;
  const saved = _rand; _rand = () => 0.01;
  try { for (let i = 0; i < 3 && !heard; i++) { out = []; G.thaiHeardTurn = -99; _thaiOverheard(); heard = _THAI_OVERHEARD.some(l => text().includes(l.slice(0, 30))); } }
  finally { _rand = saved; }
  assert.ok(heard, "you catch what was not meant for you");
});

// ── The stranded letter (the trainer's tokeniser fix, wired on our side) ─────
test("no Thai the game prints leaves a lone letter on the word card", () => {
  // ซอยบัวขาว came out ซอย|บัว|ขา|ว — "soi, lotus, leg" and a loose ว — because
  // greedy longest-match takes a shorter word that is a prefix of the real one.
  // A lone Thai letter is never a word, so it is always a tokenisation failure.
  // the vendored stack the card is built on (this suite doesn't load it by default)
  for (const f of ["data.js", "tokeniser.js"])
    vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
  const term = readFileSync(join(here, "../../web/js/term.js"), "utf8");
  const m = term.match(/const LBB_VOCAB = \[([\s\S]*?)\];/);
  assert.ok(m, "term.js carries the game's own word rows");
  const vocab = JSON.parse("[" + m[1].replace(/\/\/[^\n]*/g, "").replace(/,\s*]/g, "]").trim().replace(/,$/, "") + "]");
  const map = {};
  for (const w of WORDS) map[w[0]] = w;
  for (const n of Object.values(NPCS)) if (n.th) map[n.th] = ["ent"];
  for (const w of vocab) if (!map[w[0]]) map[w[0]] = w;
  const words = new Set(vocab.map(w => w[0]));
  const tok = makeTokeniser(map, w => !!map[w] || words.has(w));
  const src = ["world.js", "engine-core.js", "engine-encounters.js", "engine-play.js",
    "engine-systems.js", "engine-parser.js"]
    .map(f => readFileSync(join(here, "../../web/js", f), "utf8")).join("\n");
  const stranded = new Set();
  for (const run of src.match(/[฀-๿]{2,}/g) || []) {
    if (/^[๐-๙]+$/.test(run)) continue;
    for (const t of tok(run)) {
      if (!t.word && [...t.text].length === 1 && /[ก-ฮ]/.test(t.text)) stranded.add(run);
    }
  }
  assert.deepEqual([...stranded], [],
    "a lone letter on the card — add the whole word to LBB_VOCAB in term.js (and send it to the trainer)");
});
