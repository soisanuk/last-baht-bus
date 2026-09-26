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
    G.rng = 12345;   // newGame reseeds from Math.random; a barfine's honest/scam roll must not flake this (it did, twice)
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


test("it rains once a night, and never twice (Mario, 2026-09-14)", () => {
  // Colm: thirteen downpours in five nights, each a three-to-six-turn pin — a quiz,
  // a bed and a mall lost to weather. The cooldown alone allowed three or four a
  // night; the downpour now checks the day before it rolls the dice.
  const savedR = _rand, savedS = _wxStormy;
  try {
    _rand = () => 0; _wxStormy = () => true;
    G.room = "beach_rd_c"; G.nightTurn = 20; G.turns = 200; G.lastRain = -99; G.rain = 0;
    _tick();
    assert.ok(G.rain > 0, "a stormy sky with the dice at zero starts a downpour");
    assert.equal(G.rainDay, G.day, "and the night is marked");
    G.rain = 0; G.turns += 40; G.lastRain = -99;     // cooldown long gone, sky still stormy
    _tick();
    assert.equal(G.rain, 0, "the second one does not start — one a night");
    G.day++; G.turns += 40;
    _tick();
    assert.ok(G.rain > 0, "a new night can rain again");
  } finally { _rand = savedR; _wxStormy = savedS; }
});


// ── The assertion auditor (2026-09-14): "is this sentence true" ─────────────

test("the morning ledger names the account on a night the machine was used", () => {
  G.vacation = 1;
  G.lastNight = { vacation: 1, happy: G.happy, money: 2390, atm: 0, atmFees: 0, known: 0, talked: 0, nums: 0, faces: 0 };
  G.money = 3990; G.atmTotal = 2000; G.atmFees = 300; G.day = 6;
  out = []; _morningLedger();
  assert.match(text(), /down ฿700 on the night/, "the arithmetic was always right");
  assert.match(text(), /across pocket and account/, "…and now it says what it counts");
  assert.match(text(), /฿2,000 came out of the machine/);
  assert.match(text(), /฿300 of that in fees/);
  G.lastNight = { vacation: 1, happy: G.happy, money: 3990, atm: 2000, atmFees: 300, known: 0, talked: 0, nums: 0, faces: 0 };
  G.money = 3590; G.day = 7;
  out = []; _morningLedger();
  assert.match(text(), /down ฿400 on the night$/m, "a night with no draw keeps the short line");
  assert.doesNotMatch(text(), /across pocket/);
});

test("a man holding ฿25 is short, not empty-handed", () => {
  G.flags.act1Done = false; G.stage = "act1"; G.money = 25;
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region !== "Darkside");
  out = []; run("motosai to tree town");
  assert.match(text(), /the ฿25 in your hand/, "he sees what is actually there");
  assert.doesNotMatch(text(), /empty hands/);
  G.money = 0; out = []; run("motosai to tree town");
  assert.match(text(), /empty hands/, "and empty means empty");
});


// ── The bar-stage auditor: the note, the till, the floor ────────────────────

function ownBar() {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); _setFlag("barPaid");
  G.bar.room = "stinky_bar"; G.bar.paid = true; G.bar.owed = 1680000; G.bar.cash = 0;
  G.room = "stinky_bar";
}

test("paying the note back by hand pays the principal, exactly as paying it on time does", () => {
  ownBar(); G.bar.arrears = 25000; G.money = 30000;
  const owed0 = G.bar.owed;
  out = []; run("pay note 10000");
  assert.equal(G.bar.arrears, 15000, "the slate came down");
  assert.equal(G.bar.owed, owed0 - 10000, "and so did the old man's stake — it used to stay at ฿1,680,000 forever on this path");
  run("pay note 15000");
  assert.equal(G.bar.arrears, 0);
  assert.equal(G.bar.owed, owed0 - 25000, "a full month by hand is a full month");
});

test("PAY NOTE with nothing outstanding says where the money stayed", () => {
  ownBar(); G.bar.arrears = 0; G.bar.rentOwed = 0; G.money = 10000;
  out = []; run("pay note 5000");
  assert.equal(G.money, 10000, "nothing moved");
  assert.match(text(), /฿5,000 stays where it is/, "and the sentence says so, rather than reading as a receipt");
  assert.match(text(), /nothing to pay ahead of it/);
});

test("a floor moment that names ฿40 puts ฿40 in the books", () => {
  ownBar(); G.money = 5000;
  const cashier = _npcsHere().find(i => NPC_ROLES[i] === "cashier");
  assert.ok(cashier, "the Stinky has a cashier");
  const i = _FLOOR_CASHIER.findIndex(t => /written off/.test(t));
  assert.ok(i >= 0, "the line exists");
  // deal her that exact line
  G.bar.floorSaid = { [cashier]: _FLOOR_CASHIER.map((_, k) => k).filter(k => k !== i) };
  G.bar.floorN = 0; G.bar.floorTurn = -999; G.bar.workedDay = G.day; G.bar.declared = true;
  const in0 = G.bar.eventIn || 0;
  out = []; if (typeof _workFloorFor === "function") _workFloorFor(cashier); else { _doWork(); G.turns += 20; _workFloor(); }
  if (/written off/.test(text())) {
    assert.equal((G.bar.eventIn || 0) - in0, 40, "the forty landed");
    assert.ok((G.bar.eventNotes || []).some(n => /forty/.test(n)), "and BOOKS will name it");
  }
});

test("every flat loss on a shift call carries its reason into BOOKS", () => {
  // "the night's own bill ฿400" over an empty notes list — the only night the
  // auditor could not account for, because three _shiftTake calls passed no why
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  const bare = [...src.matchAll(/_shiftTake\(([^,)]+)\)/g)].map(m => m[0]);
  assert.deepEqual(bare, [], "a _shiftTake with no reason is a bill the owner cannot read");
});

test("the room safe does not welcome an expat back to his vacation", () => {
  ownBar(); G.act1SafeDue = true; G.flags.roomSafeOpened = false; G.room = _hotelRoomId();
  out = []; _roomSafeBeat();
  assert.doesNotMatch(text(), /vacation is officially back on/);
  assert.match(text(), /You live here/);
});

