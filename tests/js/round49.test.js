// Round 49 (2026-09-16) — three personas aimed off the coverage query rather than
// intuition: Brian, who drinks between opening time and midnight and whose hobby is
// punctuality (lens: early-doors); Gary, who will not set foot on Soi 6 or Beach Road
// (lens: off-the-soi); Helen, an employment-rights caseworker who asks everybody what
// their job actually is (lens: the-interviewer). Brian and Helen independently
// collected the SAME closing sentence from eleven mouths in seven bars.
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
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});
const ask = (room, who, topic) => { G.room = room; out = []; doCommand(`ask ${who} about ${topic}`); return text(); };
const miss = /not my story|wrong (girl|man|mama)|I don't know about that|That one I don't know|No idea, mate|doesn't land on anyone|Can't help you there/i;

test("a property is not a comment: nothing is swallowed by a trailing line comment", () => {
  // `water: true` and a dialogue node's `deflect: true` had each been absorbed into
  // the `//` comment on their own line — silent, invisible to every test, and the
  // mall's food court could not sell a bottle of water for its whole life.
  assert.equal(ROOMS.mikes_mall.water, true, "the mall's food court sells water");
  const gated = NPCS.fast_eddy.dialogue.filter(d => /rabbit job/.test(d.topic || ""));
  assert.ok(gated.some(d => d.deflect), "the heist deflect is a deflect");
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  const swallowed = src.split("\n")
    .map((l, i) => [i + 1, l])
    // a SWALLOWED property always has code before the `//` — a whole-line comment
    // that happens to mention `offmap:true` in prose is not a finding
    .filter(([, l]) => !/^\s*\/\//.test(l) && /\/\/[^"']*\b[a-zA-Z_]+: +(true|false|[0-9]+) *,? *$/.test(l));
  assert.deepEqual(swallowed.map(([n]) => n), [], "a trailing // comment has eaten a property");
});

test("the town can answer its own hours, and not in one voice", () => {
  // Brian asked a hostess, a cashier, a mamasan, a manager, a pub waitress and a
  // masseuse over five nights: every one of them answers "closing" and not one
  // could answer its mirror.
  const openers = ["kade", "bert"];
  for (const who of openers) {
    const r = _npcRoom(who);
    assert.doesNotMatch(ask(r, who, "opening"), miss, who + " knows what time the place opens");
    assert.doesNotMatch(ask(r, who, "busy"), miss, who + " knows when it fills up");
  }
  // …and the closing answer is POOLED: eleven mouths gave one sentence.
  const said = new Set();
  for (const g of Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "hostess").slice(0, 8)) {
    const line = ask(_npcRoom(g), g, "closing").split("·")[0].trim();
    if (line && !miss.test(line)) said.add(line);
  }
  assert.ok(said.size >= 3, "the floor has more than one way to say it (got " + said.size + ")");
});

test("a parlour answers as a parlour, and the woman who runs it is the house", () => {
  // Pensri gave the bar's "last man off the stool, and that's usually me" in a
  // room with reclining chairs and no stools, and could not quote the ฿300 list
  // on her own wall — she carries no NPC_ROLES entry (Helen, at Ruean Sabai).
  const r = _npcRoom("pensri");
  const close = ask(r, "pensri", "closing");
  assert.doesNotMatch(close, miss);
  assert.doesNotMatch(close, /stool|dawn/i, "a massage shop is not an all-night bar");
  assert.doesNotMatch(ask(r, "pensri", "price"), miss, "she quotes her own board");
  assert.doesNotMatch(ask(r, "pensri", "opening"), miss);
});

test("a manager does not answer in a bar girl's Tinglish, and one boss gets more than one review", () => {
  // Bert gave back "You be nice to me, she know that too" — verbatim what a
  // hostess said two nights earlier, from a man written in Ohio English.
  const bert = ask("stinky_bar", "bert", "lamai");
  assert.doesNotMatch(bert, /\btilac\b|\bna\b[.,”]|she know that too/i, "the register belongs to the speaker");
  // Cake and Lamai reviewed the same manager identically, back to back.
  const staff = _staffAt("stinky_bar").filter(x => x !== "bert" && (NPC_ROLES[x] || NPCS[x].manager));
  const reviews = new Set(staff.map(x => ask("stinky_bar", NPCS[x].name, "bert").split("·")[0].trim()));
  assert.ok(reviews.size === staff.length, "colleagues do not share one sentence about the boss");
});

