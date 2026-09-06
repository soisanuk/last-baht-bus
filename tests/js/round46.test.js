// Round 46 (2026-09-06) — Gareth, the girls' stories (lens: filler-girls).
// One life story per rail; an authored girl's fallback hometown agrees with her
// own text; a dropped question still answers a late digit with the drift line.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

function storyOf(id) {
  const n = NPCS[id];
  if (n.filler) return n.storyIdx;
  const has = t => n.dialogue.some(e => e.topic && new RegExp("\\b" + t + "\\b").test(String(e.topic)));
  const st = _authoredStory(id);
  return { family: has("family") ? null : st.familyIdx, plan: has("plan") ? null : st.planIdx };
}

test("one life story per rail: no two girls at one bar share a family line or a plan line", () => {
  const byRoom = {};
  for (const id of Object.keys(NPCS)) {
    if (NPC_ROLES[id] !== "hostess") continue;
    const room = NPCS[id].room || (NPCS[id].bars || [])[0];
    (byRoom[room] = byRoom[room] || []).push(id);
  }
  let bars = 0;
  for (const [room, ids] of Object.entries(byRoom)) {
    if (ids.length < 2) continue; bars++;
    for (const axis of ["family", "plan"]) {
      const seen = new Map();
      for (const id of ids) {
        const i = storyOf(id)[axis]; if (i == null) continue;
        assert.ok(!seen.has(i), `${_barName(room)}: ${id} and ${seen.get(i)} both tell ${axis} #${i} — "${(axis === "family" ? _H_FAMILY : _H_PLAN)[i]}"`);
        seen.set(i, id);
      }
    }
  }
  assert.ok(bars > 30, "checked the whole town");
  assert.ok(_H_FAMILY.length >= 20 && _H_PLAN.length >= 20, "the pools are deep enough to keep the promise");
});

test("an authored girl's fallback hometown is the province her own text names (Kai: Buriram, not Chaiyaphum)", () => {
  const provs = _H_FROM.map(p => p.replace(/[{}]/g, ""));
  let checked = 0;
  for (const id of Object.keys(NPCS)) {
    if (NPC_ROLES[id] !== "hostess" || NPCS[id].filler) continue;
    const own = NPCS[id].dialogue.map(e => e.text || "").join(" ");
    const named = provs.find(p => own.includes(p)); if (!named) continue;
    checked++;
    assert.equal(_authoredStory(id).from.replace(/[{}]/g, ""), named, id);
  }
  assert.ok(checked >= 4);
  // and the miss path speaks it
  G.room = "golden_dragon"; G.nightTurn = 20; G.known.kai = true;
  out = []; run("talk to kai", "ask kai about home");
  assert.match(text(), /Buriram/); assert.doesNotMatch(text(), /Chaiyaphum/);
});

test("a question dropped by a change of subject or a vanished partner still answers a late digit with the drift line", () => {
  G.room = "candy_bar"; G.nightTurn = 10;
  run("talk to bua"); assert.ok(G.convoQ, "she asked");
  run("do you like pattaya");         // a question back at her drops hers
  assert.equal(G.convoQ, null);
  out = []; run("1");
  assert.match(text(), /drifted past/); assert.doesNotMatch(text(), /didn't understand/);
  // partner gone
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done"); G.stage = "vacation";
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
  G.room = "candy_bar"; G.nightTurn = 10; run("talk to bua"); assert.ok(G.convoQ);
  G.room = "buakhao_s"; _convoActive();
  out = []; run("1");
  assert.match(text(), /drifted past/); assert.doesNotMatch(text(), /didn't understand/);
});

// ── Dougie, loud after the heist (lens: lay-low-loud) ─────────────────────

test("Eddy's 'drink here a while' is kept: a man drink and a night on his stool each move his trust", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.room = "white_rabbit"; G.nightTurn = 20; G.known.fast_eddy = true;
  const t0 = _npcState("fast_eddy").trust || 0;
  run("buy man drink"); run("buy man drink");
  assert.equal(_npcState("fast_eddy").trust, Math.min(3, t0 + 1), "the first of the night, once");
  G.soc.barTurns = { white_rabbit: 40 }; G.room = "hotel_room"; out = [];
  _endNight("sleep");
  assert.equal(_npcState("fast_eddy").trust, Math.min(3, t0 + 2), "three hours on his stool");
  assert.match(text(), /Fast Eddy will know it too/);
});

test("TOPICS names the word the parser answers to: ASK EDDY, not ASK FAST", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.room = "white_rabbit"; G.nightTurn = 20; G.known.fast_eddy = true;
  out = []; run("topics eddy");
  assert.match(text(), /ASK EDDY ABOUT/); assert.doesNotMatch(text(), /ASK FAST\b/);
});

test("the downpour reads the room: a street with a 7-Eleven is not behind glass, a windowless office hears it on the roof", () => {
  G.room = "soi6_street"; out = []; _startRain(5);
  assert.doesNotMatch(text(), /outside the glass/); assert.match(text(), /awning|street/i);
  G.rain = 0; G.lastRain = 0; G.room = "kitten_office"; out = []; _startRain(5);
  assert.match(text(), /on the roof/); assert.doesNotMatch(text(), /outside the glass/);
});

test("the office safe and the corridor answer EXAMINE, and the corridor changes once you know what's behind it", () => {
  G.stage = "expat"; G.room = "kitten_office"; out = []; run("examine safe");
  assert.match(text(), /wall safe|cash bags/); assert.doesNotMatch(text(), /Not here/);
  G.room = "kitten_corner"; out = []; run("examine corridor");
  assert.match(text(), /toilets are the other way/);
  _setFlag("rabbitPath"); _setFlag("rabbitData"); out = []; run("examine corridor");
  assert.match(text(), /You know exactly what is behind it/);
});

test("the manager's man-drink nudge holds while a modal is up", () => {
  G.stage = "expat"; G.room = "white_rabbit"; G.soc.mgrChat = { fast_eddy: 2 }; G.pendingChoice = "rabbitjob";
  out = []; _managerChatTick("fast_eddy");
  assert.doesNotMatch(text(), /Stand us one|BUY MAN DRINK/);
  G.pendingChoice = null; G.soc.mgrChat.fast_eddy = 2; out = []; _managerChatTick("fast_eddy");
  assert.match(text(), /BUY MAN DRINK|thirsty/);
});

test("past the landing a loud act says once that it no longer counts; the landing never claims the Rabbit is shut", () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("ccibVisited"); G.ccibLowUntil = G.day + 21; G.ccibLoud = 3;
  G.room = "stinky_bar"; out = [];
  _ccibLoud("corridor");
  assert.ok(_flag("ccibLanded")); assert.doesNotMatch(text(), /shutter is down/); assert.match(text(), /Eddy is not behind his own rail/);
  G.day++; out = []; _ccibLoud("office");
  assert.match(text(), /no longer counts/);
  G.day++; out = []; _ccibLoud("office");
  assert.doesNotMatch(text(), /no longer counts/, "said once");
  assert.equal(G.ccibLoud, 4, "nothing past the ceiling counts — the fourth was the landing");
});
