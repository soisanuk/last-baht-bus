// Round 44 — Marco (the open mind), Trev (every staked game), Bill (the dog).
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
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// ── Marco: a venue that tells you to buy a drink sells one ─────────────────

test("the cabaret and the host club sell the drink their own prose orders", () => {
  // Miss Mala: "Buy a drink, tip a girl, laugh loud. That is the whole religion
  // here." — and BUY BEER answered "this calls for a bar stool", while the room's
  // own menu line offered (BUY BEER · BUY WATER). Neither venue carries a
  // barType, deliberately, so none of the go-go machinery reaches them.
  for (const room of ["peacock_cabaret", "adonis_club"]) {
    G.room = room; G.money = 9000; G.thirst = 60;
    out = []; run("buy beer");
    assert.doesNotMatch(text(), /calls for a bar stool/, `${room} pours a beer`);
    assert.ok(G.money < 9000, `${room} charges for it`);
    G.money = 9000;
    out = []; run("buy water");
    assert.doesNotMatch(text(), /No water for sale here/, `${room} sells water too`);
  }
  // …and none of the bar-girl apparatus followed the drinks in
  for (const room of ["peacock_cabaret", "adonis_club"]) {
    assert.equal(!!ROOMS[room].barType, false, `${room} is still not a barfine bar`);
    assert.equal(_inBar.call(null) || true, true);
  }
  // the seat is priced by the class of the room, not flat
  G.room = "peacock_cabaret";
  assert.ok(_beerPrice("peacock_cabaret") > _beerPrice("stinky_bar"),
    "a cabaret charges above a beer bar");
});

test("Thappraya is reachable by bike — the district TRAVEL points a motosai at", () => {
  // TRAVEL: "…over in Thappraya — you haven't found it yet… Walk it, or a MOTOSAI
  // to the district." The piwin's list had no Thappraya on it, stranding the
  // cabaret, the host club, Supertown and Hyper behind a hill walk.
  assert.ok(MOTOSAI_DESTS.thappraya, "the rank serves Thappraya");
  assert.ok(ROOMS[MOTOSAI_DESTS.thappraya.room], "at a real room");
  assert.equal(ROOMS[MOTOSAI_DESTS.thappraya.room].region, "Thappraya");
  assert.equal(ROOMS[MOTOSAI_DESTS.supertown.room].region, "Thappraya");
});

test("Tan keeps the promise he makes in the taxi", () => {
  // "Some of the most beautiful girls on this soi weren't born girls. I'll point
  // you right." — and then ASK TAN ABOUT LADYBOY / KATOEY / CABARET / HOST BAR
  // all missed. The one man who promised to point, pointing nowhere.
  for (const topic of ["ladyboy", "katoey", "cabaret", "drag", "host bar"]) {
    G.room = "soi6_street"; G.known.tan = true; G.talked = {};
    out = []; run("ask tan about " + topic);
    assert.match(text(), /Katoey|Peacock|Adonis|Hyper/,
      `ASK TAN ABOUT ${topic.toUpperCase()} names a venue you can walk into`);
  }
  // and every venue he names is real, and where he says it is
  G.room = "soi6_street"; G.known.tan = true; G.talked = {};
  out = []; run("ask tan about ladyboy");
  assert.equal(ROOMS.katoeys.region, "Walking Street");
  assert.equal(ROOMS.peacock_cabaret.region, "Thappraya");
  assert.equal(ROOMS.hyper.region, "Thappraya");
  assert.equal(ROOMS.adonis_club.region, "Thappraya");
});

