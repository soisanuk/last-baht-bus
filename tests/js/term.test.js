// The decoration contract: term.js wraps actionable words in <b class="kw">
// spans — names, enterable bars, items present, exits, CAPS hints — and
// escapes everything else. The engine's prose stays plain; this is the
// renderer's business alone (and the future flyout wheel's tap targets).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine.js",
  "data.js", "examples.js", "tokeniser.js", "thai-script.js", "wordcard.js",
  "term.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}
engineInit(() => {});
newGame();

const kw = (s, k) => `<b class="kw" data-k="${k}" data-v="${s}">${s}</b>`;

test("character and bar names get the kw wrap; longest name wins", () => {
  assert.equal(_term.decorate("Talk to Candy."), `Talk to ${kw("Candy", "npc")}.`);
  assert.equal(_term.decorate("Nigel is at Candy Bar 2 tonight."),
    `${kw("Nigel", "patron")} is at ${kw("Candy Bar 2", "bar")} tonight.`);
  assert.ok(_term.decorate("Madam Oy owns the place.").includes(kw("Madam Oy", "npc")));
});

test("items decorate only where they are present", () => {
  // the receipt starts in your pocket
  assert.ok(G.itemLoc.receipt === "inventory");
  const name = ITEMS.receipt.name;
  assert.ok(_term.decorate(`A ${name} pokes out.`).includes(kw(name, "item")));
});

test("the exits line lights every direction", () => {
  assert.equal(_term.decorate("Exits: n, e, out."),
    `Exits: ${kw("n", "exit")}, ${kw("e", "exit")}, ${kw("out", "exit")}.`);
});

test("CAPS command hints inside parentheses glow; prose caps outside do not", () => {
  const d = _term.decorate("(WATCH POLICE — or WATCH SUNSET, the bay is fine too.)");
  assert.ok(d.includes(kw("WATCH POLICE", "cmd")), d);
  assert.ok(d.includes(kw("WATCH SUNSET", "cmd")), d);
  assert.equal(_term.decorate("He yells HANDSOME MAN at the street."),
    "He yells HANDSOME MAN at the street.", "caps outside parens stay plain");
});

