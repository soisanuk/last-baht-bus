// Mechanics built from the essay ledger (docs/essay-ledger.md, 2026-10-01) under
// docs/source-material-policy.md — the pattern, never the expression. One test per
// mechanic, in the order they shipped.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});

// ── Theme 3: bonds survive the flight ────────────────────────────────────────
test("the return is the moment: her-farang comes back a regular, a regular a face, a face a stranger", () => {
  G.soc.drinks = { lek: 14, noi: 8, fon: 4 }; G.phone.contacts = { lek: true }; G.day = 8;
  _endVacation(); G.pendingChoice = null; out = []; _newVacation();
  assert.equal(_bondTier("lek"), 2, "her farang → regular");
  assert.equal(_bondTier("noi"), 1, "regular → face");
  assert.equal(_bondTier("fon"), 0, "a face is a week's warmth");
  // …and walking into her bar carries her most of the way back
  G.room = _npcRoom("lek"); out = []; _arriveAt(G.room);
  assert.match(said(), /You come BACK|You COME|How long you gone/);
  assert.ok(_bondTier("lek") >= 2 && (G.soc.drinks.lek || 0) >= 11, "one drink from her farang again");
});
