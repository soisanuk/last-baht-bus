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

test("the verbs a Thai speaker reaches for, in Thai (Hugo)", () => {
  // every word in the table has to exist in the trainer's curriculum, or the
  // card cannot gloss it — the coverage test enforces that; this one enforces
  // that the command on the other side is real
  const src = readFileSync(join(here, "../../web/js/engine-parser.js"), "utf8");
  const verbs = new Set();
  for (const m of src.matchAll(/case\s+"([a-z0-9 ]+)":/g)) verbs.add(m[1].split(" ")[0]);
  const reach = [...new Set(_THAI_CMD.map(([, en]) => en.split(" ")[0]))].filter(w => verbs.has(w));
  assert.ok(reach.length >= 35, `${reach.length} parser verbs reachable in Thai script`);
  for (const v of ["work", "pay", "ask", "barfine", "wait", "listen", "smell", "give", "sell", "ring"])
    assert.ok(reach.includes(v), `${v} is reachable in Thai`);
  // …and the sentences actually run
  const fresh = r => { newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
    _setFlag("act1Done"); _setFlag("hasWallet"); G.money = 3000; G.nightTurn = 30; G.room = r; out = []; };
  const miss = /didn't understand|didn't parse|blinks at you|No idea what you're after|soi reads a little/i;
  for (const [th, room] of [["ทำงาน", "stinky_bar"], ["ซื้อถุงยาง", "beach_rd_c"], ["ดื่มเบียร์", "candy_bar"],
    ["ไปโรงแรม", "candy_bar"], ["บาร์ไฟน์", "candy_bar"], ["ระฆัง", "candy_bar"], ["จ่าย ๑๕", "candy_bar"]]) {
    fresh(room); run(th); assert.doesNotMatch(text(), miss, th);
  }
  // a character's own Thai name is addressable — you cannot ask a woman about
  // anything in Thai if the parser has never heard of her
  fresh("candy_bar"); run("ถามแคนดี้"); assert.match(text(), /เข้าใจ — ask candy/);
});

