// ROUND 113 (2026-11-02) — the Fable third, on the merged tree of the three November reviews: Keith (a retired ESL
// teacher from Leeds, lens reads-every-line-aloud) played the Soi 6 week and reported every line that rang wrong with
// the room, the speaker and the clock. The Opus and Sonnet personas follow on next week's allowance.
import { test } from "node:test";
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
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const SRC = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");

test("Keith: the sniped regular has been at it 'since he sat down' at twenty to seven, not 'all evening'", () => {
  sandbox(); G.nightTurn = 6; assert.equal(_snipeSince(), "since he sat down");
  G.nightTurn = 40; assert.equal(_snipeSince(), "all evening");
  for (const f of _SNIPE_LINES) {
    const early = f("Pukky", "since he sat down");
    assert.doesNotMatch(early, /all (evening|night)/, early);
    assert.doesNotMatch(early, /temperature/, "the heat line that follows already reads the room's temperature");
    assert.match(f("Pukky", "all evening"), /Pukky/);
  }
  assert.match(SRC, /_pickVary\(_SNIPE_LINES, "snipe"\)\(NPCS\[id\]\.name, _snipeSince\(\)\)/, "the caller passes the clock");
  assert.match(SRC, /the man who was buying \{n\}'s drinks \{s\}/, "…and so does the heat's cause");
});

test("Keith: a ladyboy who said it at hello does not ask 'you didn't know?' at the barfine", () => {
  sandbox(); G.room = _npcRoom("poy"); G.nightTurn = 30;
  assert.equal(_ladyboyToldAtHello("poy"), false, "not before she has said hello");
  run("talk to poy");
  assert.equal(_ladyboyToldAtHello("poy"), true);
  for (let i = 0; i < 4; i++) {
    out = []; assert.equal(_ladyboyGate("poy"), true);
    assert.doesNotMatch(said(), /You didn't know\?|Not for you, tilac/);
    assert.match(said(), /told you at hello|said it first thing|tell you at hello/);
  }
  assert.ok(_LADYBOY_PASS_TOLD.length >= 3);
});

test("Keith: a drink for the woman on your arm is not a smile calibrated to the baht", () => {
  sandbox(); G.room = "sandy_toes"; G.nightTurn = 40; G.party = { ids: ["nina"] }; G.known.nina = 1;
  assert.equal(_outWithMe("nina"), true);
  for (let i = 0; i < 6; i++) {
    const r = t("buy nina drink");
    assert.doesNotMatch(r, /calibrated to the exact value/, r);
    assert.match(r, /Nina/);
  }
});

test("Keith: Somo knows Leeds — the old names off her uncle's radio", () => {
  for (const v of ["Leeds, for my sins", "leeds united", "West Ham", "Forest"]) {
    const r = _somoTeam(v); assert.match(r, /I know them/, v); assert.doesNotMatch(r, /Small club\?/, v);
  }
  assert.match(_somoTeam("Yeovil"), /Small club\?/);
  assert.match(_somoTeam("Liverpool"), /Right answer/);
});

test("Keith: Somsri diagnoses the third night on the third night, not the second", () => {
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 2; let r = t("talk to somsri"); assert.doesNotMatch(r, /Third night\?/, r); assert.match(r, /Early|third night/);
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 3; r = t("talk to somsri"); assert.match(r, /Third night\?/, r);
});

// ── Mario's ruling on Keith's severe row (2026-11-03): conversations are two-party only ──
test("Keith: a question belongs to the conversation it was asked in — turning away drops it, and the new partner takes the line", () => {
  sandbox(); G.room = _npcRoom("somo"); G.nightTurn = 40;
  t("talk to somo"); assert.equal(G.convoQ && G.convoQ.key, "team", "Somo asks");
  const r = t("talk to nu");
  assert.match(r, /Somo lets her question go/); assert.equal(G.convoQ, null);
  assert.ok(!(G.convoLapsed && G.convoLapsed.somo), "not kept for later");
  t("leeds united");
  assert.ok(!(G.player.said && G.player.said.team), "Somo never got the answer through Nu");
  t("talk to somo"); assert.equal(G.convoQ, null, "and she does not come back to it");
  assert.equal(typeof _answerOwner, "undefined", "no answer is routed to another asker by its words");
});

// ── Keith's small rows and Mario's rulings, 2026-11-03 ──
test("Keith: TAO RAI on Soi 6 names the room upstairs", () => {
  sandbox(); G.room = "ruby_kiss"; G.nightTurn = 40;   // a Soi 6 bar (the Silk Rose is Soi Buakhao's)
  assert.match(t("tao rai"), /room upstairs ฿[\d,]+ \(flat, all night/);
  G.room = "lucky_tiger"; assert.doesNotMatch(t("tao rai"), /room upstairs/);
});
test("Keith: the morning ledger names the bar's fine as its own movement", () => {
  sandbox(); G.room = _hotelRoomId(); _nightSnapshot();
  G.bfFinePaid = (G.bfFinePaid || 0) + 3700; G.money -= 3700;
  _endNight("sleep");
  assert.match(JSON.stringify(G.lastNightSaid), /฿3,700 of it to a till for her time off the floor/);
  assert.ok(STATE_SCHEMA.life.includes("bfFinePaid"));
});
test("Mario: a three-stop errand's where-clause follows the step — no atTargets", () => {
  sandbox();
  assert.equal(QUESTS.plg_deal.at(G), "terry");
  _setFlag("heardPlgHistory"); assert.equal(QUESTS.plg_deal.at(G), "kesinee");
  _setFlag("heardPlgInside"); assert.equal(QUESTS.plg_deal.at(G), "gavin");
  _setFlag("heardPlgPitch"); assert.equal(QUESTS.plg_deal.at(G), "bert");
  sandbox(); assert.equal(QUESTS.orchid_recon.at(G), "gavin");
  _align("plg", 2); assert.equal(QUESTS.orchid_recon.at(G), "orchid_room");
  G.visited.orchid_room = 1; assert.equal(QUESTS.orchid_recon.at(G), "doyle");
});

// ── Mario's ruling on Keith's major row (2026-11-03): each Soi 6 woman gets her own after-work answer, in her record ──
test("Keith: no two Soi 6 women share the after-work sentence — every one answers from her own record, never the town pool", () => {
  sandbox();
  const pool = [..._AFTER_WORK.floor, ..._AFTER_WORK.house, ..._AFTER_WORK.thai];
  const women = Object.keys(NPCS).filter(id => { const r = _npcRoom(id); return r && ROOMS[r] && ROOMS[r].region === "Soi 6" && _afterWorkTalk(id); });
  assert.ok(women.length >= 90, `the Soi 6 roster the answerer serves: ${women.length}`);
  const seen = new Map();
  for (const id of women) {
    const own = (NPCS[id].dialogue || []).find(d => d.topic === "after work|after hours");
    assert.ok(own && own.text && own.short, `${id} has her own after-work node, with a short for the retell`);
    assert.ok(!pool.includes(own.text), `${id}'s answer is not a pool line`);
    assert.ok(!seen.has(own.text), `${id} shares her answer with ${seen.get(own.text)}`);
    seen.set(own.text, id);
  }
  // through the real path, the three Keith heard share one cigarette: Nuch at the Vic, Sopha at Front Row, View at the Tamarind
  const ask = (id) => { sandbox(); G.nightTurn = 30; G.room = _npcRoom(id); const nm = NPCS[id].name.toLowerCase(); t(`talk to ${nm}`); return t(`ask ${nm} about after work`); };
  const a = ask("nuch"), b = ask("sopha"), c = ask("sweet_tamarind_view");
  assert.match(a, /count the keys/, a); assert.match(b, /four screen off/, b); assert.match(c, /cards down from the wall/, c);
  for (const s of [a, b, c]) assert.ok(!pool.some(p => s.includes(p.slice(1, 30))), "not the pool: " + s);
  // asked twice, she retells her own short — not the engine's brush-off, and not (Keith's minor row) her phone memory
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("pukky"); t("talk to pukky"); t("ask pukky about after work");
  const again = t("ask pukky about after work");
  assert.match(again, /fan on three/, again); assert.doesNotMatch(again, /lonely ten|flat tire|Buy a drink|something new/);
  assert.match(t("ask pukky about after work again"), /lonely ten/);
  // a typed sentence reaches her line; a question with "open" in it keeps naming what pours after two (round 89's pin)
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("kwan"); t("talk to kwan");
  assert.match(t("where do you go after work"), /last crane of the night/);
  assert.match(t("ask kwan about late"), /crane/);
  const open = t("ask kwan about open after two"); assert.doesNotMatch(open, /crane/, open);
  assert.ok(Object.keys(ROOMS).some(r => ROOMS[r].barType && _closeTurn(r) == null && open.includes(_barName(r))), open);
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("air"); t("talk to air");
  assert.ok(pool.some(p => t("ask air about after work").includes(p.slice(1, 30))), "Air, the Blue Dog's cashier on Beach Road, still deals the pool");
});

test("Keith: Jinda's paper-and-the-room line is her own, not Nee's", () => {
  const jinda = NPCS.jade_lounge_jinda.dialogue.find(d => /^bar\|/.test(String(d.topic))).text;
  const nee = NPCS.nee.dialogue.filter(d => d.topic === "pattaya leisure").map(d => d.text);
  assert.ok(nee.length >= 1 && nee.every(x => /They own the paper\. I run the room\./.test(x)), "Nee keeps the company's phrasing");
  assert.doesNotMatch(jinda, /I run the room|have the paper/);
  assert.match(jinda, /name on the paper by the till is theirs/); assert.match(jinda, /is mine/);
});
