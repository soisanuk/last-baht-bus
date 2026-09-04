// Round-seventeen blind playtests (2026-08-24, three MOBILE personas — "Dave"
// the thumbs-only expat, "Sam" who plays in three-minute bursts and reloads
// constantly, "Bee" who taps everything). Each test pins one finding so it
// can't come back.
//
// Two of the round's loudest reports were REFUTED on verification and are
// deliberately pinned here too, as characterisation: the Thai word card and the
// hidden compass both work, and the reports were artifacts of driving the page
// through synthetic DOM clicks. Pinning a refutation stops the next persona's
// identical mis-sighting from being "fixed".
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// data.js + wordcard.js are the VENDORED trainer files (DOM-free at load) — the
// word-card test below is worthless without them: _wcMap would be undefined and
// the assertions would skip themselves silently.
for (const f of ["thai.js", "data.js", "wordcard.js", "world.js", "games.js", "engine-core.js",
  "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 5000;
  out = [];
}
beforeEach(() => sandbox());

// ── Dave: the info… chip menu (the readout layer's only thumb route) ──

// The chip prefills a sentinel so engineComplete can answer with a MENU instead
// of a completion; term.js then submits "__info <verb>". Nothing stripped the
// sentinel, so every item in that menu answered "I didn't understand that" —
// and it had been that way since the chip shipped.
test("every item on the info… menu runs its verb — the chip's sentinel is stripped", () => {
  const menu = engineComplete("__info ");
  assert.ok(menu.length >= 8, "the info menu should offer the readout verbs");
  for (const verb of menu) {
    out = [];
    doCommand("__info " + verb);
    assert.doesNotMatch(text(), /didn't understand|didn.t parse|blinks at you/,
      `info… → ${verb} must run the verb, not fall through to the parser's miss`);
    assert.ok(text().trim().length, `info… → ${verb} printed nothing`);
  }
});

test("the info menu is context-aware, and every verb it offers is one the parser answers", () => {
  G.mode = "soi6";
  assert.ok(engineComplete("__info ").includes("share"), "soi6 mode offers the share card");
  G.mode = null; G.stage = "expat";
  assert.ok(engineComplete("__info ").includes("books"), "an expat gets the books");
});

test("the bare sentinel means 'I want the readouts', so it answers rather than dying silently", () => {
  doCommand("__info");
  assert.match(text(), /HELP|commands/i);
  assert.doesNotMatch(text(), /didn't understand|blinks at you/);
});

// ── Sam: a prompt that re-arms pendingEnc owes its lines to the stash ──

// The haggle branch printed its new prices with a bare _say, so G.encPrompt still
// held the ORIGINAL pitch. A reload mid-encounter redrew ฿300 for a watch the
// peddler had already come down to ฿200 on — and the till charged ฿200. The
// screen was simply wrong about money.
test("a haggled peddler redraws the HAGGLED prices on a restore, not the opening pitch", () => {
  G.pendingEnc = "peddler";
  G.encPrompt = [["A peddler drifts in… (WATCH ฿300 · SUNGLASSES ฿150 · VITAMINS ฿200 · or NO.)"]];
  doCommand("haggle");
  out = [];
  _renderEncounter();                       // what a reload actually paints
  assert.match(text(), /WATCH ฿200/, "the redraw must quote the deal you struck");
  assert.doesNotMatch(text(), /฿300/, "the pre-haggle price must not survive the reload");
});

test("the price the redraw quotes is the price the till charges", () => {
  G.pendingEnc = "peddler";
  doCommand("haggle");
  const shown = text().match(/WATCH ฿(\d+)/)[1];
  const before = G.money;
  out = [];
  doCommand("watch");
  assert.equal(before - G.money, Number(shown),
    "what he charges must equal what the prompt just quoted");
});

// The same class, swept: every branch that leaves pendingEnc armed must go
// through _encPrompt. Two more were found by the sweep (the policeman's
// he-waits branch, the power-bank tout's TAO RAI) — this asserts the property
// rather than the two instances, so a new encounter branch can't reintroduce it.
test("no armed encounter is left with a prompt a reload cannot redraw", () => {
  const cases = [
    ["police", "s"],                 // a direction: he doesn't take it as an answer, he waits
    ["powerbank", "tao rai"],        // the taught ask-the-price verb; the lend is a favour
    ["peddler", "haggle"],
  ];
  for (const [enc, input] of cases) {
    sandbox();
    G.pendingEnc = enc;
    G.encPrompt = null;
    doCommand(input);
    if (!G.pendingEnc) continue;     // branch resolved the encounter: nothing to redraw
    assert.ok(Array.isArray(G.encPrompt) && G.encPrompt.length,
      `${enc} + "${input}" left the encounter armed with no redrawable prompt`);
    out = [];
    _renderEncounter();
    assert.ok(text().trim().length, `${enc}'s redraw printed nothing`);
  }
});

// ── Dave: the two verbs about YOUR money that no thumb could reach ──

test("DEBT joins the info menu when you owe somebody, and only then", () => {
  assert.ok(!engineComplete("__info ").includes("debt"), "nothing owed, nothing to read");
  G.loan = { owed: 4000, dueDay: 5 };
  assert.ok(engineComplete("__info ").includes("debt"), "Nira's loan puts it on the menu");
  out = [];
  doCommand("__info debt");
  assert.match(text(), /Nira/, "and the menu item actually reports the ledger");
});

test("DRAW is offered where the till is, since that is the only place it works", () => {
  G.stage = "expat";
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.money = BAR_DEPOSIT; _barDeposit(); G.bar.lease.paid = true; /* key money settled (2026-09-04) */ _setFlag("barOpen");
  G.bar.cash = 5291;
  G.room = "stinky_bar";
  assert.ok(engineComplete("__info ").includes("draw"), "at your own till it's on the menu");
  G.room = "soi6_mid";
  assert.ok(!engineComplete("__info ").includes("draw"),
    "elsewhere it would only answer 'your till is at the Stinky Pinky'");
});

// ── Sam: a resumed decision has to still BE a decision ──

test("the vacation-end redraw carries both options and the week's score, not two bare CAPS", () => {
  G.day = 8;
  _endVacation();
  out = [];
  _renderResume();
  assert.match(text(), /NEW VACATION — fly back next month/);
  assert.match(text(), /MOVE TO PATTAYA — stop pretending/, "the permanent, one-way option says so");
  assert.match(text(), /happiness \d+/, "…and what the week was worth");
});

test("the live vacation-end prompt and its redraw are the same text (one source, no drift)", () => {
  G.day = 8;
  _endVacation();
  const live = text();
  out = [];
  _renderResume();
  for (const line of text().split("\n").filter(l => l.trim()))
    assert.ok(live.includes(line), `the redraw invented a line the live prompt never printed: ${line}`);
  assert.equal((live.match(/happiness \d+/g) || []).length, 1,
    "…and the live path must not print the score twice");
});

test("the checkout list keeps its prices on a redraw — three hotel names alone can't be chosen between", () => {
  G.hotel = "sabai";
  G.pendingChoice = "checkout";
  out = [];
  _renderResume();
  assert.match(text(), /฿\d+\/night/, "the rates survive the reload");
});

test("a resumed bar game names the pot, so QUIT has a visible price", () => {
  G.room = "stinky_bar"; G.money = 500;
  doCommand("play connect 4 20");
  out = [];
  _renderGame();
  assert.match(text(), /฿20/, "the stake is on screen");
  assert.match(text(), /QUIT concedes/i);
});

// ── Bee, refuted: pinned so the next persona's mis-sighting isn't "fixed" ──

// Reported as "the Thai word card always shows สนุก whatever you tap". It does
// not: the tap path passes the tapped word through, and the card is built from
// it. The report came from synthetic DOM clicks that never dispatched, leaving a
// stale overlay on screen. (I reproduced the same false positive myself while
// checking it — the overlay's open state is a CSS class, not the hidden attr.)
test("the Thai lookup is keyed on the word tapped, not on whatever was tapped first", () => {
  assert.equal(typeof _wcMap, "function", "the vendored word-card map must be loaded, or this test proves nothing");
  const map = _wcMap();
  const words = ["สวัสดี", "ครับ"].filter(w => map[w]);
  assert.ok(words.length >= 2, "the sample words must exist in the vendored dictionary");
  const cards = words.map(w => map[w]);
  assert.notDeepEqual(cards[0], cards[1], "two different words must yield two different cards");
  for (let i = 0; i < words.length; i++) {
    assert.equal(cards[i][0], words[i], "a card must lead with the word that was tapped");
  }
});

// Reported as "W/E/IN are enabled and dead in the hotel room". The compass is
// correctly HIDDEN there — _navHere() excludes Your Room outright. The buttons
// keep stale attributes because _updateNavFab returns early when hidden, and the
// driver's `fab` verb clicks by existence rather than visibility, so it reached a
// control no thumb can touch.
test("the compass is not offered in a hotel room at all — the stale buttons are unreachable", () => {
  G.room = "qv_room";
  assert.equal(_navHere(), false, "Your Room must not show a compass");
  G.room = "hotel_room";
  assert.equal(_navHere(), false);
  G.room = "beach_rd_c";
  assert.equal(_navHere(), true, "a street with cardinals still gets one");
  assert.ok(_navDirs().length > 0);
});