// ── Cloze, and the tutor who works it ───────────────────────────────────────
test("Cloze is a real bar on Soi Diana, and Waen is in it", () => {
  assert.equal(ROOMS.cloze.barType, "beer");
  assert.equal(ROOMS.cloze.region, "Soi Diana");
  assert.ok(ROOMS.diana_mid.venues.includes("cloze"), "the soi names it");
  assert.match(ROOMS.diana_mid.desc, /CLOZE/, "…and its own prose says so");
  G.room = "diana_mid"; run("enter cloze"); assert.equal(G.room, "cloze");
  assert.ok(_npcsHere().includes("waen"));
  out = []; run("talk to waen"); assert.match(text(), /I am Waen/);
  for (const t of ["name", "thai", "teacher", "tones", "farang", "home", "family", "plan"]) {
    out = []; run(`ask waen about ${t}`);
    assert.doesNotMatch(text(), /not my story|wrong girl|don't know about that/i, t);
  }
  // the blackboard the room advertises answers a close look
  out = []; run("examine board"); assert.match(text(), /Tonight's word/);
  // she is staff, so the trade's own machinery sees her
  assert.equal(NPC_ROLES.waen, "hostess");
  G.money = 3000; out = []; run("buy waen a drink");
  assert.doesNotMatch(text(), /didn't understand|No one here/);
});

test("the seventeen requested words reach the verbs they were requested for", () => {
  const en = new Set(_THAI_CMD.map(([, e]) => e));
  for (const v of ["flirt", "tip", "photo", "massage", "swim", "dance", "sing",
    "withdraw", "cash", "balance", "message", "contact", "taxi", "beach", "cigarette", "light on"])
    assert.ok(en.has(v), `${v} is reachable in Thai`);
  const fresh = r => { newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
    _setFlag("act1Done"); _setFlag("hasWallet"); G.money = 5000; G.bank = 50000; G.nightTurn = 30; G.room = r; out = []; };
  const miss = /didn't understand|didn't parse|blinks at you|No idea what you're after|soi reads a little/i;
  for (const [th, room] of [["จีบ", "candy_bar"], ["นวด", "thai_massage"], ["ว่ายน้ำ", "jomtien_beach"],
    ["ถอนเงิน", "beach_rd_c"], ["บัญชี", "beach_rd_c"], ["ไปชายหาด", "beach_rd_c"]]) {
    fresh(room); run(th); assert.doesNotMatch(text(), miss, th);
  }
  // the torch is not a door: เปิดไฟ is LIGHT ON, not OPEN
  fresh("jomtien_beach_s3"); run("เปิดไฟ");
  assert.match(text(), /Flashlight on/); assert.equal(G.lightOn, true);
});

test("Kruu Waen sells an hour, and an hour is not a promotion (Mario)", () => {
  G.room = "cloze"; G.money = 1000;
  const before = _thaiPoints();
  out = []; run("lesson");
  assert.match(text(), /Phrases, then/); assert.equal(G.money, 1000 - LESSON_PRICE);
  assert.match(text(), /สวัสดีครับ/, "the content is the game's own phrase table");
  // THE RULE: you can buy the knowing, not the standing
  assert.equal(_thaiPoints(), before, "a lesson teaches; the ladder counts what you USE");
  // three tiers, and she picks by what you can already do
  out = []; run("lesson reading"); assert.match(text(), /Forty-four consonants/);
  assert.match(text(), /ไป|ดู|น้ำ/, "reading is taught off words the game prints");
  out = []; run("lesson verbs"); assert.match(text(), /useful half/);
  assert.match(text(), /LIGHT ON|SING|PHOTO|WORK/, "…and the verbs are the parser's own");
  // it is a real hour, and it costs
  const t = G.nightTurn; out = []; run("lesson phrases");
  assert.ok(G.nightTurn - t >= LESSON_TURNS, "an hour of the evening");
  // she runs out, and says the honest thing about what she cannot sell
  for (let i = 0; i < 8; i++) { G.money = 1000; G.nightTurn = 20; G.room = "cloze"; run("lesson phrases"); }
  out = []; G.money = 1000; G.nightTurn = 20; G.room = "cloze"; run("lesson phrases");
  assert.match(text(), /cannot sell you/); assert.equal(G.money, 1000, "and she doesn't charge for it");
  // broke, and elsewhere
  G.money = 20; delete G.taught; out = []; run("lesson"); assert.match(text(), /do not teach on credit/);
  G.room = "candy_bar"; out = []; run("lesson"); assert.match(text(), /Cloze on Soi Diana/);
  // three surfaces
  assert.ok(_npcActions("waen", true).includes("lesson"));
  G.room = "cloze"; assert.deepEqual(_completePool("lesson"), ["phrases", "reading", "verbs"]);
  assert.match(_HELP, /LESSON \[phrases\|reading\|verbs\]/);
});

test("Waen sends the app after the first hour, then a word a night, free (Mario)", () => {
  G.room = "cloze"; G.money = 1000;
  run("talk to waen"); assert.ok(G.known.waen);
  run("lesson");
  const link = G.phone.inbox.find(m => m.from === "waen" && /soisanuk/.test(m.text));
  assert.ok(link, "the app she makes her students use");
  assert.match(link.text, /it is free and it is not mine/, "she is recommending, not selling");
  // The fourth wall stays deliberate. Real places a player could actually go:
  // the dog's charity, and now hers. Everything else is in-fiction (a CTF
  // puzzle domain, a bar's own web address) or the game's own share card.
  const src = ["engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js", "world.js"]
    .map(f => readFileSync(join(here, "../../web/js", f), "utf8")).join("\n");
  const OK = ["soisanuk.github.io/last-baht-bus", "soidog.org", "blacksite.org", "soc.com"];
  const real = [...new Set((src.match(/[a-z0-9-]+\.(?:org|com|io)(?:\/[a-z-]+)?/gi) || []))]
    .filter(u => !OK.some(k => u.includes(k) || k.includes(u)));
  assert.deepEqual(real, [], "a third link out would make this a game with adverts: " + real.join(" "));
  // then the homework, once a night, free, and the same for everybody that night
  const before = G.money;
  G.day++; G.waenDay = null; out = []; _waenTick();
  const hw = G.phone.inbox.slice(-1)[0];
  assert.equal(hw.from, "waen"); assert.equal(hw.gives, 0); assert.equal(G.money, before, "free");
  const n = G.phone.inbox.length; _waenTick();
  assert.equal(G.phone.inbox.length, n, "once a night");
  // day-stable: reading a save must not reroll tonight's word
  const w1 = _waenWord(); assert.deepEqual(_waenWord(), w1);
  // and she does not text a stranger
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.day = 3; _waenTick();
  assert.equal(G.phone.inbox.filter(m => m.from === "waen").length, 0, "you have not met her");
});

// ── Round 43: Anders paid ฿1,500 and Barry paid nothing ─────────────────────
test("a lesson only sells what the parser takes (Anders)", () => {
  G.room = "cloze"; G.money = 9000; const taught = [];
  for (let i = 0; i < 8; i++) { G.nightTurn = 20; out = []; run("lesson verbs"); taught.push(...text().split("\n").filter(l => /^ {2}\S/.test(l))); }
  assert.ok(taught.length >= 8);
  for (const l of taught) {
    const verb = (l.split("—")[1] || "").trim().toLowerCase();
    assert.ok(_lessonUsable(verb), `she sold "${verb}", which the parser does not take`);
  }
  for (const bad of ["ice", "lady", "man", "market", "sea", "hospital"])
    assert.ok(!taught.some(l => new RegExp("— " + bad.toUpperCase() + "$", "i").test(l.trim())), bad);
});

test("the board is playable and the rule is enforced (Barry, Anders)", () => {
  G.room = "cloze"; G.money = 2000;
  out = []; run("answer"); assert.match(text(), /______/, "it shows you the sentence with the hole in it");
  const beer = _beerPrice();
  out = []; run("answer definitely-wrong-nonsense"); assert.ok(_BOARD_WRONG.some(l => text().includes(l.slice(0, 25))));
  assert.equal(_beerPrice(), beer, "a wrong answer buys nothing");
  const w = _boardWord(); out = []; run("answer " + w.rom);
  assert.match(text(), /THERE it is/); assert.equal(_beerPrice(), Math.round(beer / 2), "half price, as the sign says");
  out = []; run("answer " + w.rom); assert.match(text(), /already had it/);
  // day-stable: reloading cannot reroll tonight's word
  assert.deepEqual(_boardWord(), w);
  G.room = "candy_bar"; out = []; run("answer beer"); assert.match(text(), /Cloze on Soi Diana/);
});

test("the taught phrase does what the taught verb does, and the game's own sentence is buyable (Anders)", () => {
  G.room = "cloze"; G.money = 2000;
  out = []; run("thao rai");
  assert.match(text(), /beer ฿/, "SAY THAO RAI answered 'nobody here is selling anything' in a bar with a price list");
  out = []; run("buy lesson"); assert.match(text(), /Phrases, reading, or verbs/);
});

test("the notebook shows what the counters knew (Anders)", () => {
  G.room = "cloze"; G.money = 1000;
  out = []; run("notebook"); assert.match(text(), /back pages are empty/);
  run("lesson"); run("sawatdee khrap"); out = []; run("notebook");
  assert.match(text(), /Thai you have actually used: \d+/);
  assert.match(text(), /Taught by Kruu Waen: 4 phrases/);
  assert.match(text(), /the real syllabus/);
});

test("ASK ABOUT THAI means the language, and Tan is not a she (Anders)", () => {
  G.room = "candy_bar"; out = []; run("ask candy about thai");
  assert.match(text(), /Kruu Waen|Cloze/, "the first question a learner types");
  G.room = "soi6_street"; G.phone.contacts.tan = true; G.known.tan = true;
  out = []; run("message tan"); assert.doesNotMatch(text(), /She replies/);
});

// ── Nok-Anne, who arrived fluent ────────────────────────────────────────────
test("fluency does not turn every gap in the writing into a refusal (Nok-Anne)", () => {
  G.room = "lucky_tiger";
  for (const p of ["mai pen rai", "suay", "phaeng", "jai yen", "kin khao mai", "aroi", "sanuk", "mai ao", "chok dee", "sabai dee mai"]) run(p);
  assert.equal(_thaiRegister(), "fluent");
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  const REFUSAL = /don't want to talk about that one|deciding, in front of you, not to answer|answers a slightly different question|not going to say/;
  for (const nonsense of ["photosynthesis", "norway", "pizza", "muay thai"]) {
    out = []; run(`ask ${NPCS[g].name} about ${nonsense}`);
    assert.doesNotMatch(text(), REFUSAL, `"${nonsense}" read as her hiding something`);
  }
  // …but the things she would actually dodge still land
  let dodged = false;
  for (const touchy of ["her sponsor", "money", "her boyfriend", "the quota"]) {
    out = []; run(`ask ${NPCS[g].name} about ${touchy}`);
    if (REFUSAL.test(text())) dodged = true;
  }
  assert.ok(dodged, "she still declines the things she would decline");
});

test("the game repeats what was said, particle and all (Nok-Anne)", () => {
  G.room = "candy_bar";
  out = []; run("สวัสดีค่ะ"); assert.match(text(), /สวัสดีค่ะ/); assert.doesNotMatch(text(), /สวัสดีครับ/);
  out = []; run("ขอบคุณค่ะ"); assert.match(text(), /khop khun kha/);
  out = []; run("สวัสดีครับ"); assert.match(text(), /สวัสดีครับ/, "and a man's particle is still his");
});

test("Thai typed at a pending question is an answer, not a vocabulary miss (Nok-Anne)", () => {
  G.room = "lucky_tiger"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.convoQ = { key: "home", q: "You from where?", who: g }; G.convo = g;
  out = []; run("ฝรั่งเศส");
  assert.doesNotMatch(text(), /soi reads a little Thai/, "her answer was eaten by the vocabulary gate");
});

test("ซื้อ X ให้ Y buys it for HER (Nok-Anne)", () => {
  G.room = "lucky_tiger"; G.money = 2000; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  const before = G.money;
  out = []; run("ซื้อเบียร์ให้" + NPCS[g].th);
  assert.match(text(), /buy drink for/); assert.equal(before - G.money, _ladyPrice(), "her drink, not yours");
});

test("the wai, yes and no are typeable in Thai; the arch claims no hour (Nok-Anne)", () => {
  G.room = "candy_bar"; out = []; run("ไหว้");
  assert.match(text(), /เข้าใจ — wai/, "the gesture that wins Act One");
  const W = readFileSync(join(here, "../../web/js/world.js"), "utf8");
  assert.doesNotMatch(W, /TREE TOWN at four in the morning/, "the late paint fires from midnight");
});
