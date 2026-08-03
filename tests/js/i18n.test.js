// Localization tests: the _L translation seam, the taxi-intro language pick, and
// English fallback. Loads lang.js (the German catalog) alongside the engine.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "lang.js", "engine-core.js",
  "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}

let out = [];
engineInit((t) => out.push(t), null, () => {});
function run(...cmds) { for (const c of cmds) doCommand(c); }
function lastOut() { return out.join("\n"); }
function state() { return G; }
beforeEach(() => { out = []; newGame(); });

test("_L: default en is a passthrough; a de catalog hit translates; a de miss falls back", () => {
  assert.equal(state().player.lang, "en", "fresh game defaults to English");
  assert.equal(_L("(Pick a number.)"), "(Pick a number.)", "en → the source string, untouched");
  state().player.lang = "de";
  assert.equal(_L("(Pick a number.)"), "(Wähl eine Zahl.)", "de → the catalogued German");
  assert.equal(_L("a line nobody has translated yet"), "a line nobody has translated yet",
    "an un-catalogued string falls back to English (partial coverage still runs)");
});

test("the taxi intro asks language first, in English", () => {
  _taxiIntro("beach");
  assert.equal(state().pendingChoice, "intro");
  assert.equal(state().introStep, 0, "language is step 0");
  const o = lastOut();
  assert.match(o, /what do you think in/i, "Tan asks your language, in English");
  assert.match(o, /1\) English/, "and English is the first option");
  assert.match(o, /2\) Deutsch/, "with Deutsch offered");
});

test("picking Deutsch renders the rest of the intro in German", () => {
  _taxiIntro("beach");
  out = [];
  run("2");                              // Deutsch
  assert.equal(state().player.lang, "de", "language recorded on G.player");
  const o = lastOut();
  assert.match(o, /Ab hier in deiner Sprache/, "Tan acknowledges the switch, in German");
  assert.match(o, /Was ist deins\?/, "the origin question is German");
  assert.match(o, /Mordkommission/, "the origin options are German");
  assert.match(o, /\(Wähl eine Zahl\.\)/, "the number prompt is German");
  assert.doesNotMatch(o, /Pick a number|homicide detective/, "no English leaks into the German turn");
});

test("picking English keeps the intro English (the fallback path is a no-op)", () => {
  _taxiIntro("beach");
  out = [];
  run("1");                              // English
  assert.equal(state().player.lang, "en");
  const o = lastOut();
  assert.match(o, /story back home|homicide detective/i, "still English");
  assert.doesNotMatch(o, /Mordkommission|Wähl eine Zahl/, "no German when English is chosen");
});

test("a German intro flows straight into a German beach opening", () => {
  _taxiIntro("beach");
  run("2");        // Deutsch
  run("4");        // detective
  run("3");        // blunt
  out = [];
  run("2");        // open-minded — completes the intro, opens the beach
  assert.equal(state().pendingChoice, null, "the intro closed");
  const o = lastOut();
  assert.match(o, /Portemonnaie/, "Tan's drop-off is German");
  assert.match(o, /Tag zwei deiner Woche|Deine Brieftasche ist WEG/, "the beach opening is German");
  assert.match(o, /Du hast ฿0\./, "the ฿0 line is localised, ฿ kept");
  assert.match(o, /INVENTORY/, "command tokens stay English (they're the real commands)");
});

test("the Soi 6 challenge opening renders in German", () => {
  state().player = null;
  startSoi6Mode();
  out = [];
  run("2");        // Deutsch
  run("7"); run("1"); run("1");   // monger / charmer / straight — completes, opens the soi
  const o = lastOut();
  assert.match(o, /die lautesten hundert Meter Thailands/, "the Soi 6 framing is German");
  assert.match(o, /liegen auf der Bank/, "the money briefing is German (฿100.000-style)");
  assert.match(o, /Treppe DOWN/, "the nav hint is German with DOWN kept as the command");
  assert.match(o, /สบายสบาย/, "the Thai goal word stays Thai");
});

test("LOOK renders a German room: name, description, and scaffolding labels", () => {
  state().flags.act1Done = true; state().stage = "vacation";
  state().player.lang = "de"; state().room = "qv_room";
  out = []; run("look");
  const o = lastOut();
  assert.match(o, /Dein Zimmer — Queen Vic Inn/, "the room name is German (venue name kept)");
  assert.match(o, /Das Balkonzimmer über dem Queen Vic/, "the description is German");
  assert.match(o, /Ausgänge: /, "the Exits label is German");
  assert.match(o, /\bdown\b/, "…but the direction token stays English (it's the command)");
  assert.match(o, /Eintreten: Queen Vic Inn\. \(ENTER <Name>\)/, "Step-inside label German, venue + ENTER kept");
});

test("tap-interface labels translate to German (the command underneath stays English)", () => {
  // term.js renders _L(label); these prove the catalog. The English cmd the chip
  // submits is unchanged — only the display text is localised.
  state().player.lang = "de";
  assert.equal(_L("look"), "Umsehen");
  assert.equal(_L("help"), "Hilfe");
  assert.equal(_L("talk"), "Reden");
  assert.equal(_L("buy her a drink"), "Ihr einen Drink");
  assert.equal(_L("leave"), "Gehen");
  assert.equal(_L("DOWN"), "RUNTER");
  assert.equal(_L("E"), "O", "even the compass label (chip cmd 'e' still fires east)");
  assert.equal(_L("barfine…"), "Barfine…", "trailing ellipsis preserved");
  assert.equal(_L("Candy"), "Candy", "a dynamic NPC-name label falls back to English");
  state().player.lang = "en";
  assert.equal(_L("look"), "look", "English mode leaves labels untouched");
});

test("G.player.lang survives a save/restore round-trip", () => {
  state().player.lang = "de";
  const blob = serializeGame();
  newGame();
  assert.equal(state().player.lang, "en", "a fresh game is English");
  deserializeGame(blob);
  assert.equal(state().player.lang, "de", "the saved language is restored");
});