// ── The readouts auditor ────────────────────────────────────────────────────

test("LAST NIGHT on the first morning does not tell a man who just slept that he hasn't", () => {
  G.room = _hotelRoomId(); G.lastNight = null; G.lastNightSaid = null;
  run("sleep", "sleep");
  assert.ok(G.day >= 3, "a night passed");
  out = []; run("last night");
  assert.doesNotMatch(text(), /have not slept on it yet/, "the flat false negative");
  assert.match(text(), /First morning/);
});

test("the black book names its denominator as what it counts", () => {
  G.room = "candy_bar"; for (const id of _npcsHere()) G.known[id] = true;
  G.known.nok = true;   // met, talked to, not bar staff — and not in the count
  G.soc.drinks[_npcsHere().find(i => NPC_ROLES[i] === "hostess")] = 3;   // somebody in the book, or WHO stops before the denominator
  out = []; run("who");
  assert.doesNotMatch(text(), /ladies you have actually met/);
  assert.match(text(), /working girls you have actually met/);
});


// ── Pimmy, the Bangkok bridge scout ─────────────────────────────────────────

test("no modal answers to a bare letter or a prefix", () => {
  // `n` — north — declined the kid path for good; `north`, `note`, `nothing` all
  // read as NO; `y` would have sold the bar. Eleven modals shared the shape.
  G.stage = "expat"; _setFlag("expatLife");
  const arm = (kind, setup) => { setup(); G.pendingChoice = kind; };
  const cases = [
    ["kidprice",  () => { G.known.nont = true; }],
    ["partner",   () => { G.flags.partnerWho = "tan"; }],
    ["sellbar",   () => {}],
    ["synjob",    () => { G.synJob = G.synJob || "clean"; }],
    ["tanfavour", () => {}],
  ];
  for (const [kind, setup] of cases) {
    for (const word of ["n", "north", "nothing", "note", "y", "yellow"]) {
      newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
      _setFlag("act1Done"); G.stage = "expat"; G.money = 20000;
      arm(kind, setup);
      const before = JSON.stringify([G.flags, G.money, G.rabbitWay]);
      out = []; doCommand(word);
      assert.equal(G.pendingChoice, kind, `${kind}: "${word}" is not an answer — the modal is still up`);
      assert.equal(JSON.stringify([G.flags, G.money, G.rabbitWay]), before, `${kind}: "${word}" changed nothing`);
    }
  }
});

test("NO at Nont's price is a night, not forever", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.known.nont = true; G.pendingChoice = "kidprice";
  out = []; doCommand("no");
  assert.equal(G.kidRefusedDay, G.day);
  assert.match(text(), /tomorrow/, "and he says so");
  const kidOffered = () => { G.room = "white_rabbit"; out = []; _rabbitJobPrompt(); return /KID/.test(text()); };
  G.pendingChoice = null;
  assert.ok(!kidOffered(), "tonight the kid is off the menu");
  G.day++;
  assert.ok(kidOffered(), "tomorrow it is back — the modal's own hint had said go and get CASH");
});

test("the wai comes back from a man as a man", () => {
  G.room = _npcRoom("tan"); G.known.tan = true; G.soc.waiBack = {};
  out = []; _waiBack("tan");
  assert.doesNotMatch(text(), /\bshe\b|\bhers\b/, "Tan is not she");
  G.soc.waiBack = {}; G.room = _npcRoom("nont"); out = []; _waiBack("nont");
  assert.doesNotMatch(text(), /\bshe\b|\bhers\b/, "Nont is not she");
});

test("TOPICS for somebody who is not here says where they are, not the partner's list", () => {
  G.room = _npcRoom("nont"); G.known.nont = true; G.known.tan = true;
  run("talk to nont");
  out = []; run("topics tan");
  assert.doesNotMatch(text(), /Nont.*will discuss|Nont, on the evidence/, "not Nont's list under Tan's name");
  assert.match(text(), /Tan/);
});

test("a bare ขอบคุณ is echoed without a particle the player never typed", () => {
  G.room = _npcRoom("nont"); G.known.nont = true;
  out = []; run("ขอบคุณ");
  assert.doesNotMatch(text(), /ขอบคุณครับ/, "the game does not put ครับ in a mouth that said neither");
  out = []; run("ขอบคุณค่ะ"); out = []; run("ขอบคุณ");
  assert.doesNotMatch(text(), /ครับ/, "…and once she has said ค่ะ, a bare one is hers");
  out = []; run("ขอบคุณครับ");
  assert.match(text(), /ขอบคุณครับ/, "and a typed ครับ is always ครับ");
});

// ── Malcolm, the expat subeditor ────────────────────────────────────────────

test("the other ledger is never told to the man who keeps it", () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  const staff = _npcsHere().filter(i => NPC_ROLES[i]);
  assert.ok(staff.length);
  for (const id of staff) {
    G.soc.drinks[id] = 4; G.soc.ledger = {};
    out = []; assert.equal(_otherLedger(id), false, `${NPCS[id].name} does not explain your own cut to you`);
  }
});

test("a bonded employee never greets the owner as a new face", () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan");
  assert.ok(mama);
  G.soc.drinks[mama] = 8; G.talked = {};   // bonded, and never formally TALKed to — Malcolm's week four
  out = []; run(`talk to ${mama}`);
  assert.doesNotMatch(text(), /New face|I am the mamasan|First names, at last/, "the first-meeting node is not for your own staff");
});

test("the last-bus warning is not for a man standing his own rail", () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  G.bar.workedDay = G.day; G.bar.declared = true; G.lastBusWarned = false; G.nightTurn = LAST_BUS_TURN - 3;
  out = []; _lastBusWarn();
  assert.doesNotMatch(text(), /main road|frequent|last bus/i, "he has somewhere to be till dawn");
});

// ── Fable wave two (Malcolm's stragglers) ────────────────────────────────────