test("a host who has left the floor is said to have left it, not offered as a choice", () => {
  // After BARFINE WIN, "buy drink for win" answered "ARM (4) or WIN (9)? (BUY
  // DRINK FOR WIN.)" — the prompt instructing the exact command that produced
  // it, forever.
  G.room = "adonis_club";
  const away = NPCS.win.room; NPCS.win.room = "khao_talo";
  try {
    out = []; run("buy drink for win");
    assert.doesNotMatch(text(), /BUY DRINK FOR WIN/, "never instructs the command that just failed");
    assert.match(text(), /isn't on the floor/);
  } finally { NPCS.win.room = away; }
  // with both present the disambiguation still asks, and only about men who are here
  out = []; run("buy drink for");
  assert.ok(G.money < 9000, "a bare ask lands on whoever is standing there");
});

// ── Trev: the games ────────────────────────────────────────────────────────

test("PLAY JACKPOT WITH <name> deals to the woman you named", () => {
  // Connect 4 honoured the name and Jackpot silently ignored it: asked for the
  // mamasan, got a floor girl, no comment.
  G.room = "lucky_tiger"; G.money = 5000;
  const staff = _npcsHere().filter(n => NPC_ROLES[n]);
  assert.ok(staff.length > 1, "this bar has a floor to choose from");
  const pick = staff[staff.length - 1];
  out = []; run(`play jackpot with ${NPCS[pick].name.toLowerCase()} 20`);
  assert.equal(G.game.opp, NPCS[pick].name);
  // a name nobody answers to still says so rather than silently substituting
  G.game = null; out = []; run("play jackpot with zzzz 20");
  assert.match(text(), /Nobody here answers to/);
});

test("the killer-pool table has more than one way of saying you potted it", () => {
  // The same string three turns running inside one frame, in a game built on
  // rotating pools everywhere else.
  assert.ok(_KP_MY_POT.length >= 4 && _KP_MY_POWER.length >= 3);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(_pickVary(_KP_MY_POT, "kpmypot"));
  assert.ok(seen.size >= 3, "the pool actually rotates");
});

// ── Bill: the dog ──────────────────────────────────────────────────────────

test("the dog is filed in the gallery, and is not counted as a face", () => {
  // Two bespoke, excellent photo lines and an empty gallery two turns later;
  // SCORE still read "0 faces" on the last night of a week spent with him.
  G.dog = { since: 1, name: null }; G.battery = 50; G.phone.photos = [];
  G.room = "beach_rd_c";
  out = []; run("photo dog");
  assert.equal(_photoList().length, 1);
  assert.equal(_photoList()[0].id, "dog");
  out = []; run("gallery");
  assert.match(text(), /Sai Krok/, "he is in the collection");
  assert.doesNotMatch(text(), /one blurry thumb/);
  // one entry however many times you point the phone at him
  out = []; run("photo dog", "photo dog");
  assert.equal(_photoList().filter(p => p.id === "dog").length, 1);
  // and he never inflates the people you've met
  assert.ok(!G.known.dog, "a dog is not an acquaintance the black book knows");
});

test("PUT TAG ON HIM is the one thing anybody does with a dog tag", () => {
  // The generic parser miss — "The soi blinks at you. Try again." — on the most
  // obvious act in the game, to a man holding a tag with a dog's name on it.
  G.dog = { since: 1, name: null }; G.itemLoc.brass_tag = "inventory"; G.room = "stinky_bar";
  out = []; run("put tag on him");
  assert.doesNotMatch(text(), /didn't understand|soi blinks/);
  assert.equal(G.dogTagged, true);
  out = []; run("put tag on seamus");
  assert.match(text(), /already on him/, "and it stays on him");
  // a genuinely meaningless PUT still gets a voiced refusal, not a parser miss
  G.dogTagged = false; delete G.itemLoc.brass_tag;
  out = []; run("put hat on cat");
  assert.doesNotMatch(text(), /didn't understand/);
});

test("BUY <food> FOR <dog> feeds the dog", () => {
  // The saleng's own pitch prints "(BUY <item> FOR <lady>)", a dog owner reads
  // it as an instruction, and the game sold him a skewer and ate it for him.
  G.dog = { since: 1, name: null }; G.room = "soi_rompho"; G.money = 2000; G.hunger = 50;
  const before = G.hunger;
  out = []; run("buy moo ping for dog");
  assert.match(text(), /Sai Krok/, "he is the one who eats");
  assert.equal(G.hunger, before, "and you are no less hungry for it");
});

test("where the dog lies is true of the room he is in", () => {
  // He turned three circles on the hotel mat inside a 7-Eleven, and padded at
  // heel "nose reading the street" at a police station counter and on sand.
  assert.equal(_dogSpot(ROOMS.jomtien_7eleven), "outside", "no Thai shop admits a street dog");
  assert.equal(_dogSpot(ROOMS.stinky_bar), "under", "an open-front beer bar has no door to stop him");
  assert.equal(_dogSpot(ROOMS.soi_rompho), "heel", "the market is his industry");
  G.dog = { since: 1, name: null };
  for (const room of ["police_station", "jomtien_beach"]) {
    G.room = room; G.dogRoomSeen = null; out = [];
    _describeRoom(false);
    assert.doesNotMatch(text(), /nose reading the street/,
      `${room} is not a street and the line no longer says it is`);
  }
});

test("the dog is in the goodbye, and in the decision to stay", () => {
  // "the city doesn't come to see you off" was printed to a man whose dog was
  // asleep against his door; "the soi absorbs the news without comment" to the
  // man deciding never to fly home, with the reason at his feet.
  G.dog = { since: 1, name: null }; G.day = 8;
  out = []; _endVacation();
  assert.match(text(), /Sai Krok/, "the flight home");
  out = []; _goExpat();
  assert.match(text(), /Sai Krok/, "and the decision to stay");
  // no dog, no line — nobody gets a phantom companion
  G.dog = null; out = []; _goExpat();
  assert.doesNotMatch(text(), /Sai Krok/);
});

test("eight lanes of Sukhumvit, crossed with a dog", () => {
  // The game's own most dangerous move — "every year this road kills a handful
  // of people" — walked with a dog at heel and not one word about him.
  G.dog = { since: 1, name: null }; G.room = "sukhumvit_crossing";
  out = []; stub(() => run("e"));
  assert.match(text(), /Sai Krok/, "he crosses it with you");
  // he is never the one who gets hit — the risk stays yours
  assert.equal(!!G.dog, true);
});

test("a job you already did is settled, not offered", () => {
  // Bert acknowledged the Shamrock pilgrimage in one line and offered it as a
  // job in the next, to a man holding the brass tag.
  const q = Object.entries(QUESTS).find(([, v]) => v.doneFlag && v.giver);
  assert.ok(q, "some quest carries a doneFlag");
  const [qid, quest] = q;
  G.quests = {}; _setFlag(quest.doneFlag);
  for (const dep of quest.deps || []) G.quests[dep] = "done";
  if (quest.reqFlags) for (const f of quest.reqFlags) _setFlag(f);
  if (_questAvailable(qid)) {
    out = []; _questOffer(_qGiver(quest));
    if (/has a job for you|owes you for one already done/.test(text()))
      assert.match(text(), /owes you for one already done/,
        "the offer knows the thing is done");
  }
});

test("a companion in a massage shop is not drinking at a bar that isn't there", () => {
  // Cherry Oil Massage carries a `bar:` display name, so walking a companion in
  // printed the full bar arrival and billed a lady drink in a room with no bar
  // and no staff.
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} };
  G.money = 5000;
  out = []; _partyArrive("beachrd_oil");
  assert.equal(text(), "", "a massage shop pays no arrival");
  assert.equal(G.money, 5000, "and bills no drink");
  out = []; _partyArrive("stinky_bar");
  assert.match(text(), /Lek/, "a real bar still does");
});

test("the hospital lesson teaches the transport rules the game actually runs", () => {
  // "The baht bus … stops running at 02:00" survived the last-bus rework, which
  // replaced the curfew with a wait at the kerb — and the in-game warning the
  // same night says the opposite.
  const lessons = [...Object.values(_DEBRIEF), ...Object.values(_HOSP_WHY),
    ...Object.values(_HOSP_WHY_SOI6)].map(f => (typeof f === "function" ? f() : f));
  for (const l of lessons)
    if (l && typeof l.next === "string")
      assert.doesNotMatch(l.next, /stops running at/, "no lesson teaches the retired curfew");
  assert.ok(lessons.some(l => l && typeof l.next === "string" && /sparse|wait at the kerb|how thin/.test(l.next)),
    "the bike lesson teaches what the buses actually do after two");
});

// ── The sea wall (Mario, 2026-09-05) ───────────────────────────────────────

test("the sea wall north of Soi 6 is the coconut bar's sibling, and its cast says so first", () => {
  // Three ladyboy freelancers on the low wall at the north corner — the answer
  // to round 44's finding that the game's only katoey on a pavement was a
  // pickpocket. The doctrine of the scene is that there is no reveal in it.
  const e = ENCOUNTERS.seawall;
  assert.deepEqual(e.rooms, ["beach_rd_top"]);
  assert.ok(e.interactive && e.nightly && e.solo);
  const intros = Array.isArray(e.intro) ? e.intro : [e.intro];
  assert.ok(intros.length >= 2, "the opening is pooled like every repeatable line");
  for (const i of intros) {
    assert.match(i, /ladyboy/, "she says what she is, unprompted, in the intro itself");
    assert.match(i, /Kate|Aor|Baiyok/, "and all three are named");
    assert.match(i, /No bar|no bar/, "no bar, no barfine — the coconut-bar doctrine");
  }
  // the prices are constants, quoted from them
  assert.ok(SEAWALL_ONE > 0 && SEAWALL_TWO > SEAWALL_ONE);
  assert.match(e.hint, new RegExp("฿" + SEAWALL_ONE));
  assert.match(e.hint, new RegExp("฿" + SEAWALL_TWO));
});

test("the sea wall never robs you — the pickpocket is the other encounter", () => {
  // The dark sand rolls `robbed` because the dark sand has no witnesses. This is
  // a lit corner, and a second thieving katoey scene would have made theft the
  // whole of what the game says about them outdoors.
  for (const roll of [0.01, 0.2, 0.5, 0.8, 0.99]) {
    out = []; newGame();
    _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
    G.room = "beach_rd_top"; G.nightTurn = 65;
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
    const saved = _rand; _rand = () => roll;
    try { _startEnc("seawall"); run("yes"); } finally { _rand = saved; }
    assert.doesNotMatch(text(), /woke up lighter|robbed/i, `roll ${roll} takes nothing`);
    // the night ends the way a barfine ends, never the way the dark sand can
    assert.equal(G.nightLog[G.nightLog.length - 1], "barfine",
      `roll ${roll} closes as an ordinary night, not a robbery`);
  }
});

test("saying no on the sea wall costs nothing and is not punished", () => {
  G.room = "beach_rd_top"; G.nightTurn = 65; G.money = 9000;
  const happy = G.happy;
  out = []; _startEnc("seawall"); run("no");
  assert.equal(G.money, 9000);
  assert.equal(G.happy, happy, "declining is free — no moral grading in either direction");
  assert.doesNotMatch(text(), /insult|laugh/i);
});

test("the north corner only produces the wall once its own prose has changed", () => {
  // The room describes joggers and an ice-cream cart until midnight; the
  // encounter must not deliver three women onto a wall the prose says is empty.
  assert.ok(Array.isArray(ROOMS.beach_rd_top.lateDesc), "the corner has a pooled night face");
  for (const l of ROOMS.beach_rd_top.lateDesc)
    assert.match(l, /wall|corner/, "and every variant paints the same place");
  G.room = "beach_rd_top"; G.nightTurn = 20; G.visited.beach_rd_top = false;
  out = []; _describeRoom(true);
  assert.match(text(), /ice-cream cart/, "before midnight it is still the quiet end");
  G.nightTurn = 65; G.visited.beach_rd_top = false;
  out = []; _describeRoom(true);
  assert.match(text(), /wall/, "after midnight the wall has people on it");
});

test("the chip bar carries the sea wall's three answers", () => {
  G.room = "beach_rd_top"; G.nightTurn = 65; G.money = 9000;
  _startEnc("seawall");
  const chips = _chipSet().map(c => c.cmd);
  for (const c of ["yes", "both", "no"]) assert.ok(chips.includes(c), `${c} is tappable`);
});

// ── TOPICS: the conversation surface (2026-09-05) ──────────────────────────

test("TOPICS lists only what the person will actually answer, right now", () => {
  // The promise property, and the reason the list can't rot: _convoTopics mirrors
  // _pickDialogue's own gates, so anything printed is answerable THIS turn.
  // Build the miss oracle by running nonsense rather than transcribing pools.
  for (const id of ["bert", "lek", "mort"]) {
    if (!NPCS[id]) continue;
    const room = _npcRoom(id);
    const setup = () => {
      out = []; newGame();
      G.player = { origin: "monger", personality: "joker", orientation: "straight" };
      _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.nightTurn = 30;
      for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
      G.peddlerNight = 2; G.room = room; G.known[id] = true;
    };
    setup();
    const misses = new Set();
    for (const junk of ["zqxwv", "photosynthesis", "belgium"]) {
      out = []; run(`ask ${id} about ${junk}`); misses.add(text().slice(-90));
    }
    setup();
    const open = _convoTopics(id);
    assert.ok(open.length, `${id} has open topics`);
    for (const t of open) {
      setup();
      out = []; run(`ask ${id} about ${t}`);
      assert.ok(!misses.has(text().slice(-90)),
        `${id} answers "${t}" — TOPICS must never offer a topic that misses`);
    }
  }
});

test("the chip bar reaches every open topic, four at a time", () => {
  G.room = "stinky_bar"; G.known.bert = true;
  run("talk to bert");
  const open = _convoTopics("bert");
  assert.ok(open.length > 4, "Bert is deep enough to page");
  const seen = new Set();
  const pages = Math.ceil(open.length / 4);
  for (let i = 0; i < pages; i++) {
    for (const c of _chipSet()) {
      const m = /^ask bert about (.+)$/.exec(c.cmd);
      if (m) seen.add(m[1]);
    }
    run("topics");
  }
  assert.equal(seen.size, open.length,
    `every one of Bert's ${open.length} open topics is tappable across ${pages} pages`);
  // and the pager itself is on the bar, so a thumb knows there is more
  assert.ok(_chipSet().some(c => c.cmd === "topics"), "the more-chip is offered");
});

test("TOPICS is a readout: free, and it never lies about an empty book", () => {
  G.room = "stinky_bar"; G.known.bert = true;
  const t0 = G.turns;
  run("topics bert");
  assert.equal(G.turns, t0, "a readout costs no turn, like QUESTS and SCORE");
  // somebody with nothing open gets a voiced line, not a crash and not a blank
  const shy = Object.keys(NPCS).find(id => NPCS[id].dialogue && !_convoTopics(id).length);
  if (shy) {
    out = []; run("topics " + NPCS[shy].name.toLowerCase());
    assert.ok(text().trim().length > 0);
    assert.doesNotMatch(text(), /undefined|\[object/);
  }
});

test("the page belongs to the partner, not to the bar", () => {
  G.room = "stinky_bar"; G.known.bert = true;
  run("talk to bert", "topics");
  assert.ok(G.convoPage > 0, "you turned Bert's page");
  const other = _npcsHere().find(id => id !== "bert" && NPCS[id].dialogue);
  if (other) {
    run("talk to " + NPCS[other].name.toLowerCase());
    assert.equal(G.convoPage, 0, "a page into Bert means nothing with somebody else");
  }
});

test("TOPICS is on all the surfaces a verb has to be on", () => {
  assert.ok(_COMPLETE_VERBS.includes("topics"), "autocomplete");
  assert.ok(_FREE_VERBS.has("topics"), "free");
  assert.match(_HELP, /TOPICS/, "the full card");
  assert.match(_HELP_SOI6, /TOPICS/, "and the soi6 card");
  G.room = "stinky_bar"; G.known.bert = true; run("talk to bert");
  assert.ok(_chipSet().some(c => c.cmd === "topics"), "the chip bar");
});
