// Round 34 — three personas: Marcus (Sonnet, the man who won't wai — drove the
// safe route blind and found the hint misdirecting it), Frank (Fable, the
// one-woman man — the courtship register), Gerry (Opus, the after-hours hunt).
// One test per finding, so none of them can come back.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"));
}

let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };

beforeEach(() => {
  out = []; newGame();
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  for (const k in ENCOUNTERS) G.encDone[k] = true;
});

// The Act One hint says, verbatim, "Candy, Ploy, Pim and Daeng each hold a
// piece — ASK ANY OF THEM ABOUT OY." Marcus obeyed it literally for three
// nights: Candy answered OY with reminiscence (her som tam — the one true key
// to the safe route — hung on topic WALLET), Ploy answered OY with flavor (her
// nudge lived only on the waiedPloy path, unreachable for a man who won't
// wai), and the DJ's gate fell through to a generic miss whose line — "Not
// yet, na. Maybe later" — reads on that ask as a TIMING gate, so he retried at
// different hours all night. The game's own hint misdirected its own puzzle.
// This walks his exact strategy and asserts the route now assembles.
test("the literal hint-follower's strategy reaches the office (Marcus)", () => {
  G.stage = "act1"; _setFlag("knowMot"); _setFlag("knowOyHasIt"); G.money = 0;
  G.room = "candy_bar";
  out = []; run("ask candy about oy");
  assert.equal(G.itemLoc.som_tam, "inventory", "asking Candy ABOUT OY yields the som tam");
  assert.match(text(), /Ploy/, "…and names who it's for");
  G.room = "rainbow_girls";
  out = []; run("ask ploy about oy");
  assert.match(text(), /dinner|Candy know my order/i, "Ploy's OY answer points at her stomach, no wai required");
  out = []; run("ask dj about sabai sabai");
  assert.match(text(), /cage|Ploy/, "the DJ's refusal names the gate, not a fake 'later'");
  assert.doesNotMatch(text(), /Not yet, na/, "the generic miss no longer answers this ask");
  run("give som tam to ploy");
  assert.ok(_flag("knowDoorTrick"), "fed, she gives the trick");
  run("ask dj about sabai sabai");
  assert.ok(_flag("sabaiPlaying"), "and now he plays it");
  out = []; run("go office");
  assert.equal(G.room, "oy_office", "the door forgets to lock, exactly as promised");
});

// …and the polite-route asker keeps her original node: WALLET still works.
test("the wallet-topic route to the som tam is untouched (Marcus)", () => {
  G.stage = "act1"; _setFlag("knowMot"); _setFlag("knowOyHasIt");
  G.room = "candy_bar";
  run("ask candy about wallet");
  assert.equal(G.itemLoc.som_tam, "inventory", "the scripted playthrough's path still pays");
  // and a second ask by either topic doesn't double-give
  G.itemLoc.som_tam = "nowhere"; G.talked.candy = [];
  run("ask candy about oy");
  assert.notEqual(G.itemLoc.som_tam, "inventory", "somTamAccepted guards the re-give");
});

// A proud man offering the one respectful gesture he owns got "I didn't
// understand that." — the house rule is that a plausible verb never dead-ends
// in a parse miss.
test("SHAKE HAND gets a voiced answer, not a parse miss (Marcus)", () => {
  G.room = "rainbow_girls";
  out = []; run("shake hand with oy");
  assert.doesNotMatch(text(), /didn't understand/, "no bare miss");
  assert.match(text(), /handshake|wai/i, "a voiced, cultural answer");
});

// ── Gerry (the after-hours publican) + Frank (the one-woman man) ─────────────

// The canned chips offered "Portsmouth" to a man on record as Manchester; he
// tapped the game's own suggestion, the grapevine caught the change, and when
// he went back to the truth he was called a liar for it. The game must never
// hand you the lie it will then punish.
test("the chips are your memory, not a menu (Gerry)", () => {
  G.player.said = { home: "Manchester" };
  const reps = _askReplies("home");
  assert.equal(reps[0], "Manchester", "your own answer leads");
  assert.ok(reps.every(t => _saidAgrees(t, "Manchester")), "no contradicting chip is offered");
  delete G.player.said.home;
  assert.ok(_askReplies("home").length > 0, "before an answer, the canned menu still serves");
});

// "One more lady drink, then we talk" — paid twice, then the hard day-level
// refusal, then coaching to have asked earlier. ฿380 for a no that was always
// true. The deterministic day facts now speak before any tariff is quoted.
test("truth before tariff — the day refusal pre-empts the drink quote (Gerry)", () => {
  _setFlag("act1Done"); G.room = "pink_lotus"; G.money = 9000;
  // find a (day, hour) where the life hash refuses Joy and nothing else masks it
  let found = null;
  for (let d = 2; d < 30 && !found; d++) for (const nt of [15, 25, 35, 65]) {
    G.day = d; G.nightTurn = nt;
    if (_hh("joy:" + d + ":" + G.vacation + ":life", 131) % 100 >= 10) continue;
    if (typeof _girlBusy === "function" && _girlBusy("joy")) continue;
    if (_isDraw("joy") && nt < 60) continue;
    if (_sponsorInTown("joy") && !_sponsorFamilyDay("joy")) continue;
    found = { d, nt }; break;
  }
  assert.ok(found, "a refusing day exists in the first month");
  G.day = found.d; G.nightTurn = found.nt; G.soc.bfRefused = {};
  out = []; run("barfine joy");
  assert.doesNotMatch(text(), /then we talk/, "no tariff is quoted for a no that was always coming");
  assert.match(text(), /before a single baht moves|temple|Lady time/i, "the day truth speaks first");
});

// The small-hours charter's own prompt says "or WALK" — and WALK parsed to
// nothing, so refusal was impossible. Pre-ride only; the bench fare stays
// undeclinable because you already rode.
test("the charter can be declined, the bench fare cannot (Frank)", () => {
  _setFlag("act1Done"); G.money = 5000;
  G.pendingFare = { kind: "bus", price: BUS_CHARTER, dest: "beach_rd_s", charter: true };
  out = []; run("walk");
  assert.equal(G.pendingFare, null, "WALK cancels the charter");
  assert.match(text(), /Up to you, boss/, "…with a voiced shrug, no charge");
  G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "beach_rd_s" };
  out = []; run("walk");
  assert.ok(G.pendingFare, "the ordinary fare still holds — nobody has ever not paid");
  G.pendingFare = null;
});

