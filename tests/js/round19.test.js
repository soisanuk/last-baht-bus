// Round-nineteen fixes (2026-08-29). Ken, an ex-merchant-navy persona who came
// for the company of the other old boys rather than the girls, drank at the same
// rail for three nights. Everything here is one of his findings, plus the two
// round-18 signposts that had been approved and never shipped.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");
const MISS = /Not one I know|Search me|Couldn't tell you|above my pay grade|No idea, mate|Not my department|Not my story|don't know about that/i;

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 10000;
  out = [];
}
beforeEach(() => sandbox());

// ── the money bug ──

test("going home does not buy a curse: an encounter answer is a word you say, not a command containing one", () => {
  G.room = "beach_rd_c";
  _startEnc("fortune");
  const before = G.money;
  out = [];
  doCommand("travel to sabai palms");   // "…palms" matched /palm/ and paid ฿199
  assert.equal(G.money, before, "leaving is free");
  assert.doesNotMatch(text(), /cleansing/, "and never opens the four-figure upsell");
});

test("…but consenting to the reading still costs what it costs", () => {
  G.room = "beach_rd_c";
  _startEnc("fortune");
  const before = G.money;
  out = [];
  doCommand("read my palm");
  assert.equal(before - G.money, FORTUNE_READ, "the hook still hooks");
});

// ── standing a man a drink ──

test("a man is stood what he actually drinks, and nobody repays it with Terry's anecdote", () => {
  G.room = "queen_vic";
  out = [];
  doCommand("buy drink for doyle");
  assert.match(text(), /soda water/, "Doyle nurses soda water and the game stood him a Chang for a year");
  assert.doesNotMatch(text(), /Walking Street in 2004/, "that story belongs to one man");
  out = [];
  doCommand("buy drink for angela");
  assert.match(text(), /Singha/, "hers is named in her own prose too");
});

test("the stand-a-beer line is pooled, and none of it misgenders the women at the rail", () => {
  assert.ok(_STAND_BEER.length >= 4, "a repeatable line ships a pool (house rule)");
  for (const line of _STAND_BEER)
    assert.doesNotMatch(line, /\b(he|him|his)\b/i,
      "Angela, Sandra and Josey drink at this rail too");
});

test("the landlady is served, not denied — she is the house, not a punter", () => {
  G.room = "queen_vic";
  assert.ok(NPCS.nuch.house, "the Vic has no mamasan or cashier, so she carries the house marker");
  const before = G.money;
  out = [];
  doCommand("buy drink for nuch");
  assert.equal(before - G.money, BEER_PRICE, "she takes one like anybody else");
  assert.doesNotMatch(text(), /not working this bar/i,
    "the woman running the bar is, self-evidently, working this bar");
});

// ── a man can talk about what he himself said ──

test("a proper noun in a character's own mouth is a topic they answer", () => {
  const cases = [
    ["roger", "lucky7", "lek"], ["roger", "lucky7", "football"],
    ["phil", "stinky_bar", "surin"], ["doug", "stinky_bar", "portfolio"],
    ["angela", "queen_vic", "discman"], ["terry", "queen_vic", "angela"],
  ];
  for (const [who, room, topic] of cases) {
    sandbox();
    G.room = room;
    assert.ok(_npcsHere().includes(who), `${who} is in ${room}`);
    doCommand("talk to " + who);
    out = [];
    doCommand(`ask ${who} about ${topic}`);
    assert.doesNotMatch(text(), MISS, `${who} disowned "${topic}", which is his own word`);
  }
});

test("_selfNamedNode honours gates — a locked story stays locked", () => {
  // Nira names Pim in a node the arc hasn't opened yet. The fallback must not
  // become a way to read content ahead of its trigger.
  G.room = "neon_paradise";
  const d = _selfNamedNode("nira", "pim");
  if (d) assert.ok(!d.when || d.when(_npcState("nira"), G), "anything it returns must pass its own gate");
});

test("it does not hijack ordinary words — only capitalised proper nouns count", () => {
  G.room = "queen_vic";
  doCommand("talk to terry");
  out = [];
  doCommand("ask terry about money");       // says "money" nowhere as a name
  assert.match(text(), MISS, "a common word is still a miss, not a scattergun match");
});