test("'my bar' is an ownership claim, and a mamasan does not own the bar", () => {
  const mamas = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "mamasan" && !NPCS[id].owner).slice(0, 5);
  assert.ok(mamas.length >= 2, "there are mamasans who own nothing");
  for (const id of mamas) {
    const line = ask(_npcRoom(id), id, "bar");
    if (miss.test(line)) continue;
    assert.doesNotMatch(line, /"My bar\./, NPCS[id].name + " does not own the place");
  }
});

test("a meal said to be on the house is on the house — once", () => {
  _setFlag("lakeFishFree");
  G.room = "lake_bar"; G.hunger = 80;
  for (const k of Object.keys(G.itemLoc)) if (/noodle|moo_ping|toastie/.test(k)) G.itemLoc[k] = null;
  let before = G.money;
  out = []; doCommand("eat");
  assert.equal(G.money, before, "Duangjai said the fish was on the house");
  assert.ok(G.hunger < 80, "…and it was food");
  before = G.money; G.hunger = 80;
  out = []; doCommand("eat");
  assert.ok(G.money < before, "the second one is a fish like any other");
});

test("the first morning of a new trip reports the night that was played", () => {
  G.day = 7; G.money = 5000;
  _newVacation();
  assert.ok(G.lastNight, "a fresh baseline for the new trip's first night");
  G.nightTurn = 100; G.money = 4140;
  _endNight("dawn");
  out = []; doCommand("last night");
  assert.doesNotMatch(text(), /First morning in town/, "a night was played and it is on the books");
});

test("Wilf is on the bench, and a regular's local may be a kitchen", () => {
  assert.equal(NPCS.wilf.patron, true);
  assert.ok(Number.isInteger(NPCS.wilf.age) && NPCS.wilf.nat, "the profile the bench invariant checks");
  assert.doesNotMatch(ask("mikes_mall", "wilf", "opening"), miss, "the one place in town with real hours can state them");
});

test("the mamasan quotes the number she sets — the cashiers promise she will", () => {
  // Three cashiers say "ask Mama anything, she will tell you the answer and the
  // price", and at three bars she could not discuss the barfine. Worse, the
  // natural phrasing — "how much to take a girl out" — reached _priceTalk and
  // came back with a list of drinks (Helen, round 49).
  G.nightTurn = 40;
  const mamas = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "mamasan").slice(0, 4);
  assert.ok(mamas.length >= 2);
  for (const id of mamas) {
    const room = _npcRoom(id);
    if (!ROOMS[room] || !ROOMS[room].barType) continue;
    const bf = _barfinePrices(ROOMS[room].barType);
    for (const phrasing of ["barfine", "bar fine", "how much to take a girl out"]) {
      G.room = room; out = []; doCommand(`ask ${id} about ${phrasing}`);
      const said = text();
      assert.doesNotMatch(said, miss, `${id} answers "${phrasing}"`);
      assert.ok(said.includes("฿" + bf.st) || said.includes("฿" + bf.lt),
        `${id} quotes what the till will charge ("${phrasing}")`);
    }
    // …and it is on her price list, because that is what the cashier promised
    G.room = room; out = []; doCommand(`ask ${id} about price`);
    assert.match(text(), /barfine|her own money/i, `${id}'s price list carries the fine`);
  }
});

