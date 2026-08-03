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

test("Taitch: Mercedes meets a German player in broken German, an English player in English", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().room = "cherry_pop"; // moved onto Soi 6
  // German player → German narration + Taitch speech
  state().player.lang = "de";
  out = []; run("ask mercedes about german");
  const de = lastOut();
  assert.match(de, /Fünf Jahr, München/, "her Munich line comes through in German");
  assert.match(de, /wie Kind mit zwei Wort/, "…and it's Taitch — dropped endings, no articles");
  assert.match(de, /Sie dreht einen Bierdeckel um/, "the narration around her speech is clean German");
  // English player → her voice is unchanged (only the catalogued lady is affected)
  state().player.lang = "en"; state().talked = {}; // reset the seen-book so the full line delivers again
  out = []; run("ask mercedes about german");
  assert.match(lastOut(), /Germany\. Five years, Munich/, "an English player hears her English");
  assert.doesNotMatch(lastOut(), /Fünf Jahr/, "no German for the English player");
});

test("Taitch: Jenny speaks a lighter, phrasebook German learned off her sponsor Klaus", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().room = "pink_lotus";
  state().player.lang = "de";
  out = []; run("ask jenny about sponsor");
  const de = lastOut();
  assert.match(de, /Klaus\. Deutschland/, "Klaus comes through in German");
  assert.match(de, /Zwei Jahr jetzt/, "Taitch: dropped plural + fragment");
  assert.match(de, /ich bleib sauber/, "phrasebook 'I stay clean'");
  state().player.lang = "en"; state().talked = {};
  out = []; run("ask jenny about sponsor");
  assert.match(lastOut(), /Klaus\. Germany/, "an English player hears her English");
});

test("speech stays English by default — a non-Taitch NPC is unaffected by German mode", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().room = "stinky_bar";
  state().player.lang = "de";
  out = []; run("talk bert");
  // Bert isn't a Taitch lady and has no catalog entry → his English speech stands
  assert.doesNotMatch(lastOut(), /Willkommen|Setz|guten Tag/i, "no accidental German for Bert");
});

test("_fmt fills a translated template word-order-safely, English fallback when uncatalogued", () => {
  state().player.lang = "de";
  assert.equal(
    _fmt("{clock}, {weekday} — day {day} of 7.", { clock: "22:00", weekday: "Donnerstag", day: 4 }),
    "22:00, Donnerstag — Tag 4 von 7.");
  assert.equal(_fmt("nothing {x} here", { x: "Z" }), "nothing Z here", "uncatalogued template → English filled");
  state().player.lang = "en";
  assert.equal(
    _fmt("{clock}, {weekday} — day {day} of 7.", { clock: "22:00", weekday: "Thursday", day: 4 }),
    "22:00, Thursday — day 4 of 7.", "en is a passthrough");
});

test("TIME reads out in German: the _fmt clock line + fixed status lines + weekday", () => {
  state().stage = "vacation"; state().flags.act1Done = true; state().mode = "soi6";
  state().player.lang = "de"; state().day = 4; state().nightTurn = 45;
  out = []; run("time");
  const o = lastOut();
  assert.match(o, /Donnerstag — Tag 4 von 7/, "the clock line (via _fmt) + localised weekday");
  assert.match(o, /Hauptzeit\. Es gelten die Standardpreise/, "and a fixed status line is German");
});

test("G.player.lang survives a save/restore round-trip", () => {
  state().player.lang = "de";
  const blob = serializeGame();
  newGame();
  assert.equal(state().player.lang, "en", "a fresh game is English");
  deserializeGame(blob);
  assert.equal(state().player.lang, "de", "the saved language is restored");
});