// ── the signposts ──

test("Doyle's terse greeting does not re-introduce him", () => {
  G.room = "queen_vic";
  doCommand("talk to doyle");
  out = [];
  doCommand("talk to doyle");
  assert.doesNotMatch(text().trim(), /^["“]?Doyle\b/,
    "he remembers you; the line must not open with his own name as though he doesn't");
});

test("An Introduction can actually be completed — being SENT opens the door", () => {
  // The deadlock nobody had named: orchidVouched gated the door AND was the
  // quest's doneFlag, and only Rose set it — from inside the door. Candy's "so I
  // am sending you" set nothing, so the sole way in was finishing Doyle's
  // unrelated recon quest. Walk the whole thing.
  G.room = "candy_bar";
  doCommand("talk to candy");
  doCommand("ask candy about rose");
  assert.ok(_flag("orchidSent"), "being sent is a thing that happens to the world");
  G.room = "naklua_rd";
  doCommand("enter orchid club");
  assert.equal(G.room, "orchid_club", "the wall has a door in it for somebody Candy sent");
  doCommand("ask rose about candy");
  assert.ok(_flag("orchidVouched"), "…and the introduction is what completes the errand");
});

test("Tan advertises the locator himself, and the quest names the key not the door", () => {
  const greet = NPCS.tan.dialogue.map(d => String(d.text)).join(" ");
  assert.match(greet, /ASK TAN ABOUT/, "the most useful verb in the game was undiscoverable");
  // the Orchid quest pointed at Rose, behind a door only Candy opens
  assert.match(QUESTS.orchid_intro.desc, /ASK CANDY ABOUT ROSE/,
    "the hint has to name the step you can actually take");
  const rose = NPCS.candy.dialogue.find(d => d.topic === "rose");
  assert.ok(rose && rose.chip !== false, "…and the node carrying the key is offerable on the chip bar");
});

// ── Round 20: the credit man's findings (Vince, 23 in-game days) ─────────────

test("a dep chain is a chain — being an origin doesn't skip other people's jobs", () => {
  // The waiver exists so an origin VIGNETTE — a scene about the man you picked,
  // which cannot happen because he is you — counts as lived. It used to waive any
  // dep whose giver was merely inactive, and that is transitive: pick the
  // investor and Wayne deactivates, so `bar_licence` (his job, not a vignette)
  // counted as done, so Candy offered step THREE of the bar chain to a man who
  // had done none of it — an unfinishable quest, permanently on the books.
  newGame();
  G.player = { origin: "business", personality: "joker", orientation: "straight" };
  G.stage = "expat";
  _setFlag("act1Done"); _setFlag("hasWallet"); _setFlag("expatLife");
  assert.equal(_npcActive("wayne"), false, "premise: you ARE the investor, so Wayne isn't out there");
  assert.equal(_questAvailable("bar_partner"), false, "step three is not available with none of the chain done");
  // …and the genuine waiver still works: nominee_deal IS his own scene
  G.quests.bar_premises = "done"; _setFlag(QUESTS.bar_premises.doneFlag);
  assert.equal(_questAvailable("bar_licence"), true, "a vignette he embodies still counts as lived");
});

test("the hotel book stops when it stops — no charge is announced that isn't made", () => {
  G.stage = "expat"; _setFlag("expatLife");
  G.hotelDebt = 0; G.money = 0; G.room = _hotelRoomId();
  let last = "";
  for (let i = 0; i < 11; i++) { out = []; _chargeRent(); last = text(); }
  assert.equal(G.hotelDebt, _DEBT_CAP, "the book caps");
  assert.doesNotMatch(last, /adds ฿\d+ to the book/,
    "and the clerk stops narrating a charge he is no longer making");
});

test("the piwin's mercy is a way out, not a taxi service", () => {
  G.money = 0; G.room = "naklua_rd";
  doCommand("motosai to walking street");
  assert.equal(G.room, "ws_gate", "a broke man gets out of trouble once");
  doCommand("motosai to naklua");
  assert.equal(G.room, "ws_gate", "…and not twice in a night");
  G.day++;
  doCommand("motosai to naklua");
  assert.equal(G.room, "naklua_rd", "the kindness renews at dawn");
});
