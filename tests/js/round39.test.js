// Round 39 — Bronwyn (the cold first-timer, measured), Trevor (the one-bar week), Eamonn (the Soi 6 shopper).
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
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// ── Trevor ──
test("no two filler girls at one bar share a look, a greeting, a family and a plan (Trevor)", () => {
  const byBar = {};
  for (const [id, n] of Object.entries(NPCS)) if (n.filler && NPC_ROLES[id] === "hostess") (byBar[n.room] = byBar[n.room] || []).push(id);
  for (const [room, ids] of Object.entries(byBar)) {
    const sigs = ids.map(id => NPCS[id].desc.slice(0, 40) + "|" + String(NPCS[id].dialogue[0].text).slice(0, 40) +
      "|" + String((NPCS[id].dialogue.find(d => d.topic === "family") || {}).text).slice(0, 30));
    assert.equal(new Set(sigs).size, sigs.length, room + ": " + ids.join(","));
  }
  assert.notEqual(NPCS.rung.desc, NPCS.oat.desc, "Rung and Oat are two women now");
});

test("a man who sits three hours on one stool is somebody: the presence bond offsets the cool-off (Trevor)", () => {
  const home = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcRoom(id) === "candy_bar");
  const away = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcRoom(id) === "lucky_tiger");
  G.soc.drinks[home] = 5; G.soc.drinks[away] = 5; G.soc.barTurns = { candy_bar: 40, lucky_tiger: 3 };
  G.room = "hotel_room"; _endNight("sleep");
  assert.equal(G.soc.drinks[away], 4, "the cool-off elsewhere");
  assert.equal(G.soc.drinks[home], 5, "…held where you sat");
  assert.match(text(), /Three hours on the same stool/);
});

test("Nigel's sermon answers to the words a man types — topic aliases (Trevor / Hamish)", () => {
  assert.ok(_topicHits("1998|pattaya|beach road", "beach road"));
  assert.ok(_convoTopics("nigel").includes("1998") && !_convoTopics("nigel").some(t => t.includes("|")), "the chip shows the first alias");
  const where = _npcWhere("nigel"); if (!where) return;
  G.room = where; run("ask nigel about pattaya");
  assert.match(text(), /Best year of my life, 1998/);
});

test("the downpour's start and the saleng's departure are pools; a bar gets one cart a night (Trevor)", () => {
  G.room = "candy_bar"; _startRain(3); assert.ok(_RAIN_START.some(l => text().includes(l)));
  assert.ok(_RAIN_START.length >= 4 && _SALENG_LEAVE.length >= 4);
  const src = readFileSync(join(here, "../../web/js/engine-encounters.js"), "utf8");
  assert.match(src, /salengBar \|\| \{\}\)\[G\.room\]\)/, "one cart per bar per night");
});

test("no phantom regular 'keeping her in colas' on a rail the season emptied (Trevor)", () => {
  G.season0 = 8; G.day = 3;   // September: low season
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType === "beer" && !Object.keys(NPCS).some(n => NPCS[n].patron && NPCS[n].room === id));
  assert.ok(bar, "a beer bar with no regular of its own");
  for (let i = 0; i < 12; i++) { G.room = "second_rd_c"; _arriveAt(bar); assert.ok(!G.soc.patronBusy[bar], "nobody to be jealous"); }
});

test("the league-night bell is rung by whoever keeps the till; the tier-one ledger beat doesn't assume a drink was just rung (Trevor)", () => {
  const src = readFileSync(join(here, "../../web/js/engine-play.js"), "utf8");
  assert.match(src, /rings the bell herself/); assert.match(src, /The next lady drink that goes on your chit/);
});

test("the charter prefers the stop you named over the first stop in its district (Trevor)", () => {
  G.room = "buakhao_n"; G.money = 1000; run("ride bus to naklua");
  assert.ok(G.pendingFare && G.pendingFare.charter, "a charter is offered");
  assert.equal(G.pendingFare.dest, "naklua_rd");
  G.pendingFare = null;
});

