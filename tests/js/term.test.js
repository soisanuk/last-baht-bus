// The decoration contract: term.js wraps actionable words in <b class="kw">
// spans — names, enterable bars, items present, exits, CAPS hints — and
// escapes everything else. The engine's prose stays plain; this is the
// renderer's business alone (and the future flyout wheel's tap targets).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js",
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

test("an item name after a third-person possessive is someone else's, not tappable", () => {
  G.itemLoc.phone = "inventory"; // you carry a phone
  const dv = 'data-v="phone"';
  // NPC dialogue about her own phone must not tap through to your inventory item
  assert.ok(!_term.decorate("She checks her phone with practised ease.").includes(dv),
    "her phone");
  assert.ok(!_term.decorate("His phone lights up on the bar.").includes(dv), "his phone");
  assert.ok(!_term.decorate("Candy’s phone is always on.").includes(dv), "Candy's phone");
  // but your own phone — and generic/ambiguous mentions — still tap
  assert.ok(_term.decorate("Your phone reads 13%.").includes(dv), "your phone");
  assert.ok(_term.decorate("The phone buzzes.").includes(dv), "the phone");
  assert.ok(_term.decorate("He grabs another phone.").includes(dv),
    "the 'her' inside 'another' must not false-trigger");
});

test("{{…}} plain spans suppress all decoration inside, leaking no markers", () => {
  G.itemLoc.phone = "inventory";
  const NUL = String.fromCharCode(0);
  // the content writer's manual escape hatch for a residual case
  const one = _term.decorate("He grabs another {{phone}} off the bar.");
  assert.ok(!one.includes('data-v="phone"'), "the marked phone doesn't tap");
  assert.ok(one.includes("another phone off"), "but its text prints verbatim");
  assert.ok(!/[{][}]/.test(one) && !one.includes(NUL), "no markup/placeholder leaks");
  // a whole phrase, and it suppresses names/Thai too — not just items
  const phrase = _term.decorate("She waves {{her phone at Candy}} and grins.");
  assert.ok(!phrase.includes('data-k='), "nothing inside the span decorates");
  // live decoration still runs OUTSIDE the span
  const mixed = _term.decorate("{{phone}} — but ask Candy about it.");
  assert.ok(!mixed.includes('data-v="phone"'), "inside stays plain");
  assert.ok(mixed.includes(kw("Candy", "npc")), "outside still decorates");
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
  G.room = "jomtien_beach"; // nobody around to gossip with: a talk attempt, which
  const alone = _term.kwActions("npc", "Madam Oy", false); // gives honest feedback
  assert.equal(alone.length, 1);
  assert.match(alone[0].c, /^talk to madam oy$/);
  assert.equal(alone[0].go, true);
});