test("a promise that states its own condition opens when the condition is met", () => {
  // "Come and sit with me on a night the rain has killed the pool and nobody
  // wants anything. I tell you the whole thing then." Helen bought four lady
  // drinks, sat through the rain, asked again — and got the deflection back,
  // because the story is a topicless beat fired by TALK and she was ASKING.
  G.room = "lucky_tiger"; G.soc.drinks.lek = 5; G.day = 2; G.rain = 0;
  out = []; doCommand("ask lek about price");
  assert.match(text(), /night the rain has killed the pool/, "a dry night still sends you looking");
  assert.ok(!_flag("heardPriceStory"));
  G.rain = 4;
  out = []; doCommand("ask lek about price");
  assert.match(text(), /did I think this is Dubai/, "the night she named opens it");
  assert.ok(_flag("heardPriceStory"), "and it is heard exactly once");
  out = []; doCommand("ask lek about price");
  assert.match(text(), /Same as I tell you in the rain/, "afterwards she answers as somebody who told you");
});

test("the town can say what its people do, who they answer to, and what it pays", () => {
  // WORK, JOB, BOSS, PAY and SALARY were not words this town answered to — about
  // thirty people asked, two could answer, while the same people answer `bar`,
  // `hours`, `price` and `family` beautifully (Helen, round 49, an
  // employment-rights caseworker). The content existed; the vocabulary did not
  // reach it. Judged per character against a miss oracle built by RUNNING
  // nonsense at that same character, because the miss pools branch by role.
  const NONSENSE = ["photosynthesis", "wolverhampton", "quadratics", "a xylophone"];
  const norm = t => String(t || "").split("\n").filter(l => !/^\s*·/.test(l)).join(" ").replace(/\s+/g, " ").trim();
  const words = ["work", "job", "boss", "pay"];
  const freeze = () => { G.nightTurn = 40; G.hunger = 10; G.thirst = 10; G.soc.drunk = 0; G.money = 9000; };
  const sample = Object.keys(NPC_ROLES).filter(id => !NPCS[id].filler).slice(0, 12);
  assert.ok(sample.length >= 6, "a sample of role-carriers");
  let deaf = [];
  for (const id of sample) {
    const room = _npcWhere(id); if (!room || !ROOMS[room]) continue;
    freeze(); G.room = room;
    const oracle = new Set();
    for (const q of NONSENSE) { freeze(); out = []; doCommand(`ask ${id} about ${q}`); oracle.add(norm(text())); }
    if (oracle.size > 4) continue;
    let hits = 0;
    for (const w of words) { freeze(); out = []; doCommand(`ask ${id} about ${w}`); if (!oracle.has(norm(text()))) hits++; }
    if (hits === 0) deaf.push(NPCS[id].name);
  }
  assert.deepEqual(deaf, [], "a member of staff can say what the job is");
});

test("a character's livelihood is filed under its own word, and `work:` points at it", () => {
  // Jerry's is `teaching`, Danny's `crypto`, Neil's `clam`, Wilf's `pension` —
  // all written, none reachable by the word a player types.
  const mapped = Object.entries(NPCS).filter(([, n]) => n.work);
  assert.ok(mapped.length >= 8, "the mapping exists");
  for (const [id, n] of mapped) {
    const d = _pickDialogue(id, n.work);
    assert.ok(d && d.topic, `${n.name}: work: "${n.work}" names a topic he actually has`);
  }
  // …and it is reachable through the verb
  G.day = 1; G.room = "stinky_bar";
  out = []; doCommand("ask jerry about work");
  assert.match(text(), /Thirty-two thousand|32k/, "his teaching node answers 'work'");
});

test("a stranger gets the SHAPE of the money, never the ledger's figures", () => {
  // _OTHER_LEDGER is bond-gated on purpose — the cut, the quota, the sending
  // north are hers to show you when she knows you. The generic work answer must
  // not pre-empt them, or the reveal becomes a readout.
  const girls = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "hostess").slice(0, 8);
  for (const id of girls) {
    const room = _npcWhere(id); if (!room) continue;
    G.room = room; G.soc.drinks[id] = 0;
    for (const w of ["pay", "salary", "work"]) {
      out = []; doCommand(`ask ${id} about ${w}`);
      // the ฿-forms only: BAR_QUOTA is 30 and a bare "30" matches ฿300, a turn
      // count and half the prices in town — the ledger quotes the quota in words
      // ("Thirty drink a month"), which is checked separately below
      for (const fig of [LADY_CUT, BAR_SALARY, HOME_SEND])
        assert.ok(!text().includes("฿" + fig),
          `${NPCS[id].name} does not quote the ledger's ฿${fig} to a stranger`);
      assert.doesNotMatch(text(), /thirty drink|drink a month/i,
        `${NPCS[id].name} does not state the quota to a stranger`);
    }
  }
});