test("HTML in text is escaped before decoration", () => {
  assert.equal(_term.decorate("<script>alert(1)</script>"),
    "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("the wheel: exits and closed hints fire straight; open hints prefill", () => {
  assert.deepEqual(_term.kwActions("exit", "n", false),
    [{ t: "go n", c: "go n", go: true }]);
  assert.deepEqual(_term.kwActions("cmd", "WATCH POLICE", false),
    [{ t: "watch police", c: "watch police", go: true }]);
  const open = _term.kwActions("cmd", "TIP <lady> <amt>", false)[0];
  assert.equal(open.go, false, "placeholders mean the player finishes the command");
  assert.match(open.c, /^tip /);
});

test("the wheel: quick vs comprehensive for a present hostess", () => {
  G.room = "lucky_tiger"; // Lek's bar
  const quick = _term.kwActions("npc", "Lek", false);
  const labels = quick.map(a => a.t);
  assert.ok(labels.includes("talk"), "talk is quick");
  assert.ok(labels.includes("buy her a drink"), "the soi's love language");
  assert.ok(!labels.includes("barfine"), "barfine is not a quick tap");
  const full = _term.kwActions("npc", "Lek", true);
  const fullLabels = full.map(a => a.t);
  assert.ok(fullLabels.includes("flirt"));
  assert.ok(fullLabels.includes("barfine"));
  G.known.oy = true; // Oy's name has come up in gossip
  const known = _term.kwActions("npc", "Lek", true).map(a => a.t);
  assert.ok(known.some(t => /^ask about oy$/.test(t)), "live topics surface on hold");
});

test("the wheel: name-topics stay hidden until the name has printed", () => {
  newGame();
  G.room = "beach_rd_s"; // Bank's motosai stand; Pim never mentioned yet
  let topics = _term.kwActions("npc", "Bank", true).map(a => a.t);
  assert.ok(!topics.includes("ask about pim"), "who is Pim?");
  assert.ok(topics.includes("ask about darkside"), "place topics are not gated");
  _say("“My girlfriend Pim — Starlight Bar, LK Metro.”");
  topics = _term.kwActions("npc", "Bank", true).map(a => a.t);
  assert.ok(topics.includes("ask about pim"), "the transcript named her");
});

test("the wheel: an absent name routes through whoever is here", () => {
  G.room = "candy_bar"; // Candy present, Oy absent
  const acts = _term.kwActions("npc", "Madam Oy", false);
  assert.match(acts[0].c, /^ask candy about madam oy$/);
  assert.equal(acts[0].go, true);
  assert.ok(acts.every(x => x.go), "no dangling 'ask …' when someone is here");
  G.room = "jomtien_beach"; // nobody around: the open prefill is all there is
  const alone = _term.kwActions("npc", "Madam Oy", false);
  assert.equal(alone.length, 1);
  assert.equal(alone[0].go, false);
});

test("the wheel: items offer take here, read in the pocket", () => {
  G.room = "jomtien_beach";
  const name = ITEMS.receipt.name; // starts in inventory
  const acts = _term.kwActions("item", name, true).map(a => a.t);
  assert.ok(acts.includes("read"));
  assert.ok(acts.includes("drop"));
  assert.ok(!acts.includes("take"), "already yours");
});

test("Thai in the transcript tokenizes into tappable vocab words", () => {
  const d = _term.decorate("“สวัสดีค่ะที่รัก” (sawatdee kha tilac)");
  assert.ok(d.includes(kw("สวัสดี", "thai")), d);
  assert.ok(d.includes(kw("ค่ะ", "thai")));
  assert.ok(d.includes(kw("ที่รัก", "thai")));
});

test("entity Thai stays whole: แคนดี้ is Candy, not vocab shrapnel", () => {
  const d = _term.decorate("ป้ายเขียนว่า แคนดี้");
  assert.ok(d.includes(kw("แคนดี้", "thai")), d);
});

test("the wheel: bare PLAY fans out into this room's games", () => {
  G.room = "stinky_bar";
  G.day = 4; // no league tonight
  const acts = _term.kwActions("cmd", "PLAY", false);
  assert.deepEqual(acts.map(a => a.c), ["play connect 4", "play jackpot", "play pool"]);
  assert.ok(acts.every(a => a.go), "each fires as a complete command");
  G.room = "jomtien_beach"; // nothing to play: plain cmd behavior remains
  assert.deepEqual(_term.kwActions("cmd", "PLAY", false),
    [{ t: "play", c: "play", go: true }]);
});

test("the wheel: DROP fans out into open columns during Connect 4", () => {
  G.game = { type: "c4", board: c4New() };
  const acts = _term.kwActions("cmd", "DROP", false);
  assert.equal(acts.length, 7);
  assert.deepEqual(acts[0], { t: "drop 1", c: "drop 1", go: true });
  G.game = null; // no game: DROP is the ordinary item verb again
  assert.deepEqual(_term.kwActions("cmd", "DROP", false),
    [{ t: "drop", c: "drop", go: true }]);
});

test("anonymous staff decorate only where they stand", () => {
  G.room = "myth_night";
  assert.equal(_term.decorate("Complex security watches the lane."),
    "Complex security watches the lane.", "no dead-end tap in Myth Night");
  G.room = "rainbow_girls";
  assert.ok(_term.decorate("The security detail is load-bearing.")
    .includes(kw("security", "npc")), "tappable where they stand");
});

test("entity Thai doesn't fire inside a longer word: หมด is not Mot (มด)", () => {
  const d = _term.decorate("แบตหมดเหรอ");
  assert.ok(d.includes(kw("หมด", "thai")), d);
  assert.ok(!d.includes(kw("มด", "thai")), d);
});

test("tapping plain Thai goes straight to the word card; entity Thai gets the wheel", () => {
  // plain vocab word: exactly one action, a function, so tap = instant modal
  const plain = _term.kwActions("thai", "สวัสดี", false);
  assert.equal(plain.length, 1);
  assert.equal(typeof plain[0].fn, "function");
  assert.match(plain[0].t, /translate/);
  // Candy's Thai name while she's in the room: her game actions + translate
  G.room = "candy_bar";
  const ent = _term.kwActions("thai", "แคนดี้", false);
  const labels = ent.map(a => a.t);
  assert.ok(labels.includes("talk"), "the world gets first claim");
  assert.ok(labels.some(t => /translate/.test(t)), "the dictionary rides along");
  assert.ok(ent.length > 1, "a wheel, not an instant fire");
});

test("every Thai word the game prints resolves in the vendored vocab", () => {
  // the coverage contract: game Thai is always tappable-and-translatable.
  // New writing that introduces Thai must either use vocab words or add
  // them to the trainer's data.js (source of truth) and re-vendor.
  const map = {};
  for (const w of WORDS) map[w[0]] = w;
  for (const n of Object.values(NPCS)) if (n.th) map[n.th] = ["ent"];
  const tok = makeTokeniser(map);
  const srcs = ["world.js", "engine.js", "thai.js"].map(f => readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8")).join("\n");
  let gen = [];
  for (let n = 0; n <= 999; n++) gen.push(thaiNum(n)); // runtime-composed numbers
  const all = srcs + "\n" + gen.join("\n");
  const unknown = new Set();
  for (const run of all.match(/[฀-๿]{2,}/g) || []) {
    if (/^[๐-๙]+$/.test(run)) continue; // Thai numerals are the puzzle, not vocab
    for (const t of tok(run)) {
      if (!t.word && t.text.length >= 2 && !/^[๐-๙]+$/.test(t.text)) unknown.add(t.text);
    }
  }
  assert.deepEqual([...unknown], [],
    "unknown Thai in game text — add to the trainer's data.js and re-vendor");
});

test("Thai numerals stay undecorated — the safe PIN is a puzzle, not vocab", () => {
  const d = _term.decorate("The keypad reads ๗๑๙ in fading paint.");
  assert.equal(d, "The keypad reads ๗๑๙ in fading paint.");
});
