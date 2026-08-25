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
    // A reads value is a string, or an array of gated nodes {req?, notFlags?,
    // text, sets?, reveal?} — first match wins (see _resolveRead). Every node
    // needs text, and the LAST node must be ungated so the fixture always answers.
    const wellFormed = v => (typeof v === "string" && v.trim()) ||
      (Array.isArray(v) && v.length &&
        v.every(e => typeof e.text === "string" && e.text.trim()) &&
        !v[v.length - 1].req && !v[v.length - 1].notFlags);
    assert.ok(nouns.every(n => wellFormed(r.reads[n])), `${id}: non-empty flavor`);
    // The room's prose should reference at least one of its read nouns. Prose =
    // desc + revisit (both surfaces invite), and a noun counts via its
    // _READ_NOUNS aliases too — "framed photographs" invites reads.photos
    // because EXAMINE PHOTOGRAPHS resolves through the alias table.
    const prose = [r.desc, ...(r.revisit || [])].join(" ");
    const invites = n => [n, ...(_READ_NOUNS[n] || [])]
      .some(a => new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(prose)) ||
      // the singular of a plural key ("photos" → "photo") still names the thing
      (n.endsWith("s") && new RegExp(n.slice(0, -1), "i").test(prose));
    assert.ok(nouns.some(invites), `${id}: prose mentions the ${nouns.join("/")}`);
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

  // A hint must not promise a verb the room refuses. EXAMINE CEILING in the
  // Queen Vic offered the pasties game and THROW COVER answered "this room is
  // short one dancer" on the very next turn — the pub is the one bar with no
  // hostesses at all, so the go-go furniture is a lie in it (playtest).
  const pubCeiling = x("queen_vic", "examine ceiling");
  assert.doesNotMatch(pubCeiling, /THROW COVER|pasties|nipple/i,
    "the pub must not advertise the ceiling game it can't run");
  assert.match(pubCeiling, /beams|brasses|dartboard/i, "it gets its own furniture instead");
  assert.match(x("stinky_bar", "examine ceiling"), /THROW COVER/,
    "a bar with hostesses still offers it");
  // a pub is still a bar for what the two genuinely share
  assert.doesNotMatch(x("queen_vic", "examine stool"), dead, "shared furniture falls back to the bar lines");

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

// ── The door you can walk through must look back ─────────────────────────────
// Every street room names its bars in CAPS, lists them under "Step inside", and
// renders each as a tappable keyword — and EXAMINE answered "Whatever that is,
// it isn't here, and it isn't interesting anyway." It was true of EVERY venue on
// the map (thorough-player playtest B#2, 2026-08-23), which is why the fix is one
// engine answer derived from the exits graph rather than ~90 authored entries.

test("every venue you can step into from here gets an exterior look", () => {
  let tested = 0;
  const missed = [];
  for (const [rid, r] of Object.entries(ROOMS)) {
    if (!r.exits || r.dark) continue;
    for (const to of Object.values(r.exits)) {
      const v = ROOMS[to];
      if (!v || !v.bar) continue;
      G.room = rid; out = [];
      doCommand("examine " + v.bar.toLowerCase().replace(/'/g, ""));
      tested++;
      if (!/You are outside it/.test(out.join("\n"))) missed.push(rid + " -> " + v.bar);
    }
  }
  assert.ok(tested > 50, "the sweep actually ran (" + tested + " venues)");
  assert.deepEqual(missed, [], "a venue named in prose must not answer \"it isn't here\"");
});

test("the exterior look never invents a beer bar out of a massage shop", () => {
  // A third of the map's venues carry no barType, so defaulting them to "beer"
  // would assert a horseshoe rail under woven palm about an oil shop — the
  // false-claim defect this whole answer exists to fix.
  const kinds = {};
  for (const r of Object.values(ROOMS)) {
    if (!r.bar) continue;
    kinds[_venueKind(r)] = (kinds[_venueKind(r)] || 0) + 1;
    assert.ok(_VENUE_LOOK[_venueKind(r)], r.bar + " resolves to a kind with prose");
  }
  assert.ok(kinds.massage > 0 && kinds.beer > 0, "the kinds are actually distinguished");
  G.room = "beach_rd_s"; out = []; doCommand("examine beach road thai massage");
  assert.match(out.join("\n"), /price list|plastic chairs|polo/i);
  assert.doesNotMatch(out.join("\n"), /horseshoe rail|woven palm/i);
});

test("an exact venue name beats a generic noun inside it", () => {
  // "Daeng's Place" must not resolve through the scenery entry for "place",
  // nor "The Water Buffalo" through the one for a tree.
  G.room = "khao_talo"; out = []; doCommand("examine daengs place");
  assert.match(out.join("\n"), /Daeng's Place/);
  assert.match(out.join("\n"), /You are outside it/);
});

test("a venue you cannot step into from here is still a miss", () => {
  G.room = "hotel_room"; out = []; doCommand("examine candy bar");
  assert.doesNotMatch(out.join("\n"), /You are outside it/,
    "you are not looking at a bar three districts away");
});

// ── People the room itself describes ─────────────────────────────────────────
test("somebody the room's own prose put there gets a voiced refusal, not \"nobody by that name\"", () => {
  const flat = /Nobody by that name|No one here answers|doesn't land on anyone|Nobody here goes by/;

  G.room = "jomtien_beach_rd"; out = []; doCommand("talk to motosai driver");
  assert.doesNotMatch(out.join("\n"), flat);
  assert.match(out.join("\n"), /MOTOSAI TO/, "and a real verb is pointed at");

  G.room = "tt_entrance"; out = []; doCommand("talk to security");
  assert.doesNotMatch(out.join("\n"), flat, "the room describes security on plastic stools");

  G.room = "jomtien_soi_7_oil"; out = []; doCommand("talk to girls");
  assert.doesNotMatch(out.join("\n"), flat, "the room says 'girls on the step'");
});

test("…but a name the room never mentioned still misses", () => {
  G.room = "tt_entrance"; out = []; doCommand("talk to quantum surveyor");
  assert.doesNotMatch(out.join("\n"), /flat, un-hostile attention|professional smile/,
    "the folk answer is derived from the room's prose, not handed out to everyone");
});
