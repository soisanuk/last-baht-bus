// Round 47 (2026-09-07) — Stuart, the returning save loader (lens: old-save loader).
// The morning ledger is a single frame, and it carries the night's worst news: black
// out, wake rough with your pockets emptied, close the app, come back — and the money
// is gone with the game saying nothing about it. LAST NIGHT reprints it, and because
// the text rides the save it survives exactly the gap that lost it.
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

// Sleep through to a morning that actually HAS a ledger: the baseline for a
// morning is taken at the previous wake, so the first night of a fresh game has
// nothing to compare against and correctly says nothing.
function sleepToLedger() {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.room = _hotelRoomId(); run("sleep", "sleep");
}

test("LAST NIGHT reprints the morning ledger, word for word", () => {
  sleepToLedger();
  assert.ok(Array.isArray(G.lastNightSaid) && G.lastNightSaid.length,
    "the wake stored what it said");
  const said = G.lastNightSaid.slice();
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "LAST NIGHT says exactly what the morning said, not a paraphrase");
  out = []; run("ledger");
  assert.deepEqual(out.map(o => o.text), said, "LEDGER is the same verb");
});

test("the ledger survives the app being closed — which is the whole finding", () => {
  sleepToLedger();
  const said = G.lastNightSaid.slice();
  // Stuart's actual sequence: rough wake, lock the phone, come back to a save.
  const blob = serializeGame();
  newGame(); deserializeGame(blob);
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "a reloaded save can still be asked what happened last night");
});

test("the rough wake's missing money is in what LAST NIGHT reprints", () => {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.money = 4000; G.room = "beach_rd_c";
  _endNight("blackout");
  assert.ok(G.roughLost > 0, "the rough wake actually lifted something");
  out = []; run("last night");
  assert.match(text(), new RegExp(_num(G.roughLost) + "(?: of it)? lifted"),
    "the figure a returning player came back looking for");
});

test("LAST NIGHT costs no turn and has a truthful answer before you have slept", () => {
  const t0 = G.turns, n0 = G.nightTurn;
  run("last night");
  assert.equal(G.turns, t0, "a readout of what already happened is free");
  assert.equal(G.nightTurn, n0);
  assert.match(text(), /not slept on it yet/);
});

test("LAST NIGHT is reachable by thumb as well as by keyboard", () => {
  assert.ok(engineComplete("last").includes("last night"), "autocomplete offers it");
  assert.ok(engineComplete("__info ").includes("last night"), "the INFO chip carries it");
  assert.match(_HELP, /LAST NIGHT/, "HELP lists it");
  assert.match(_HELP_SOI6, /LAST NIGHT/, "and the challenge card does too");
});

// ── TOPICS: the two ways the list lied ──────────────────────────────────────

test("every label TOPICS can print is a phrase the parser takes", () => {
  // The pinning test in round 44 asked the topic KEY. TOPICS prints
  // _topicLabel(key), and a player types back what they just read — so the one
  // label in the table that differs from its key ("sponsor" → "the kept girls")
  // was unaskable on five characters while the test stayed green. Derived from
  // the cast rather than a list, so a new label cannot ship without its alias.
  const strip = t => String(t).toLowerCase().replace(/^(the|a|an)\s+/, "").trim();
  const bad = [];
  let checked = 0;
  for (const id of Object.keys(NPCS)) {
    const npc = NPCS[id]; if (!npc.dialogue) continue;
    const room = _npcRoom(id); if (!room || !ROOMS[room]) continue;
    G.room = room; G.known[id] = true;
    for (const t of _convoTopics(id, { all: true })) {
      const label = strip(_topicLabel(t));
      checked++;
      let d = _pickDialogue(id, label);
      if (!(d && d.topic)) { const alt = _convoTopic(label); if (alt) d = _pickDialogue(id, alt); }
      if (!(d && d.topic)) bad.push(`${id} prints "${_topicLabel(t).toLowerCase()}" for key "${t}"`);
    }
  }
  assert.ok(checked > 500, `the audit reached the cast (${checked} labels)`);
  assert.deepEqual(bad, [], "TOPICS printed a phrase the parser will not take");
});