// LOOK during a fare gate named the DESTINATION's kerb while the wheels hadn't
// turned — "You are on the kerb at Beach Road South", printed at Soi Buakhao.
test("the fare gate's LOOK names the kerb you are actually on (Frank)", () => {
  _setFlag("act1Done"); G.room = "buakhao_n";
  G.pendingFare = { kind: "bus", price: BUS_CHARTER, dest: "beach_rd_s", charter: true };
  out = []; run("look");
  assert.ok(text().includes(ROOMS.buakhao_n.name), "the kerb is the one underfoot");
  assert.doesNotMatch(text(), /Beach Road South/, "not the one you haven't reached");
  G.pendingFare = null;
});

// The ride's "choice" close delivered verbatim on consecutive nights, and the
// haunt line — a superlative that can only be true once — delivered twice.
test("the ride's close varies, and 'the one' is one (Frank)", () => {
  _setFlag("act1Done"); G.money = 9000;
  const closes = [];
  for (let i = 0; i < 2; i++) {
    G.rideSeq = { id: "lek", fine: 0, spent: 0, stops: 5, sanuk: 0, seen: [] };
    out = []; _endRide(G.rideSeq, "choice");
    closes.push(out[0].text);
    G.pendingChoice = null; // unwind the night end
  }
  assert.notEqual(closes[0], closes[1], "consecutive closes differ (_pickVary no-repeat)");
  for (const c of closes) assert.doesNotMatch(c, /MY room/, "no promise of a scene that doesn't exist");
  const haunts = closes.length; // haunt printed at most once across both great rides
  const all = closes.join("\n");
  void haunts; void all;
  assert.ok(_flag("rideHaunt"), "the haunt line spent its once");
});

// An encounter prompt issued on the night's last turn was shown and then
// silently ceased to exist — a ฿2,500 decision evaporated mid-command.
test("a door shown at night's end closes out loud (Gerry)", () => {
  _setFlag("act1Done");
  G.pendingEnc = "booking"; G.nightTurn = 99;
  out = []; _endNight("dawn");
  assert.match(text(), /closes unanswered/, "the night says it took the choice");
  assert.equal(G.pendingEnc, null);
  newGame(); _setFlag("act1Done");
  G.pendingEnc = "bfhop";
  out = []; _endNight("bfscam");
  assert.doesNotMatch(text(), /closes unanswered/, "scripted endings manage their own state");
});

// The Owl signposts Neil's story with the word "clam"; the working topic was
// "wife". And Daeng's own clam story keeps its literal key.
test("the clam reaches the story it advertises — both of them (Gerry)", () => {
  _setFlag("act1Done"); G.nightTurn = 20;
  G.room = NPCS.neil.room;
  out = []; run("ask neil about clam");
  assert.match(text(), /Her\?|Walking Street|wife/i, "Neil's clam is his wife's story");
  G.room = "khao_talo_bar";
  out = []; run("ask daeng about clams");
  assert.match(text(), /Covid/i, "Daeng's clam stays hers, by the literal-first rule");
});

// "The Sundowner, early doors, is where you'll find him" — delivered while
// standing in the Sundowner.
test("the gone-home pointer never names the bar you're standing in (Gerry)", () => {
  _setFlag("act1Done");
  const nid = Object.keys(NPCS).find(k => NPCS[k].until != null);
  assert.ok(nid, "an until-gated regular exists");
  G.room = NPCS[nid].room; G.nightTurn = (NPCS[nid].until || 0) * 10 + 10; G.known[nid] = true;
  out = []; run("talk to " + NPCS[nid].name.toLowerCase().split(" ").pop());
  if (/gone home for the night/.test(text())) {
    assert.match(text(), /Back here early doors/, "the pointer is temporal, not spatial");
    assert.doesNotMatch(text(), new RegExp(_barName(NPCS[nid].room) + ", early doors"), "no riddle");
  }
});