test("a reveal is a reveal: an exhausted floor deals nobody's first confidence twice", () => {
  // Cake found the same ฿40 on two nights — the pool restarted when dry
  ownBar(); G.money = 5000;
  const staff = _barStaff();
  assert.ok(staff.length, "the Stinky has a floor");
  G.bar.floorSaid = {};
  for (const id of staff) G.bar.floorSaid[id] = _floorPool(id).map((_, k) => k);   // everyone has told you everything
  G.bar.floorSeen = []; G.bar.floorN = 0; G.bar.floorTurn = -999;
  G.bar.workedDay = G.day; G.bar.declared = true;
  out = []; _workFloor();
  assert.equal(text(), "", "an ordinary floor: nothing dealt");
  assert.equal(G.bar.floorN || 0, 0, "no moment counted");
  for (const id of staff) assert.equal(G.bar.floorSaid[id].length, _floorPool(id).length, "no book was wiped");
});

test("TALK TO MAMASAN / CASHIER addresses the role-carrier on the floor", () => {
  G.room = "lucky_tiger";
  const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan");
  const till = _npcsHere().find(i => NPC_ROLES[i] === "cashier");
  assert.ok(mama && till, "the Tiger has both");
  assert.equal(_findNpc("mamasan"), mama);
  assert.equal(_findNpc("the mamasan"), mama);
  assert.equal(_findNpc("mama-san"), mama);
  assert.equal(_findNpc("cashier"), till);
  G.room = "stinky_bar";
  assert.equal(_findNpc("manager"), "bert");
  out = []; doCommand("talk to mamasan");
  assert.doesNotMatch(text(), /nobody here goes by|doesn't land on anyone|no one here answers/i);
});

test("the tab call's pay-day is never tonight, and the settle line names the same day", () => {
  for (let d = 1; d <= 7; d++) { G.day = d; assert.notEqual(_shiftPayday(), _weekday()); }
  const tab = SHIFT_CALLS.find(c => c.id === "tab");
  assert.ok(tab.ask.every(t => !/Friday|Thursday/.test(t)) && !/Thursday/.test(tab.no), "no baked weekday");
  ownBar(); G.money = 5000; G.day = 5; G.bar.nights = 1;
  const saved = _shiftEligible; _shiftEligible = () => [tab];
  try { G.bar.shiftAsked = false; G.pendingChoice = null; G.bar.workedDay = G.day; G.bar.declared = true; G.bar.workedTurn = 0; G.turns = 10; out = []; _shiftAsk(); }
  finally { _shiftEligible = saved; }
  if (/Pay-day/.test(text())) {   // the ask pool has two variants; only one names the day
    assert.match(text(), new RegExp("Pay-day's " + _shiftPayday()));
    assert.doesNotMatch(text(), /never once not paid you/, "no record with you on night one");
    assert.match(text(), /Bert, without looking up/);
  }
  out = []; doCommand("no");
  assert.match(text(), new RegExp("back on " + _shiftPayday()));
});

test("the early call names the kin the girl actually has", () => {
  const early = SHIFT_CALLS.find(c => c.id === "early");
  assert.ok(early.askKin && early.askKin.length >= 2);
  assert.ok(early.askKin.every(t => !/\bher boy\b|\bthe boy\b/.test(t)), "no boy in the kin pool");
  // Manow: three little sisters, no child — she is asked, never about a son
  assert.equal(_girlHasBoy("manow"), false);
  ownBar(); G.money = 5000;
  const saved = _shiftEligible; _shiftEligible = () => [early];
  try {
    for (let d = 1; d <= 4; d++) {
      G.day = d; G.bar.shiftAsked = false; G.pendingChoice = null; G.bar.workedDay = G.day; G.bar.declared = true; G.bar.workedTurn = 0; G.turns = 10;
      out = []; _shiftAsk();
      if (G.shiftWho === "manow") assert.doesNotMatch(text(), /\bher boy\b|\bthe boy\b/);
      if (G.pendingChoice) doCommand("no");
    }
  } finally { _shiftEligible = saved; }
});

test("Tan's authored read on Eddy outranks the locator, and moves after the coffee", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.known.fast_eddy = true; G.room = _npcWhere("tan") || "soi6_street";
  out = []; doCommand("ask tan about eddy");
  assert.match(text(), /He had a bar and now he has a smaller one/, "the authored node, not 'somebody the soi knows'");
  _setFlag("ccibVisited");
  out = []; doCommand("ask tan about eddy");
  assert.match(text(), /gone to ground/, "after the coffee, the other read");
});

test("Tan's read on Nont moves with the file", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.known.nont = true; G.room = _npcWhere("tan") || "soi6_street";
  out = []; doCommand("ask tan about nont");
  assert.match(text(), /found him a table/);
  _setFlag("ccibVisited"); _setFlag("kidPath");
  out = []; doCommand("ask tan about nont");
  assert.match(text(), /the boy had one too/, "the authored kid-read node outranks the locator");
  G.pendingChoice = null; _setFlag("ccibReadGiven");
  out = []; doCommand("ask tan about nont");
  assert.match(text(), /name in a file/);
  _setFlag("kidCleared");
  out = []; doCommand("ask tan about nont");
  assert.match(text(), /He is not now/);
});

test("Bangkok is a subject three people answer, and Duangjai has a line on the Rabbit", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.known.nont = true;
  const miss = /not my story|wrong (girl|man)|ask me something|another time/i;
  G.room = _npcWhere("tan") || "soi6_street"; out = []; doCommand("ask tan about bangkok"); assert.match(text(), /lights left on/);
  G.room = NPCS.nont.room; out = []; doCommand("ask nont about bangkok"); assert.match(text(), /bigger table/);
  G.room = "lake_bar"; out = []; doCommand("ask duangjai about bangkok"); assert.match(text(), /Harder rooms/);
  out = []; doCommand("ask duangjai about rabbit"); assert.match(text(), /polite both times/); assert.doesNotMatch(text(), miss);
});

test("Nont tells his exit from the Rabbit one way", () => {
  const n = NPCS.nont.dialogue.find(d => /^rabbit\|/.test(String(d.topic)));
  assert.match(n.text, /a month before the golf shirt took my name off/);
  assert.match(n.short, /before they took my name off the rota/);
});