test("TOPICS answers for a woman the chip bar has nothing to show", () => {
  // Maureen ran TOPICS PIM twice, bought two lady drinks in between, and was told
  // both times that Pim had nothing open — in the minutes Pim was answering a
  // borrowed-name subplot, a quest turn-in and the safe clue. All three of her
  // subjects were suppressed by CHIP ETIQUETTE (quest-driven nodes, and a topic
  // that is another character's name), none by a gate.
  G.room = _npcRoom("pim"); G.known.pim = true;
  assert.deepEqual(_convoTopics("pim"), [], "the chip bar still shows her none — that part is by design");
  const open = _convoTopics("pim", { all: true });
  assert.ok(open.length >= 2, `TOPICS finds her subjects (${JSON.stringify(open)})`);
  out = []; run("topics pim");
  assert.doesNotMatch(text(), /nothing open|isn't giving you much/,
    "a woman with authored answers is never reported as having none");
  for (const t of open) {
    G.talked = {}; out = []; run(`ask pim about ${t}`);
    assert.match(text(), new RegExp("asked Pim about", "i"), `she takes "${t}"`);
  }
});

test("a person's name still waits on the transcript having printed it", () => {
  // The etiquette that DOES survive into TOPICS: person-name topics stay off the
  // list until you have met them, so the verb can't spoil a name.
  G.room = _npcRoom("pim"); G.known = { pim: true };
  assert.ok(!_convoTopics("pim", { all: true }).includes("oy"), "Oy is not named to a stranger");
  G.known.oy = true;
  assert.ok(_convoTopics("pim", { all: true }).includes("oy"), "once you know her, Pim will discuss her");
});

test("the pager still counts what a thumb can reach, not what TOPICS printed", () => {
  G.room = "stinky_bar"; G.known.bert = true;
  run("talk to bert");
  const chips = _convoTopics("bert");
  out = []; run("topics");
  assert.ok(chips.length > 4, "Bert is deep enough to page");
  const m = /more \((\d+)\/(\d+)\)/.exec(_chipSet().map(c => c.label).join(" "));
  assert.ok(m, "the chip bar offers a pager");
  assert.equal(Number(m[2]), Math.ceil(chips.length / 4),
    "the page count is the chip bar's, since that is what tapping turns");
});

// ── The women on the money get their own lives ──────────────────────────────

test("no two till-keepers in different districts recite the same life", () => {
  // Maureen talked to every cashier in fifteen bars and got about three distinct
  // sentences: Gam on Buakhao, Ging two doors down and Keng across the highway
  // gave the SAME family answer word for word, down to "My boyfriend prefers it
  // too." Round 46 gave the hostesses deep pools; the women on the money were
  // still drawing a whole inner life from a pool of two.
  const by = role => Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === role);
  for (const [role, floor] of [["cashier", 6], ["mamasan", 6]]) {
    const ids = by(role);
    assert.ok(ids.length > 20, `${role}s exist in numbers (${ids.length})`);
    for (const topic of ["family", "plan", "girls", "money"]) {
      const said = new Set();
      for (const id of ids) {
        const d = (NPCS[id].dialogue || []).find(x => x.topic && _topicHits(x.topic, topic));
        if (d) said.add(d.text);
      }
      if (!said.size) continue;
      assert.ok(said.size >= floor,
        `${role}s draw "${topic}" from ${said.size} lines across ${ids.length} women — ` +
        `a pool this shallow reads as one woman in twenty-five aprons`);
    }
    const greets = new Set(ids.map(id => NPCS[id].dialogue[0].text));
    assert.ok(greets.size >= floor, `${role} greetings: ${greets.size}`);
  }
});

test("a mamasan's look line and her family answer are about the same woman", () => {
  // Two claims, two salts: left alone the generator eventually stands a woman
  // whose desc says she buried a husband beside an answer about the husband she
  // has had for twenty-one years. The co-location defect, built in at the factory.
  for (const id of Object.keys(NPCS)) {
    if (!NPCS[id].filler || NPC_ROLES[id] !== "mamasan") continue;
    const story = _hh(id, 7) % _M_STORY.length;
    const fam = _mamaFamilyIdx(id);
    assert.ok(!(_M_FAM_CLASH[story] || []).includes(fam),
      `${NPCS[id].name}: "${_M_STORY[story]}" does not sit with "${_M_FAMILY[fam].slice(0, 50)}…"`);
  }
});