test("the killer table has a king, and he has to keep turning up", () => {
  // Nothing was tracked across the week. `wonLeague` is a one-shot quest flag,
  // so a second win did nothing — while Bert promised "that goes up behind the
  // till tonight" and "defend it next league night", and the LOSS line promised
  // "the bar takes your name for next league night". None of it existed
  // (Mario asked, 2026-09-16). Killer has no rankings anywhere — it is a
  // one-night knockout — so what a bar keeps is the chalk, held until lost.
  G.room = "stinky_bar"; G.day = 3; G.money = 20000;
  assert.ok(_leagueTonight(), "day 3 is a league night");

  // claiming, and defending, are different lines
  G.kpTitle = {};
  G.kpTitle[G.room] = { since: 1, defended: 0 };
  assert.equal(G.kpTitle.stinky_bar.defended, 0);

  // a league night you do not turn up for takes it off you
  G.kpPlayed = {};
  _kpTitleTick();
  assert.deepEqual(G.kpTitle, {}, "the table does not wait for an absent champion");
  assert.ok(G.kpLost && G.kpLost.stinky_bar, "…and you find out when you next walk in");
  out = []; G.room = "beach_rd_n"; doCommand("go stinky pinky");
  assert.match(text(), /chalk/i, "the news is delivered on arrival, once");
  out = []; G.room = "beach_rd_n"; doCommand("go stinky pinky");
  assert.doesNotMatch(text(), /wiped the till chalk|different name on it/i, "and only once");

  // turning up and playing keeps it, win or lose — presence is the defence
  G.kpTitle = { stinky_bar: { since: 1, defended: 0 } };
  G.kpPlayed = { stinky_bar: true };
  _kpTitleTick();
  assert.ok(G.kpTitle.stinky_bar, "you played: it is still yours to lose at the table");

  // and holding it is felt: league night comes looking for you
  G.room = "beach_rd_n"; G.nightTurn = 20; G.soc.kpChall = {}; G.kpPlayed = {};
  out = []; doCommand("go stinky pinky");
  assert.match(text(), /PLAY KILLER/, "you are challenged for your own table");
  // …but not when you do not hold it
  G.kpTitle = {}; G.soc.kpChall = {}; G.room = "beach_rd_n";
  out = []; doCommand("go stinky pinky");
  assert.doesNotMatch(text(), /still on the chalk|cue is leaning against your stool/,
    "nobody is hunting a man who holds nothing");
});

test("the table signposts are derived, and name only bars you have found", () => {
  // Two hard-coded lists named two different pairs of bars, neither matching the
  // other and neither including the Lucky Tiger — of eight tables in town. Asked
  // in the Blue Dog, the pool line sent a man to Walking Street and the Darkside
  // and never mentioned the Stinky Pinky across the road (Kevin, round 50).
  const tables = Object.keys(ROOMS).filter(id => ROOMS[id].pool);
  assert.ok(tables.length >= 6, "there are plenty of tables");
  G.room = "blue_dog"; G.visited = {}; G.heardOf = {};
  out = []; doCommand("play pool");
  assert.doesNotMatch(text(), /Midnight Sun|Daeng/, "it does not name bars you have never found");
  assert.match(text(), /ask around for a table/i);
  // …and once you know one, it is named
  G.visited = { lucky_tiger: true };
  out = []; doCommand("play pool");
  assert.match(text(), /Lucky Tiger/, "a bar you have stood in is named");
  out = []; doCommand("play killer");
  assert.match(text(), /Lucky Tiger/, "and both signposts agree, because both are derived");
});