test("the wheel: tapping a regular who has hopped away offers to talk (not gossip)", () => {
  G.room = "silk_rose"; G.day = 2; // Helmut & Drew are the regulars here on day 2
  // Chuck's home is Tequila Queen — tapping his (decorated-everywhere) name here
  // shouldn't gossip-route; it should try to talk, which reports he's elsewhere.
  const acts = _term.kwActions("patron", "Chuck", true);
  assert.equal(acts.length, 1);
  assert.match(acts[0].c, /^talk to chuck$/);
  assert.equal(acts[0].go, true);
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

test("the MAP art decorates without any command kws — no dead taps", () => {
  assert.ok(!_term.decorate(_MAP).includes('data-k="cmd"'),
    "parens in the map must never contain CAPS runs");
});

test("the 7-Eleven hint is three complete BUY taps", () => {
  const d = _term.decorate("A 7-Eleven glows across the way (BUY TOASTIE · BUY WATER · BUY CHARGER).");
  for (const c of ["BUY TOASTIE", "BUY WATER", "BUY CHARGER"]) {
    assert.ok(d.includes(kw(c, "cmd")), c);
  }
});

test("hint placeholders stay inside one kw — no orphan FOR/TO taps", () => {
  const d = _term.decorate("(BUY MOO PING ฿40 · BUY <item> FOR <lady> · NO.)");
  assert.ok(d.includes('data-v="BUY &lt;item&gt; FOR &lt;lady&gt;"'), d);
  assert.ok(!d.includes('data-v="FOR"'), "no orphan FOR");
  const s = _term.decorate("(SEND <amount> TO <name> — the banking app)");
  assert.ok(s.includes('data-v="SEND &lt;amount&gt; TO &lt;name&gt;"'), s);
  assert.ok(!s.includes('data-v="TO"'), "no orphan TO");
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

test("the wheel: FLIP fans out into the pending jackpot moves (carries a number)", () => {
  G.game = { type: "jp", pending: [[3, 4], [7]] };
  const acts = _term.kwActions("cmd", "FLIP", false);
  assert.deepEqual(acts, [
    { t: "flip 3 4", c: "flip 3 4", go: true },
    { t: "flip 7", c: "flip 7", go: true },
  ]);
  G.game = null; // no roll pending: FLIP is the ordinary bare verb again
  assert.deepEqual(_term.kwActions("cmd", "FLIP", false),
    [{ t: "flip", c: "flip", go: true }]);
});

test("the single-FLIP jackpot hint wraps only FLIP as the tap target", () => {
  // "(FLIP 1 & 2 or 3)" — the numbers are plain, one FLIP taps and fans out;
  // the ampersand is escaped, not mistaken for another cmd word.
  const d = _term.decorate("(FLIP 1 & 2 or 3)");
  assert.ok(d.includes(kw("FLIP", "cmd")), d);
  assert.equal((d.match(/data-k="cmd"/g) || []).length, 1, "exactly one tap target");
  assert.ok(d.includes("&amp;"), "the & is HTML-escaped, not a second command");
});

test("quiz answer lines: the leading digit taps while a quiz is live", () => {
  G.game = { type: "quiz", qs: [], at: 0, right: 0 };
  assert.equal(_term.decorate("  1. Bangkok"),
    `  ${kw("1", "cmd")}. Bangkok`);
  assert.deepEqual(_term.kwActions("cmd", "1", false),
    [{ t: "1", c: "1", go: true }]);
  G.game = null; // no quiz: a numbered line is ordinary prose again
  assert.equal(_term.decorate("  1. Bangkok"), "  1. Bangkok");
});

test("Connect 4: the column numbers and Q tap while a c4 game is live", () => {
  G.game = { type: "c4", board: c4New() };
  const board = _term.decorate(c4Render(c4New()));
  for (const d of ["1", "2", "3", "4", "5", "6", "7"]) {
    assert.ok(board.includes(kw(d, "cmd")), `column ${d} taps to drop`);
  }
  assert.deepEqual(_term.kwActions("cmd", "3", false), [{ t: "3", c: "3", go: true }]);
  assert.ok(_term.decorate("(Tap a column 1-7 · Q quits.)").includes(kw("Q", "cmd")), "Q taps to quit");
  G.game = null; // no game: the number row is plain, no dead taps
  assert.ok(!_term.decorate(c4Render(c4New())).includes('data-k="cmd"'));
});

test("saleng: the open BUY-for-lady hint fans out into the cart's items", () => {
  G.salengCart = "snacks"; // a cart parked in the player's current room
  G.salengRoom = G.room;
  G.salengUntil = G.turns + 5;
  assert.deepEqual(_term.kwActions("cmd", "BUY <item> FOR <lady>", false), [
    { t: "buy som tam for …", c: "buy som tam for ", go: false },
    { t: "buy fruit for …", c: "buy fruit for ", go: false },
  ]);
  G.salengCart = null; // no cart: just the ordinary open prefill
  assert.deepEqual(_term.kwActions("cmd", "BUY <item> FOR <lady>", false),
    [{ t: "buy <item> for <lady>", c: "buy ", go: false }]);
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
  const srcs = ["world.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js", "thai.js"].map(f => readFileSync(
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