test("nobody sends you to Candy while Candy is standing there", () => {
  // Gam told Maureen to "ask Candy on Buakhao" with Candy six feet away in the
  // same room, on Buakhao. Bua, in the same bar, got it right.
  G.flags = {}; G.stage = "act1";
  const room = _npcWhere("candy");
  assert.ok(room, "Candy is out tonight");
  G.room = room;
  const staff = _npcsHere().filter(i => NPCS[i].filler && /cashier|mamasan/.test(NPC_ROLES[i] || ""));
  assert.ok(staff.length, `somebody keeps the till at ${_barName(room)}`);
  for (const id of staff) {
    G.talked = {}; out = []; run(`ask ${id} about wallet`);
    assert.doesNotMatch(text(), /on Buakhao|Buakhao side|Candy Bar, Soi Buakhao/,
      `${NPCS[id].name} does not send you across town to a woman in the room`);
    assert.match(text(), /Candy/, "…but still names her, because she is the answer");
  }
});

// ── The stragglers ──────────────────────────────────────────────────────────

test("a roof is a roof: the downpour never sends you out for an awning you're under", () => {
  // Maureen got "You make the nearest awning already soaked" in room 412 of her
  // own hotel, and again mid-massage. _sheltered was the wrong test — it means
  // "you can dive in HERE", which is true of a street with a 7-Eleven on it.
  const roofed = Object.keys(ROOMS).filter(r => _underRoof(r));
  assert.ok(roofed.length > 100, `most venues are interiors (${roofed.length})`);
  for (const r of ["hotel_room", "qv_room", "naklua_thai", "central_mall", "peacock_cabaret", "emperor_soapy"]) {
    G.room = r; G.rain = 0; G.lastRain = 0; out = []; _startRain(4);
    assert.doesNotMatch(text(), /nearest awning|make the 7-Eleven awning/,
      `${_barName(r) || ROOMS[r].name}: you are already under a roof`);
  }
  // …and a street is still a street however many doorways it has
  for (const r of ["soi6_street", "beach_rd_c", "jomtien_beach"]) {
    assert.ok(!_underRoof(r), `${r} is outdoors`);
  }
});

test("nobody presses their own money on a man with thousands in his pocket", () => {
  // The drunk bargirl gave Maureen ฿20 and a skewer on night 6 with ฿5,810 in
  // pocket and สนุก 90, telling her she always has a bad night. The check
  // existed and sat at ฿50,000.
  G.room = "soi6_street"; G.money = 5810; const before = G.money;
  out = []; _ENC.bargirl("");
  assert.equal(G.money, before, "she keeps her twenty");
  assert.doesNotMatch(text(), /always have bad night/);
  G.money = 120; out = []; _ENC.bargirl("");
  assert.equal(G.money, 140, "…and a man who actually needs it still gets it");
});

test("Auntie Nok only says 'enough for bus now' to somebody who hadn't got it", () => {
  G.room = "jomtien_soi_7_beach_end"; G.money = 4955;
  _setFlag("act1Done");
  G.itemLoc.bottle1 = "inventory";
  out = []; _doSellBottles ? _doSellBottles() : run("sell bottles");
  assert.doesNotMatch(text(), /Enough for bus now/, "she is not shooing a rich woman toward a songthaew");
});

