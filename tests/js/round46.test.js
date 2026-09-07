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

// ── Owen, every door (lens: every-door) ───────────────────────────────────

function vac() { G.stage = "vacation"; G.money = 9000; G.nightTurn = 20; }

test("the motel is indoors: the downpour is on the roof, and leaving it speaks from the doorway", () => {
  vac(); assert.ok(_sheltered("short_time_motel"));
  G.room = "short_time_motel"; G.rain = 4; out = []; _describeRoom(true);
  assert.match(text(), /hammers the roof/); assert.doesNotMatch(text(), /awning overhead/);
  out = []; run("out");
  assert.match(text(), /rain is on the roof|doorway is a wall of water/); assert.doesNotMatch(text(), /awning above you/);
});

test("the dolphins are the roundabout you are standing on", () => {
  vac(); G.room = "dolphin"; out = []; run("examine dolphins");
  assert.match(text(), /The pod/); assert.doesNotMatch(text(), /No dolphins here/);
});

test("Mot will discuss the wallet he stole, and the cart he mentioned", () => {
  vac(); _setFlag("hasWallet"); _setFlag("knowOyHasIt"); G.room = "ws_alley"; G.known.mot = true;
  out = []; run("ask mot about wallet"); assert.match(text(), /Madam Oy/); assert.doesNotMatch(text(), /don't know, na/);
  out = []; run("ask mot about cart"); assert.match(text(), /yellow light/);
});

test("TRAVEL stops where the rain catches it, like a typed step would", () => {
  vac(); G.room = "second_rd_c"; G.visited.stinky_bar = true; G.rain = 0; G.lastRain = -99;
  const t0 = _tick; let n = 0;
  try { _tick = () => { t0(); if (++n === 1) G.rain = 5; }; out = []; run("travel stinky pinky"); }
  finally { _tick = t0; }
  assert.notEqual(G.room, "stinky_bar"); assert.match(text(), /Pinned until it passes/);
});

test("the Boardroom's absent owners are one line, and not 'over on Thappraya' to a man on Thappraya", () => {
  vac(); G.room = "the_boardroom";
  let found = false;
  for (let d = 1; d <= 8 && !found; d++) { G.day = d; out = []; _describeRoom(true); if (/is working|is at/.test(text())) found = true; }
  assert.ok(found, "some night an owner is away");
  const lines = out.map(o => o.text).filter(l => /on the till|floor staff keep/.test(l));
  assert.equal(lines.length, 1, "one line for the room"); assert.doesNotMatch(lines[0], /over on Thappraya/);
});

test("dawn inside an office is not 'upright on the soi'", () => {
  vac(); G.room = "eastern_seaboard"; G.nightTurn = 99; out = [];
  _endNight("dawn");
  assert.ok(_ALLNIGHTER_INDOORS.some(l => text().includes(l.slice(0, 40))), "the indoors pool");
  assert.doesNotMatch(text(), /still upright on it|on the pavement/);
});

test("a whole district is a bike ride: pratumnak is a piwin destination", () => {
  assert.equal(MOTOSAI_DESTS.pratumnak.room, "pratumnak_soi5_m");
});

test("the piwin's own menu parses as the answer: 'bali hai' after 'where to?'", () => {
  vac(); G.room = "beach_rd_s"; out = []; run("motosai");
  assert.match(text(), /where to\?/);
  out = []; run("bali hai");
  assert.doesNotMatch(text(), /soi blinks|didn't understand/); assert.equal(G.room, "bali_hai");
});

test("a real building with no room behind it is refused as what it is", () => {
  vac(); G.room = "naklua_rd"; out = []; run("enter temple");
  assert.match(text(), /monks are asleep|correct place/); assert.doesNotMatch(text(), /only know the way/);
  G.room = "dolphin"; out = []; run("enter terminal 21"); assert.match(text(), /mall|doorman|food court/i);
  G.room = "pattaya_klang"; out = []; run("enter gold shop"); assert.match(text(), /gold shop keeps/);
});

test("PRAY on Buddha Hill is the Buddha, not a spirit house by a doorway", () => {
  vac(); G.room = "buddha_hill"; out = []; run("pray");
  assert.match(text(), /wai the big Buddha/); assert.doesNotMatch(text(), /spirit house/);
});

test("the lake after midnight does not light a bar that has shut", () => {
  assert.doesNotMatch(String(ROOMS.lake_mabprachan.lateDesc), /only light on the road is the Sundowner/);
});

test("Soi 9 sells the bowl its prose dares you to try", () => {
  vac(); G.room = "pattaya_soi_9"; const m0 = G.money; out = []; run("buy food");
  assert.ok(G.money < m0, "money moved"); assert.match(text(), /noodle/);
});

test("four massages are four massages", () => {
  vac(); G.money = 5000;
  const room = Object.keys(ROOMS).find(k => /Naklua Traditional/.test(ROOMS[k].name));
  assert.ok(room, "the Thai shop exists");
  G.room = room; out = []; run("massage foot"); const a = text();
  G.room = room; G.nightTurn = 20; out = []; run("massage herbal compress"); const b = text();
  assert.match(a, /sole|feet|calves/); assert.match(b, /compress|lemongrass|herb/); assert.notEqual(a, b);
});

test("the fixtures a walking man reaches for answer EXAMINE", () => {
  vac();
  const cases = [["buddha_hill", "buddha", /Gold leaf/], ["police_station", "sergeant", /unhurried patience/], ["eastern_seaboard", "filing cabinet", /invoices/],
    ["bali_hai", "pier", /Concrete legs/], ["sukhumvit_verge", "ditch", /plank/], ["pratumnak_soi5", "gap", /the whole bay/], ["cheap_charlies_jt", "wok", /rice burns/],
    ["naklua_rd", "bell", /Notty/], ["dolphin", "terminal 21", /departure boards/], ["eastern_seaboard", "computer", /screensaver/]];
  G.lightOn = true; G.battery = 60;
  for (const [room, noun, re] of cases) { G.room = room; out = []; run("examine " + noun); assert.match(text(), re, room + " / " + noun); }
});

test("both faces of the mall keep the same hours", () => {
  assert.ok(ROOMS.central_mall.lateDesc && ROOMS.second_rd_mall.lateDesc);
});

test("Nont knows Boonchu is a morning man, and charges nothing for it", () => {
  vac(); G.stage = "expat"; _setFlag("expatLife"); G.room = _npcRoom("nont"); G.known.nont = true; const m0 = G.money;
  out = []; run("ask nont about boonchu");
  assert.match(text(), /pickup with no tailgate/); assert.equal(G.money, m0);
});

// ── Mario's calls on Owen's geography (2026-09-06) ────────────────────────

test("road travel is reversible: a cardinal step between two street rooms has the opposite cardinal back (or a junction's named connector where that slot is another road)", () => {
  const OPP = { n: "s", s: "n", e: "w", w: "e" };
  const venue = r => !!(r.bar || r.barType || r.shop || r.outlet || r.indoors || r.massage || r.soapy || r.hostBar || r.food || r.hotel);
  // documented exceptions: Tree Town's lanes are a warren, not roads; Jomtien Soi 7's middle and
  // its beach end sit on one south-west line with the soi's west stretch (both 233°), which a
  // four-cardinal grid cannot hold honestly — a bar-mat question for Mario, not a bug
  const skip = id => /^tt_/.test(id) || id === "jomtien_soi_7_m" || id === "jomtien_soi_7_beach_end";
  const bad = [];
  for (const [a, r] of Object.entries(ROOMS)) {
    if (venue(r) || skip(a)) continue;
    for (const [d, b] of Object.entries(r.exits || {})) {
      if (!OPP[d] || !ROOMS[b] || venue(ROOMS[b]) || skip(b)) continue;
      const ex = ROOMS[b].exits || {};
      if (ex[OPP[d]] === a) continue;                                   // honest both ways
      const back = Object.entries(ex).find(([, x]) => x === a);
      if (!back) { bad.push(`${a} -${d}-> ${b}: no way back`); continue; }
      if (ex[OPP[d]] && ex[OPP[d]] !== a) continue;                    // that slot is another road: a junction, named connector allowed
      bad.push(`${a} -${d}-> ${b} -${back[0]}-> back, and ${OPP[d]} is free`);
    }
  }
  assert.deepEqual(bad, []);
});

test("Pattaya Klang runs Beach Road → Second Road → Soi Buakhao → Sukhumvit, and Soi Buakhao terminates into it", () => {
  assert.equal(ROOMS.beach_rd_klang.exits.e, "pattaya_klang");
  assert.equal(ROOMS.pattaya_klang.exits.e, "pk_buakhao");
  assert.equal(ROOMS.pk_buakhao.exits.e, "pk_east");
  assert.equal(ROOMS.pk_buakhao.exits.w, "pattaya_klang");
  assert.equal(ROOMS.pk_buakhao.exits.s, "buakhao_klang");
  assert.equal(ROOMS.buakhao_klang.exits.n, "pk_buakhao");
  assert.equal(ROOMS.buakhao_klang.exits.w, undefined, "the soi ends at the road, it does not cross it");
  assert.equal(ROOMS.pk_east.exits.w, "pk_buakhao");
  assert.ok(ROOM_GEO.pk_buakhao && ROOM_GEO.pk_east);
  assert.ok(_path("beach_rd_klang", "pk_east").length >= 3, "walkable end to end");
});

test("the Areca Lodge's driveway is where its door is: Soi Diana middle, not the Buakhao end", () => {
  assert.match(String(ROOMS.diana_mid.desc), /ARECA LODGE|Areca Lodge/);
  assert.doesNotMatch(String(ROOMS.diana_e.desc), /Areca/);
  assert.equal(ROOMS.diana_mid.exits.hotel, "areca_room");
});

test("Wilf at Mike's Mall: thirty years, a pension the rate has been eating, one thing away, and not going back", () => {
  vac(); G.room = "mikes_mall"; G.nightTurn = 20;
  assert.ok(_npcsHere().includes("wilf"), "he is at the long table");
  out = []; run("talk to wilf"); assert.match(text(), /Fortnight's not finished/);
  out = []; run("ask wilf about pension"); assert.match(text(), /taking/);
  out = []; run("ask wilf about home"); assert.match(text(), /Go back to what/);
  out = []; run("ask wilf about hospital"); assert.match(text(), /one thing away|just the sum/i);
  assert.doesNotMatch(text(), /\bpity\b/i);
  for (let d = 1; d <= 7; d++) { G.day = d; assert.ok(_npcActive("wilf"), "every day of the week — he has nowhere else to be"); }
});

test("Wilf gave up drinking ten years ago (the rate, not the doctor) and has no girlfriend by choice", () => {
  vac(); G.room = "mikes_mall"; G.nightTurn = 20;
  out = []; run("ask wilf about beer"); assert.match(text(), /Gave it up ten year ago/);
  out = []; run("ask wilf about girlfriend"); assert.match(text(), /sick buffalo|mood/); assert.match(text(), /Massage, once/);
  const all = NPCS.wilf.dialogue.map(d => (d.text || "") + (d.short || "")).join(" ");
  assert.doesNotMatch(all, /the Anchor, one beer|Beer's one/, "a man who doesn't drink has no Thursday beer");
});

test("Nont's arithmetic holds: father gone at twelve, on the till at fourteen, twenty-two now", () => {
  const all = NPCS.nont.dialogue.map(d => (d.text || "") + " " + (d.short || "")).join(" ");
  assert.match(NPCS.nont.look, /twenty-two/, "he is 22");
  assert.match(all, /he left when I was twelve|Gone back to wherever\. I was twelve/, "the father's departure is dated");
  assert.match(all, /Fourteen, on the till|I was there, fourteen, on the till/, "and the sale is dated");
  // the order the dating exists to protect: school stops before the earning starts
  const family = NPCS.nont.dialogue.find(d => d.topic === "family").text;
  assert.ok(family.indexOf("twelve") < family.indexOf("started earning"), "he does not work before his father leaves");
  // and the sale is eight years, everywhere it is mentioned
  const corpus = all + Object.values(NPCS.fast_eddy.dialogue).map(d => (d.text || "") + (d.short || "")).join(" ");
  assert.doesNotMatch(corpus, /given me back in five years/, "the sale has one date");
});

test("Glam walks the crossing on somebody's arm, and comes back after an hour (Mario, 2026-09-07)", () => {
  vac(); _setFlag("act1Done");
  // the saleng brings him to the strip and takes him home; the road is done on foot
  assert.match(NPCS.glam.desc, /saleng/);
  assert.match(NPCS.glam.desc, /escorted across/);
  const pools = [..._GLAM_GOES, ..._GLAM_COMES].join(" ");
  assert.doesNotMatch(pools, /wheel|chair|brake|pushed off/i, "there is no wheelchair");
  assert.match(pools, /arm/, "he is escorted");
  // the shuttle is a window: over for the music, back to his own bar after an hour
  assert.equal(NPCS.glam.shuttle.until, NPCS.glam.shuttle.after + 1);
  const at = h => { G.nightTurn = h * 10; return _npcRoom("glam"); };
  assert.equal(at(3), "cheeky_monkey");
  assert.equal(at(4), "hyper", "over the road for the music");
  assert.equal(at(5), "cheeky_monkey", "and back to his regular bar");
  assert.equal(at(9), "cheeky_monkey");
  // _railRoomAt agrees, or the narration reports a move that didn't happen
  for (const h of [3, 4, 5, 9]) { G.nightTurn = h * 10; assert.equal(_railRoomAt("glam", h), _npcRoom("glam"), "hour " + h); }
});

test("Wimon says her own three errands out loud, and the closed door survives (round-46 quest sweep)", () => {
  vac(); _setFlag("act1Done"); G.room = _npcRoom("wimon"); G.nightTurn = 25; G.known.wimon = true;
  const ask = (t) => { G.talked = {}; out = []; run("ask wimon about " + t); return text(); };
  // with nothing live she gives the closed door — that beat is the character
  G.quests.oldrocker = "done"; G.quests.keys = "done"; G.quests.family = "done";
  assert.match(ask("glam"), /that is the entire interview|You want another beer/);
  // …and while each quest is live the errand comes out of her mouth
  G.quests.oldrocker = "active";
  assert.match(ask("glam"), /Don't ask ME|say music/);
  G.quests.keys = "active";
  assert.match(ask("husband"), /His keys|shrine/);
  G.quests.family = "active";
  assert.match(ask("diamond"), /the whole of it|Tell her I said you can/);
  // the three she gives are hers, and none of them is small talk on the chip bar
  for (const q of ["oldrocker", "keys", "family"]) assert.equal(QUESTS[q].giver, "wimon", q);
  const live = NPCS.wimon.dialogue.filter(d => d.when && d.chip === false);
  assert.equal(live.length, 3, "one voiced offer per quest, all chip:false");
});

test("a two-leg errand points HINT at the leg you are on (Opus quest re-run)", () => {
  vac(); _setFlag("act1Done"); G.quests.lake_errand = "active"; G.room = "stinky_bar"; G.itemLoc.tiffin = "inventory";
  const where = () => { out = []; run("quests"); return text(); };
  assert.match(where(), /Nont is at/, "leg one: carry the tiffin to the market");
  _setFlag("tiffinDelivered");
  assert.match(where(), /Duangjai is at/, "leg two: go back and tell her");
  // the pattern safecracker already used — and the soi6 gate must read it through _qAt
  assert.equal(typeof QUESTS.lake_errand.at, "function");
  assert.equal(typeof QUESTS.safecracker.at, "function");
  const src = readFileSync(new URL("../../web/js/engine-systems.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /const targetRoom = ROOMS\[q\.at\]/, "a conditional at: must not be read raw");
});

test("Bert is American: no Guv, no pint, no bloody, no that lot (Mario, 2026-09-07)", () => {
  const t = NPCS.bert.dialogue.map(d => (d.text || "") + " " + (d.short || "")).join(" ") + NPCS.bert.desc;
  for (const re of [/\bGuv\b/, /\bthe float\b/, /\ba pint\b/, /\bbloody\b/, /\bthat lot\b/, /\bmate\b/, /knocks a bit off/, /comes round/])
    assert.doesNotMatch(t, re, `British tell in an American's mouth: ${re}`);
  assert.match(t, /Walmart|bud\b|favor|humor/, "…and the American register is still there");
});

test("Wimon counts the same three beer bars twice", () => {
  const greet = NPCS.wimon.dialogue.find(d => !d.topic && d.th).text;
  const samson = NPCS.wimon.dialogue.find(d => d.topic === "samson").text;
  assert.match(greet, /Three bar I look after/);
  assert.match(samson, /this bar and the two others I run/, "not 'this bar, and that one' — that was two");
});

test("WAIT UNTIL reaches the whole night, and a refusal costs nothing (Kenji, round 47)", () => {
  vac(); _setFlag("act1Done"); G.room = "beach_rd_c";
  // the night moved to 06:00 and this was capped at the old 04:00 — the one command a man
  // staying up for the sunrise types was refused with a clock that had stopped two hours back
  G.nightTurn = 100; out = []; run("wait until 5");
  assert.equal(G.nightTurn, 110, "05:00 is reachable");
  assert.doesNotMatch(text(), /18:00 to 04:00/);
  // …and the message states the clock the game actually keeps
  G.nightTurn = 100; out = []; run("wait until 3");
  assert.match(text(), /18:00 to 06:00|already/, "the span is derived, not typed");
  // a refusal must not spend the turn it refused to spend
  G.nightTurn = 100; out = []; run("wait until 4");
  assert.equal(G.nightTurn, 100, "refusing to wait is free");
  // "until 9" still means 21:00; 5 and 6 are real night hours now and read as themselves
  G.nightTurn = 20; run("wait until 9"); assert.equal(G.nightTurn, 30);
  const src = readFileSync(new URL("../../web/js/engine-parser.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /The night runs 18:00 to 04:00/, "no hard-coded span");
});

test("the round on the house books the spend AND the return, never the net (Des, round 47)", () => {
  vac(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen");
  G.bar.room = "stinky_bar"; G.bar.cash = 5000; G.room = "stinky_bar";
  const saved = _rand;
  try {
    _rand = () => 0.1;                       // it lands
    G.pendingChoice = "shift"; G.shiftCall = "round"; out = []; _shiftYes();
    assert.ok(G.bar.eventNotes.some(n => /round on the house −/.test(n)), "the spend is named and negative");
    assert.ok(G.bar.eventNotes.some(n => /\+/.test(n)), "and the return is its own line");
    assert.equal(G.bar.eventOut, SHIFT_ROUND_COST, "the cost happened either way");
  } finally { _rand = saved; }
});

test("the next-door hand-off is one sentence, not a doubled name and two full stops", () => {
  vac(); G.stage = "expat"; _setFlag("expatLife");
  const w = _questWhere("tan");
  assert.match(w, /Tan is at/, "questWhere already names him and ends the sentence");
  assert.match(w, /\.$/);
  const src = readFileSync(new URL("../../web/js/engine-systems.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /has it\$\{_questWhere\(giver\) \|\| ""\}\./, "…so do not prefix the name and add another stop");
});
