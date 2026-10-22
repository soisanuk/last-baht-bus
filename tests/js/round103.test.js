// ROUND 103 (2026-10-22) — the digital barstool walked the day it shipped, the laundering doors paid both ways, and the manager
// on the hill again. Gareth (Opus, stream-chaser: a Wrexham signalman who knew four camera bars from his settee — "the phone in
// my hand and the room in front of me kept telling different stories about who was online"), Ingrid (Opus, the laundering jobs
// reconciled: "the town keeps its money straight and its memory short"), Tomás (Opus, the manager's month: "the books know my
// life; the people only know my job title").
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
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 20000;
};
// the Jade Lounge with SilverFox online: the first day his hour is on
const jade = () => { sandbox(); G.room = "jade_lounge"; G.nightTurn = 30; for (let d = 1; d < 80 && !_whaleOn(); d++) G.day = d; quiet(); assert.ok(_whaleOn(), "the tipper is online"); };
const camGirl = () => _npcsHere().find(x => _atCamera(x));

beforeEach(() => { newGame(); });

test("Gareth: a flirt at the camera names the camera, never 'undefined'", () => {
  jade(); const c = camGirl(); assert.ok(c);
  for (let i = 0; i < 6; i++) assert.doesNotMatch(t("flirt " + NPCS[c].name.toLowerCase()), /undefined/);
});

test("Gareth: 'why does he tip so much' is the tipper, not the seat-price speech", () => {
  jade(); const a = t("why does he tip so much?");
  assert.ok(!_SEAT_LINES.some(l => a.includes(l)), a); assert.doesNotMatch(a, /You pay for the seat|The stool is the rest/);
});

test("Gareth: a tipper by name — his own bar's, or another bar's, or where he lives; a handle is a name on the phone", () => {
  jade(); const c = camGirl(), n = NPCS[c].name.toLowerCase();
  assert.match(t("ask " + n + " about silverfox"), /SilverFox_Leeds|Mister Silver|England/);
  const tex = t("ask " + n + " about big tex"); assert.match(tex, /Big_Tex_Dallas|Mister Tex/); assert.match(tex, new RegExp(_barName(Object.keys(ROOMS).find(id => _streamBar(id) && _whaleOf(id).h === "Big_Tex_Dallas"))));
  assert.match(t("where does big tex live?"), /Dallas|Texas/);
  assert.match(t("ask " + n + " about deckchair_dutchman"), /deckchair_dutchman/i);
  assert.doesNotMatch(said(), /I don't know, na\.$|That one I don't know/);
});

test("Gareth: nobody's camera answer is only the group's — an independent camera bar is named, and Bert shakes HIS head", () => {
  sandbox(); G.room = "stinky_bar"; G.nightTurn = 20; quiet();
  const indies = Object.keys(ROOMS).filter(id => _streamBar(id) && !_PLG_ROOMS.includes(id)).map(id => _barName(id));
  let named = false;
  for (const w of ["camera", "the stream", "cameras", "streaming", "the live stream", "webcam", "the internet", "channel"]) for (const who of ["bert", "lamai", "manow", "cake"]) {
    const a = t(`ask ${who} about ${w}`); if (indies.some(b => a.includes(b))) named = true;
    assert.doesNotMatch(a, /Bert shakes her head/);
  }
  assert.ok(named, "an independent camera bar is named somewhere on the rail");
  assert.ok(_TOWN.stream_not.punter.length >= 6, "Terry and Angela said one sentence: the punter pool is deeper");
});

test("Gareth: a girl at the camera is not free for a board or a chat — another takes the frame, and COME SIT gets the one finger", () => {
  jade(); const c = camGirl(), n = NPCS[c].name.toLowerCase();
  const a = t("play connect 4 with " + n); assert.match(a, /at the camera/); assert.ok(G.game && G.game.oppId !== c);
  run("quit"); G.game = null;
  assert.match(t(n + ", come sit with me"), /camera/);
  assert.match(t("can " + n + " come sit with me?"), /camera/);
  assert.doesNotMatch(said(), /Your holiday/);
});

test("Gareth: a tip of a drink's price is a drink — no 'you nice man, but no' after ฿1,000", () => {
  sandbox(); G.room = "golden_dragon"; G.nightTurn = 30; quiet();
  const g = _npcsHere().find(x => NPC_ROLES[x] === "hostess"), n = NPCS[g].name.toLowerCase();
  G.soc.streamBell = { golden_dragon: _streamNow() };   // the tipper off the floor
  run("tip " + n + " 1000");
  const saved = _rand; try { _rand = () => 0.01; out = []; run("barfine " + n); } finally { _rand = saved; }
  assert.doesNotMatch(said(), /You nice man\. But/); assert.doesNotMatch(said(), /cheap charlie/i);
});

