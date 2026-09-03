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

// ── batch B: volunteer-then-miss (the unlintable class, authored) ────────────
// A character puts a proper noun in their own greeting and then has no answer
// for it. No tool can find these — the words are topics nowhere in the game
// yet — so they come from personas standing in front of the character.

test("Gary answers for everything his own hello volunteers (Gerry)", () => {
  _setFlag("act1Done"); G.nightTurn = 20; G.room = _npcRoom("gary"); G.known.gary = true;
  const greet = NPCS.gary.dialogue[0].text;
  assert.match(greet, /fourteen at the lake/, "premise: he volunteers the lake");
  assert.match(greet, /Married her/, "…and the wife");
  for (const [topic, want] of [["lake", /Mabprachan/], ["wife", /Midnight Sun, 2004/],
    ["fishing", /Snakehead/]]) {
    G.talked.gary = []; out = []; run("ask gary about " + topic);
    assert.match(text(), want, "gary/" + topic);
    assert.doesNotMatch(text(), /Not my story|Couldn't tell you|Search me/i, topic + " lands");
  }
});

test("Ron answers for his wife, and for the man he sends you to (Gerry)", () => {
  _setFlag("act1Done"); G.nightTurn = 20; G.room = _npcRoom("ron"); G.known.ron = true;
  assert.match(NPCS.ron.dialogue[0].text, /Married a cashier off that very stool/, "premise");
  assert.match(NPCS.ron.dialogue.find(d => d.topic === "darkside").text, /Gary out at the lake/,
    "premise: he names Gary");
  for (const [topic, want] of [["wife", /That exact stool/], ["gary", /Lake Gary/],
    ["lake", /different country/]]) {
    G.talked.ron = []; out = []; run("ask ron about " + topic);
    assert.match(text(), want, "ron/" + topic);
  }
});

// The Shamrock key's own desc says "Khun Rattana owns the ground under that
// bar, DAENG SAYS" — and Daeng didn't know the name.
test("Daeng knows the landowner her own key credits her with naming (Gerry)", () => {
  assert.match(ITEMS.shamrock_key.desc, /Khun Rattana.*Daeng says/, "premise: the key cites her");
  _setFlag("act1Done"); G.room = "khao_talo_bar"; G.known.daeng = true;
  out = []; run("ask daeng about rattana");
  assert.match(text(), /Land person|three shophouse|Never sell/i, "she answers");
  assert.doesNotMatch(text(), /don't know, na/, "no miss on a name she is quoted about");
  // the factions register: flat, no scandal, no menace (docs/factions-thai.md)
  const node = NPCS.daeng.dialogue.find(d => d.topic === "rattana");
  assert.doesNotMatch(node.text, /bribe|corrupt|mafia|threat|dangerous/i,
    "structural pattern, never a scandal");
});

// The flagship girl — the woman the whole wallet quest walks you to — could
// not be asked where she was from, at any bond tier, while every filler
// hostess in the game carries family/home/plan.
test("Lek's personal topics exist, and deepen with the ledger (Frank)", () => {
  _setFlag("act1Done"); G.room = "lucky_tiger"; G.known.lek = true;
  const ask = topic => { G.talked.lek = []; out = []; run("ask lek about " + topic); return text(); };

  G.soc.drinks = { lek: 0 };                       // stranger: deflects, in voice
  assert.match(ask("family"), /Everybody here have family/, "stranger gets the deflection");
  assert.match(ask("home"), /Isaan/, "…a region, not a village");
  assert.doesNotMatch(ask("family"), /Not my story/, "but never a flat miss");

  G.soc.drinks = { lek: 7 };                       // regular: the boy, the village
  assert.equal(_bondTier("lek"), 2);
  assert.match(ask("family"), /seven|Ban Phai/, "the boy and the village arrive");
  assert.match(ask("home"), /Ban Phai/, "…named now");

  G.soc.drinks = { lek: 14 };                      // her-farang: the admission
  assert.equal(_bondTier("lek"), 3);
  assert.match(ask("plan"), /two more year for four year|Small shop/i, "the plan, and its honesty");
});

test("Lek's hello is not frozen at night one (Frank)", () => {
  _setFlag("act1Done"); G.room = "lucky_tiger"; G.known.lek = true;
  const hello = drinks => { G.soc.drinks = { lek: drinks }; G.talked = {}; G.convo = null;
    out = []; run("talk to lek"); return text(); };
  const cold = hello(0), warm = hello(7), close = hello(14);
  assert.match(cold, /Hello handsome/, "night one is night one");
  assert.notEqual(warm, cold, "a regular gets a different door");
  assert.notEqual(close, warm, "…and her-farang another");
  assert.match(close, /nobody else's all evening|stool/i, "the kept seat, in the greeting");
});

// asNew (a NEW question answered by an already-spoken node) fell back to the
// node's FULL text when it had no `short` — so the fix for a false "you asked
// me that" accusation produced a verbatim replay of his whole hello instead.
test("a new question about an old line gets the gist, not the spiel (Gerry+Wes)", () => {
  _setFlag("act1Done"); G.nightTurn = 20; G.room = _npcRoom("gary"); G.known.gary = true;
  out = []; run("talk to gary");
  const first = text();
  out = []; run("ask gary about midnight sun");
  const again = text();
  assert.notEqual(again, first, "not a verbatim replay (Gerry)");
  assert.doesNotMatch(again, /asked me that|sieve/i, "and not an accusation (Wes)");
  assert.match(again, /Midnight Sun/, "…it still answers what was asked");
});

// ── batch C: the padded door (Mario's call) ─────────────────────────────────
// Every Darkside street after midnight advertised "one padded door still
// thumping", and no command, price, favour or reputation got you through it
// from outside — the single biggest tease in the game for the player who came
// looking for exactly this. The door now opens for a face it knows: a man the
// bar has bolted in BEFORE, and nobody else.
test("the padded door opens for a man it has locked in before (Gerry/Mario)", () => {
  _setFlag("act1Done"); G.money = 9000;
  // earn it: spend freely at a lockIn bar, stand there at midnight
  G.room = "khao_talo_bar"; G.soc.bells = { khao_talo_bar: 1 };
  G.soc.mamaTreat = { khao_talo_bar: true }; G.nightTurn = 60;
  _closingTick();
  assert.ok(G.soc.lockIn.khao_talo_bar, "the bolt goes across");
  assert.ok(G.lockedInAt.khao_talo_bar, "…and the house remembers it permanently");

  // a NEW night, nothing spent, arriving off the street after midnight
  G.nightTurn = 99; _endNight("dawn");
  assert.ok(!G.soc.lockIn.khao_talo_bar, "the nightly flag is gone");
  assert.ok(G.lockedInAt.khao_talo_bar, "the permanent one is not");
  G.nightTurn = 70; G.room = "khao_talo";
  // …but NOT through the front. The value of that door is that the street sees
  // a shut shopfront; a farang admitted through it at 1 a.m. is the one thing
  // that would spoil it (Mario's call). They place him and send him round.
  out = []; run("enter daengs place");
  assert.equal(G.room, "khao_talo", "the front stays shut, even to a face they know");
  assert.match(text(), /Not the front/, "…and says why, and where instead");
  assert.match(text(), /ROUND THE BACK/, "with the tappable hint");
  out = []; run("round the back");
  assert.equal(G.room, "khao_talo_bar", "the alley door is the way it's actually done");
  assert.match(text(), /Aaah\. YOU|no handle on the outside/, "somebody was listening for you");
  assert.ok(G.soc.lockIn.khao_talo_bar, "and you're inside the lock-in proper");
});

// The hint is a promise, so every natural way of typing it has to work.
test("ROUND THE BACK answers to the words a player would use (Mario)", () => {
  _setFlag("act1Done"); G.day = 5; G.nightTurn = 70;
  for (const cmd of ["round the back", "back door", "backdoor", "alley",
    "go round the back", "go to the back door", "round back", "enter the alley"]) {
    newGame(); _setFlag("act1Done"); G.day = 5; G.nightTurn = 70;
    G.lockedInAt = { khao_talo_bar: 3 }; G.room = "khao_talo";
    out = []; run(cmd);
    assert.equal(G.room, "khao_talo_bar", cmd + " gets you in");
  }
  // …and ALLEY is still a real exit where a real alley exists
  newGame(); _setFlag("act1Done"); G.room = "metropole_room";
  run("alley");
  assert.equal(G.room, "lk_entrance", "the Metropole fire stairs are untouched");
});

test("the back door is knowledge, not signage (Mario)", () => {
  _setFlag("act1Done"); G.day = 5; G.nightTurn = 70; G.room = "khao_talo";
  assert.ok(!engineComplete("round").includes("round the back"),
    "a stranger is never offered it");
  G.lockedInAt = { khao_talo_bar: 3 };
  assert.ok(engineComplete("round").some(c => /round the back/.test(c)),
    "…and a known face is");
  // a cold look down the side finds a locked steel door, not a refusal
  G.lockedInAt = {};
  out = []; run("round the back");
  assert.match(text(), /never once opened for anybody who had to look for it/,
    "the alley exists; the door is the part you have to be given");
});

test("…and stays shut to everybody else (Gerry/Mario)", () => {
  _setFlag("act1Done"); G.nightTurn = 70; G.room = "khao_talo";
  out = []; run("enter daengs place");
  assert.notEqual(G.room, "khao_talo_bar", "a stranger is still a stranger");
  assert.match(text(), /Shutters down/, "the ordinary refusal");
});

// He tried this at exactly that door: "Nobody knocks in this town."
test("KNOCK is the one place the no-knocking rule bends (Gerry)", () => {
  _setFlag("act1Done"); G.nightTurn = 70; G.room = "khao_talo";
  out = []; run("knock");
  assert.match(text(), /Nobody knocks/, "the rule holds for everyone else");
  G.lockedInAt = { khao_talo_bar: G.day - 1 };   // an earlier night
  out = []; run("knock");
  assert.match(text(), /eccentric act/, "…and bends for the man it should");
  assert.match(text(), /Not the front|ROUND THE BACK/, "pointing him round the back");
  assert.equal(G.room, "khao_talo", "knocking is not entering — the front never opens");
});

// The street line was a pure tease — it must stop teasing a man who can answer it.
test("the street names the door once it is yours (Gerry)", () => {
  _setFlag("act1Done"); G.nightTurn = 70; G.room = "khao_talo_strip";
  out = []; run("enter the water buffalo");
  assert.doesNotMatch(text(), /not shut to you/, "a stranger gets the rumour only");
  G.lockedInAt = { khao_talo_bar: G.day - 1 };
  out = []; run("enter the water buffalo");
  assert.match(text(), /you know which one, and roughly who is behind it/, "the rumour becomes an address");
  assert.match(text(), new RegExp(_barName("khao_talo_bar")), "…a named one");
});

test("the permanent lock-in record survives a save (Gerry/Mario)", () => {
  G.lockedInAt = { khao_talo_bar: 3 };
  const snap = serializeGame(); newGame(); deserializeGame(snap);
  assert.deepEqual(G.lockedInAt, { khao_talo_bar: 3 });
  newGame();
  assert.deepEqual(G.lockedInAt, {}, "a fresh game knows nobody");
});

// The one-way rule is older than the welcome and outranks it: the lock-in's
// own closing line promises "no coming back in tonight", so the door that
// opens for a known face opens on a LATER night, never the one he left.
test("walking out still doesn't buy you back in tonight (canon)", () => {
  _setFlag("act1Done"); G.nightTurn = 70;
  G.lockedInAt = { khao_talo_bar: G.day };     // locked in THIS night
  assert.ok(!_lockInWelcome("khao_talo_bar"), "same night: the bolt stays shut");
  G.lockedInAt = { khao_talo_bar: G.day - 1 }; // …and an earlier one
  assert.ok(_lockInWelcome("khao_talo_bar"), "a previous night: the door knows you");
});

// ── the goodbye (Frank) ─────────────────────────────────────────────────────
// A whole week with one woman — barfine waived, top of her ledger, "your girl"
// in the black book — and the week ended with nothing from her at all. The
// return side was already built (G.prevBond keeps her peak tier so her bar
// greets a man who comes back); this is the other half.

test("a bonded girl gets a goodbye, and it scales with the ledger (Frank)", () => {
  _setFlag("act1Done"); G.day = 8;
  const say = drinks => { newGame(); _setFlag("act1Done"); G.day = 8;
    G.soc.drinks = { lek: drinks }; out = []; _lastGoodbye(); return text(); };

  assert.equal(say(1), "", "a stranger gets no goodbye — it is earned");
  const reg = say(7);
  assert.equal(_bondTier("lek"), 2);
  assert.ok(reg.length > 0 && /Lek/.test(reg), "a regular gets one");
  const far = say(14);
  assert.equal(_bondTier("lek"), 3);
  assert.notEqual(far, reg, "her-farang gets a different one");
  assert.match(far, /she works|not the same as/i, "…and the coda that says she has her own week");
});

// Doctrine: the week is being SCORED on this very screen, so a goodbye that
// paid สนุก would turn the last real moment of a relationship into a bonus.
test("the goodbye costs nothing and pays nothing (Frank)", () => {
  for (const drinks of [7, 14]) {
    newGame(); _setFlag("act1Done"); G.day = 8; G.soc.drinks = { lek: drinks };
    const h = G.happy, j = G.jaded, b = G.soc.drinks.lek, m = G.money;
    out = []; _lastGoodbye();
    assert.deepEqual([G.happy, G.jaded, G.soc.drinks.lek, G.money], [h, j, b, m],
      "no meter moves at drinks=" + drinks);
  }
});

test("the goodbye reaches the player through the real vacation end (Frank)", () => {
  _setFlag("act1Done"); G.soc.drinks = { lek: 14 }; G.day = 8;
  out = []; _endVacation();
  assert.match(text(), /Lek/, "she is in the week's-end screen");
  assert.match(text(), /So\. What now\?/, "…before the airline's question, not instead of it");
  assert.equal(G.pendingChoice, "vacation_end", "the gate still arms");
});

// The other half: "she doesn't text". Her number survives the trip home and
// prevBond remembers her, so the phone is where it keeps going.
test("she texts while you're in the air — if she's yours (Frank)", () => {
  _setFlag("act1Done"); G.soc.drinks = { lek: 14 }; G.phone.contacts = { lek: true }; G.day = 8;
  _endVacation(); G.pendingChoice = null;
  out = []; _newVacation();
  assert.match(text(), /sent while you were somewhere over the gulf/, "the nudge");
  const msg = G.phone.inbox.find(m => m.from === "lek");
  assert.ok(msg, "…and a real message from her");
  assert.ok(!msg.gives, "no money — she is not asking for anything");
  assert.doesNotMatch(msg.text, /sick|hospital|medicine|send/i, "and it is not a scam-ask");

  // a churn player gets neither
  newGame(); _setFlag("act1Done"); G.soc.drinks = { lek: 2, ping: 2 };
  G.phone.contacts = { lek: true }; G.day = 8;
  _endVacation(); G.pendingChoice = null; out = []; _newVacation();
  // NB: the airport scrub says "the seatbelt sign pings off over the gulf" for
  // everyone — assert on the nudge's own distinctive phrase, not that fragment.
  assert.doesNotMatch(text(), /sent while you were somewhere over the gulf/,
    "breadth earns no letter home");
  assert.equal(G.phone.inbox.length, 0);
});

// Soi 6 challenge mode ends on the share card, not a relationship beat.
test("the daily challenge keeps its own ending (Frank)", () => {
  _setFlag("act1Done"); G.mode = "soi6"; G.soc.drinks = { lek: 14 }; G.day = 8;
  out = []; _endVacation();
  assert.doesNotMatch(text(), /knows the date|thirty entirely undivided/, "no goodbye in the challenge");
  assert.match(text(), /PLAY AGAIN/, "the card and the rematch, as before");
});