test("Mot's boots are a number the player can do something about", () => {
  // Mot works a pitch-dark alley, so every command here rolls the soi-dog streak
  // and a bite relocates you mid-assert. Stub the dice and stand still.
  const saved = _rand; _rand = () => 0.99;
  try { motBoots(); } finally { _rand = saved; }
});
function motBoots() {
  const at = () => { G.room = "ws_alley"; };
  at(); G.money = 3000;
  out = []; run("tip mot 200");
  assert.match(text(), /I do nothing for you yet/, "before dinner the subject does not exist");
  assert.equal(G.money, 3000, "and nothing moved");
  _setFlag("motFed"); at();
  out = []; run("ask mot about boots");
  assert.match(text(), /studs one|640/i, "he will discuss them once he has raised them");
  at(); out = []; run("tip mot 200");
  assert.equal(G.money, 2800);
  assert.ok(!_flag("motBooted"), "part-paid is part-paid");
  const h0 = G.happy, m0 = G.money;
  at(); out = []; run("give 400 to mot");
  assert.equal(G.motBoots, MOT_BOOTS - MOT_BOOTS_SAVED, "the gap is closed exactly");
  assert.ok(m0 - G.money <= 260 + 40, "he takes the gap and hands the rest back");
  // …and he counts it ONCE. The first cut printed a "too much, he hands the rest
  // back" line and then fell through to the completion pool, so Mot took the
  // money twice in one beat (ultrareview, 2026-09-11). This test passed then,
  // because it asserted the flag and the money and never the prose.
  const takes = _MOT_BOOTS_TAKE.filter(t => text().includes(t.slice(0, 40))).length;
  assert.equal(takes, 1, "one completion beat");
  assert.match(text(), /hands the rest straight back/, "the overshoot is acknowledged");
  assert.doesNotMatch(text(), /Too much, phi/, "…on the money line, not as a second counting");
  assert.ok(_flag("motBooted"));
  assert.ok(G.happy > h0, "a kindness pays, and it is not a conquest");
  at(); out = []; run("tip mot 500");
  assert.match(text(), /What I do with four/, "he will not take a second pair");
  at(); out = []; run("ask mot about boots");
  assert.match(text(), /rubbish in the shoes/i, "and the payoff is his, not yours");
}

test("the women at a lock-in bar can discuss the bolt", () => {
  const bars = Object.keys(ROOMS).filter(r => ROOMS[r].lockIn);
  assert.ok(bars.length, "lock-in bars exist");
  for (const room of bars) {
    G.room = room;
    const staff = _npcsHere().filter(id => NPC_ROLES[id]);
    assert.ok(staff.length, `${_barName(room)} is staffed`);
    for (const id of staff) {
      G.known[id] = true;
      assert.ok(_convoTopics(id, { all: true }).includes("lockin"),
        `${NPCS[id].name} will discuss the door at ${_barName(room)}`);
      G.talked = {}; run(`talk to ${id}`);
      out = []; run(`ask ${id} about the door`);
      assert.doesNotMatch(text(), /don't know|wrong girl|Not my story/i,
        `${NPCS[id].name} answers about the bolt that is her bar's whole premise`);
    }
  }
});

