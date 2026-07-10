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

const kw = s => `<b class="kw">${s}</b>`;

test("character and bar names get the kw wrap; longest name wins", () => {
  assert.equal(_term.decorate("Talk to Candy."), `Talk to ${kw("Candy")}.`);
  assert.equal(_term.decorate("Nigel is at Candy Bar 2 tonight."),
    `${kw("Nigel")} is at ${kw("Candy Bar 2")} tonight.`);
  assert.ok(_term.decorate("Madam Oy owns the place.").includes(kw("Madam Oy")));
});

test("items decorate only where they are present", () => {
  // the receipt starts in your pocket
  assert.ok(G.itemLoc.receipt === "inventory");
  const name = ITEMS.receipt.name;
  assert.ok(_term.decorate(`A ${name} pokes out.`).includes(kw(name)));
});

test("the exits line lights every direction", () => {
  assert.equal(_term.decorate("Exits: n, e, out."),
    `Exits: ${kw("n")}, ${kw("e")}, ${kw("out")}.`);
});

test("CAPS command hints inside parentheses glow; prose caps outside do not", () => {
  const d = _term.decorate("(WATCH POLICE — or WATCH SUNSET, the bay is fine too.)");
  assert.ok(d.includes(kw("WATCH POLICE")), d);
  assert.ok(d.includes(kw("WATCH SUNSET")), d);
  assert.equal(_term.decorate("He yells HANDSOME MAN at the street."),
    "He yells HANDSOME MAN at the street.", "caps outside parens stay plain");
});

test("HTML in text is escaped before decoration", () => {
  assert.equal(_term.decorate("<script>alert(1)</script>"),
    "&lt;script&gt;alert(1)&lt;/script&gt;");
});