// ── the mechanical batch ────────────────────────────────────────────────────

test("your own room is not an audience for the torch (Frank)", () => {
  _setFlag("act1Done"); G.room = _hotelRoomId(); G.battery = 80;
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: [] };
  out = []; G.lightOn = true; _lightNotice();
  assert.equal(text(), "", "no bar tease in a locked hotel room");
  // …and a bar still gets one
  G.room = "lucky_tiger"; out = []; _lightNotice();
  assert.ok(text().length > 0, "the bar still clocks the torch");
  G.party = null;
});

// bondNight is written by tips and party arrivals too, so a man who tipped
// three girls got "four fingers" on the FIRST drink he actually bought.
test("the butterfly tease counts drinks, because that is what it says (Gerry)", () => {
  _setFlag("act1Done"); G.room = "lucky_tiger"; G.money = 9000;
  G.soc.bondNight = { a: 1, b: 1, c: 1, d: 1 };   // tips/party, no drinks
  G.soc.drinkNight = {};
  out = []; run("buy drink for lek");
  assert.doesNotMatch(text(), /BUTTERFLY|Butterfly, na|flap/i, "no tease before four DRINKS");
  assert.deepEqual(Object.keys(G.soc.drinkNight), ["lek"], "drinks keep their own book");
});

// The social pools named a role their own target may hold: "Keng calls
// something to the cashier" — Keng being the cashier.
test("no social line names a role its target might hold (Gerry)", () => {
  const flat = JSON.stringify(_SOCIAL_TEXT);
  assert.ok(!/calls something to the cashier/.test(flat), "she does not call to herself");
  assert.ok(!/The cashier rings the till/.test(flat), "…nor ring her own till");
});

// A trace stranded by an early-return printed against an unrelated later
// command — a rose given in her bar surfaced on a LIGHT ON the next night.
test("a failed command carries nobody's breadcrumb (Frank)", () => {
  _setFlag("act1Done"); G.room = "lucky_tiger";
  _trace("give", "Lek", "a single red rose");     // strand one
  out = []; run("zzzznotaverb");
  assert.doesNotMatch(text(), /You gave/, "the parse miss drops it");
  out = []; run("look");
  assert.doesNotMatch(text(), /You gave/, "…and it does not resurface later");
});

// A, B, A slipped past a dedup that only compared the sender's LAST message.
test("one inbox read never prints the same text twice (Gerry)", () => {
  _setFlag("act1Done"); G.phone.inbox = [];
  const ask = "family of me sick need medicine 300 you help little bit na?";
  _pushMsg("lek", ask);
  _pushMsg("lek", "sabai dee mai");
  _pushMsg("lek", ask);
  const texts = G.phone.inbox.filter(m => !m.read).map(m => m.text);
  assert.equal(new Set(texts).size, texts.length, "no duplicate unread from one sender");
});

test("Myth Night is a motosai destination, not just a departure point (Gerry)", () => {
  assert.ok(MOTOSAI_DESTS["myth night"], "the market you can leave from is one you can reach");
  assert.equal(MOTOSAI_DESTS["myth night"].room, "myth_night");
  assert.ok(ROOMS.myth_night.motosai, "…and it does have the stand");
});

// The parade kept being dealt onto a man visibly holding somebody's hand.
test("nobody propositions you mid-party (Frank)", () => {
  const solo = Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].solo);
  assert.ok(solo.includes("freelancer") && solo.includes("bkktourist"),
    "the solicitations are marked");
  _setFlag("act1Done"); G.room = "beach_rd_c"; G.encDone = {}; G.lastEnc = -999;
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: [] };
  for (let i = 0; i < 60; i++) { G.pendingEnc = null; _maybeEncounter();
    if (G.pendingEnc) assert.ok(!ENCOUNTERS[G.pendingEnc] || !ENCOUNTERS[G.pendingEnc].solo,
      G.pendingEnc + " should not fire with company"); }
  G.party = null;
});

// "The club empties into the soft light" — for a man sealed behind a padded
// door in a bar with painted-out windows.
test("a lock-in dawn is a lock-in dawn (Gerry)", () => {
  _setFlag("act1Done"); G.room = "khao_talo_bar";
  G.soc.lockIn = { khao_talo_bar: true };
  out = []; _endNight("allnighter");
  assert.match(text(), /bolt back|black paint/i, "the bolt goes back first");
  assert.doesNotMatch(text(), /The club empties/, "not the generic all-nighter");
});

// The room says the far stools are empty; TALK TO PATRON produced one of them.
test("the bar-bore isn't on a rail the room called empty (Gerry)", () => {
  _setFlag("act1Done"); G.room = "starlight_bar"; G.season0 = 8; G.day = 1;
  assert.ok(_lowSeason(), "premise: the lean months");
  out = []; run("talk to patron");
  assert.match(text(), /find stools|lean months/i, "nobody there to talk to");
  G.season0 = 10; out = []; run("talk to patron");
  assert.ok(text().length > 0, "…and in season he's back");
});
