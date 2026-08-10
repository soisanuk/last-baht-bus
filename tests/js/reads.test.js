// Readable fixtures: a room's `reads: { menu|board|sign|poster: "flavor" }` backs
// the menus / tap boards / cheeky notices its prose advertises, so READ <noun> and
// EXAMINE <noun> deliver instead of "No signs worth reading here." — closing the
// "readable object" broken-promise class the prose sweep had missed.
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
engineInit(t => out.push(t), null, () => {});
beforeEach(() => { out = []; newGame(); });

test("READ MENU surfaces KISS's mile-long menu", () => {
  G.room = "kiss"; out = []; doCommand("read menu");
  assert.match(out.join("\n"), /Item 47|BIG BEER|HANGOVER CURE/);
});

test("EXAMINE also surfaces a readable fixture (not just READ)", () => {
  G.room = "cricketers"; out = []; doCommand("examine menu");
  assert.match(out.join("\n"), /PIES|PROPER GRAVY|CHIPS WITH EVERYTHING/);
});

test("aliases resolve — READ BOARD / CLIPBOARD / REQUESTS all hit the DJ request sheet", () => {
  for (const word of ["board", "clipboard", "requests"]) {
    G.room = "feedback_bar"; out = []; doCommand("read " + word);
    assert.match(out.join("\n"), /ONE SONG ONE SLIP|request sheet/, `read ${word}`);
  }
});

test("a room's readable SIGN wins over the generic 'no signs' rebuff", () => {
  G.room = "smile_massage"; out = []; doCommand("read sign");
  assert.match(out.join("\n"), /NO SEX|business model/);
});

test("reading a fixture that isn't here still falls through gracefully", () => {
  G.room = "kiss"; out = []; doCommand("read board"); // KISS has a menu, no board
  assert.match(out.join("\n"), /don't have that to read|No signs worth reading/);
});

test("every readable-fixture room's prose actually invites the read", () => {
  // guards the broken-promise class: if a room sets `reads`, its desc should mention
  // the thing (menu/board/sign/poster) so the fixture isn't orphaned, and vice-versa
  // the fixture backs a real prose mention.
  const withReads = Object.entries(ROOMS).filter(([, r]) => r.reads);
  assert.ok(withReads.length >= 6, "the sweep backed several rooms");
  for (const [id, r] of withReads) {
    const nouns = Object.keys(r.reads);
    assert.ok(nouns.every(n => typeof r.reads[n] === "string" && r.reads[n].trim()), `${id}: non-empty flavor`);
    // the room desc (or its own reads) should reference at least one of the nouns
    assert.ok(nouns.some(n => new RegExp(n, "i").test(r.desc)), `${id}: desc mentions the ${nouns.join("/")}`);
  }
});

// EXAMINE is the Zork ledger's reward verb, and ours paid out only for the 29
// things in ITEMS — everything else, including the sea from a beach and your
// own hands, got one flat "Nothing special about that". That is the dead end
// the house rule exists to prevent (CLAUDE.md: a plausible verb gets a voiced
// refusal, never the last resort). _SCENERY answers by noun AND context, so
// this checks a representative noun in each of the three.
test("EXAMINE on scenery never dead-ends, and answers differently by context", () => {
  // Every doCommand here ticks, and a tick on an eligible street can arm an
  // encounter — after which the NEXT command is the player's answer to it, not
  // an examine at all. That flaked this test at about 1 in 10 with a peddler's
  // shrug standing in for the refusal. encDone alone is not enough: the peddler
  // and the police are COOLDOWN-gated, so the timers need pushing forward too.
  // The one that actually bit is the PEDDLER: engine-core.js arms him in any
  // Beach Road bar on a 20-turn cooldown at 12% a tick, and stinky_bar is a
  // Beach Road bar. Suppressing once at the top is not enough — this test runs
  // two dozen commands, so the cooldown lapses mid-run and he walks back in.
  // Push every timer forward immediately BEFORE each command instead.
  for (const id of Object.keys(ENCOUNTERS)) G.encDone[id] = true;
  const x = (room, cmd) => {
    G.room = room;
    G.pendingEnc = null;
    G.lastEnc = G.lastPeddler = G.lastPolice = G.turns;
    out = [];
    doCommand(cmd);
    return out.join("\n");
  };

  const dead = /Nothing special about that|isn't interesting anyway|declines to elaborate|not a thing/;
  const NOUNS = ["me", "hands", "sky", "sea", "ground", "crowd", "money"];
  for (const room of ["stinky_bar", "beach_rd_c", "jomtien_beach"]) {
    for (const noun of NOUNS) {
      const said = x(room, "examine " + noun);
      assert.ok(said.trim(), `examine ${noun} in ${room} printed nothing`);
      assert.doesNotMatch(said, dead, `examine ${noun} in ${room} dead-ends`);
    }
  }
  // context actually differentiates: the sea from the sand is not the sea from a bar
  assert.notEqual(x("jomtien_beach", "examine sea"), x("stinky_bar", "examine sea"));

  // bar-only nouns stay bar-only rather than answering everywhere
  assert.match(x("stinky_bar", "examine bell"), /RING BELL/,
    "the bell should point at its own mechanic");

  // and genuine nonsense still gets the honest refusal
  assert.match(x("beach_rd_c", "examine helicopter"), dead);
});

// A quest's `desc` is the ACTIVE-quest instruction: its parenthesised command
// usually only fires once the quest is accepted. Printing it at OFFER time put
// two commands on screen and the specific-looking one was the wrong one — a
// playtester followed "(ASK PETE ABOUT THE NAME)" verbatim, got a shutter
// coming down, and reasonably read that as broken. ACCEPT is the only live
// command at offer time.
test("a quest OFFER prints no command but ACCEPT", () => {
  const q = QUESTS.quiet_one;
  assert.match(q.desc, /\(ASK PETE ABOUT THE NAME\)/, "fixture moved — re-point this test");
  const pitch = _questPitch(q.desc);
  assert.doesNotMatch(pitch, /\(/, "the offer pitch still carries a parenthesised command");
  assert.match(pitch, /sitting on something heavy/, "the pitch kept the actual sentence");
  assert.doesNotMatch(pitch, /\s\./, "punctuation left dangling where the hint was cut");

  // and the full desc is still what an ACTIVE quest shows, hint and all
  assert.match(q.desc, /ASK PETE/);
});
