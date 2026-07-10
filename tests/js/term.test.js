// The decoration contract: term.js wraps actionable words in <b class="kw">
// spans — names, enterable bars, items present, exits, CAPS hints — and
// escapes everything else. The engine's prose stays plain; this is the
// renderer's business alone (and the future flyout wheel's tap targets).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine.js", "term.js"]) {
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
  assert.ok(fullLabels.some(t => /^ask about oy$/.test(t)), "live topics surface on hold");
});

test("the wheel: an absent name routes through whoever is here", () => {
  G.room = "candy_bar"; // Candy present, Oy absent
  const acts = _term.kwActions("npc", "Madam Oy", false);
  assert.match(acts[0].c, /^ask candy about madam oy$/);
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