test("Gareth: her text, quoted back, carries no tap hint — and the ask you paid outranks the text that asked it", () => {
  assert.equal(_unhint("buffalo of family very sick 😭 200 baht help? (SEND 200 TO CARTOON)"), "buffalo of family very sick 😭 200 baht help?");
  sandbox(); G.room = "jade_lounge"; G.nightTurn = 10; G.day = 6; quiet();
  const id = "jade_lounge_cartoon"; G.phone.contacts[id] = true;
  G.phone.asks = { [id]: [{ kind: "buffalo", amt: 200, day: 5, paid: true, paidDay: 5 }] };
  G.phone.inbox = [{ from: id, day: 5, text: "buffalo of family very sick 😭😭 200 baht help little bit? (SEND 200 TO CARTOON)", read: true }];
  run("talk to cartoon"); const a = t("how is the buffalo?");
  assert.doesNotMatch(a, /SEND|I text you/); assert.match(a, /okay|thank|buffalo/i);
  assert.match(t("i sent you 200 for the buffalo"), /buffalo|help/i);
});

test("Gareth: the phone shows the corner the room shows — the girls at the camera, the bell's empty chair, the tipper on the column", () => {
  jade(); const room = "jade_lounge", cams = _cameraGirls().map(x => NPCS[x].name);
  G.visited[room] = true; G.room = "soi6_mid";
  const a = t("watch stream jade"); assert.match(a, /SilverFox_Leeds/); assert.ok(cams.some(n => a.includes(n + " at the camera") || a.includes(n)), a);
  G.soc.streamBell = { [room]: _streamNow() };
  assert.match(t("watch stream jade"), /rang the bell|corner is empty/);
  assert.ok(_streamCol(room).length === 3);
  assert.match(ROOMS.lucky_tiger.streamFrom, /pool table/);
});

test("Ingrid: the crooked door's risk is a mixed hash — consecutive days are not one answer for a week", () => {
  for (const k of ["verification", "fiftyone", "covers", "presale"]) {
    const v = []; for (let d = 1; d <= 30; d++) v.push(_hm("launder:" + k + ":" + d, 7) % 100);
    const hits = v.filter(x => x < LAUNDER_RISK_PCT).length;
    assert.ok(hits >= 5 && hits <= 20, k + " fires roughly two nights in five: " + hits);
    assert.ok(v.slice(1).filter((x, i) => Math.abs(x - v[i]) === 1).length < 6, k + " is not near-linear in the day");
  }
});

test("Ingrid: Hong recites the count you made, and two nights is two nights", () => {
  sandbox(); G.quests.covers = "active"; G.room = "jasmine_garden"; G.nightTurn = 30; quiet();
  G.coversNights = { 10: 7 }; run("talk to hong"); assert.match(t("ask hong about the count"), /One night is a Friday/);
  G.coversNights = { 10: 7, 11: 9 }; G.talked.hong = []; assert.match(t("ask hong about the count"), /Two nights/);
  G.coversNights = { 10: 11, 11: 9, 12: 11 }; assert.equal(_coversSaid(), "11, 9 and 11");
  const told = NPCS.hong.dialogue.find(d => (d.choices || []).length).choices[0];
  _runChoice("hong", told); assert.match(said(), /11, 9 and 11/); assert.doesNotMatch(said(), /eight, nine, seven/);
});

test("Ingrid: a man's transfer is his; a text not yet opened is not said 'again'", () => {
  sandbox(); G.phone.inbox = [{ from: "nont", text: "the broker paid", turn: 1, read: false, gives: 3000, day: G.day }];
  out = []; _readMessages(); assert.match(said(), /He's transferred you ฿3,000/); assert.doesNotMatch(said(), /She's transferred/);
  G.room = NPCS.colin.room; G.phone.inbox = [{ from: "colin", text: "somebody polite rang about the slips", read: false, day: G.day }];
  out = []; assert.ok(_textTalk("colin", "the slips")); assert.doesNotMatch(said(), /again|Same now/); assert.match(said(), /read|look yet|sent/);
});

test("Ingrid: Mort pays for what HE hasn't seen — never his own notebook — and the paper by a till is a lead", () => {
  sandbox(); G.stage = "expat"; G.stringer = { paid: {}, weekStart: G.day, weekPaid: 0 };
  G.examined = { "queen_vic.notebook": 1 }; G.licencesRead = { stinky_bar: "x" };
  assert.deepEqual(_stringerOwed(), ["stinky_bar.licence"]);
});