test("Ploy answers for the things two other people send you to her for", () => {
  G.room = "rainbow_girls"; G.known.ploy = true;
  run("talk to ploy");
  const open = _convoTopics("ploy", { all: true });
  assert.ok(open.length >= 5, `the cashier who sees everything has something to say (${JSON.stringify(open)})`);
  for (const t of ["money", "security", "girls", "office"]) {
    assert.ok(open.includes(t), `she discusses ${t}`);
    G.talked = {}; out = []; run(`ask ploy about ${t}`);
    assert.doesNotMatch(text(), /Cage is for money and me|don't know/i, `…and answers on ${t}`);
  }
});

test("a bar with nobody in it still has somebody pouring", () => {
  const staffless = Object.keys(ROOMS).filter(r => {
    if (!ROOMS[r].barType) return false;
    G.room = r;
    return !_npcsHere().some(id => NPC_ROLES[id] || NPCS[id].manager);
  });
  assert.ok(staffless.length, "the case exists (the Offside, Take Care Me)");
  for (const r of staffless) {
    G.room = r;
    for (const who of ["barman", "staff", "hostess"]) {
      out = []; run(`talk to ${who}`);
      assert.doesNotMatch(text(), /No one here answers to that|Nobody by that name here/,
        `${_barName(r)}: it sells beer, so somebody is behind the taps`);
    }
  }
});

// ── A MODAL REDRAW MUST CARRY WHAT ITS LIVE PROMPT SAID ─────────────────────
// Lock your phone mid-negotiation and come back: main.js redraws whatever modal
// is gating input, and the redraw is a DIFFERENT code path from the prose that
// armed it. Stuart (round 47) came back to three prices with no woman attached
// to them, because _bfPrompt re-derives the money and the options and the girl
// was named by the caller.
//
// The instrument matters as much as the fix. The first pass compared the live
// output to the redraw LINE BY LINE and reported five modals broken — all five
// false, because a redraw legitimately says the same thing in fewer lines (the
// checkout list is three bullets live and one priced line on resume). What a
// returning player actually needs off the screen is the MONEY, the COMMANDS and
// the NAMES, so that is what this measures. Derived from the engine — every
// ฿ figure, every CAPS command inside parens, every cast name — rather than a
// hand-written list per modal, so a new modal is covered by adding it below.
test("every modal redraw carries the money, the commands and the names its live prompt did", () => {
  const money = t => [...t.matchAll(/฿\s?[\d,]+/g)].map(m => m[0].replace(/\s/g, ""));
  const cmds = t => [...t.matchAll(/\(([^)]*)\)/g)]
    .flatMap(m => [...m[1].matchAll(/\b[A-Z][A-Z ]{2,}\b/g)].map(x => x[0].trim()));
  const names = t => Object.values(NPCS).map(n => n.name)
    .filter(n => /^[A-Z]/.test(n) && new RegExp("\\b" + n + "\\b").test(t));

  const armed = [];
  const check = (label, arm) => {
    out = []; newGame();
    G.player = { origin: "monger", personality: "joker", orientation: "straight" };
    _setFlag("act1Done"); G.stage = "vacation"; G.money = 20000;
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
    G.peddlerNight = 2; G.soc.drinkCount = G.soc.drinkCount || {}; G.soc.selfDrinks = G.soc.selfDrinks || {};
    arm();
    const gate = G.pendingChoice || G.pendingBf || G.pendingEnc || G.pendingFare || G.pendingSoapy || G.game;
    if (!gate) return;                       // this state didn't arm here; another test's problem
    armed.push(label);
    const live = text();
    out = []; _renderResume();
    const re = text();
    for (const [what, got] of [["money", money(live)], ["command", cmds(live)], ["name", names(live)]])
      for (const x of new Set(got))
        assert.ok(re.includes(x), `${label}: the redraw drops the ${what} "${x}" — ` +
          `a player who came back to this screen cannot act on it`);
  };

  check("barfine", () => {
    G.room = "candy_bar"; G.nightTurn = 70;
    for (const g of _npcsHere().filter(i => NPC_ROLES[i] === "hostess")) {
      G.soc.drinks[g] = 8; G.soc.drinkCount[g] = 3; G.soc.selfDrinks[G.room] = 3;
      run(`barfine ${g}`); if (G.pendingBf) return;
    }
  });
  check("fare", () => { G.room = "beach_rd_c"; run("ride bus to naklua"); });
  check("soapy", () => { G.room = "emperor_soapy"; run("soapy"); });
  check("checkout", () => { G.room = _hotelRoomId(); G.nightTurn = 2; run("checkout"); });
  check("vacation_end", () => { G.day = 8; _endVacation(); });
  check("shift", () => {
    G.stage = "expat"; _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.paid = true;
    G.room = "stinky_bar"; if (typeof _shiftAsk === "function") _shiftAsk();
  });
  assert.ok(armed.length >= 5, `the audit actually armed things (${armed.join(", ")})`);
});

// ── Colm, the topics-first player: the list is a menu, so what is ON it matters ──