test("an authored girl's plan is a sentence, as a filler girl's is", () => {
  G.day = 3; G.room = "candy_bar_2"; doCommand("talk to bee");
  out = []; doCommand("ask bee about plan");
  assert.match(text(), /My dream is to .+\./, "wrapped, not a bare fragment");
});

test("a plain line to a partner whose question lapsed is the late answer, not a topic", () => {
  G.room = "stinky_bar"; doCommand("talk to bert");
  G.convo = "bert"; G.convoQ = null;
  G.convoLapsed = { bert: { key: "home", q: "Where are you from, bud?" } };
  out = []; doCommand("bristol mate");
  assert.match(text(), /a beat late/);
  assert.doesNotMatch(text(), /You asked Bert about/);
  assert.ok(!G.convoLapsed.bert, "the lapsed question is spent");
});

// ── Fable wave two: Henri (the gents' clubs), Brenda (the calendar), Desmond (the Owl) ──

test("Bill welcomes you to the club you are standing in", () => {
  G.money = 5000;
  for (const room of NPCS.bill.bars) {
    let d = G.day; while (_npcRoom("bill") !== room) { G.day++; if (G.day - d > 6) break; }
    G.room = room; G.soc.mgrShot = {}; out = []; _managerWelcome();
    if (/Welcome to/.test(text())) assert.match(text(), new RegExp("Welcome to " + ROOMS[room].bar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("staff answer the calendar they keep: closing and the league, in their own register", () => {
  G.room = "lucky_tiger";
  out = []; doCommand("ask lek about closing");
  // the pool, not a string: an all-night bar says it has no closing hour, in
  // whichever of its variants (round 49 deepened this from one line to four)
  assert.match(text(), /dawn|last man|never close|no close|nobody sit|last customer|last idiot/i, "an all-night beer bar");
  G.room = "velvet_club"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; doCommand(`ask ${NPCS[g].name} about closing`);
  assert.match(text(), /Midnight|Twelve/, "a gents' club shuts at twelve");
  G.room = "lucky_tiger"; G.day = 3;
  out = []; doCommand("ask lek about league");
  assert.match(text(), /Tonight/); assert.match(text(), /PLAY KILLER/);
  G.day = 4; out = []; doCommand("ask lek about league"); assert.match(text(), /night after next/);
  G.day = 5; out = []; doCommand("ask lek about league"); assert.match(text(), /tomorrow/);
  G.room = "queen_vic"; out = []; doCommand("ask terry about quiz");
  assert.doesNotMatch(text(), /\bna\b/, "a pensioner does not say na");
  out = []; doCommand("ask aoy about closing"); assert.match(text(), /dawn|last customer|last man|no closing time|whenever the room empties/i);
});

test("TIME says where in the count the league is, and a quiz you are sitting in is ON", () => {
  G.day = 3; out = []; _doTime(); assert.match(text(), /League night: killer pool/);
  G.day = 4; out = []; _doTime(); assert.match(text(), /League night .* is the night after next/); G.day = 5; out = []; _doTime(); assert.match(text(), /League night .* is tomorrow/);
  G.day = 4; G.nightTurn = 40; G.game = { type: "quiz", qs: [0, 1, 2, 3, 4], at: 0, right: 0 }; out = []; _doTime();
  assert.match(text(), /ON right now/); G.game = null;
});

test("Mort stands behind his own copy, and the cipher's instruction is a door", () => {
  G.room = "queen_vic"; G.day = 2;
  out = []; doCommand("ask mort about blue dog");
  assert.match(text(), /BLUE DOG/); assert.doesNotMatch(text(), /not my story|Search me/i);
  out = []; doCommand("tell mort i counted the steps");
  assert.match(text(), /Box fifteen|Box 15/); assert.ok(_flag("owlBox15"));
});

test("TAO RAI answers in a cabaret and a massage shop", () => {
  G.room = "peacock_cabaret"; out = []; _doTaoRai();
  assert.match(text(), /beer ฿/); assert.doesNotMatch(text(), /lady drink|the bell/);
  G.room = Object.keys(ROOMS).find(k => ROOMS[k].massage === "legit"); out = []; _doTaoRai();
  assert.match(text(), new RegExp("Thai ฿" + MASSAGE_LEGIT));
});

test("the Stinky's ashtray reads; a late pie is an offer of crisps, not a charge", () => {
  G.room = "stinky_bar"; out = []; doCommand("examine ashtray");
  assert.match(text(), /league ashtray/i);
  G.room = "queen_vic"; G.nightTurn = 70; G.money = 1000; out = []; doCommand("buy pie");
  assert.match(text(), /Kitchen close/); assert.match(text(), /goes on the tab/, "the joke names its price");
  assert.equal(G.money, 1000 - QV_CRISPS, "the joke, once");
  out = []; doCommand("buy curry");
  assert.match(text(), /had the crisp already/); assert.equal(G.money, 1000 - QV_CRISPS, "and not twice");
});

test("an absent owner's pronoun is his own; a filler girl's family line is not doubled", () => {
  // Bill is a man; the Doghouse's absence line used to say "the one she leaves it with"
  let d = G.day; while (_npcRoom("bill") === "doghouse") { G.day++; if (G.day - d > 6) break; }
  G.room = "doghouse"; out = []; _describeRoom(true);
  const abs = out.map(o => typeof o === "string" ? o : o.text).find(t => /is working|are both working/.test(t)) || "";
  if (/the one \w+ leaves? it with/.test(abs)) assert.doesNotMatch(abs, /the one she leaves/);
  for (const id of Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess")) {
    const fam = (NPCS[id].dialogue.find(x => x.topic === "family") || {}).text || "";
    assert.ok(!/I send money every month[^.]*\. Every month I send money/.test(fam), id + " doubles the sending line");
  }
});

test("Doyle's job waits on a face he knows; the order quest stops pitching once it is done", () => {
  G.room = "queen_vic";
  const st = _npcState("doyle"); st.trust = 0;
  out = []; doCommand("ask doyle about job"); assert.match(text(), /Not yet/);
  st.trust = 2; out = []; doCommand("ask doyle about job"); assert.match(text(), /useful/);
  _setFlag("knowIceMan"); _setFlag("iceSettled");
  const n = _pickDialogue("bill", "order"); assert.match(n.text, /Sorted/);
});

test("no bargirl weaves out of a shut Soi 6 door", () => {
  G.room = "soi6_street"; G.nightTurn = 65; G.encDone = {};
  const saved = _rand; _rand = () => 0;
  try { out = []; for (let i = 0; i < 6; i++) _maybeEncounter(); } finally { _rand = saved; }
  assert.doesNotMatch(text(), /weaves out of the nearest doorway/);
});

// ── Mario's rulings on the wave-two leftovers (2026-09-15) ──────────────────

test("Beach Road is a long ride: riding THROUGH it costs a turn, arriving in it does not", () => {
  assert.equal(_districtHops("Naklua", "Beach Road"), 1, "arriving in it is one hop");
  assert.equal(_districtHops("Naklua", "Pratumnak"), 3, "Naklua to the hill spends the ride on an artery");
  assert.equal(_districtHops("Naklua", "Walking Street"), 3);
  const path = _districtPath("Naklua", "Walking Street");
  assert.ok(path && path.includes("Beach Road"), "and the path says so");
  // the ride reads the front, not a temple car park
  G.room = "naklua_rd"; G.money = 5000; G.nightTurn = 30; G.motoRides = 5;
  const saved = _rand; _rand = () => 0.99;
  try { out = []; _doMotosai("walking street"); } finally { _rand = saved; }
  if (G.room !== "naklua_rd")
    assert.ok(_MOTO_RIDE_BEACH.some(l => text().includes(l.slice(0, 40))), "the scenic pool");
});

test("the un-adopted dog has a manor: the nudge fires where he was first seen", () => {
  G.dog = null; G.dogRegion = null; G.day = 3;
  const saved = _rand; _rand = () => 0.1;
  try {
    G.room = "naklua_rd"; G.dogNudgeDay = 0; out = []; _describeRoom(true);
    assert.equal(G.dogRegion, "Naklua", "pinned on first sight");
    G.room = "pratumnak_rd"; G.dogNudgeDay = 0; G.day = 4; out = []; _describeRoom(true);
    assert.doesNotMatch(text(), /clipped[- ]ear/, "not on the hill");
    G.room = "naklua_rd"; G.dogNudgeDay = 0; G.day = 5; out = []; _describeRoom(true);
    assert.match(text(), /clipped[- ]ear/, "back on his own soi");
  } finally { _rand = saved; }
});

test("after midnight TIME says whose small hours these are, and the pension's home chip is nobody's port", () => {
  G.day = 3; G.nightTurn = 61; out = []; _doTime();
  assert.match(text(), /Wednesday night, into Thursday/);
  assert.ok(!ASK_REPLIES.home.some(r => /Portsmouth/.test(r.text || r)), "a French pensioner is not from Portsmouth");
});

test("the Owl's arrival slot has enough variants for a week without a rerun", () => {
  assert.ok(_OWL_ARRIVED.length >= 7, `${_OWL_ARRIVED.length} variants`);
  for (const f of _OWL_ARRIVED) { const t = f(); assert.ok(t.length > 300); }
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  const block = src.slice(src.indexOf("const _OWL_ARRIVED"), src.indexOf("const _OWL_LISTINGS"));
  assert.doesNotMatch(block, /฿\d/, "prices are constants, never digits");
});

test("Mort is a fixture: the season never keeps him in, whatever night you visit", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.season0 = 8;   // a September start: the deep-low trough
  for (let d = 2; d <= 30; d++) { G.day = d; G.nightTurn = 30; assert.ok(_npcActive("mort") && _npcWhere("mort") === "queen_vic", "day " + d); }
});

test("the hospital queue only names money you'll never see when you actually sent some", () => {
  G.sentTotal = 0; G.hospitalVisits = 0;
  const saved = _rand; _rand = () => 0.1;
  try {
    out = []; _hospitalMorning("hurt");
  } finally { _rand = saved; }
  if (text()) assert.doesNotMatch(text(), /money you'll never see|lent a few hundred|rent shortfall/);
  // SEND counts
  G.room = "candy_bar"; G.money = 2000; G.phone.contacts = G.phone.contacts || {}; G.phone.contacts.candy = true; G.phone.battery = 80;
  out = []; doCommand("send 300 to candy");
  if (G.money === 1700) assert.equal(G.sentTotal, 300);
});

// ── Fable wave three: Lars (the companion night), Margarethe (the unmet cast), Graham (the affair) ──

test("the rose pitch takes only an answer to the rose: BUY BEER buys a beer", () => {
  G.room = "stinky_bar"; G.money = 2000; G.pendingEnc = "flower"; G.flowerFor = "manow";
  const m0 = G.money; out = []; doCommand("buy beer");
  assert.equal(G.itemLoc.rose === "inventory", false, "no rose");
  assert.doesNotMatch(text(), /rose comes to you/);
  assert.ok(G.money <= m0 - _beerPrice() + 1, "the beer was bought");
  G.pendingEnc = "flower"; G.flowerFor = "manow"; out = []; doCommand("buy rose");
  assert.match(text(), /rose/i);
});

test("the girl on your arm is the party, not the jilted; the roster says she is with you", () => {
  G.room = "rainbow_girls"; G.money = 20000; G.nightTurn = 30;
  const girls = _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
  assert.ok(girls.length >= 2);
  const [a, b] = girls;
  G.soc.drinks[a] = 13; G.soc.drinks[b] = 13;   // both her-farang
  G.party = { ids: [a], stops: 0, spent: 0, seen: {} };
  out = []; _describeRoom(true);
  assert.match(text(), new RegExp(NPCS[a].name + " \\(with you\\)"));
  const bond0 = G.soc.drinks[a];
  G.pendingBf = { id: b, st: 500, lt: 1000, party: 1000, room: G.room };
  const saved = _rand; _rand = () => 0.99;
  try { out = []; _bfResolve("party"); } finally { _rand = saved; }
  assert.doesNotMatch(text(), new RegExp(NPCS[a].name + " watches you leave"), "she IS the party");
  assert.ok(G.soc.drinks[a] >= bond0, "no souring on the companion");
  G.party = null;
});

test("a shift stood into the small hours survives going home to bed", () => {
  ownBar(); G.money = 5000; G.nightTurn = 30;
  _doWork(); G.bar.stoodTurns = 45; G.nightTurn = 81; G.room = "hotel_room";
  for (let i = 0; i < WORK_AWAY_BUDGET + 2; i++) _workPresenceTick();
  assert.ok(G.bar.workedLast, "still yours");
});

test("the tab is one line in the books", () => {
  ownBar(); G.money = 5000; G.bar.eventNotes = []; G.shiftCall = "tab"; G.shiftWho = null; G.pendingChoice = "shift";
  const saved = _rand; _rand = () => 0.99;   // settles
  try { out = []; _shiftYes(); } finally { _rand = saved; }
  const notes = (G.bar.eventNotes || []).filter(n => /slate/.test(n));
  assert.equal(notes.length, 1, notes.join(" | "));
});

test("the affair girl is not a customer: no barfine quote, her own texts, her own hello, and the staff know", () => {
  ownBar(); G.money = 5000; G.day = 40;
  const her = _barStaff().find(i => NPC_ROLES[i] === "hostess"); assert.ok(her);
  G.soc.drinks[her] = 13;
  G.affair = { id: her, since: 20, strain: 0, floorSour: 0, warned: {}, crisSeen: [], ended: false };
  assert.ok(_affairLive());
  out = []; doCommand(`ask ${NPCS[her].name} about price`);
  assert.doesNotMatch(text(), /BARFINE|my price is my price/); assert.match(text(), /boss|come home|Ask mama/i);
  out = []; _relGreeting(her); assert.doesNotMatch(text(), /arithmetic allows/); assert.ok(text().length > 40);
  const mama = _barStaff().find(i => NPC_ROLES[i] === "mamasan");
  if (mama) { out = []; doCommand(`ask ${NPCS[mama].name} about ${NPCS[her].name}`); assert.match(text(), /Your girl|Everybody know/); }
  // her text is hers
  G.phone.contacts[her] = true; G.phone.battery = 80; G.room = "queen_vic"; G.phone.lastText = -100;
  const saved = _rand; _rand = () => 0.01;
  try { _maybeIncomingText(); } finally { _rand = saved; }
  const last = (G.phone.msgs || G.phone.inbox || []).slice(-1)[0];
  if (last && last.from === her) assert.doesNotMatch(String(last.text), /SEND 300|keep you seat/);
  // crises keep a cadence from the last one
  G.affair.crisDay = 30; G.room = G.bar.room; G.nightTurn = 30; G.pendingChoice = null;
  G.day = 35; assert.equal(_affairCrisisDue(), null); G.day = 36; assert.ok(_affairCrisisDue());
  G.affair = null;
});

test("Jun answers to yourself and is nobody's lady drink; Tan reads a venue and a phone-only woman", () => {
  G.room = "sunset_dreams"; G.money = 2000; doCommand("talk to jun");
  out = []; doCommand("ask jun about yourself"); assert.match(text(), /daughter/);
  const m0 = G.money; out = []; doCommand("buy jun a drink");
  assert.match(text(), /Not a lady drink/); assert.equal(G.money, m0 - _beerPrice());
  G.room = _npcWhere("tan") || "soi6_street";
  out = []; doCommand("ask tan about crystal palace"); assert.match(text(), /go-go/);
  out = []; doCommand("ask tan about priew"); assert.match(text(), /finds you/); assert.doesNotMatch(text(), /Second Road/);
  out = []; doCommand("ask tan about peacock"); assert.match(text(), /Katoey|Peacock|Adonis|Hyper|katoey|cabaret/i);
});

test("a soapy has a price list, a street has no doorway, and the rain has an earliest hour", () => {
  G.room = "poseidon_soapy"; out = []; doCommand("tao rai"); assert.match(text(), new RegExp("star ฿" + _SOAPY_TIERS[0].price));
  out = []; doCommand("read menu"); assert.match(text(), /model ฿/);
  out = []; doCommand("examine fish"); assert.match(text(), /real fish/);
  for (let d = 2; d < 30; d++) { G.day = d; const e = _rainEarliest(); assert.ok(e >= 0 && e < 70); }
  assert.ok(new Set([...Array(20).keys()].map(d => { G.day = d + 2; return _rainEarliest(); })).size > 3, "not always six o'clock");
});

test("a work event keeps its gap, and a birthday has more than one paragraph", () => {
  const b = WORK_NIGHTS.find(e => e.id === "birthday");
  assert.ok(Array.isArray(b.text) && b.text.length >= 3); assert.ok(b.minGapDays >= 7);
  ownBar(); G.bar.evtDay = { birthday: G.day - 2 };
  const saved = _rand; _rand = () => 0.01;   // the roll passes, the draw lands on the first weight
  try { for (let i = 0; i < 12; i++) { out = []; _workNight(); assert.doesNotMatch(text(), /birthday|turns thirty/); } } finally { _rand = saved; }
});

// ── Fable wave four: Kenji (the night ride), Arturo (the Glam saga), Judith (outside the bars) ──

test("a ride stop takes the time a stop takes, the after-hours room's 'already paid' is paid, and she remembers", () => {
  G.money = 20000; G.room = "lucky_tiger"; G.nightTurn = 62; G.soc.drinks.lek = 13;
  G.rideSeq = { id: "lek", stops: 0, spent: 0, seen: [], sanuk: 0 }; G.pendingEnc = "nightride";
  const t0 = G.nightTurn; out = []; doCommand("ride on");
  assert.ok(G.nightTurn - t0 >= RIDE_STOP_TURNS, "the clock moved");
  let guard = 0; while (G.pendingEnc === "nightride" && guard++ < 8) { out = []; doCommand("ride on"); }
  assert.ok(G.rideLog && G.rideLog.lek && G.rideLog.lek.stops >= 1, "the ride is remembered");
  G.room = "lucky_tiger"; G.nightTurn = 20; out = []; doCommand("ask lek about late");
  assert.doesNotMatch(text(), /not friend yet/i); assert.match(text(), /bike|ride|after two/i);
  assert.notEqual(_rideBike("lek"), _rideBike("nan")); assert.notEqual(_rideNickname("lek"), _rideNickname("nan"));
  const paid = _RIDE_VENUES.find(v => v.key === "afterhours").scenes.find(f => /Already paid/.test(f("X")));
  assert.match(paid("X"), /\[free\]/, "the free scene is tagged free");
});

test("the self-barfine offer lapses honestly, and BUY ROSE FOR <her> buys the rose", () => {
  G.room = "candy_bar"; G.money = 3000; G.selfBfId = "candy"; G.pendingEnc = "selfbf"; G.nightTurn = 30;
  out = []; doCommand("buy beer");
  assert.equal(G.pendingEnc, null); assert.match(text(), /lapses/); assert.doesNotMatch(text(), /still in the room/);
  assert.ok(G.money < 3000, "and the beer was bought");
  G.pendingEnc = "flower"; G.flowerFor = "candy"; out = []; doCommand("buy rose for candy");
  assert.match(text(), /rose/i); assert.doesNotMatch(text(), /steers the child on/);
});

test("the saga's return channels: Wimon after the whole of it, Diamond on the keys, Mala on the scout, the giver's pronoun", () => {
  G.room = "the_office"; _setFlag("diamondTruth"); _setFlag("keysDelivered"); _setFlag("wimonThanked"); _setFlag("scoutSent");
  const miss = /Not yet, na|another time|Not my story|wrong (girl|mama)/i;
  out = []; doCommand("ask wimon about diamond"); assert.doesNotMatch(text(), miss); assert.match(text(), /whole of it|She tell you/);
  out = []; doCommand("ask wimon about keys"); assert.doesNotMatch(text(), miss);
  G.room = "hyper"; out = []; doCommand("ask diamond about keys"); assert.match(text(), /hook/);
  G.room = "peacock_cabaret"; out = []; doCommand("ask mala about diamond"); assert.match(text(), /headdress/);
  assert.equal(ROOMS.peacock_cabaret.liveMusic, false, "the show is the music");
  const wm = NPCS.diamond.dialogue.find(d => /samson/.test(String(d.topic))); assert.match(wm.text, /three " \+\s*"beer bar|three beer bar/s);
});

test("the clinic is a place, the squid man sells squid, the weekender comes in two, the catfish keeps a cadence", () => {
  G.room = "stinky_bar"; out = []; doCommand("get tested"); assert.match(text(), /Second Road/); assert.equal(G.room, "second_rd_c", "the verb takes you to the clinic");
  out = []; doCommand("get tested"); assert.match(text(), /negative|antibiotics|Clean/i); assert.doesNotMatch(text(), /take a bike/);
  out = []; doCommand("examine clinic"); assert.match(text(), /glass door/);
  G.room = "tt_deep"; G.money = 500; G.hunger = 60; out = []; doCommand("buy squid"); assert.equal(G.money, 460);
  assert.ok(Array.isArray(ENCOUNTERS.bkktourist.intro) && ENCOUNTERS.bkktourist.intro.length >= 2);
  G.bookingDay = G.day - 1; G.nightTurn = 75; G.room = "hotel_room"; G.encDone = {};
  const saved = _rand; _rand = () => 0; try { out = []; for (let i = 0; i < 4; i++) _maybeEncounter(); } finally { _rand = saved; }
  assert.doesNotMatch(text(), /apps/, "not the night after");
  assert.doesNotMatch(String(ENCOUNTERS.booking.intro), /kept leaving you on read/, "no asserted history");
});

test("Tan's call knows the hill is not town; Waen texts students she has met; Priew texts", () => {
  G.flags.act1Done = false; G.phone.tanAct1 = false; G.room = "thappraya_mid"; G.money = 5; out = [];
  doCommand("call tan"); assert.doesNotMatch(text(), /already in town/);
  G.flags.act1Done = true; G.known.waen = true; delete G.talked.waen; G.phone.battery = 80;
  out = []; _waenTick(); assert.doesNotMatch(text(), /Waen/);
  G.room = "beach_rd_c"; _setFlag("metPriew"); G.phone.contacts.priew = true; G.phone.lastText = -100; G.day = 6;
  const saved = _rand; _rand = () => 0.01; try { _maybeIncomingText(); } finally { _rand = saved; }
  const last = (G.phone.inbox || []).slice(-1)[0];
  assert.ok(last && last.from === "priew", "she texts unprompted");
});

test("an old save standing in orchid_club wakes in nottys_place", () => {
  const g = JSON.parse(serializeGame()); g.room = "orchid_club"; g.visited = { orchid_club: true };
  deserializeGame(JSON.stringify(g));
  assert.equal(G.room, "nottys_place"); assert.ok(G.visited.nottys_place && !G.visited.orchid_club);
});

test("Cream's door gets a hint after three nights at her table, and the Killer Table warns when the week runs out", () => {
  G.room = "metro_garden"; G.nightTurn = 45; G.money = 3000; G.chamDays = [];
  G.day = 3; _chamContact();
  out = []; G.day = 4; _chamContact();
  assert.match(text(), /Maybe later na. If you nice/, "not yet on the second night");
  G.day = 5; out = []; _chamContact();
  assert.match(text(), /ask|Ask/); assert.doesNotMatch(text(), /If you nice/); assert.doesNotMatch(text(), /฿|baht/, "never a price");
  // the league warning
  G.room = "stinky_bar"; G.stage = "vacation"; G.day = 6; delete G.quests.league; G.questsOffered = G.questsOffered || {};
  out = []; _questOffer("bert");
  if (/Killer|league/i.test(text())) assert.match(text(), /last league night before you fly/);
});

// ── Round 48: Geraint, the regular (Opus) — the bond tiers, played at last ───

test("buying her a drink does not make her introduce herself again", () => {
  G.room = "candy_bar"; G.money = 9000; G.lastSaleng = G.lastPeddler = 99999; G.flowerNight = 2;
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && NPCS[i].filler);
  const n = NPCS[g].name;
  doCommand("talk to " + n); out = []; doCommand("talk to " + n);
  const terse = text();
  G.soc.roundFor = { [g]: G.turns };            // what a lady drink sets
  out = []; doCommand("talk to " + n);
  assert.doesNotMatch(text(), /I no speak English good/, "the hello is not a story you buy back");
  // …and the drink still buys a STORY in full (Terry's deal)
  out = []; doCommand(`ask ${n} about family`); const first = text();
  out = []; doCommand(`ask ${n} about family`);
  assert.notEqual(text(), first, "a repeat is terse");
  G.soc.roundFor = { [g]: G.turns };
  out = []; doCommand(`ask ${n} about family`);
  assert.equal(text().includes(first.split("\n").pop().slice(0, 40)), true, "a drink buys it back in full");
});

test("a woman's confidences are hers: no repeat to you, and she does not share them with the next woman", () => {
  const lines = {};
  for (const [g, room] of [["nan", "candy_bar"], ["toey", "rainbow_girls"]]) {
    G.room = room; G.soc.drinks[g] = 8; lines[g] = [];
    for (let i = 0; i < 5; i++) { out = []; _bondTalk(g); lines[g].push(text()); }
  }
  assert.equal(new Set(lines.nan).size, 5, "five nights, five different things");
  const strip = s => s.replace(/Nan|Toey/g, "X");
  const shared = lines.nan.map(strip).filter(l => lines.toey.map(strip).includes(l));
  assert.ok(shared.length <= 2, `two women shared ${shared.length} of their first five confidences`);
  assert.ok(_BOND_TALK[2].length >= 8 && _BOND_TALK[3].length >= 7, "the warmth pools are deep enough to be hers");
});

test("a butterfly is a man who does not come back, and Lek thanks you only for shoes you bought", () => {
  // four regulars you return to every night is the OPPOSITE of butterflying
  G.room = "las_vegas"; G.money = 9000; G.soc.drinkNight = {}; G.soc.butterflyTeased = false;
  const girls = _npcsHere().filter(i => NPC_ROLES[i] === "hostess").slice(0, 4);
  for (const g of girls) { G.soc.drinks[g] = 8; G.soc.drinkNight[g] = true; }   // all bonded regulars
  out = []; _ladyDrinkCharge(girls[0]);
  const g5 = girls[0];
  assert.ok(!G.soc.butterflyTeased || !/BUTTERFLY|flap/i.test(text()), "your own regulars are not a flit");
  // Lek: the thank-you waits for the gift; she still answers about shoes
  G.room = "lucky_tiger"; G.soc.drinks.lek = 14; G.soc.given = {};
  out = []; doCommand("ask lek about sandals");
  assert.doesNotMatch(text(), /Nobody buy me shoes before/, "no thanks for a gift never given");
  assert.match(text(), /heels are the job|flip-flop/, "…but she answers");
  G.soc.given = { lek: ["lingerie"] };
  out = []; doCommand("ask lek about sandals");
  assert.match(text(), /Nobody buy me shoes before/);
});

test("the deepest-written woman is not the quietest: warmth outranks the ask-me-something prompt", () => {
  // Lek at her-farang tier answered "a small smile, and nothing else" while a
  // GENERATED girl at the same tier told you about her room (Geraint, round 48).
  // Her own bond: lines come first; the generic register is the floor under
  // everyone, not a consolation for being filler.
  G.room = "lucky_tiger"; G.soc.drinks.lek = 14; G.known.lek = true;
  doCommand("talk to lek");
  const said = [];
  for (let i = 0; i < 4; i++) { out = []; doCommand("talk to lek"); said.push(text()); }
  assert.ok(!said.some(l => /raises her glass an inch|this is the part where you say something/.test(l)),
    "an authored regular does not fall to the prompt while she has warmth left");
  const pool = [..._BOND_TALK[2], ..._BOND_TALK[3]].map(f => f("Lek"));
  assert.ok(said.some(t => pool.some(l => t.includes(l))), "she reaches the bond register");
  // …and a stranger still gets no warmth she has not earned you
  G.room = "candy_bar"; G.soc.drinks.nan = 0; doCommand("talk to nan");
  out = []; doCommand("talk to nan");
  assert.ok(!pool.some(l => text().includes(l.replace(/Lek/g, "Nan"))), "warmth is earned, not default");
});

test("a ledger reveal is a thing the TOWN shows you once, not a script each woman owns", () => {
  // The book was per-woman, so it could never repeat itself — and the second
  // woman handed over the first one's script anyway: Lek's folded-chit reveal
  // came back verbatim as Wilai's (Geraint, round 48, four women in eleven nights).
  const girls = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "hostess").slice(0, 6);
  const seen = [];
  for (const id of girls) {
    G.room = _npcRoom(id); G.soc.drinks[id] = 3;
    out = []; _otherLedger(id);
    const t = text().trim();
    if (t) seen.push(t);
  }
  assert.ok(seen.length >= 3, "several women reach the first tier");
  assert.equal(new Set(seen).size, seen.length, "no two women give the same tier-1 reveal while one is unheard");
  // and the pools are deep enough that the town has more than a couple to show
  for (const t of [1, 2, 3]) assert.ok(_OTHER_LEDGER[t].length >= 3, "tier " + t + " has depth");
});

test("the name she uses for nobody else is SAID, and it is the same name on the bike", () => {
  // It was described on the rail every night and only ever spoken on a night
  // ride, so eleven nights at her-farang tier never heard it (Geraint, round 48).
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 14;
  const saved = _rand;
  try {
    _rand = () => 0.01;
    out = []; _relGreeting("lek");
  } finally { _rand = saved; }
  const k = _herNameForYou("lek");
  assert.ok(k && k.length, "she has a name for you");
  assert.match(text(), new RegExp(k.replace(/[{}]/g, "").replace(/[.*+?^$()|[\]\\]/g, "\\$&")),
    "the greeting says it out loud");
  assert.equal(_rideNickname("lek"), k, "the rail and the ride agree");
});