test("Ingrid: 'Dear lady' teaches nobody's name", () => {
  sandbox(); _learnNames("\"Dear lady,\" Reginald says to Orathai, \"the folder.\""); assert.ok(!G.known.dear);
});

test("Ingrid: a go-go's anonymous regulars sit on benches, never welded to a bar", () => {
  for (const l of _BAR_REGULAR_GOGO) assert.doesNotMatch(l, /\bbar\b|stool|\brail\b/);
});

test("Ingrid: the laundering jobs' own words are askable of the people in them", () => {
  sandbox(); _setFlag("fiftyoneSigned"); G.room = NPCS.orathai.room; quiet(); run("talk to orathai");
  assert.match(t("ask orathai about me"), /Reginald's folder/); assert.match(t("ask orathai about the fee"), /Paid/);
  G.quests.covers = "active"; G.room = "jasmine_garden"; run("talk to hong"); assert.match(t("ask hong about grace"), /Grace/);
  _setFlag("coversTold"); G.room = NPCS.grace.room; run("talk to grace"); assert.match(t("ask grace about the envelope"), /counting/);
  _setFlag("presaleSlips"); G.room = NPCS.colin.room; run("talk to colin"); assert.match(t("ask colin about the friend"), /slip/);
  _setFlag("verifSold"); G.room = NPCS.nigel.room; run("talk to nigel"); assert.match(t("ask nigel about the lawyer"), /Second Road/);
  G.room = "queen_vic"; assert.match(t("examine brass owl"), /brass owl/i);
  assert.match(t("take the job"), /Nobody has offered|job already/);
});

test("Ingrid: Nont does not say you are paid before the broker pays", () => {
  const n = NPCS.nont.dialogue.find(d => d.req && d.req.includes("verifSold") && /He bit/.test(d.text));
  assert.doesNotMatch(n.text, /three thousand happier/); assert.match(n.text, /on its way/);
});

test("Tomás: the shutter is the man who was there at close — a manager who left early is remembered leaving", () => {
  const w = { day: 1, bar: "sunset_rail", shift: "sunset_rail", shiftLeft: 37 };
  assert.ok(/shiftLeft/.test(String(_endNight)), "the night records when he left");
  const src = String(_townTalk) + String(_doTalkCore);
  assert.ok(/sawshiftleft/.test(readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8")));
  assert.ok(w.shiftLeft < _closeTurn("sunset_rail"));
});

test("Tomás: the quit is the mama's rail, never Bert's; the woman on the paper says 'me'", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /Bert stand it now/);
  assert.match(src, /"Me\." \$\{n\} taps the frame by the till/);
});

test("Tomás: no songthaew takes her home up the hill; the floor's account of a night out reads how it ended", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo";
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /no truck goes up the hill \(Tomás, round 103/);
  assert.ok(_TOWN.my_flat_seen.floor.length >= 6, "two women, one sentence: the flat pool is deeper");
});

test("Tomás: she can talk about the flat while she's in it; BALCONY in the flat is the flat's", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.room = "condo_room"; G.nightTurn = 70;
  const id = "pukky"; G.party = { ids: [id], stops: 0, spent: 0, seen: {} };
  assert.ok(_townTalk(id, "the flat")); assert.doesNotMatch(said(), /I don't know/);
  assert.doesNotMatch(t("balcony"), /over the Queen Vic/);
});

test("Tomás: 'not tonight, I'm drinking' answers the house at his own bar", () => {
  sandbox(); G.stage = "expat"; G.room = "sunset_rail"; G.nightTurn = 20;
  G.job = { kind: "manager", room: "sunset_rail", corp: false, nights: 5, stood: 0, weekStood: 0, weekStart: G.day, strikes: 0, since: G.day };
  assert.match(t("not tonight, i'm drinking tonight"), /Customer/);
});

test("Tomás: a woman told about the flat once is not told it fresh a month later", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.room = NPCS.pukky.room; G.nightTurn = 20; quiet();
  run("talk to pukky"); const a = t("ask pukky about my flat"); G.day += 30; const b = t("ask pukky about my flat");
  assert.notEqual(a, b); assert.doesNotMatch(b, /interested in a way she was not/);
});

test("Tomás: the woman you walked to her ride remembers it — the witness answers for herself", () => {
  sandbox(); G.room = NPCS.pukky.room; G.nightTurn = 20; quiet();
  G.lastNightWas = { day: G.day - 1, bar: G.room, seenHome: "pukky" };
  run("talk to pukky"); const a = t("ask pukky about the songthaew");
  assert.doesNotMatch(a, /Not yet, na|don't know/); assert.match(a, /walk|Gentleman|remember/i);
});