test("TOPICS never offers a node the author marked chip:false", () => {
  // Round 47 opened chip:false into TOPICS and put four characters' bare word
  // "offer" on the menu — and, the severe one, Tan's `debt`, which SETS
  // debtSettled and owesTan. Colm read the list top to bottom and spent the one
  // favour Tan gives without knowing he had called it in. The flag means what it
  // says; a node that is a SUBJECT rather than a MOVE opts in with chip:"topics".
  const bad = [];
  for (const id of Object.keys(NPCS)) {
    const n = NPCS[id]; if (!n.dialogue) continue;
    const room = _npcRoom(id); if (!room || !ROOMS[room]) continue;
    G.room = room; G.known[id] = true;
    // The invariant is about where an offered topic LANDS: two nodes can share a
    // topic (Wimon's husband, Nont's job) with one of them chip:false, and the
    // ungated one is the answer. What must never happen is TOPICS offering a
    // word that resolves to the node the author hid.
    for (const t of _convoTopics(id, { all: true })) {
      const d = _pickDialogue(id, t);
      if (d && d.chip === false) bad.push(`${n.name}: TOPICS offers "${t}" and it lands on a chip:false node`);
    }
  }
  assert.deepEqual(bad, []);
  // and the one that cost him the favour, by name
  G.room = _npcRoom("tan"); G.known.tan = true;
  assert.ok(!_convoTopics("tan", { all: true }).includes("debt"),
    "Tan's one favour is not a menu item");
});

test("chip:\"topics\" is listed by the verb and never suggested by the bar", () => {
  const optedIn = [];
  for (const id of Object.keys(NPCS))
    for (const d of NPCS[id].dialogue || []) if (d.chip === "topics") optedIn.push([id, String(d.topic).split("|")[0]]);
  assert.ok(optedIn.length >= 4, `some nodes take the third value (${optedIn.length})`);
  for (const [id, t] of optedIn) {
    const room = _npcRoom(id); if (!room || !ROOMS[room]) continue;
    G.room = room; G.known[id] = true;
    const gated = _convoTopics(id, { all: true }).includes(t) === false && _convoTopics(id).includes(t) === false;
    if (gated) continue;                                  // its own req/when is shut right now
    assert.ok(_convoTopics(id, { all: true }).includes(t), `${id}: TOPICS lists "${t}"`);
    assert.ok(!_convoTopics(id).includes(t), `${id}: the chip bar does not suggest "${t}"`);
  }
  // Pim is the case that started it: nothing on the bar, two subjects on the verb
  G.room = _npcRoom("pim"); G.known.pim = true;
  assert.deepEqual(_convoTopics("pim"), []);
  assert.ok(_convoTopics("pim", { all: true }).length >= 2);
});

test("a topic that is somebody's own name reads as herself, and answers to it", () => {
  // Five Queen Vic regulars each offered their own name back as a topic — the
  // schema showing through. "Ask her about herself" is a real move; it just has
  // to be printed and typed like one.
  G.room = "queen_vic"; G.known.angela = true;
  out = []; run("topics angela");
  assert.match(text(), /herself/);
  assert.doesNotMatch(text(), /\bangela · |· angela\b/i, "not her own name as a list item");
  run("talk to angela");
  G.talked = {}; out = []; run("ask angela about herself");
  assert.doesNotMatch(text(), /don't know about that|wrong girl|Not my story/i);
});

test("a real venue is never refused as genre furniture", () => {
  // ENTER MIKE'S MALL up in Naklua answered "the mall is real and it is not what
  // you came out for" — about a mall two districts away that has Wilf in it.
  G.room = "naklua_rd"; _setFlag("act1Done");
  out = []; run("enter mikes mall");
  assert.doesNotMatch(text(), /not what you came out for/,
    "a place the game HAS is a navigation answer, not a refusal");
  // …and the buildings that really have no room behind them still get theirs
  out = []; run("enter immigration");
  assert.match(text(), /photocopies|daylight|queue/i);
});

test("one woman is not 'the girls'", () => {
  // "The girls have the far half of the bar to themselves" printed at Cloze,
  // which is Waen and nobody else.
  G.room = "cloze";
  assert.equal(_npcsHere().filter(i => NPC_ROLES[i]).length, 1, "premise: Cloze is one woman");
  const staffedLine = _BAR_THIN_STAFFED.some(t => t.includes("girls") || t.includes("mama"));
  assert.ok(staffedLine, "premise: the staffed pool talks about a floor");
  out = []; _describeRoom(true);
  for (const t of _BAR_THIN_STAFFED)
    assert.ok(!text().includes(t.slice(0, 40)), "a one-woman bar gets the plain thin line");
});