test("Bert hands back chalk only while it is still up", () => {
  G.room = "stinky_bar"; _setFlag("wonLeague");
  G.kpTitle = { stinky_bar: { since: 1, defended: 0 } };
  out = []; doCommand("ask bert about league");
  assert.match(text(), /name-chalk|King of the killer table/, "champion gets the champion's scene");
  G.kpTitle = {}; G.talked = {};
  out = []; doCommand("ask bert about league");
  assert.doesNotMatch(text(), /name-chalk on the bar like evidence/, "…and the deposed do not");
  assert.match(text(), /Held it, lost it/, "the man who crowned you noticed");
});

test("the slate is a thing in the room, not one line every third night", () => {
  G.kpTitle = { stinky_bar: { since: 1, defended: 2 } };
  G.room = "beach_rd_n";
  out = []; doCommand("go stinky pinky");
  assert.match(text(), /name is on the slate/, "the room carries standing state");
  out = []; doCommand("examine chalk");
  assert.match(text(), /your name/i);
  assert.match(text(), /2 marks/, "the bar keeps the count for you");
  G.kpTitle = {};
  out = []; doCommand("examine chalk");
  assert.match(text(), /not yours/, "…and when it is not yours it says so");
});

test("winner stays on, and losing the frame loses the table", () => {
  // Won for the table four times in a week: no challenger, no hold, not a word.
  G.room = "lucky_tiger"; G.money = 0; G.poolHold = {};
  let held = false;
  for (let i = 0; i < 40 && !held; i++) {
    out = []; doCommand("play pool");
    let guard = 0; while (G.game && guard++ < 90) doCommand("shot");
    if (/You stay on/.test(text())) held = true;
  }
  assert.ok(held, "a frame played for nothing is played for the table");
  assert.ok(G.poolHold.lucky_tiger >= 1, "and the hold is counted");
  let lost = false;
  for (let i = 0; i < 40 && !lost; i++) {
    out = []; doCommand("play pool");
    let guard = 0; while (G.game && guard++ < 90) doCommand("shot");
    if (!/You stay on/.test(text())) lost = true;
  }
  assert.ok(!G.poolHold.lucky_tiger, "the table goes with the frame");
});

test("trying to start the game you are already playing is not a free shot", () => {
  G.room = "stinky_bar"; G.money = 5000;
  doCommand("play pool");
  const before = { you: G.game.you, opp: G.game.opp };
  out = []; doCommand("play pool");
  assert.match(text(), /already on pool/i);
  assert.deepEqual({ you: G.game.you, opp: G.game.opp }, before, "no ball moved");
});

test("a man who is out is not being let have the table", () => {
  // "steps back to let you have the table" landed one line under "That was your
  // last life" (Kevin, round 50).
  assert.ok(_KP_POT_OUT.length >= 2, "the eliminated pool exists");
  for (const line of _KP_POT_OUT)
    assert.doesNotMatch(line, /let you have the table|steps back to let you|\byour shot\b/i,
      "nothing in the out-pool hands the table to a man with no lives");
  // and the live pool, which DOES address you, is only reachable while you are in
  assert.ok(_KP_POT.some(l => /let you have the table/.test(l)), "the in-play pool still has it");
});

test("the room with the table can discuss the table", () => {
  // `ask <anyone> about killer` answered everywhere; `about pool` — the word a
  // player types, in the bar with the table in it — fell through to the greeting.
  const miss2 = /not my story|wrong (girl|man|mama)|I don't know about that|That one I don't know|No idea, mate/i;
  G.room = "lucky_tiger"; G.day = 2;
  out = []; doCommand("ask ratana about pool");
  assert.doesNotMatch(text(), miss2, "the mamasan whose floor it stands on");
  assert.match(text(), /PLAY POOL/);
  G.room = "candy_bar";
  out = []; doCommand("ask candy about pool");
  assert.doesNotMatch(text(), miss2, "a bar with no table says so");
});