// ── Bronwyn ──
test("plain English from a first-timer is pointed somewhere, never 'I didn't understand that' (Bronwyn)", () => {
  G.room = "jomtien_beach"; run("what should i do");
  assert.match(text(), /LOOK shows where you are/); assert.doesNotMatch(text(), /didn't understand|didn't parse/);
  out = []; run("where am i"); assert.match(text(), /Jomtien Beach/); assert.doesNotMatch(text(), /You talked to/);
  out = []; run("look around"); assert.match(text(), /Jomtien Beach/);
  out = []; run("i'm lost"); assert.match(text(), /HINT when you're stuck/);
});

test("฿5 and a ฿15 fare on the opening night: the phone has one number in it (Bronwyn)", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.money = 5; G.phone.contacts.tan = true; G.room = "jomtien_beach_rd"; run("ride bus to pattaya tai");
  assert.match(text(), /CALL TAN/);
});

test("a canned reply typed a beat late still answers the question that lapsed (Bronwyn)", () => {
  const key = Object.keys(ASK_REPLIES)[0]; const reply = ASK_REPLIES[key][0]; const t = typeof reply === "string" ? reply : reply.text;
  G.convoQ = null; G.convoLapsed = { bert: { key, q: "?" } }; G.room = "stinky_bar";
  run(t);
  assert.equal(G.player.said[key] && G.player.said[key].length > 0, true, "the answer landed");
  assert.match(text(), /a beat late/);
});

test("a quest with a thing to hand over is accepted where the giver is (Bronwyn)", () => {
  const away = [2, 3].find(d => { G.day = d; return _npcRoom("candy") !== "candy_bar"; });
  assert.ok(away, "a night Candy works the other bar");
  G.quests.sangsom = "offered"; G.room = "candy_bar"; run("accept sangsom");
  assert.equal(G.quests.sangsom, "offered"); assert.match(text(), /isn't here to hand it over/);
  assert.notEqual(G.itemLoc.sang_som, "inventory");
});

test("the 7-Eleven has somebody in it (Bronwyn)", () => {
  const seven = Object.keys(ROOMS).find(id => ROOMS[id].seven);
  G.room = seven; run("talk to clerk");
  assert.ok(_FOLK_SEVEN.some(l => text().includes(l)));
});

// ── Eamonn ──
test("Kitten Corner's prose and its roles line agree (Eamonn)", () => {
  assert.match(ROOMS.kitten_corner.desc, /Baimon has the till/); assert.doesNotMatch(ROOMS.kitten_corner.desc, /Kesinee watches it all from the till/);
});

test("an authored girl without a home line answers from the trade's stock, not a stonewall (Eamonn)", () => {
  const g = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && !NPCS[id].filler && ROOMS[_npcRoom(id)] && ROOMS[_npcRoom(id)].barType === "soi6" &&
    !NPCS[id].dialogue.some(d => d.topic && /home|family/.test(d.topic)));
  assert.ok(g, "a Soi 6 girl with no home node");
  G.room = _npcRoom(g); run(`ask ${NPCS[g].name.toLowerCase()} about home`);
  assert.match(text(), /Isan side/); assert.doesNotMatch(text(), /Not my story/);
  out = []; run(`ask ${NPCS[g].name.toLowerCase()} about family`);
  assert.doesNotMatch(text(), /Not my story|wrong girl/);
});

// ── HELP is a first page for the night you're in; the card is one step down (Mario, 2026-09-04) ──
test("HELP on the opening night lists the verbs that get you home and none of the sandbox's", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; G.room = "jomtien_beach";
  run("help");
  assert.match(text(), /sanuk/); assert.match(text(), /TALK TO <person> · ASK/); assert.match(text(), /CALL TAN/);
  assert.doesNotMatch(text(), /BARFINE|SOAPY|CONDOM|HIRE/);
  assert.match(text(), /HELP MORE/);
  assert.ok(text().split("\n").length <= 14, "a page, not a card: " + text().split("\n").length);
});

test("HELP in the sandbox is the week's page; HELP MORE and VERBS are the whole card", () => {
  G.room = "candy_bar"; run("help");
  assert.match(text(), /BARFINE <lady>/); assert.doesNotMatch(text(), /SOAPY|HIRE <host>/);
  out = []; run("help more"); assert.match(text(), /SOAPY/); assert.match(text(), /THE WHOLE CARD/);
  out = []; run("verbs"); assert.match(text(), /SOAPY/);
  const t = G.turns; run("help"); run("verbs"); assert.equal(G.turns, t, "free, like SCORE");
});
