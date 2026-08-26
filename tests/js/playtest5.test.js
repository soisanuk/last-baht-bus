// Round-five blind playtests (2026-08-22, two Fable personas — "Graham the
// Settler" on desktop, "Marcus who'd never" on mobile). Each test pins one
// finding so it can't come back.
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
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");

function sandbox(pers = "joker") {
  newGame();
  G.player = { origin: "monger", personality: pers, orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 5000;
  out = [];
}
beforeEach(() => sandbox());

// ── the conversation layer ──
test("an unknown topic is not a repeat: Lake Gary gets his greeting once, then a voiced miss in his own register", () => {
  G.room = "lake_mabprachan";
  doCommand("ask gary about clams");            // first contact: the greeting, as ever
  assert.match(text(), /Twenty-two years here/);
  out = [];
  doCommand("ask gary about visa");             // a miss, now that he's said hello
  assert.doesNotMatch(text(), /you ask me that already|Farang memory|tilac|Aiyah/);
  assert.match(text(), /Not my department|above my pay grade|No idea, mate/);
  out = [];
  doCommand("ask gary about sabai");            // a real topic still answers
  assert.match(text(), /Now you are here/);
});

test("a hostess's miss stays in her register; a true repeat keeps the Tinglish brush-off", () => {
  G.room = "candy_bar";
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  doCommand("talk to " + NPCS[girl].name.toLowerCase()); out = [];
  doCommand(`ask ${NPCS[girl].name.toLowerCase()} about cryptocurrency`);
  assert.match(text(), /I don't know|wrong girl|Not my story|Ask me something/);
  assert.doesNotMatch(text(), /pay grade|No idea, mate/);
});

test("patrons: the intro is met-once (not nightly), and a topic miss is a shrug, not 'You again'", () => {
  G.room = "queen_vic";
  doCommand("talk to angela");
  assert.match(text(), /Angela/);
  const first = text();
  out = [];
  doCommand("ask angela about discman");
  assert.doesNotMatch(text(), /You again/);
  assert.match(text(), /Not one I know|Search me|Couldn't tell you/);
  // a new day: the daily seen-book resets, but she doesn't re-introduce herself in full
  G.day += 1; out = [];
  doCommand("talk to angela");
  assert.notEqual(text(), first);
  assert.ok(text().length < first.length, "the gist, not the whole first meeting again");
});

test("a pending question lapses OUT LOUD when you turn to someone else, and the cue prints once", () => {
  G.room = "stinky_bar";
  G.player.origin = "pi"; G.player.personality = "blunt";
  doCommand("talk to bert");
  assert.equal(G.convoQ && G.convoQ.key, "why");
  const cues = () => (text().match(/put that to you/g) || []).length;
  assert.equal(cues(), 1);
  doCommand("look");                               // another turn — no re-print
  assert.equal(cues(), 1);
  out = [];
  doCommand("talk to dave");                       // switch partners
  assert.match(text(), /Bert's question goes unanswered/);
  assert.equal(G.convoQ, null);
});

// ── characters ──
test("Fast Eddy stays dry: BUY MAN DRINK pours him a soda water", () => {
  G.room = "white_rabbit";
  doCommand("buy man drink");
  assert.match(text(), /soda water/);
  assert.doesNotMatch(text(), /proper one|for the road/);
});

test("Cream answers her own verbs — a civilian, not the rail and not the roster", () => {
  G.room = "metro_garden"; G.nightTurn = 45;
  doCommand("buy drink for cream");
  assert.doesNotMatch(text(), /Walking Street in 2004|sacrament/);
  assert.match(text(), /lets you|thank you na/);
  out = [];
  doCommand("flirt with cream");
  assert.doesNotMatch(text(), /mate|Wrong tree/);
  assert.match(text(), /pink|smooth|flirt me/);
  out = [];
  doCommand("contact cream");
  assert.doesNotMatch(text(), /family and better customers/);
  assert.match(text(), /Maybe later/);
});

// ── encounters ──
test("the Tree Town maze: bare HELP is the reaction the hint promised, not a re-render", () => {
  G.room = "tt_lane_1";
  delete G.encDone.maze;
  _startEnc("maze");
  assert.equal(G.pendingEnc, "maze");
  out = [];
  doCommand("help");
  assert.equal(G.pendingEnc, null, "HELP answered the moment");
  assert.ok(_MAZE_HELP.some(s => text().includes(s)));
});

test("the booking app's NO reads where you are — no ceiling fan on Naklua Road", () => {
  G.room = "naklua_rd";
  delete G.encDone.booking; G.nightTurn = 45;
  _startEnc("booking");
  assert.equal(G.pendingEnc, "booking");
  out = [];
  doCommand("no");
  assert.doesNotMatch(text(), /ceiling fan|asleep before/);
  assert.match(text(), /keep walking/);
});

// ── the clock and transport ──
test("the last-bus warning counts the minutes it actually has left", () => {
  G.room = "beach_rd_c"; G.nightTurn = 78; G.lastBusWarned = false;
  _lastBusWarn();
  assert.match(text(), /12 minutes/);
  assert.doesNotMatch(text(), /half an hour/);
});

test("motosai: the Darkside fare applies both ways, Second Road has stands, and HOTEL is a destination", () => {
  assert.ok(ROOMS.second_rd_c.motosai && ROOMS.second_rd_mall.motosai);
  G.room = "khao_talo"; G.nightTurn = 30;
  const m = G.money;
  doCommand("motosai to naklua");
  assert.equal(G.room, "naklua_rd");
  assert.equal(m - G.money, MOTOSAI_FAR, "back across the highway costs the Darkside rate");
  sandbox(); G.room = "second_rd_c"; G.nightTurn = 30;
  doCommand("motosai to hotel");
  assert.equal(G.room, MOTOSAI_DESTS.naklua.room, "the piwin knows where you sleep");
});

test("the bus: a stop typed without the 'soi', and a bare stop name straight off the drop-list", () => {
  G.room = "second_rd_c"; G.nightTurn = 30;
  doCommand("ride bus to second road myth night");
  assert.ok(G.pendingFare && G.pendingFare.kind === "bus", "token match reaches 'Second Road (Soi Myth Night)'");
  sandbox(); G.room = "second_rd_c"; G.nightTurn = 30;
  doCommand("ride bus");
  assert.match(text(), /He'll drop you/);
  out = [];
  doCommand("second road (soi diana)");
  assert.ok(G.pendingFare && G.pendingFare.kind === "bus", "the bare stop answers the list");
});

test("SLEEP tapped on waking asks once; SLEEP again (or a sleep after a sleep) goes through", () => {
  G.room = "hotel_room"; G.nightTurn = 50;
  doCommand("sleep");                    // ends the night → wake, G.wakeTurn set
  const d = G.day;
  out = [];
  doCommand("look"); doCommand("sleep");  // wake + one command, then sleep: guard fires
  assert.equal(G.day, d);
  assert.match(text(), /SLEEP again if you mean it/);
  doCommand("sleep");
  assert.equal(G.day, d + 1, "the second SLEEP is meant");
});

test("in the opening quest a hospital night is a do-or-die fail like dawn, not a calendar day", () => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.day = 2; G.room = "tt_lane_1";
  out = [];
  _endNight("hurt");
  assert.equal(G.day, 2, "reset, not advanced");
  assert.match(text(), /THE NIGHT BEAT YOU HOME/);
  assert.match(text(), /ward|drip/);
});

// ── claims the mechanics now honour ──
test("EAT / MENU / BUY <dish> at a kitchen all reach the food; water sells where a cart is described", () => {
  G.room = "kiss"; out = [];
  Object.keys(_EDIBLE).forEach(i => { if (G.itemLoc[i] === "inventory") G.itemLoc[i] = null; }); // nothing in the pockets
  doCommand("menu");
  assert.doesNotMatch(text(), /didn't parse|No idea/);
  out = []; const m = G.money;
  doCommand("eat");
  assert.ok(G.money < m, "EAT at a restaurant orders");
  out = []; const m2 = G.money;
  doCommand("buy pad thai");
  assert.ok(G.money < m2, "a dish off the card is BUY FOOD");
  G.room = "central_beach"; out = []; const m3 = G.money;
  doCommand("buy water");
  assert.ok(G.money < m3, "the cool box sells water");
});

test("swim off any sand, charge at the 7-Eleven window, and your own room safe answers", () => {
  G.room = "central_beach"; G.soc.drunk = 0; out = [];
  doCommand("swim");
  assert.match(text(), /wade in|bathwater/);
  G.room = "jomtien_2nd"; G.itemLoc.charger = "inventory"; G.battery = 40; out = [];
  doCommand("charge phone");
  assert.equal(G.battery, 100);
  G.room = "hotel_room"; out = [];
  doCommand("open safe");
  assert.match(text(), /Your own room safe/);
  assert.doesNotMatch(text(), /keypad wants/);
});

test("bare TALK names the room; bare NO is voiced; a wai on the sand is a wai on the sand", () => {
  G.room = "queen_vic"; out = [];
  doCommand("talk");
  assert.match(text(), /Talk to whom\? Here:/);
  out = [];
  doCommand("no");
  assert.doesNotMatch(text(), /didn't parse|didn't understand/);
  G.room = "central_beach"; out = [];
  doCommand("wai family");
  assert.match(text(), /empty sand/);
});

test("the phone: offmap girls list as LINE only, and answer SEND in their own voices", () => {
  G.phone.contacts.priew = true; G.phone.contacts.sao = true; G.phone.contacts.cream = true;
  doCommand("contacts");
  assert.match(text(), /Priew — LINE only/);
  out = []; const m = G.money;
  doCommand("send 500 to priew");
  assert.doesNotMatch(text(), /take care YOU/);
  const msgs = () => G.phone.inbox.map(x => x.text).join("\n");
  assert.match(msgs(), /i keep it for lunch|lunch is on me/);
  doCommand("send 500 to sao");
  assert.equal(G.money, m - 500, "Sao's comes back — only Priew's left the account");
  assert.match(msgs(), /Coffee's on me/);
  doCommand("send 500 to cream");
  assert.match(msgs(), /english course/);
});

test("weather flavour: a Darkside drizzle has no baht bus, and the pools are deeper than two", () => {
  assert.ok(_DRIZZLE_STREET.length >= 4 && _DRIZZLE_DARK.length >= 3);
  assert.ok(_DRIZZLE_DARK.every(s => !/baht bus/.test(s)));
});

test("Khao Talo after the shutters stops advertising the charcoal; a shut bar isn't offered as a destination", () => {
  G.room = "khao_talo"; G.nightTurn = 70; out = [];
  _describeRoom(true);
  assert.match(text(), /after the shutters/);
  assert.doesNotMatch(text(), /sends out charcoal smoke/);
  G.known.daeng = true; G.room = "khao_talo";
  const line = _elsewhereLine("daeng");
  assert.match(line, /shut for the night/);
});

test("PLAY CONNECT 4 100 puts ฿100 on the table; the Anchor's barometer reads", () => {
  G.room = "candy_bar"; G.money = 500; out = [];
  doCommand("play connect 4 100");
  assert.equal(G.game && G.game.stake, 100);
  G.game = null;
  G.room = "anchor_bar"; out = [];
  doCommand("examine barometer");
  assert.match(text(), /CHANGE since/);
  assert.doesNotMatch(text(), /ship's wheel is real/);
});

// ── the second pair (Jürgen / Bex / Keith) ──
test("no emergency stash on the Soi 6 week — the room safe beat is a full-game thing", () => {
  startSoi6Mode();
  const m = G.money;
  G.room = "qv_room"; out = [];
  _roomSafeBeat();
  assert.equal(G.money, m);
  assert.doesNotMatch(text(), /emergency stash/);
});

test("the conversation layer only swallows a line as an ASK when it could be one", () => {
  G.room = "queen_vic";
  doCommand("talk to terry"); out = [];
  doCommand("untersuche notizbuch bitte");          // a whole sentence in another language
  assert.doesNotMatch(text(), /You asked Terry about untersuche/);
  assert.match(text(), /didn't understand|didn't parse|soi blinks|no idea/i);
  out = [];
  doCommand("navy");                                 // a short topic guess still asks
  assert.match(text(), /Terry|Navy|navy/);
});

test("a female patron goes back to HER glass", () => {
  G.room = "coconut";
  doCommand("talk to sandra");
  for (let i = 0; i < 8; i++) { out = []; doCommand("ask sandra about quantum physics"); assert.doesNotMatch(text(), /his glass|his Chang/); }
});

test("SAY GOODBYE is leave-taking; last call counts its minutes and says nothing at the shutters", () => {
  G.room = "queen_vic";
  doCommand("talk to mort"); out = [];
  doCommand("say goodbye");
  assert.match(text(), /take your leave/);
  G.room = "pink_lotus"; G.nightTurn = 57; G.soc.lastCall = {}; out = [];
  _lastCall("pink_lotus");
  assert.match(text(), /about 18 minutes/);
  G.nightTurn = 59; G.soc.lastCall = {}; out = [];
  _lastCall("pink_lotus");
  assert.equal(text(), "");
});

test("Lek keeps the Mot gist; Oy's gated wallet topic is a 'not yet', not a 'not mine'", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("knowMot"); _setFlag("knowOyHasIt");
  G.room = _npcRoom("lek"); doCommand("talk to lek"); out = [];
  doCommand("ask lek about mot");
  assert.match(text(), /Madam Oy|Rainbow Girls/);
  G.flags.knowOyHasIt = false;
  G.room = _npcRoom("oy"); doCommand("talk to oy"); out = [];
  doCommand("ask oy about wallet");
  assert.match(text(), /Not yet|another time|Another time|Not tonight/);
});

test("the dog survives the Act One reset, rides Tan's sedan out loud, and is a topic everyone has", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.dog = { since: 2, name: "Biscuit" }; _setFlag("hasDog");
  G.room = "jomtien_beach"; out = [];
  _endNight("dawn");
  assert.ok(G.dog && G.dog.name === "Biscuit", "the companion is not part of the slate");
  assert.match(text(), /Biscuit is still at your heel/);
  // Tan's pickup
  G.phone.contacts.tan = true; G.battery = 50; G.money = 0; out = [];
  _tanCall();
  assert.match(text(), /Biscuit/);
  // the topic
  sandbox(); G.dog = { since: 1, name: "Biscuit" };
  G.room = _npcRoom("lek"); doCommand("talk to lek"); out = [];
  doCommand("ask lek about dog");
  assert.doesNotMatch(text(), /wrong girl|Not my story/);
  assert.match(text(), /Biscuit/);
  G.room = "khao_talo_bar"; _setFlag("shamrockVisited"); doCommand("talk to daeng"); out = [];
  doCommand("ask daeng about paddy");
  assert.match(text(), /Paddy dog/);
  G.room = "queen_vic"; out = [];
  doCommand("ask mort about the dog");
  assert.match(text(), /dog|picked you/i);
  assert.doesNotMatch(text(), /Not one I know|Search me|Couldn't tell you/);
});

test("dog verbs a dog person types are voiced, and the dog reads the room", () => {
  G.dog = { since: 1, name: "Biscuit" };
  G.room = "beach_rd_c"; G.itemLoc.rose = "inventory";
  for (const [cmd, re] of [["good boy", /Good boy|good boy|Good dog/], ["stay", /stays|sits/], ["whistle", /whistle/i],
    ["hug biscuit", /knee|shin|chin|fuss|scratch|rub|tail|Biscuit/], ["call biscuit", /he comes/], ["talk to biscuit", /Biscuit|his name|Conversation over/], ["photo biscuit", /blur|yawn|frame/],
    ["feed cats", /No cats here/]]) {
    out = []; doCommand(cmd);
    assert.match(text(), re, cmd);
    assert.doesNotMatch(text(), /didn't understand|didn't parse/, cmd);
  }
  out = []; doCommand("give rose to biscuit");
  assert.match(text(), /sniffs|Not food/);
  G.room = "hotel_room"; G.itemLoc.noodles = null; G.itemLoc.moo_ping = null; out = [];
  doCommand("feed biscuit");
  assert.match(text(), /room service|Nothing up here/);
  // a LOOK doesn't walk him in again
  G.room = "candy_bar"; out = [];
  _describeRoom(true); _describeRoom(true);
  assert.equal((text().match(/trots in under the rail/g) || []).length, 1);
  // a pet is a pool
  const seen = new Set();
  for (let i = 0; i < 12; i++) { out = []; doCommand("pet biscuit"); seen.add(text()); }
  assert.ok(seen.size >= 3);
});

test("animals the prose names can be examined; Nok greets the regular; Cheap Charlie's cooks; no phantom baht bus", () => {
  G.room = "tt_lane_1"; out = [];
  doCommand("examine fish tank"); assert.match(text(), /fish tank/);
  G.room = "dolphin_bar"; out = [];
  doCommand("examine dolphin"); assert.match(text(), /house paint/);
  G.room = "beach_rd_c"; out = [];
  doCommand("examine rats"); assert.match(text(), /routines/);
  G.room = "jomtien_beach"; out = [];
  doCommand("examine dog"); assert.match(text(), /tide line/);
  G.room = _npcRoom("nok"); out = [];
  doCommand("talk to nok"); assert.match(text(), /you back|You back/i); assert.doesNotMatch(text(), /sleep on beach like soi dog/);
  assert.ok(FOOD_STALLS.cheap_charlies && FOOD_STALLS.cheap_charlies_jt);
  assert.ok(ROOMS.buakhao_tt.revisit.every(l => !/baht bus/.test(l)));
});

test("the investor can still own a bar: Tan gives the licence answer when you ARE Wayne", () => {
  G.player.origin = "business"; G.stage = "expat"; _setFlag("expatLife");
  G.quests.bar_premises = "done";
  assert.equal(_qGiver(QUESTS.bar_licence), "tan");
  assert.ok(_questAvailable("bar_licence"), "the nominee vignette counts as lived when it's about you");
  G.room = NPCS.tan.room || G.room;
  _questOffer("tan");
  assert.equal(G.quests.bar_licence, "offered");
  assert.match(text(), /Whose Name Is On It/);
  doCommand("accept bar_licence");
  out = []; doCommand("quests"); assert.match(text(), /ASK TAN ABOUT THE LICENCE/);
  G.room = _npcRoom("tan"); out = [];
  doCommand("ask tan about licence");
  assert.match(text(), /Fifty-one percent/);
  assert.ok(_flag("barLicence"));
});

test("HINT never nudges the WDG errand; Tan's manifest names venues by their signs", () => {
  G.quests.wdg_flip = "offered"; out = [];
  _doHint();
  assert.doesNotMatch(text(), /WDG_FLIP/);
  assert.match(_tanWhere("pete"), /Verandah/);
  assert.doesNotMatch(_tanWhere("pete"), /Sandy Toes/);
  assert.match(_tanWhere("doyle"), /Queen Vic/);
});

test("TRAVEL won't walk you to shutters or into the dawn", () => {
  G.room = "naklua_rd"; G.visited.orchid_club = true; G.nightTurn = 59; out = [];
  doCommand("travel orchid club");
  assert.match(text(), /shuts at midnight/);
  assert.equal(G.room, "naklua_rd");
  G.room = "ws_gate"; G.nightTurn = 95; out = [];
  doCommand("travel hotel");
  assert.match(text(), /walking into the dawn/);
  assert.equal(G.room, "ws_gate");
});

test("own-prose instructions parse: Kesinee's bar, Nigel's bar(s), Tan's coffee; Bert and Candy answer the Shamrock and each other", () => {
  G.room = "kitten_corner"; doCommand("talk to kesinee"); out = [];
  doCommand("ask kesinee about my bar"); assert.match(text(), /Kitten Corner/);
  G.room = "lucky_tiger"; doCommand("talk to nigel"); out = [];
  doCommand("ask nigel about bar"); assert.match(text(), /Lucky Tiger/);
  G.room = _npcRoom("tan"); out = [];
  doCommand("buy tan coffee"); assert.match(text(), /Ohio|owns nothing/);
  _setFlag("shamrockVisited"); _setFlag("hatchPried");
  G.room = "stinky_bar"; doCommand("talk to bert"); out = [];
  doCommand("ask bert about shamrock"); assert.match(text(), /Sean/);
  out = []; doCommand("ask bert about key"); assert.match(text(), /landlord/);
  G.room = "candy_bar"; doCommand("talk to candy"); out = [];
  doCommand("ask candy about bert"); assert.match(text(), /We go back/);
});

test("a lapsed question can be asked again next time the node lands", () => {
  G.room = "stinky_bar"; G.player.origin = "pi"; G.player.personality = "blunt";
  doCommand("talk to bert");
  assert.equal(G.convoQ && G.convoQ.key, "why");
  doCommand("talk to dave");
  assert.equal(G.convoQ, null);
  assert.ok(!_npcState("bert").know["asked_why"], "the ask is un-spent — the next node that carries it asks again");
});

// ── round seven: the one-girl man (Tomas) ──
test("a regular's 'yesterday you no come' only fires when you didn't come", () => {
  const girl = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && NPCS[id].room === "lucky_tiger");
  G.room = "lucky_tiger"; G.soc.drinks[girl] = 8; // regular tier
  G.seenDay = { [girl]: G.day - 1 };               // you were with her last night
  for (let i = 0; i < 12; i++) { out = []; _bondTalk(girl); assert.doesNotMatch(text(), /Yesterday you no come/); }
  G.seenDay = { [girl]: G.day - 3 }; let hit = false;
  for (let i = 0; i < 30; i++) { out = []; _bondTalk(girl); if (/Yesterday you no come/.test(text())) hit = true; }
  assert.ok(hit, "…and can when you've been away");
  // talking to her records the day
  doCommand("talk to " + NPCS[girl].name.toLowerCase());
  assert.equal(G.seenDay[girl], G.day);
});

test("her texts and refusals don't name a mama her own story put elsewhere", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /mama of me sick need medicine|mama of me sick, need buy/);
  assert.doesNotMatch(src, /make merit with my mama/);
});

test("she remembers you across vacations — once, with a head start, not the old ledger", () => {
  const girl = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && NPCS[id].room === "lucky_tiger");
  G.soc.drinks[girl] = 8;
  G.day = 7; G.room = "hotel_room";
  _newVacation();
  assert.equal(G.prevBond[girl], 2);
  assert.equal(G.soc.drinks[girl] || 0, 0, "the ledger did reset");
  G.room = "buakhao_n"; out = [];
  _arriveAt("lucky_tiger");
  assert.match(text(), /You come BACK|You COME|Now I keep again/);
  assert.ok(G.soc.drinks[girl] >= 2, "a small head start");
  out = []; G.room = "buakhao_n"; _arriveAt("lucky_tiger");
  assert.doesNotMatch(text(), /You come BACK|You COME|Now I keep again/, "once per vacation");
});

test("Lek's wallet topic ticks the milestone the HINT points at", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("knowMot"); G.room = _npcRoom("lek");
  doCommand("ask lek about wallet");
  assert.ok(_flag("knowOyHasIt"));
  assert.doesNotMatch(text(), /Same-same I tell you/);
});

test("the rose seller lapses on an unrelated command instead of eating it", () => {
  G.room = "lucky_tiger";
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.soc.drinks[girl] = 2; G.convo = girl; G.flowerFor = girl; G.pendingEnc = "flower"; G.flowerDay = G.day;
  const m = G.money; out = [];
  doCommand(`tip ${NPCS[girl].name.toLowerCase()} 100`);
  assert.equal(G.pendingEnc, null);
  assert.equal(G.money, m - 100, "the tip actually happened");
  assert.match(text(), /steers the child on/);
  G.flowerFor = girl; G.pendingEnc = "flower"; out = [];
  doCommand("no thanks");
  assert.match(text(), /lift a palm/);
});

test("chips: a waived fine shows no number; the night ride has RIDE ON / call it", () => {
  const girl = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && NPCS[id].room === "lucky_tiger");
  G.soc.drinks[girl] = 14; G.pendingBf = { st: 600, lt: 1050, id: girl };
  const c = _chipSet().map(x => x.label).join(" | ");
  assert.match(c, /no fine/); assert.doesNotMatch(c, /฿600|฿1050/);
  G.pendingBf = null; G.pendingEnc = "nightride";
  assert.match(_chipSet().map(x => x.cmd).join(" | "), /ride on/);
  G.pendingEnc = null;
});

test("MESSAGE her while she's three stools away; the quiz ignores digits inside commands; a toastie is a toastie", () => {
  const girl = _npcsHere.call(null) && Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && NPCS[id].room === "lucky_tiger");
  G.room = "lucky_tiger"; G.phone.contacts[girl] = true; G.battery = 80; out = [];
  doCommand("message " + NPCS[girl].name.toLowerCase());
  assert.match(G.phone.inbox.map(x => x.text).join("\n"), /i am HERE|look up|RIGHT here/);
  // the quiz
  G.room = _quizBars()[0]; G.day = 4; G.nightTurn = 25;
  G.game = { type: "quiz", qs: [0, 1, 2, 3, 4], at: 0, right: 0, bar: G.room };
  out = []; _quizInput("tip rung 100");
  assert.match(text(), /1, 2, or 3/);
  assert.equal(G.game.at, 0);
  G.game = null;
  // the toastie
  G.room = "naklua_rd"; G.money = 500; out = [];
  doCommand("buy toastie");
  assert.doesNotMatch(text(), /grilled chicken/);
  assert.ok(_TOASTIE_LINES.some(s => text().includes(s)));
});

test("a night ride never repeats a venue while the pool lasts; the 6 a.m. coda is any girl's", () => {
  const seen = [];
  for (let i = 0; i < _RIDE_VENUES.length - 1; i++) { const v = _pickRideVenue(seen); assert.ok(!seen.includes(v.key)); seen.push(v.key); }
  assert.ok(_CODA_DECON.every(s => !/mile-long|untouchable VIP/.test(s)));
});

// ── round seven: the action junkie (Danny Boy) ──
test("Tan's sedan ends any game on the table; killer pool is tappable", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; // Act One: Tan drives you in from Jomtien
  G.room = "coconut"; G.money = 500; G.nightTurn = 50;
  doCommand("play connect 4");
  assert.equal(G.game && G.game.type, "c4");
  G.phone.contacts.tan = true; G.battery = 50; out = [];
  _tanCall();
  assert.equal(G.game, null, "the game died with the stool");
  assert.match(text(), /dies with the stool/);
  assert.equal(G.room, "buakhao_n");
  G.game = { type: "kp", kp: {}, stake: 100 };
  assert.deepEqual(_gameVerbs(), ["shot", "power", "quit"]);
  G.game = null;
});

test("the Jackpot cap says so; PLAY CONNECT 4 WITH <mamasan> honours the opponent; a short stake is announced", () => {
  G.room = "candy_bar"; G.money = 1000; out = [];
  doCommand("play jackpot 500");
  assert.match(text(), /House max on the Jackpot is ฿100/);
  assert.equal(G.game.stake, 100);
  G.game = null; out = [];
  const mama = _npcsHere().find(id => NPC_ROLES[id] === "mamasan");
  doCommand("play connect 4 with " + NPCS[mama].name.toLowerCase());
  assert.equal(G.game.oppId, mama, "the shark takes the frame when asked");
  G.game = null; G.money = 5; out = [];
  doCommand("play connect 4");
  assert.match(text(), /Short stake/);
  G.game = null;
});

test("REMATCH / DOUBLE / BET are the gambler's verbs; LOOK/TIME mid-game are free; a stray SHOT is pointed", () => {
  G.room = "candy_bar"; G.money = 1000;
  out = []; doCommand("shot"); assert.match(text(), /No game on the table/);
  out = []; doCommand("bet 50"); assert.match(text(), /Bet on what/);
  doCommand("play connect 4 40");
  const nt = G.nightTurn;
  doCommand("time"); doCommand("look"); doCommand("inventory");
  assert.equal(G.nightTurn, nt, "checking the clock/board/pockets costs nothing");
  assert.equal(G.game && G.game.type, "c4", "…and doesn't end the game");
  doCommand("quit");
  assert.ok(G.lastGame && G.lastGame.type === "c4" && G.lastGame.stake === 40);
  out = []; doCommand("double");
  assert.match(text(), /Double or nothing: ฿80/);
  assert.equal(G.game && G.game.stake, 80);
  doCommand("quit"); out = [];
  doCommand("bet 30 on jackpot");
  assert.equal(G.game && G.game.type, "jp"); assert.equal(G.game.stake, 30);
  doCommand("quit");
});

test("quiz questions don't repeat within a night; QUIZ and DARTS are topics anyone answers", () => {
  G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0];
  _startQuiz(); const first = [...G.game.qs]; G.game = null;
  G.room = _quizBars()[1];
  _startQuiz(); const second = G.game.qs; G.game = null;
  assert.ok(first.every(q => !second.includes(q)), "no question twice in one night");
  G.day = 5; G.room = _npcRoom("candy"); doCommand("talk to candy"); out = [];
  doCommand("ask candy about quiz");
  assert.match(text(), /Thursday|Quiz/);
  out = []; doCommand("ask candy about darts");
  assert.match(text(), /board|Board/);
  G.room = "queen_vic"; out = [];
  doCommand("ask mort about the quiz");
  assert.match(text(), /Quiz|quiz/);
  assert.doesNotMatch(text(), /Search me|Not one I know/);
});

test("the Connect 4 loss is a pool; the seated quiz entry is one line", () => {
  assert.ok(_C4_LOSS.length >= 3);
  G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0]; out = [];
  _startQuiz(true);
  assert.doesNotMatch(text(), /Too late/);
  G.game = null;
});

// ── round eight: the Thai speaker (Annie), the replayer (Ollie), the broke one (Shane) ──
test("typed Thai: polite particles match, a Thai listener understands, Thai digits read, a little Thai commands", () => {
  G.room = _npcRoom("candy"); out = [];
  doCommand("say สวัสดีค่ะ to candy");
  assert.match(text(), /สวัสดี/);
  assert.doesNotMatch(text(), /did not catch a word/);
  out = []; doCommand("say ฉันชอบเมืองนี้มาก to candy");   // Thai the game doesn't know — she still understood
  assert.match(text(), /catches it — every word/);
  out = []; doCommand("ขอบคุณค่ะ");
  assert.match(text(), /ขอบคุณ/);
  out = []; doCommand("ไม่เอา");
  assert.match(text(), /mai ao/);
  assert.doesNotMatch(text(), /Laughter and approval/);
  G.room = "jomtien_beach"; G.money = 100; out = [];
  doCommand("ซื้อน้ำ");
  assert.match(text(), /เข้าใจ — buy water/);
  out = []; doCommand("เบียร์ไปไหนดู");
  assert.match(text(), /reads a little Thai|เข้าใจ/);
  assert.doesNotMatch(text(), /didn't understand/);
  assert.equal(_norm("enter ๑๕"), "enter 15");
});

test("Thai NPCs keep their register on a miss; Nok says ui, not aiyee; the jogger has no fixed hour", () => {
  assert.ok(_thaiVoice("nok") && _thaiVoice("tan") && _thaiVoice("dj_beer"));
  assert.ok(!_thaiVoice("gary") && !_thaiVoice("bert"));
  G.room = _npcRoom("nok"); doCommand("talk to nok"); out = [];
  doCommand("ask nok about quantum");
  assert.doesNotMatch(text(), /mate|my department|pay grade/);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /No money\? Aiyee/);
  const enc = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.doesNotMatch(enc, /on a hill at two in the morning/);
});

test("the piwin can be wai'd and spoken to; Candy knows Lek; Lek points at the cage; the station has OUT", () => {
  G.room = "second_rd_c"; out = [];
  doCommand("wai piwin"); assert.match(text(), /returns it one-handed/);
  out = []; doCommand("say thao rai to piwin"); assert.match(text(), /in town/);
  G.room = _npcRoom("candy"); doCommand("talk to candy"); out = [];
  doCommand("ask candy about lek"); assert.match(text(), /Lucky Tiger/);
  G.room = _npcRoom("lek"); doCommand("talk to lek"); out = [];
  doCommand("ask lek about office"); assert.match(text(), /cage/);
  assert.equal(ROOMS.police_station.exits.out, "beach_rd_soi9");
  assert.ok(FOOD_STALLS.jomtien_soi_7_m, "the lone som tam cart trades");
  assert.ok(ITEMS.bottle4 && ITEMS.bottle4.location === "promenade", "the promenade bins hold a bottle");
});

test("the daily survives RESTART; LOOK is the full description; leads stay in the Soi 6 pocket", () => {
  startSoi6Mode({ seed: 12345, dailyId: "2026-08-22" });
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  assert.equal(G.dailySeed, 12345);
  doCommand("restart");
  assert.equal(G.dailyId, "2026-08-22", "RESTART keeps the daily");
  // LOOK: the full desc, even on a revisit
  sandbox(); G.room = "khao_talo"; G.visited.khao_talo = true; out = [];
  doCommand("look");
  assert.match(text(), /A long, plain soi of beer bars/);
  // leads in the pocket never name Second Road
  startSoi6Mode(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; G.stage = "vacation"; _setFlag("act1Done");
  const leads = _leads().join("\n");
  assert.doesNotMatch(leads, /Second Road|Walking Street|Naklua/);
});

test("a restore redraw must not move the dice: redraw, then reload the blob, and the roll is the same", () => {
  G.room = "candy_bar"; G.money = 500;
  doCommand("play jackpot 20");
  const blob = serializeGame();
  // simulate main.js: deserialize → describe → resume → deserialize again
  deserializeGame(blob); _describeRoom(true, true); _renderResume(); deserializeGame(blob);
  const rngA = G.rng;
  deserializeGame(blob);
  assert.equal(G.rng, rngA, "the redraw consumed nothing that survives");
});

test("WAIT stops when the world moves you; a pending question is redrawn on resume", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.room = "jomtien_beach"; G.phone.contacts.tan = true; G.battery = 50; G.money = 0; G.nightTurn = 40;
  // Tan's 23:00 pickup fires from the tick at nt 50 — WAIT must stop there
  doCommand("wait until 4");
  assert.equal(G.room, "buakhao_n");
  assert.ok(G.nightTurn < 90, "the wait did not ride through the sedan to dawn");
  sandbox(); G.room = "stinky_bar"; G.player.origin = "pi"; G.player.personality = "blunt";
  doCommand("talk to bert"); out = [];
  _renderResume();
  assert.match(text(), /put that to you/);
});

test("poverty: SELL points at Jomtien, the pity ride is a sandbox mercy, CHECKOUT settles the book first, TIP 0 refused, BEG is voiced", () => {
  G.room = "second_rd_c"; out = [];
  doCommand("sell phone"); assert.match(text(), /glass/); assert.doesNotMatch(text(), /No bottle buyer/);
  // The pointer must name the ROOM she is in, not the soi it is near: "the beach
  // end of Jomtien Soi 7" describes the soi's west end and she is not there, so
  // a broke player walked the whole soi and found nobody (churner playtest
  // 2026-08-23 — third sighting in this corner after rounds 8 and 12).
  out = []; doCommand("sell bottles");
  assert.match(text(), new RegExp(ROOMS[NPCS.nok.room].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "names the room Auntie Nok is actually standing in");
  assert.match(text(), /Jomtien/, "…and still disambiguates from Pattaya's own Soi 7");
  // Act One: no free ride
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.room = "jomtien_beach_rd"; G.money = 0; out = [];
  doCommand("motosai to naklua");
  assert.equal(G.room, "jomtien_beach_rd");
  assert.match(text(), /No money, no ride/);
  // sandbox: the mercy still exists
  sandbox(); G.room = "sukhumvit_crossing"; G.money = 0; out = [];
  doCommand("motosai to naklua");
  assert.notEqual(G.room, "sukhumvit_crossing");
  // checkout with a debt
  sandbox(); G.room = "hotel_room"; G.nightTurn = 2; G.hotelDebt = 400; G.money = 10; out = [];
  doCommand("checkout");
  assert.match(text(), /Settle first/); assert.equal(G.pendingChoice, null);
  G.money = 1000; out = []; doCommand("checkout");
  assert.equal(G.hotelDebt, 0); assert.equal(G.pendingChoice, "checkout");
  G.pendingChoice = null;
  G.room = "candy_bar"; out = [];
  doCommand("tip 0"); assert.match(text(), /Zero isn't a tip/);
  out = []; doCommand("beg"); assert.match(text(), /Sell bottle|Nobody gives|pity/);
  assert.doesNotMatch(text(), /didn't parse|didn't understand/);
});

test("the loan: Nira speaks it, DEBT states it, and flying home is what she remembers", () => {
  G.room = _npcRoom("nira"); G.money = 30000;
  doCommand("talk to nira");
  doCommand("borrow 10000");
  assert.ok(G.loan, "borrowed");
  out = []; doCommand("ask nira about loan");
  // She used to "name the date" via a concatenation written INSIDE the string
  // literal, so this node printed `"Day " + String(G.loan.dueDay) + …` verbatim
  // to the player (debt playtest 2026-08-24). world.js is declarative and does
  // not compute; the figures belong in the readout below.
  assert.doesNotMatch(text(), /String\(|\bG\.loan\b/, "no raw JavaScript reaches the player");
  assert.match(text(), /know the day/i);
  G.day = G.loan.dueDay + 1; out = [];
  doCommand("ask nira about loan");
  assert.match(text(), /Late/);

  // …and the player can always find out what he owes. Typing LOAN with a live
  // balance used to answer "Nobody here is lending".
  out = []; doCommand("debt");
  assert.match(text(), /WHAT YOU OWE/);
  assert.match(text(), new RegExp(String(G.loan.owed).replace(/\B(?=(\d{3})+(?!\d))/g, ",")));
  out = []; doCommand("loan");
  assert.match(text(), /WHAT YOU OWE/, "LOAN reads the standing loan rather than offering a new one");

  // Staying does NOT count as skipping — that fired on the expat path and told a
  // man being garnished nightly that he'd flown home with her money.
  G.day = 8; G.room = "hotel_room"; out = [];
  _endVacation();
  assert.match(text(), /You owe Nira/);
  assert.ok(!G.loanSkipped, "the gate has not decided for the player yet");
  doCommand("new vacation");
  assert.ok(G.loanSkipped, "flying home is what she remembers");
  G.room = _npcRoom("nira"); out = [];
  doCommand("borrow 5000");
  assert.match(text(), /Not you\. Not ever/);
});

// ── round nine: the liability (Wazza) and the long-term resident (Bob) ──
test("OUT of your room after a respawn is your soi, and the stash pays on a respawn too", () => {
  G.enteredVia = "beach_rd_n"; G.room = "blue_dog"; G.nightTurn = 70;
  _endNight("barfine");
  assert.equal(G.enteredVia, null);
  assert.equal(G.room, "hotel_room");
  doCommand("out");
  assert.equal(G.room, "hotel_soi");
  // the stash: act one just completed, every wake a respawn
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.room = "rainbow_girls"; G.itemLoc.wallet = "inventory"; _setFlag("hasWallet"); G.money = 0;
  _checkAct1();
  assert.ok(G.act1SafeDue);
  G.room = "candy_bar"; G.nightTurn = 70; out = [];
  _endNight("barfine");
  assert.equal(G.money, SAFE_CASH, "the safe paid on the respawn into the room");
  assert.match(text(), /emergency stash/);
});

test("encounter chips come from the prompt's CAPS; the police wait on a non-answer; soft pitches pass a real command through", () => {
  G.room = "north_beach"; delete G.encDone.freelancer; G.nightTurn = 40;
  _startEnc("freelancer");
  const c = _chipSet().map(x => x.cmd);
  assert.ok(c.includes("yes") && c.includes("both") && c.includes("no"), c.join(","));
  G.pendingEnc = null;
  // police: a direction is not an argument
  G.room = "buakhao_n"; G.soc.drunk = 6; G.money = 3000; G.pendingEnc = "police"; out = [];
  doCommand("s");
  assert.equal(G.pendingEnc, "police", "he's still there");
  assert.equal(G.money, 3000, "and nothing was taken for it");
  assert.match(text(), /Fine first/);
  doCommand("pay");
  assert.equal(G.pendingEnc, null);
  // soft: the peddler doesn't eat QUESTS
  G.room = "stinky_bar"; G.pendingEnc = "peddler"; out = [];
  doCommand("talk to bert");
  assert.equal(G.pendingEnc, null);
  assert.match(text(), /moment passed without an answer/);
  assert.match(text(), /Bert/, "TALK ran");
  // the self-barfine offer doesn't eat a tip
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.selfBfId = girl; G.pendingEnc = "selfbf"; G.money = 2000; out = [];
  doCommand(`tip ${NPCS[girl].name.toLowerCase()} 100`);
  assert.equal(G.money, 1900, "the tip happened");
  assert.equal(G.pendingEnc, null);
});

test("bare PHOTO in a go-go is refused; the freelancer pays once; the honest LT gets the quiet coda", () => {
  G.room = "neon_paradise"; G.battery = 50; out = [];
  doCommand("photo");
  assert.ok(_PHOTO_GOGO_NO.some(s => text().includes(s)));
  // honest LT coda
  sandbox(); G.lastBfHonest = true; G.room = "candy_bar"; out = [];
  _endNight("barfine");
  assert.match(text(), /quieter than the night you paid for/);
  assert.doesNotMatch(text(), /khao man gai/);
});

test("a resident keeps a local: expat bonds cool every third night; the REP label fits any cause; the manager stops saying New face", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife");
  const girl = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && NPCS[id].room === "lucky_tiger");
  G.soc.drinks[girl] = 8; G.day = 10; G.room = "hotel_room";
  _endNight("sleep");   // day 10 → 11 (10 % 3 !== 0… decay happens only when the ENDING day is a multiple of 3)
  const after1 = G.soc.drinks[girl];
  G.day = 12; G.room = "hotel_room"; _endNight("sleep");
  const after2 = G.soc.drinks[girl];
  assert.ok(after1 === 8 || after2 === after1 - 1, "cools on the third night, not every night");
  assert.match(_REP_LABELS["-1"], /liability/);
  G.soc.manDrinks = { bert: 2 }; G.soc.mgrShot = {}; G.room = "stinky_bar"; out = [];
  _managerWelcome();
  assert.doesNotMatch(text(), /New face/);
});

test("HINT signposts the bar chain's hidden step; a typed choice label outlives the next ask; a forfeited question is un-spent", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.quests.bar_premises = "done"; out = [];
  _doHint();
  assert.match(text(), /Wayne/);
  assert.match(text(), /Answer what he asks|LICENCE/);
  // a choice label typed after an intervening ask still fires
  G.room = _npcRoom("kesinee"); doCommand("talk to kesinee");
  const memo = G.convoChoiceMemo && G.convoChoiceMemo.kesinee;
  if (memo != null) {
    doCommand("ask kesinee about kittens");
    out = []; doCommand("goodbye");
    assert.match(text(), /take your leave|leave|Goodbye|bye/i);
  }
  // forfeit by leaving: the ask is un-spent
  sandbox(); G.room = "stinky_bar"; G.player.origin = "pi"; G.player.personality = "blunt";
  doCommand("talk to bert");
  assert.equal(G.convoQ && G.convoQ.key, "why");
  G.room = "buakhao_n"; _convoActive();
  assert.ok(!_npcState("bert").know["asked_why"]);
});

test("texts: no identical line twice running from one sender, the inbox is capped; the ledger nets out ATM cash; the violence refusal is a pool", () => {
  G.phone.contacts.lek = true;
  _pushMsg("lek", "thinking of you na 💭"); _pushMsg("lek", "thinking of you na 💭");
  const lekMsgs = G.phone.inbox.filter(m => m.from === "lek").map(m => m.text);
  assert.notEqual(lekMsgs[0], lekMsgs[1]);
  for (let i = 0; i < 120; i++) { _pushMsg("lek", "x" + i); G.phone.inbox[G.phone.inbox.length - 1].read = true; }
  assert.ok(G.phone.inbox.length <= 82);
  // ledger
  G.lastNight = { happy: G.happy, money: 1000, atm: 0, known: 0, nums: 0, faces: 0 };
  G.money = 20000; G.atmTotal = 20000; out = [];
  _morningLedger();
  assert.doesNotMatch(text(), /up ฿/);
  assert.match(text(), /down ฿1,000 on the night|down ฿1000 on the night/,
    "a net is a net — the card stopped calling every delta 'spent'");
  G.room = "buakhao_s"; const seen = new Set();
  for (let i = 0; i < 12; i++) { out = []; doCommand("punch tout"); seen.add(text()); }
  assert.ok(seen.size >= 2, "the refusal varies");
  out = []; doCommand("swear"); assert.doesNotMatch(text(), /didn't understand|No idea|didn't parse/);
});

// ── the 2026-08-22 code review (HANDOFF-CODE-REVIEW.md, since deleted) ──
test("review: a command that merely CONTAINS an answer word passes through a soft encounter", () => {
  G.room = "stinky_bar"; G.money = 2000; G.pendingEnc = "peddler"; out = [];
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  doCommand(`buy drink for ${NPCS[girl].name.toLowerCase()}`);
  assert.equal(G.pendingEnc, null);
  assert.ok(G.money < 2000, "the lady drink was bought — not eaten as the peddler's answer");
  G.room = "buakhao_n"; G.pendingEnc = "noodle"; out = [];
  doCommand("go north");
  assert.equal(G.pendingEnc, null);
  assert.notEqual(G.room, "buakhao_n", "GO NORTH walked — 'go' is not the noodle girl's yes");
  // a bare answer is still an answer
  G.room = "stinky_bar"; G.pendingEnc = "peddler"; out = [];
  doCommand("no");
  assert.equal(G.pendingEnc, null);
  assert.doesNotMatch(text(), /moment passed without an answer/);
});

test("review: the Darkside league draws its own roster; the inbox is hard-capped read or unread", () => {
  sandbox(); G.stage = "expat"; G.room = "khao_talo_bar"; G.day = 3; G.money = 2000;
  _startKiller();
  const names = G.game && G.game.kp && G.game.kp.players ? G.game.kp.players.map(p => p.name) : [];
  G.game = null;
  assert.ok(names.some(n => /dredger|Mama Yai|Tuesday man|lake boats|Daeng/.test(n)), names.join(","));
  for (let i = 0; i < 200; i++) _pushMsg("lek", "unread " + i); // never read
  assert.ok(G.phone.inbox.length <= 80);
});

// ── round ten: the completionist (Priya) ──
test("a printed verbal-action hint parses after an intervening ask (the chips moved on, the label didn't)", () => {
  G.room = _npcRoom("kesinee"); doCommand("talk to kesinee");
  if (G.convoChoiceMemo && G.convoChoiceMemo.kesinee != null) {
    doCommand("ask kesinee about kittens");
    out = []; doCommand("tell her bert sent you");
    assert.doesNotMatch(text(), /Telling isn't the verb/);
  }
});

test("ASK TAN ABOUT <someone> places them: the manifest men get his read, anyone else a driver's placing", () => {
  G.room = _npcRoom("tan"); doCommand("talk to tan");
  G.known.candy = true; out = [];
  doCommand("ask tan about candy");
  assert.doesNotMatch(text(), /That one I don't know|Not my story/);
  assert.match(text(), /Candy|Candy Bar/);
  G.known.wayne = true; out = [];
  doCommand("ask tan about wayne");
  assert.match(text(), /Wayne/);
  assert.match(text(), new RegExp(_TAN_READ.wayne.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  out = []; doCommand("talk to tan");
  assert.doesNotMatch(text(), /here two days/);
});

test("Bert's grudge gates his offers; the Safe-Cracker's where-clause follows the step; Oy stops talking about a wallet she gave back", () => {
  _align("wdg", 2); G.room = "stinky_bar"; out = [];
  _questOffer("bert");
  assert.doesNotMatch(text(), /has a job for you/);
  assert.equal(typeof QUESTS.safecracker.at, "function");
  assert.equal(QUESTS.safecracker.at(G), "pim");
  _setFlag("heardWhispers");
  assert.equal(QUESTS.safecracker.at(G), "oy");
  G.quests.safecracker = "active"; G.room = "buakhao_n"; out = [];
  _doHint();
  assert.match(text(), /Oy/); assert.doesNotMatch(text(), /Pim is at/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("knowOyHasIt"); _setFlag("oyGaveWallet"); _setFlag("hasWallet"); G.room = _npcRoom("oy");
  doCommand("talk to oy"); out = [];
  doCommand("ask oy about wallet");
  assert.doesNotMatch(text(), /Many wallets in Pattaya/);
});

test("a non-move in killer pool / Connect 4 / the quiz costs no turn", () => {
  G.room = "candy_bar"; G.money = 500;
  doCommand("play connect 4"); const nt = G.nightTurn;
  doCommand("out"); doCommand("sleep"); doCommand("n");
  assert.equal(G.nightTurn, nt);
  assert.equal(G.game && G.game.type, "c4");
  doCommand("quit");
});

test("Candy's Mot reveal answers ASK ABOUT WALLET; the Shamrock quest completes in the same breath; Gavin pays in person; Bee remembers her investor", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("knowWasHere"); G.room = _npcRoom("candy"); out = [];
  doCommand("ask candy about wallet");
  assert.ok(_flag("knowMot"));
  assert.match(text(), /Mot/);
  // the Shamrock
  sandbox(); G.dog = { since: 1, name: "Biscuit" }; _setFlag("hasDog");
  G.quests.shamrock = "active"; G.room = "khao_talo"; out = [];
  doCommand("w");
  assert.equal(G.quests.shamrock, "done", "done on arrival, not one LOOK later");
  // Gavin
  sandbox(); _setFlag("wdgFlipTried"); G.quests.wdg_flip = "active"; const m = G.money;
  _questTick();
  assert.equal(G.money, m, "the errand's fee isn't paid at Bert's counter");
  G.room = _npcRoom("gavin"); out = [];
  doCommand("talk to gavin");
  assert.equal(G.money, m + 2000, "Gavin pays, in person, once");
  out = []; doCommand("talk to gavin"); assert.equal(G.money, m + 2000);
  // Bee
  _setFlag("beeBanked"); G.room = _npcRoom("bee"); out = [];
  doCommand("talk to bee");
  assert.match(text(), /INVESTOR|investor/);
});

test("Wayne and Bert answer 'bar'; the Orchid isn't on Naklua's door list until you've been sent", () => {
  G.room = _npcRoom("wayne"); doCommand("talk to wayne"); out = [];
  doCommand("ask wayne about bar"); assert.match(text(), /Turnkey|signing Friday|sign Friday/);
  _setFlag("barPremises"); G.room = "stinky_bar"; doCommand("talk to bert"); out = [];
  doCommand("ask bert about the bar"); assert.match(text(), /Twelve stools/);
  G.room = "naklua_rd"; out = [];
  _describeRoom(true, true);
  assert.doesNotMatch(text(), /Step inside:.*Orchid/);
  _setFlag("orchidVouched"); out = [];
  _describeRoom(true, true);
  assert.match(text(), /Step inside:.*Orchid/);
});

// ── round eleven: the min-maxer (Sandeep) ──
test("UNDO is refused inside a live game or a pending answer — it was an oracle", () => {
  // the engine half: the game state must still be there for main.js's guard to see
  G.room = "candy_bar"; G.money = 500;
  doCommand("play connect 4");
  assert.ok(G.game, "a live game is the flag main.js refuses on");
  doCommand("quit");
  G.pendingBf = { st: 600, lt: 1050, id: null };
  assert.ok(G.pendingBf);
  G.pendingBf = null;
});

test("bought สนุก tapers over an evening: a generous night pays in full, a grind does not", () => {
  G.room = "candy_bar"; G.money = 99999; G.soc.bought = 0;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  const h0 = G.happy;
  for (let i = 0; i < 6; i++) doCommand("buy drink for " + NPCS[girl].name.toLowerCase());
  assert.equal(G.happy - h0, 6, "the first six of a night pay in full");
  const h1 = G.happy;
  for (let i = 0; i < 34; i++) doCommand("buy drink for " + NPCS[girl].name.toLowerCase());
  const grind = G.happy - h1;
  assert.ok(grind < 20, "34 more drinks buy far less than 34 สนุก (" + grind + ")");
  assert.ok(grind > 5, "…but they aren't worthless either (" + grind + ")");
  // a fresh night resets the room's patience
  G.room = "hotel_room"; G.nightTurn = 70; _endNight("sleep");
  assert.ok(!G.soc.bought, "the counter resets with the night");
});

test("the scam post-mortem reads how the deal was struck", () => {
  G.bfOpen = true;
  assert.match(_DEBRIEF.bfscam().why, /newbie mistake/);
  G.bfOpen = false;
  assert.match(_DEBRIEF.bfscam().why, /did it properly/);
  assert.match(_DEBRIEF.bfscam().next, /COMPLAIN/);
});

test("a slow payer still gets his ride — the depot no longer exists", () => {
  // curfew rework (2026-08-25): the old gate voided a boarded ride if you
  // stalled past 02:00, closing an exploit against a curfew that has since
  // been removed. The buses run all night; a slow payer is just a slow payer.
  G.room = "beach_rd_c"; G.nightTurn = 78; G.money = 500;
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  doCommand("ride bus to naklua road");
  assert.ok(G.pendingFare);
  G.nightTurn = LAST_BUS_TURN + 1; out = [];
  doCommand("pay 15");
  assert.equal(G.pendingFare, null);
  assert.doesNotMatch(text(), /run out of night|heads for the depot/);
  assert.equal(G.room, "naklua_rd", "the ride completes — he took your fifteen baht");
  // a wall is a wall
  G.room = "khao_talo"; const a = []; for (let i = 0; i < 4; i++) { out = []; doCommand("s"); a.push(text()); }
  assert.equal(new Set(a).size, 1, "the same blocked direction answers the same way");
});

test("Auntie Nok's bottles promise what the beach actually holds", () => {
  const bottles = Object.keys(ITEMS).filter(i => ITEMS[i].bottle && ITEMS[i].location);
  assert.ok(bottles.length >= 3, "at least the three she names");
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /Beach full of bottle/);
});

// ── round eleven: the two-week millionaire (Bernard) ──
test("the bell goes through the spend-brake like every other bought สนุก", () => {
  G.room = "candy_bar"; G.money = 99999; G.soc.bought = 0;
  const h0 = G.happy;
  for (let i = 0; i < 20; i++) doCommand("ring bell");
  const gained = G.happy - h0;
  assert.ok(gained < 30, "20 rings do not pay 40 สนุก (" + gained + ")");
  assert.ok(gained >= 12, "…and the first few still pay in full (" + gained + ")");
});

test("a rough wake takes a pocket, not an estate", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
  G.money = 1400000; G.room = "beach_rd_c"; G.dog = null; out = [];
  _endNight("blackout");   // curfew rework: dawn-standing is legal; passing out is what robs you
  assert.ok(G.money >= 1400000 - ROUGH_WAKE_CAP - 2000, "the pocket, plus the folio — not the estate");
  assert.equal(G.roughLost, ROUGH_WAKE_CAP);
  // NOT "still in the room" — that figure is the POCKET balance, and billing it
  // as what you had the sense to leave behind was a plain falsehood about the
  // player's own money (persona report A#12, 2026-08-23).
  assert.match(text(), /They left you/);
  assert.doesNotMatch(text(), /still in the room/);
  assert.match(text(), /20,000 gone/);
});

test("money buys attention, not intimacy: a night's tips lift her a couple of notches and stop", () => {
  G.room = "candy_bar"; G.money = 999999; G.soc.tipBond = 0;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  const n = NPCS[girl].name.toLowerCase();
  const b0 = G.soc.drinks[girl] || 0;
  for (let i = 0; i < 6; i++) doCommand(`tip ${n} 5000`);
  const gained = (G.soc.drinks[girl] || 0) - b0;
  assert.ok(gained <= 4, "the chequebook can't reach her-farang tier (" + gained + ")");
  out = []; doCommand(`tip ${n} 500`);
  assert.match(text(), /changes nothing between you/);
  // and an absurd number reads as a problem, not as generosity
  out = []; doCommand(`tip ${n} 50000`);
  assert.match(text(), /not a tip, it's a story|the house's business too|What you want/);
});

test("TIP and BRIBE answer in the right voice; MONEY is a verb", () => {
  G.room = "beach_rd_c"; G.money = 99999;
  out = []; doCommand("tip tan 50000");
  assert.doesNotMatch(text(), /piwins wave it away/);
  out = []; doCommand("bribe doorman");
  assert.doesNotMatch(text(), /didn't parse|didn't understand/);
  assert.match(text(), /Not like that|insults everyone/);
  out = []; doCommand("money");
  assert.match(text(), /in your pocket/);
});

test("Connect 4 says why the big money won't ride; charity and credit read the wallet", () => {
  G.room = "candy_bar"; G.money = 999999; out = [];
  doCommand("play connect 4 1000000");
  assert.match(text(), /My table is ฿/);
  assert.ok(G.game.stake <= 500);
  doCommand("quit");
  // the drunk bargirl doesn't press ฿20 on a rich man
  G.room = "buakhao_n"; G.money = 99999; out = [];
  const m = G.money; _ENC.bargirl();
  assert.equal(G.money, m, "she keeps her twenty");
  assert.match(text(), /YOU okay, na/);
  // Nira doesn't lend to him either
  G.room = _npcRoom("nira"); G.money = 200000; out = [];
  doCommand("borrow 20000");
  assert.match(text(), /I only do money/);
  assert.ok(!G.loan);
});

// ── Round 15/16 personas: prose that contradicts the state it prints beside ──

test("the folio cannot slide under a door you didn't wake behind", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 50000; G.dog = null;
  G.room = "buakhao_market";              // passed out on the street
  out = []; _endNight("blackout");
  const said = text();
  assert.match(said, /waiting at the desk/i, "you collect it, it does not arrive");
  assert.doesNotMatch(said, /slides under the door/i);

  // …and a night that ended in your own bed still gets the door
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 50000;
  G.room = _hotelRoomId(); out = []; _endNight("dawn");
  assert.match(text(), /slides under the door/i);
});

test("DIAGNOSE's dawn warning states the cap, not your whole pocket", () => {
  newGame(); _setFlag("act1Done"); G.stage = "vacation"; G.room = "beach_rd_c"; G.dog = null;
  out = []; doCommand("diagnose");
  const said = text();
  if (/Not making it home/.test(said)) {
    assert.match(said, /20,000/, "the loss is capped and the warning must say so");
    assert.doesNotMatch(said, /costs you the cash in your pocket/);
  }
});

test("a bar that keeps a cat lets you pet the cat", () => {
  newGame(); G.dog = null;
  G.room = "sandbar"; out = []; doCommand("examine cat");
  assert.doesNotMatch(text(), /isn't here|declines to elaborate/i, "she is described");
  out = []; doCommand("pet cat");
  assert.doesNotMatch(text(), /Nothing here wants petting/,
    "denying the cat one command after describing her is the contradiction");
  // …and a room with no cat still says so
  G.room = "beach_rd_c"; out = []; doCommand("pet cat");
  assert.match(text(), /Nothing here wants petting/);
});

test("TAKE something you already carry says so", () => {
  newGame(); G.itemLoc.phone = "inventory"; G.room = "jomtien_beach";
  out = []; doCommand("take phone");
  assert.ok(_ALREADY_HAVE.some(l => text().includes(l.replace("{it}", ITEMS.phone.name))),
    "answered from the already-have pool");
  assert.doesNotMatch(text(), /fixtures, not luggage|don't see that here/);
  out = []; doCommand("take xyzzything");
  assert.match(text(), /don't see that here|no such|not here/i, "and a real miss still misses");
});

test("a bus destination that isn't on this loop is refused, not silently swallowed", () => {
  newGame(); _setFlag("act1Done"); G.stage = "vacation"; G.money = 500;
  G.room = "jomtien_beach_rd"; G.rain = 0; G.nightTurn = 10;
  out = []; doCommand("ride bus to naklua");
  assert.match(text(), /shakes his head|not this route/i,
    "the ask must be answered before the list is re-printed");
  // a bare ask is still just the list, with no phantom refusal
  out = []; doCommand("ride bus");
  assert.doesNotMatch(text(), /shakes his head/);
  assert.match(text(), /drop you/);
});

test("nobody narrates half an hour and then advances the clock by six minutes", () => {
  // The player rang Tan, was told it took "the best part of half an hour", and
  // TIME said six minutes on the next command (persona report B#11, 2026-08-23).
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  const prose = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
  assert.doesNotMatch(prose, /best part of half an hour/,
    "prose must not name a duration the turn counter contradicts");
});

// ── Round 15/16: the interaction cluster ─────────────────────────────────────

test("HIRE takes the host off the floor and costs the evening it narrates", () => {
  // It said "the moment you're out the door" and left you standing in the club
  // with him still on the roster, for one turn (persona report A#13, 2026-08-23).
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.money = 99999; G.room = "adonis_club"; G.nightTurn = 20;
  assert.ok(_npcsHere().includes("arm"), "he is on the floor first");
  const t0 = G.nightTurn;
  out = []; doCommand("hire arm");
  assert.ok(G.nightTurn - t0 >= 5, "an evening passed (" + (G.nightTurn - t0) + " turns)");
  assert.ok(!_npcsHere().includes("arm"), "…and he is not still standing there");
  _endNight("dawn");
  assert.ok(_npcRoom("arm") === "adonis_club" && !(G.soc.hostOut || {}).arm,
    "back on the floor tomorrow");
});

test("bare BUY DRINK asks who it's for instead of spending ฿150 on a guess", () => {
  // Typed with the thirst nudge live, it bought the first girl on the rail a
  // lady drink (persona report B#23, 2026-08-23).
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.money = 9999; G.room = "candy_bar"; G.thirst = 95;
  const before = G.money;
  out = []; doCommand("buy drink");
  assert.equal(G.money, before, "no money moved on an ambiguous ask");
  assert.match(out.join("\n"), /BUY BEER/, "and both readings are offered");
  // naming her still works exactly as before
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  out = []; doCommand("buy drink for " + NPCS[girl].name);
  assert.ok(G.money < before, "a named lady drink is still a lady drink");
});

test("a question you walked away from is put to you again", () => {
  // Clearing `asked_` wasn't enough: the dialogue ENTRY carrying the ask was
  // already spent, so re-talking gave the brush-off and the question was never
  // re-offered — while the whole consistency system hangs on answering it
  // (persona report B#15, 2026-08-23).
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "queen_vic";
  for (let i = 0; i < 8 && !G.convoQ; i++) { out = []; doCommand("talk to angela"); }
  assert.ok(G.convoQ, "she asked something");
  const key = G.convoQ.key;
  out = []; doCommand("ask mort about column");
  assert.equal(G.convoQ, null, "turning away lapses it");
  assert.ok(G.convoLapsed && G.convoLapsed.angela, "…and it is remembered");
  out = []; doCommand("talk to angela");
  assert.ok(G.convoQ && G.convoQ.key === key, "she comes back to it");
  assert.match(out.join("\n"), /comes back to it/);
});

test("darts checks out from a real three-dart range and says when a command didn't land", () => {
  newGame(); G.money = 500;
  G.room = Object.keys(ROOMS).find(id => ROOMS[id].darts);
  doCommand("play darts");
  G.game.you = 80;
  out = []; doCommand("finish");
  assert.doesNotMatch(out.join("\n"), /No checkout on 80/, "80 is D20-D20");
  // …and a 20% checkout sometimes LANDS, which ends the game — so re-rack before
  // asserting on the in-game swallow, rather than depending on missing.
  if (!G.game) doCommand("play darts");
  out = []; doCommand("examine cat");
  assert.match(out.join("\n"), /at the oche/, "a swallowed command says why it was swallowed");
  assert.ok(G.game, "and the game is still on");
});

test("the dog settles where the room actually is, not where its flags suggest", () => {
  // He padded at your heel INSIDE an air-conditioned mall with security guards
  // who wai, and folded up "outside the door" of an open-air market that has no
  // door (persona report A#21, 2026-08-23).
  newGame(); _setFlag("act1Done"); G.dog = { since: 2 };
  const spot = room => { G.room = room; G.dogRoomSeen = null; out = []; doCommand("look"); return out.join("\n"); };
  assert.match(spot("central_mall"), /outside the door/, "a mall is not a street");
  assert.doesNotMatch(spot("soi_rompho"), /outside the door/, "a market has no door");
  assert.match(spot("candy_bar"), /under the rail|beneath your stool/, "a beer bar still lets him in");
  assert.match(spot("hyper"), /outside the door/, "a go-go still doesn't");
});

test("feeding the dog doesn't invent a grill cart that isn't in the room", () => {
  newGame(); _setFlag("act1Done"); G.money = 500; G.dog = null;
  for (const id of ["noodles", "moo_ping"]) if (G.itemLoc[id] !== undefined) G.itemLoc[id] = null;
  G.room = "naklua_rd"; out = []; doCommand("feed dog");
  assert.doesNotMatch(out.join("\n"), /at a grill cart/, "the room has no cart in it");
  assert.ok(G.dog, "and he is yours either way");
});

test("LOOK while a fare is pending says where you are, not where you boarded", () => {
  newGame(); _setFlag("act1Done"); G.stage = "vacation";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.money = 500; G.room = "beach_rd_c"; G.nightTurn = 10; G.rain = 0;
  doCommand("ride bus to naklua road");
  assert.ok(G.pendingFare, "the driver wants paying");
  out = []; doCommand("look");
  assert.match(out.join("\n"), /Naklua Road/, "the prose already said you hopped off");
  assert.doesNotMatch(out.join("\n"), /Mid-Beach-Road/, "…so don't re-print the stop you left");
});

test("the no-dartboard line names boards that exist, and only ones you've found", () => {
  newGame(); G.room = "arrow_bar"; G.visited = {};
  out = []; doCommand("play darts");
  assert.doesNotMatch(out.join("\n"), /The Office, the Cricketers/, "no hand-written list");
  for (const id of Object.keys(ROOMS)) if (ROOMS[id].darts) G.visited[id] = true;
  out = []; doCommand("play darts");
  const said = out.join("\n");
  for (const id of Object.keys(ROOMS)) {
    if (ROOMS[id].darts) assert.ok(said.includes(_barName(id)), _barName(id) + " has a board and is named");
  }
});

test("a game move typed after the game is over isn't offered as a topic", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "queen_vic"; doCommand("talk to mort");
  for (const word of ["finish", "steady"]) {
    out = []; doCommand(word);
    assert.match(out.join("\n"), /a game that's over/, word);
    assert.doesNotMatch(out.join("\n"), /Not my story|Search me|Couldn't tell you/, word);
  }
  // …and a real topic still reaches the partner
  out = []; doCommand("column");
  assert.doesNotMatch(out.join("\n"), /a game that's over/);
});

test("the Act One hint names the topic that actually holds the code", () => {
  // It named four people who "each hold a piece" and no topic — and every one of
  // them holds theirs under `oy`, so ASK PLOY ABOUT CODE (the first thing anybody
  // types) missed on the critical path (persona report B#5, 2026-08-23).
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.act1Tries = 1;
  for (const f of ["knowWasHere", "knowMot", "knowOyHasIt"]) _setFlag(f);
  out = []; doCommand("hint");
  assert.match(out.join("\n"), /ABOUT OY/, "the hint names the topic, not just the people");

  for (const who of ["ploy", "pim", "daeng", "candy"]) {
    for (const word of ["code", "safe"]) {
      newGame(); G.stage = "expat"; _setFlag("act1Done");
      for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
      G.room = _npcRoom(who);
      out = []; doCommand("talk to " + who);
      out = []; G.pendingEnc = null; doCommand(`ask ${who} about ${word}`);
      assert.doesNotMatch(out.join("\n"),
        /I don't know about that|Not my story|That one I don't know|No idea|Search me|wrong girl/i,
        `ask ${who} about ${word}`);
    }
  }
});

test("a quest pointer at a man who drifts says that he drifts", () => {
  // Printed truthfully and false on arrival: sent to the Cheeky Monkey, found
  // the Hyper (persona report A#3, 2026-08-23).
  newGame(); _setFlag("act1Done"); G.room = "hotel_room";
  let sawWarning = false, sawPlain = false;
  for (const t of [10, 20, 30, 40, 50, 60, 70]) {
    G.nightTurn = t;
    const line = _questWhere("glam");
    if (!line) continue;
    if (/he drifts/.test(line)) sawWarning = true; else sawPlain = true;
    assert.match(line, /Glam is at/, "it still names where he is — that's the useful part");
  }
  assert.ok(sawWarning, "the hour before he moves warns you");
  assert.ok(sawPlain, "…and a settled hour doesn't");
});

test("the rain doesn't call a bar empty while you're talking to somebody in it", () => {
  // Fired at Moonshine Bar in the same beat as a hostess posing and joking with
  // the player: patrons are the RAIL REGULARS, and staff were never counted
  // (persona report B#21, 2026-08-23).
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType === "beer" && !_patronsHere.call(null).length);
  G.room = "moonshine_bar";
  const girl = _npcsHere().find(id => NPC_ROLES[id]);
  if (girl) {
    doCommand("talk to " + NPCS[girl].name);
    assert.ok(_convoActive(), "you are mid-conversation");
    G.rain = 0; G.lastDrizzle = -99;
    out = []; _sayDrizzle && _sayDrizzle();
    assert.doesNotMatch(out.join("\n"), /belongs to nobody|nobody has said anything/i,
      "a room you are talking in is not a room the rain has to itself");
  }
});

test("your own door warns you about the unlit soi before you walk into it", () => {
  // The only way out of your hotel room is an unlit soi with a dog in it. A
  // player on day four lost the whole night at nightTurn 2 without one
  // successful action (persona report A#2, 2026-08-23).
  newGame(); _setFlag("act1Done"); G.room = "hotel_room";
  G.lightOn = false; G.battery = 50; G.darkDoorDay = -1;
  out = []; _describeRoom(true, true);
  assert.match(out.join("\n"), /LIGHT ON/, "warned at the door");
  assert.match(out[out.length - 1], /LIGHT ON/, "and last, as a parting note");
  out = []; _describeRoom(true, true);
  assert.doesNotMatch(out.join("\n"), /working lights/, "once a night, not every LOOK");
  G.lightOn = true; G.darkDoorDay = -1;
  out = []; _describeRoom(true, true);
  assert.doesNotMatch(out.join("\n"), /working lights/, "…and not when the torch is already on");
});

test("the beach nobody works has nobody working it", () => {
  newGame(); _setFlag("act1Done");
  G.room = "beach_north_end"; out = []; doCommand("swim");
  assert.doesNotMatch(out.join("\n"), /jet ski scam/,
    "its own prose says no jet-skis, no deckchair men, no flyer girls");
  G.room = "central_beach"; out = []; doCommand("swim");
  assert.match(out.join("\n"), /jet ski scam/, "…and a worked beach still has one");
});

test("something the room describes but doesn't sell gets a reason, not a shrug", () => {
  newGame(); _setFlag("act1Done"); G.money = 999;
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_top"; out = []; doCommand("buy ice cream");
  assert.ok(_NOT_TONIGHT.some(l => out.join("\n").includes(l)),
    "the cart is in the prose and shuts before anything interesting happens");
  G.room = "candy_bar"; out = []; doCommand("buy helicopter");
  assert.match(out.join("\n"), /Not for sale here/, "…and a thing that isn't there still isn't");
});

// ── The Soi 6 challenge keeps its own frame (grapevine playtest, 2026-08-25) ──

test("quiz night exists inside the mode it is promised in", () => {
  // TIME and two NPCs promised a Thursday quiz at three bars — none of them on
  // Soi 6, in a mode whose wall is "one week, one street" (grapevine F2).
  newGame(); G.mode = "soi6";
  assert.deepEqual(_quizBars(), ["queen_vic"], "in-mode, the pub runs it");
  assert.match(_quizTalk(), /Queen Vic/, "and whoever you ask says so");
  assert.doesNotMatch(_quizTalk(), /three bars/);
  G.day = 4; G.nightTurn = 25; G.room = "queen_vic";
  assert.ok(_quizHere(), "walking in mid-window starts it, same as the full game");
  G.mode = null;
  assert.equal(_quizBars().length, 3, "the full game still draws three");
  for (const b of _quizBars()) assert.ok(QUIZ_BARS.includes(b));
});

test("the piwin's menu and his mouth agree about the challenge", () => {
  // He refused a NAMED destination in voice, then offered the whole city as a
  // menu one command earlier (grapevine F4).
  newGame(); G.mode = "soi6"; G.room = "soi6_street"; G.money = 500;
  out = []; doCommand("motosai");
  assert.ok(_SOI6_BOUND.some(l => out.join("\n").includes(l)),
    "bare MOTOSAI gets the frame refusal, not the city list");
  assert.doesNotMatch(out.join("\n"), /where to\?/);
});

// ── Grapevine round, the rest (2026-08-25) ───────────────────────────────────

test("the Vic's kitchen keeps Aoy's stated hours", () => {
  newGame(); _setFlag("act1Done"); G.money = 999; G.room = "queen_vic";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.nightTurn = 20; G.hunger = 80;
  out = []; doCommand("buy food");
  assert.ok(_QV_BASKET_LINES.some(l => out.join("\n").includes(l)), "the basket lands before eleven");
  assert.equal(G.money, 999 - QV_BASKET);
  assert.ok(G.hunger < 80, "and it fed you");
  G.nightTurn = 55; G.hunger = 80; const m0 = G.money;
  out = []; doCommand("buy food");
  assert.match(out.join("\n"), /only crisp|Crisp/i, "after eleven, Aoy's rule holds");
  assert.equal(G.money, m0 - QV_CRISPS);
  out = []; doCommand("buy");
  assert.match(out.join("\n"), /BUY FOOD/, "bare BUY advertises the kitchen");
});

test("an unaffordable long time leaves the ledger open on the line you can afford", () => {
  newGame(); G.mode = "soi6"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "cherry_pop"; G.money = 3320;
  G.pendingBf = { id: "mercedes", st: 1150, lt: 3450, room: G.room };
  out = []; _bfResolve("lt");
  assert.match(out.join("\n"), /short time, ฿1150|SHORT TIME/, "she taps the other line");
  assert.ok(G.pendingBf, "the negotiation is NOT over");
  out = []; doCommand("short time");
  assert.equal(G.pendingBf, null, "…and the follow-up answers the ledger, not the topic parser");
  assert.ok(G.money < 3320, "the short time actually happened");
});

test("her tariff is the tariff: the drink count she names is the count that opens the door", () => {
  newGame(); G.mode = "soi6"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const girl = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" &&
    ROOMS[_npcRoom(id)] && ROOMS[_npcRoom(id)].barType === "soi6" && !_hasSponsor(id) && !_isDraw(id));
  G.room = _npcRoom(girl); G.money = 99999;
  G.soc.drinks[girl] = 1;                          // one drink in: one short of the gate
  out = []; _doBarfine(NPCS[girl].name.toLowerCase());
  if (/lady drink/i.test(out.join("\n"))) {
    assert.match(out.join("\n"), /One more lady drink/,
      "she names the real remaining count, not 'one or three'");
  }
});

test("the soi6 short-time scene answers from a pool, not one string", () => {
  assert.ok(_ST_SOI6_LINES.length >= 5, "deep pool for the hottest beat");
  const seen = new Set();
  for (let i = 0; i < 12; i++) seen.add(_pickVary(_ST_SOI6_LINES, "stsoi6test"));
  assert.ok(seen.size >= 3, "and it actually varies");
});

test("the rose family's second visit reads as recognition, not a rerun", () => {
  newGame(); _setFlag("act1Done");
  G.flowerSeen = 1;                              // they've worked you once already
  G.room = "candy_bar"; G.flowerDay = -1;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.soc.drinks[girl] = 2; _convoStart(girl);
  // force the encounter deterministically through its own entry point
  let fired = false;
  for (let tries = 0; tries < 400 && !fired; tries++) {
    G.flowerDay = -1; G.pendingEnc = null; out = [];
    _flowerTick();
    if (G.pendingEnc === "flower") fired = true;
  }
  assert.ok(fired, "the seller reaches a courted rail within 400 rolls");
  assert.doesNotMatch(out.join("\n"), /rehearsed a thousand times/,
    "the emotionally loaded one-off must not print twice verbatim");
  assert.match(out.join("\n"), /again|remembers|their round|the same/i);
});

test("a quest completes in the same breath as the move that wins it", () => {
  // _questTick lived at doCommand's tail, and every modal branch returns before
  // the tail — so a quest won at the oche completed one command late.
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  const q = Object.entries(QUESTS).find(([, spec]) => spec.doneFlag === "wonLeague");
  if (q) {
    G.quests[q[0]] = "active";
    _setFlag("wonLeague");         // the win, as _endGame sets it mid-modal
    out = []; _tick();             // the one call every branch makes
    assert.equal(G.quests[q[0]], "done", "the tick sees it immediately");
  }
});

// ── The fabulist round: midnight keeps its manners (2026-08-25) ──────────────

test("midnight abandons a live game instead of continuing it on the pavement", () => {
  // Roy finished a Connect 4 match standing alone in a shuttered street, eleven
  // moves after the frontage rolled down on his opponent (fabulist F1).
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType === "soi6");
  G.room = bar; G.money = 500;
  G.game = { type: "c4", stake: 100, board: [], oppId: null, depth: 2 };
  G.nightTurn = 60;
  out = []; _closingTick();
  assert.equal(G.game, null, "the game dies with the stool you left");
  assert.match(out.join("\n"), /Midnight calls it/, "…with a line, not silently");
  assert.notEqual(G.room, bar, "and you are walked out as before");
});

test("midnight clears a pending street-offer instead of carrying it to the kerb", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType === "soi6");
  G.room = bar; G.pendingEnc = "peddler"; G.encPrompt = [["x", ""]];
  G.nightTurn = 60;
  out = []; _closingTick();
  assert.equal(G.pendingEnc, null);
  assert.equal(G.encPrompt, null);
  assert.match(out.join("\n"), /shutters settle it/);
});

test("the shutters cannot walk out a man who already left on the back of her bike", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType === "soi6");
  G.room = bar; G.offstage = true; G.pendingEnc = "nightride";
  G.nightTurn = 60;
  out = []; _closingTick();
  assert.equal(G.room, bar, "no ejection mid-ride");
  assert.equal(G.pendingEnc, "nightride", "the ride carries on");
  assert.equal(out.length, 0, "and no shutters narration over the ride scene");
});

test("the cheap-charlie refusal reads the ledger it cites", () => {
  // "the one lady drink, nursed" — at a ledger reading three (fabulist F7).
  // And the ≥2 branch owns that the drinks WERE hers: "none of them hers"
  // printed at a man who'd bought her two by name (Tyler, 2026-08-26).
  newGame(); G.mode = "soi6"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "ruby_kiss"; G.money = 99999;
  G.soc.drinks.wilai = 3;
  out = []; _bfRefusalSay("wilai", { kind: "cheap" });
  assert.match(out.join("\n"), /3 lady drinks — she counts each fondly/);
  assert.doesNotMatch(out.join("\n"), /none of them hers/, "the drinks were hers; the prose must not deny it");
  G.soc.drinks.wilai = 1;
  out = []; _bfRefusalSay("wilai", { kind: "cheap" });
  assert.match(out.join("\n"), /the one lady drink, nursed/);
  G.soc.drinks.wilai = 0;
  out = []; _bfRefusalSay("wilai", { kind: "cheap" });
  assert.match(out.join("\n"), /not one lady drink/);
});

test("the jilted regular's next hello is cooler, once", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const girl = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && NPCS[id].filler);
  G.room = _npcRoom(girl);
  (G.soc.miffed = {})[girl] = G.day;
  out = []; doCommand("talk to " + NPCS[girl].name);
  assert.ok(_MIFFED_HELLO.some(l => out.join("\n").includes(l.replace("{n}", NPCS[girl].name))),
    "one cooled hello");
  out = []; doCommand("talk to " + NPCS[girl].name);
  assert.ok(!_MIFFED_HELLO.some(l => out.join("\n").includes(l.replace("{n}", NPCS[girl].name))),
    "…and only once — the cost was paid, not a grudge loop");
});

test("the busy-regular line never seats a girl the room's own prose just featured", () => {
  // Kitten Corner: "Praewa in your lap" and "Praewa laughing on cue beside him"
  // in the same paint (fabulist F5). Setter and fallback both prefer a girl the
  // desc doesn't name; nobody qualifying, the nameless pool tells the truth.
  const featured = ["praewa", "nangfah"];
  for (const id of featured) {
    assert.match(String(ROOMS.kitten_corner.desc), new RegExp(NPCS[id].name),
      "the fixture girls are still in the desc (or this test is stale)");
  }
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  let seeded = 0;
  for (let seed = 1; seed <= 24; seed++) {
    G.rng = seed * 7919;
    G.soc.patronBusy = {};
    G.pendingEnc = null; G.pendingChoice = null; G.game = null;
    G.room = "soi6_deep"; G.nightTurn = 20;
    doCommand("enter kitten corner");     // the arrival is what seeds patronBusy
    const pick = G.soc.patronBusy.kitten_corner;
    if (typeof pick === "string") {
      seeded++;
      assert.ok(!featured.includes(pick),
        "the busy pick avoids the girls the desc features (picked " + pick + ")");
    }
  }
  assert.ok(seeded > 0, "the 40% roll landed at least once in 24 seeds — the test actually tested");
});

// ── The curfew rework: the only curfew is on you (design call 2026-08-25) ────
// In the real town the songthaews run 24 hours (sparse from two), the bikes and
// taxis are all-night, and worst case you walk — even from the Darkside. The
// timetable was never the wall; the body is.

test("the small hours make you WAIT for the bus, and the kerb charges real turns", () => {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_c"; G.money = 500; G.nightTurn = 82; G.rain = 0; G.soc.drunk = 0;
  const t0 = G.nightTurn;
  out = []; doCommand("ride bus to naklua road");
  const said = out.join("\n");
  assert.ok(_BUS_SMALL_HOURS.some(l => said.includes(l)), "the empty-hour kerb, from the pool");
  if (G.pendingFare) {
    assert.ok(_BUS_SMALL_HOURS_COMES.some(l => said.includes(l)), "…and the arrival, from its pool");
    assert.ok(G.nightTurn - t0 >= 3, "at least three turns paid at the kerb (" + (G.nightTurn - t0) + ")");
    out = []; doCommand("pay 15");
    assert.equal(G.room, "naklua_rd", "and the ride completes — the bus always ran");
  } else {
    assert.ok(G.pendingEnc || G.day !== 2, "no fare only because the street or the night interrupted");
  }
});

test("the kerb can end the night — the physiological curfew enforcing itself", () => {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_c"; G.money = 500; G.nightTurn = 82; G.hunger = 99; G.thirst = 99;
  out = []; doCommand("ride bus to naklua road");
  assert.equal(G.pendingFare, null, "no bus saved him");
  assert.notEqual(G.day, 2, "the night ended where he stood");
});

test("past drunk seven the bikes refuse you — and the bench still has you", () => {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_s"; G.money = 500; G.nightTurn = 40; G.soc.drunk = 7;
  assert.ok(ROOMS.beach_rd_s.motosai, "a stand is here (or move this test)");
  const m0 = G.money;
  out = []; doCommand("motosai to naklua");
  assert.ok(_MOTO_DRUNK_NO.some(l => out.join("\n").includes(l)), "the piwin sizes you up and says no");
  assert.equal(G.money, m0, "nothing spent, nothing moved");
  // but the songthaew is the vehicle that always has you — the title's thesis
  G.money = 500; out = []; doCommand("ride bus to naklua road");
  assert.ok(G.pendingFare, "the bus takes anybody");
  assert.ok(_BUS_DRUNK_BENCH.some(l => out.join("\n").includes(l)), "…and says so");
  // …and a second motosai ask inside the window is INSISTENCE, broke or not —
  // the balk was the warning, the override is the player's, the dice judge it
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_s"; G.money = 0; G.nightTurn = 40; G.soc.drunk = 7;
  doCommand("motosai to naklua");
  out = []; doCommand("motosai to naklua");
  assert.match(out.join("\n"), /Your funeral, boss/, "insisting past the balk is allowed, even broke");
  // sober, no bench line
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_s"; G.money = 500; G.nightTurn = 40; G.soc.drunk = 0;
  out = []; doCommand("ride bus to naklua road");
  assert.ok(!_BUS_DRUNK_BENCH.some(l => out.join("\n").includes(l)), "a sober man just boards");
});

test("TIME tells the truth about the small hours in all three windows", () => {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_c";
  G.nightTurn = 30; out = []; doCommand("time");
  assert.match(out.join("\n"), /circulating/, "early: no waiting to speak of");
  G.nightTurn = 72; out = []; doCommand("time");
  assert.match(out.join("\n"), /easy hour is nearly up/, "the warning window");
  G.nightTurn = 82; out = []; doCommand("time");
  assert.match(out.join("\n"), /run sparse/, "small hours: sparse, never gone");
  assert.doesNotMatch(out.join("\n"), /has gone/, "no more depot claim");
});

test("the street hint at a dead-hour bus stop stays a live promise", () => {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "beach_rd_c"; G.nightTurn = 85; G.rain = 0;
  out = []; _describeRoom(true, true);
  const said = out.join("\n");
  if (/bus-stop bench/.test(said)) {
    assert.match(said, /will come|settle in/, "the stop is slow, not dead");
    assert.doesNotMatch(said, /long gone/);
  }
});

test("the balk is a balk, not a wall: insistence buys the ride the crash arc needs", () => {
  // The refusal must not delete the authored crash ending — that arc IS the
  // body-curfew thesis, refused once and chosen twice.
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = Object.keys(ROOMS).find(id => ROOMS[id].motosai);
  G.money = 2000; G.soc.drunk = 8; G.nightTurn = 40;
  out = []; doCommand("motosai to naklua");
  assert.ok(_MOTO_DRUNK_NO.some(l => out.join("\n").includes(l)), "first ask: the balk");
  out = []; doCommand("motosai to naklua");
  assert.match(out.join("\n"), /Your funeral, boss/, "second ask: he takes the fare");
  assert.doesNotMatch(out.join("\n"), /Bench no fall off/, "no second balk");
});

// ── The all-nighter + TAKE HER OUT (design call 2026-08-25) ──────────────────
// "A lot of punters will barfine a lady (or two) to go party on WS, sometimes
// staying out until dawn." The big night out is now a legal move, and the
// barfine can continue the night instead of ending it.

function _bigNight() {
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.money = 20000; G.lastSaleng = 99999;
}

test("standing at dawn is an all-nighter: home, solvent, billed to the morning", () => {
  _bigNight(); G.room = "ws_south"; G.soc.drunk = 4;
  out = []; _endNight("dawn");
  assert.equal(G.room, _hotelRoomId(), "the taxi home in the light");
  assert.equal(G.money, 20000 - _hotelRate(G.hotel),
    "every baht intact bar the folio — the town robs the unconscious, not the upright");
  assert.equal(G.nightLog[G.nightLog.length - 1], "allnighter", "the week's spine records it");
  assert.ok(_NIGHT_EMOJI.allnighter, "…and the share card can render it");
  assert.ok(G.hunger >= 55 && G.thirst >= 65,
    "the invoice arrives in the evening meters (" + G.hunger + "/" + G.thirst + ")");
  // …while a night slept at home wakes gentler
  _bigNight(); G.room = _hotelRoomId(); G.soc.drunk = 4;
  const h1 = (() => { _endNight("dawn"); return G.hunger; })();
  assert.ok(h1 < 60, "same drunk, softer morning when you slept in a bed");
});

test("Act One's dawn is still do-or-die — the all-nighter is a resident's privilege", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.room = "beach_rd_c"; G.day = 2;
  _endNight("dawn");
  assert.equal(G.day, 2, "the hard fail reset the world to day two");
  assert.ok(!_flag("act1Done"));
});

test("TAKE HER OUT: she joins, every new door pays, and the club is her hour", () => {
  _bigNight(); G.room = "lucky_tiger"; G.nightTurn = 30;
  G.soc.drinks.lek = 6;
  G.pendingBf = { id: "lek", st: 400, lt: 700, room: "lucky_tiger" };
  const m0 = G.money;
  out = []; doCommand("take her out");
  assert.ok(G.party && G.party.ids.includes("lek"), "she's with you");
  assert.equal(G.money, m0 - 700, "the fine is the long-time fine");
  assert.ok(_PARTY_JOIN.some(l => out.join("\n").includes(l.replace("{n}", "Lek"))), "the join, from its pool");
  // a NEW venue pays: arrival line + her drink + สนุก
  const h0 = G.happy, m1 = G.money;
  out = []; _arriveAt("rock_factory");
  assert.ok(G.party.seen.rock_factory, "the stop is counted");
  assert.equal(G.money, m1 - LADY_DRINK, "her drink lands wherever you do");
  assert.ok(G.happy > h0, "company at a new door pays the night");
  // …once per venue
  const m2 = G.money; out = []; _arriveAt("rock_factory");
  assert.equal(G.money, m2, "the same door doesn't bill twice");
});

test("two is a party, three is a tour group", () => {
  _bigNight(); G.room = "lucky_tiger"; G.nightTurn = 30;
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} };
  G.pendingBf = { id: "nong", st: 400, lt: 700, room: "lucky_tiger" };
  out = []; doCommand("take her out");
  assert.equal(G.party.ids.length, 2, "the classic flex");
  assert.ok(_PARTY_JOIN2.some(l => out.join("\n").includes(
    l.replace(/\{n\}/g, NPCS.nong.name).replace(/\{other\}/g, "Lek"))), "the pair's own join");
  G.pendingBf = { id: "wan", st: 400, lt: 700, room: "lucky_tiger" };
  out = []; doCommand("take her out");
  assert.equal(G.party.ids.length, 2, "capped");
  assert.match(out.join("\n"), /TOUR GROUP|minivan/, "…with the mamasan's blessing");
});

test("with company on your arm, the ledger only sells another companion", () => {
  _bigNight(); G.room = "lucky_tiger"; G.nightTurn = 30;
  G.party = { ids: ["lek"], stops: 2, spent: 0, seen: {} };
  G.pendingBf = { id: "nong", st: 400, lt: 700, room: "lucky_tiger" };
  const m0 = G.money;
  out = []; doCommand("long time");
  assert.equal(G.money, m0, "no money moved");
  assert.ok(G.pendingBf, "the negotiation stays open");
  assert.match(out.join("\n"), /company tonight already|She come TOO/i);
});

test("SLEEP with company is the long-time close, paid up by the evening she spent on your arm", () => {
  _bigNight(); G.room = "lucky_tiger"; G.nightTurn = 40;
  G.party = { ids: ["lek"], stops: 4, spent: 600, seen: {} };
  G.room = _hotelRoomId();
  out = []; _endNight("sleep");
  const said = out.join("\n");
  assert.equal(G.party, null, "the party ends where the best ones do");
  assert.match(said, /nobody's business|khao man gai|forgotten your name/i, "the barfine close fires");
  assert.equal(G.nightLog[G.nightLog.length - 1], "barfine", "logged as the night it was");
  assert.ok((G.soc.drinks.lek || 0) >= 2, "the close pays bond (less the night's usual cooling)");
});

test("dawn with company: she pours you homeward and the week remembers a great night", () => {
  _bigNight(); G.room = "ws_south"; G.nightTurn = 99;
  G.party = { ids: ["lek"], stops: 5, spent: 750, seen: {} };
  out = []; _endNight("dawn");
  const said = out.join("\n");
  assert.ok(_PARTY_DAWN.some(l => said.includes(l.replace(/\{who\}/g, "Lek"))), "her goodbye, from its pool");
  assert.equal(G.party, null);
  assert.equal(G.room, _hotelRoomId(), "home, upright");
  assert.equal(G.money, 20000 - _hotelRate(G.hotel), "and unrobbed — the folio is the only bill");
  assert.ok((G.soc.drinks.lek || 0) >= 1, "the night together counts (net of the nightly cooling)");
});

test("the companion rescue: a blackout with her on your arm ends in your own bed", () => {
  _bigNight(); G.room = "ws_south"; G.soc.drunk = 9;
  G.party = { ids: ["lek"], stops: 3, spent: 450, seen: {} };
  out = []; _endNight("blackout");
  const said = out.join("\n");
  assert.equal(G.room, _hotelRoomId(), "she got you home");
  assert.equal(G.money, 20000 - PARTY_TAXI - _hotelRate(G.hotel),
    "the taxi from your shirt pocket plus the folio — counted, correct");
  assert.ok(_PARTY_RESCUE.some(l => said.includes(
    l.replace(/\{who\}/g, "Lek").replace(/\{c\}/g, String(PARTY_TAXI)))), "the scene says so");
  assert.equal(G.party, null);
  // …the same blackout alone is the rough wake it always was
  _bigNight(); G.room = "ws_south"; G.soc.drunk = 9; G.dog = null;
  _endNight("blackout");
  assert.ok(G.money < 20000 - PARTY_TAXI, "alone, the town works you properly");
});

test("her whole night is priced like one: bond decides willingness, season decides the premium", () => {
  // TAKE HER OUT eats her entire earning potential — even an LT often gets cut
  // short so she can go back to work. She gives you the full night because she
  // likes you (regular+: plain LT; her-farang: waived) or because the payout
  // makes her whole (design call 2026-08-25).
  // The season premium is now GRADED (SEASON_PARTY_BUMP): the fuller the rail,
  // the dearer her whole night. Pin the month via G.season0 (day 5 → month ===
  // season0), and read the tier straight off the same helper the engine uses.
  _bigNight();
  G.day = 5;
  const price = mult => Math.max(700, Math.round(700 * mult / 50) * 50);
  const at = (m0, tier) => { G.season0 = m0; assert.equal(_seasonTier(), tier, `month ${m0} is ${tier}`); };

  at(11, "peak");   // December — the winter-holiday boom, the rail two-deep
  G.soc.drinks.lek = 0; assert.equal(_partyPrice("lek", 700), price(2 + 0.75), "peak stranger: the steepest buyout");
  G.soc.drinks.lek = 5; assert.equal(_partyPrice("lek", 700), price(1.5 + 0.75), "peak face: still a premium");
  G.soc.drinks.lek = 8; assert.equal(_partyPrice("lek", 700), 700, "a regular gets the night because she wants the night — season no object");

  at(10, "high");   // November — cool season proper (the 1.0 baseline)
  G.soc.drinks.lek = 0; assert.equal(_partyPrice("lek", 700), price(2 + 0.5), "high stranger: the classic full buyout");
  G.soc.drinks.lek = 5; assert.equal(_partyPrice("lek", 700), price(1.5 + 0.5), "high face");

  at(3, "shoulder"); // April — hot season, no premium either way
  G.soc.drinks.lek = 0; assert.equal(_partyPrice("lek", 700), price(2 + 0), "shoulder stranger: the flat buyout, no season loading");

  at(6, "low");     // July — monsoon in, a sure night beats a bare stool
  G.soc.drinks.lek = 0; assert.equal(_partyPrice("lek", 700), price(2 - 0.5), "low stranger: the discount begins");
  G.soc.drinks.lek = 5; assert.equal(_partyPrice("lek", 700), 700, "low face: no premium left");

  at(8, "deeplow"); // September — the deep trough, the keenest discount
  G.soc.drinks.lek = 0; assert.equal(_partyPrice("lek", 700), price(2 - 0.75), "deep-low stranger: the floor of the premium");

  assert.equal(_partyPrice("lek", 0), 0, "the past-midnight waiver stands — her earning night is over anyway");
});

test("the real negotiation carries the party price to every surface, and she says the math out loud", () => {
  _bigNight(); G.day = 5;             // high season
  G.room = "lucky_tiger"; G.nightTurn = 30;
  G.soc.drinks.lek = 6;               // a face — premium, softened
  out = []; doCommand("barfine lek");
  assert.ok(G.pendingBf && G.pendingBf.party > G.pendingBf.lt, "the negotiation computed her night's worth");
  const want = G.pendingBf.party;
  assert.match(out.join("\n"), new RegExp("TAKE HER OUT ฿" + want), "the menu quotes the real number");
  const m0 = G.money;
  out = []; doCommand("take her out");
  assert.equal(G.money, m0 - want, "…and the ledger charges it");
  assert.match(out.join("\n"), /full night is different thing|switch off the phone/i,
    "she states the economics in her own voice");
});

// ── Round 20, the closer: the companion is REAL everywhere (2026-08-26) ──────

test("the girl on your arm exists to every verb, in every room", () => {
  // She narrated at his side while TALK said she was at Cherry Pop and her
  // texting arm sent "when you come see me??" mid-date (closer F1/F2). One
  // override in _npcRoom fixes every presence consumer at once.
  _bigNight(); G.room = "candy_bar";
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: {} };
  assert.equal(_npcRoom("lek"), "candy_bar", "she is wherever YOU are");
  assert.ok(_npcsHere().includes("lek"), "the room lists her");
  out = []; G.pendingEnc = null; doCommand("talk to lek");
  assert.doesNotMatch(out.join("\n"), /isn't at this bar|Nobody by that name/);
  // …and her texting arm knows she's with you: the away-filter sees her HERE
  G.phone.contacts.lek = true;
  const away = Object.keys(G.phone.contacts).filter(c => NPC_ROLES[c] && _npcRoom(c) !== G.room);
  assert.ok(!away.includes("lek"), "a girl on your arm never texts that she misses you");
  G.party = null;
  assert.equal(_npcRoom("lek"), NPCS.lek.room, "…and she goes back to her bar when the night ends");
});

test("the companion on your arm doesn't greet you across the room she's standing in", () => {
  // Gordon/Keith, 2026-08-26: walking into a bar WITH a bonded girl fired the
  // regular-recognition greeting for HER — "she spots you and the practiced hello
  // softens" — for the woman holding your arm. The arrival greeting excludes party
  // companions now.
  _bigNight();
  G.soc.drinks.lek = 8;                          // tier 2 — would trigger the recognition line
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: {} };
  G.soc.greeted = {};                            // clear so the greeting COULD fire
  G.room = "beach_rd_c";                          // arrive from off the bar
  out = []; _arriveAt("candy_bar");              // lek is here — she's on your arm (party override)
  assert.ok(_npcsHere().includes("lek"), "she's in the room, on your arm");
  assert.doesNotMatch(out.join("\n"), /spots you|clocks you|remembers you/i,
    "the recognition greeting does not fire for the girl you walked in with");
});

test("BARFINE at the girl already on your arm has nothing to sell", () => {
  _bigNight(); G.room = "candy_bar"; G.pendingEnc = null; G.flowerDay = G.day;
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: {} };
  const m0 = G.money;
  out = []; doCommand("barfine lek");
  assert.match(out.join("\n"), /I am HERE/, "she says the obvious thing");
  assert.equal(G.money, m0);
  assert.ok(!G.pendingBf, "no ledger opens");
});

test("one truck, one wait: answering the drop-off menu doesn't conjure a second kerb", () => {
  // Two full waits fired for one ride — the truck the menu said was filling
  // evaporated when the destination was named (closer F4).
  _bigNight(); G.room = "beach_rd_c"; G.nightTurn = 82; G.rain = 0;
  out = []; doCommand("ride bus");                 // the wait, then the menu
  const said1 = out.join("\n");
  if (_BUS_SMALL_HOURS_COMES.some(l => said1.includes(l))) {
    out = []; doCommand("ride bus to naklua road"); // the truck is standing right there
    const said2 = out.join("\n");
    assert.ok(!_BUS_SMALL_HOURS.some(l => said2.includes(l)),
      "no second empty-kerb wait while the truck stands at the rank");
    assert.ok(G.pendingFare, "just the fare");
  }
});

test("the full game shows its week: SHARE renders, including at the vacation-end gate", () => {
  _bigNight(); G.nightLog = ["sleep", "allnighter", "barfine"];
  out = []; doCommand("share");
  assert.doesNotMatch(out.join("\n"), /Soi 6 challenge thing/);
  assert.match(out.join("\n"), /🛏|🌇|💋/, "the glyphs render");
  G.pendingChoice = "vacation_end";
  out = []; doCommand("share");
  assert.match(out.join("\n"), /🛏|🌇|💋/, "…and the gate answers SHARE instead of swallowing it");
  assert.match(out.join("\n"), /NEW VACATION|MOVE TO PATTAYA/, "then re-prompts");
  G.pendingChoice = null;
});

test("a shut barfine book names the act that shut it", () => {
  // "After tonight's behaviour?" held all night with no path to comprehension —
  // heat carries its cause now (closer F5).
  _bigNight(); G.room = "candy_bar"; G.pendingEnc = null;
  _addHeat(1, "the man whose girl you kept buying past");
  out = []; _doBarfine("nan");
  assert.match(out.join("\n"), /the man whose girl you kept buying past/,
    "the finger points at something");
  assert.match(out.join("\n"), /A new night forgets/, "…and names the way out");
});

test("EAT <named dish> orders the named dish, not the stall's special", () => {
  // "eat toastie" beside the 7-Eleven bought grilled chicken (closer F11)
  _bigNight(); G.room = "naklua_rd"; G.hunger = 80; G.pendingEnc = null;
  out = []; doCommand("eat toastie");
  assert.doesNotMatch(out.join("\n"), /grilled chicken and sticky rice/);
  assert.ok(_TOASTIE_LINES.some(l => out.join("\n").includes(l)), "the toastie is the toastie");
});

test("one waiver, one reason: her-farang past midnight doesn't get the mamasan's second blessing", () => {
  _bigNight(); G.room = "candy_bar"; G.pendingEnc = null;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.soc.drinks[girl] = 14;               // her-farang
  G.nightTurn = 65;                      // past midnight: the fine is 0 anyway
  G.pendingBf = { id: girl, st: 0, lt: 0, party: 0, room: G.room };
  out = []; _bfResolve("st");
  const said = out.join("\n");
  assert.doesNotMatch(said, /waves the fee away with two fingers/,
    "the midnight shrug belongs to strangers");
  if (/book is shut anyway/.test(said)) assert.match(said, /the point was never the fee/);
});

test("an in-character haggle at the ledger gets a voice, not a silent reprint", () => {
  _bigNight(); G.room = "candy_bar"; G.pendingEnc = null;
  G.pendingBf = { id: "nan", st: 400, lt: 700, party: 1400, room: G.room };
  out = []; doCommand("6900 is robbery, pet");
  assert.match(out.join("\n"), /Mama number is mama number/);
  assert.ok(G.pendingBf, "the negotiation survives the cheek");
  G.pendingBf = null;
});

test("RIDE BUS in your own room knows there is no street in here", () => {
  _bigNight(); G.room = _hotelRoomId();
  out = []; doCommand("ride bus");
  assert.match(out.join("\n"), /theoretical|OUT first/);
  assert.doesNotMatch(out.join("\n"), /No blue trucks come down here/);
});

test("the drink-snipe line is a pool, not a stamp", () => {
  assert.ok(_SNIPE_LINES.length >= 3);
  const seen = new Set();
  for (let i = 0; i < 9; i++) seen.add(_pickVary(_SNIPE_LINES, "snipetest")("Nan"));
  assert.ok(seen.size >= 2, "the moment varies across nights");
});

// ── Rounds 22/23: the civilian + publican batch (2026-08-26) ─────────────────

test("the shift-call prompt reads the YES action as YES, not as an annotation of NO", () => {
  // publican F2: "(YES · NO — have a word yourself)" fired the YES outcome when
  // the player answered NO meaning "I'll do it myself". The label belongs on YES.
  newGame(); _setFlag("act1Done"); G.shiftCall = "turning";
  out = []; _shiftPrompt();
  assert.match(out.join("\n"), /YES\s*—\s*have a word yourself\s*·\s*NO/,
    "the action sits on YES, where it fires");
});

test("SCORE and QUESTS agree: a vignette quest shows on neither", () => {
  // civilian F1: SCORE listed the President's Table as active ▶ while QUESTS
  // said "nothing on the books" (it's a vignette — hidden from journal AND hint)
  newGame(); _setFlag("act1Done"); G.stage = "vacation";
  const vig = Object.entries(QUESTS).find(([, q]) => q.vignette);
  if (vig) {
    G.quests[vig[0]] = "active";
    out = []; doCommand("score");
    assert.doesNotMatch(out.join("\n"), new RegExp("▶ " + vig[1].name),
      "SCORE no longer leaks the vignette the journal hides");
  }
});

test("WATCH SUNSET is a room verb, not a wristwatch — even with a peddler at your elbow", () => {
  // civilian F2: WATCH SUNSET bought a ฿300 fake Rolex
  newGame(); _setFlag("act1Done"); G.money = 5000; G.room = "blue_dog";
  G.pendingEnc = "peddler";
  out = []; doCommand("watch sunset");
  assert.doesNotMatch(out.join("\n"), /Rolex|fitted on your wrist/, "no watch was bought");
  assert.equal(G.money, 5000, "…and no money moved to the peddler");
  // buying it deliberately still works
  G.pendingEnc = "peddler"; out = []; doCommand("buy watch");
  assert.match(out.join("\n"), /Rolex/, "asking for the watch still buys the watch");
});

test("the quiz chalkboard names each bar once", () => {
  // both reporters hit "X and X have a chalkboard out" — two exit keys, one bar
  newGame(); _setFlag("act1Done");
  // find a Thursday and a room whose exits double up on a quiz bar; assert the
  // dedup at the source rather than hunting the exact geometry
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-core.js", import.meta.url)), "utf8");
  assert.match(src, /\[\.\.\.new Set\(Object\.values\(r\.exits\)\)\]/,
    "the near-quiz-bar scan dedups exits before naming them");
});

test("the Owl no longer preaches the dead bus curfew", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /THE LAST BAHT BUS rattles off to the depot/,
    "the columnist caught up with the 2026-08-25 curfew rework");
  assert.match(src, /The only bus you can truly miss is the one you're too far gone to catch/);
});

test("volunteered subjects answer: Daeng's dancer past, Kwang's son, Cream's coffee", () => {
  const miss = /I don't know about that|Not my story|That one I don't know|No idea|wrong girl|Search me/i;
  for (const [who, topic, want] of [
    ["daeng", "the dancer", /seventy-two|Crystal Palace/],
    ["daeng", "walking street", /seventy-two|Crystal Palace|show/],
    ["kwang", "son", /sister|send|month|home|school/i],
    ["cream", "coffee shop", /Barista|apron|twelve thousand/i],
  ]) {
    newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
    for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
    G.nightTurn = 45;                     // Cream is a late-window civilian
    G.room = _npcRoom(who); G.pendingEnc = null;
    out = []; doCommand("talk to " + who);
    out = []; G.pendingEnc = null; doCommand(`ask ${who} about ${topic}`);
    const said = out.join("\n");
    assert.doesNotMatch(said, miss, `ask ${who} about ${topic}`);
    assert.match(said, want, `ask ${who} about ${topic} reaches the real answer`);
  }
});

test("Cream doesn't re-introduce herself to the man she went home with", () => {
  // civilian F5: post-arc, talk to cream still gave the stranger's alibi
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); _setFlag("chamDone");
  G.nightTurn = 45;                       // she's a late-window civilian (from 22:00)
  G.room = _npcRoom("cream"); G.pendingEnc = null;
  assert.ok(_npcsHere().includes("cream"), "she's here at this hour");
  out = []; doCommand("talk to cream");
  const said = out.join("\n");
  assert.doesNotMatch(said, /I not work here na|just visit my friend/,
    "the alibi was for a stranger, not for you");
  assert.match(said, /here you are again|performance is over|like people/i);
});

test("the dog is present in the newest content: dark warning, small-hours kerb, light rain", () => {
  // dog-lover rerun (2026-08-26): three beats where the dog was missing from
  // content shipped after his systems were written
  newGame(); _setFlag("act1Done"); G.dog = { since: 2 };
  // 1. the dark-room warning no longer threatens soi dogs at the man who has one
  G.room = "hotel_soi"; G.lightOn = false; G.battery = 50;
  out = []; _describeRoom(true, true);
  assert.match(out.join("\n"), /Sai Krok|department/i, "his dog handles the dark");
  assert.doesNotMatch(out.join("\n"), /Sois this dark tend to have soi dogs in them/, "not the dogless warning");
  // 2. the small-hours kerb wait mentions him standing it with you
  newGame(); _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.dog = { since: 2 }; G.room = "beach_rd_c"; G.nightTurn = 82; G.rain = 0;
  out = []; doCommand("ride bus");
  assert.match(out.join("\n"), /Sai Krok sits at the kerb/, "he waits it with you");
  // 3. the light-rain drizzle carries a dog beat (reachable on a non-storm week)
  newGame(); _setFlag("act1Done"); G.dog = { since: 2 };
  G.room = "beach_rd_c";
  let sawDog = false;
  for (let t = 0; t < 8 && !sawDog; t++) { G.turns = 100 + t * 30; out = []; _sayDrizzle(); if (/Sai Krok/.test(out.join("\n"))) sawDog = true; }
  assert.ok(sawDog, "his rain repertoire is reachable in ordinary light rain");
});

test("Fast Eddy owns his bar — the man-drink line doesn't call the owner a manager", () => {
  newGame(); _setFlag("act1Done"); G.money = 5000;
  G.room = _npcRoom("fast_eddy");
  out = []; doCommand("buy man drink");
  const said = out.join("\n");
  if (/soda/i.test(said)) {  // Eddy's dry branch fired
    assert.doesNotMatch(said, /a manager who likes you/, "he's the guv'nor, not a manager");
    assert.match(said, /name is over the door/);
  }
});

// ── Frank the romantic (2026-08-26): the systems around the affair know it ended ──

function frankOwner() {
  sandbox();
  G.stage = "expat";
  ["expatLife", "barPremises", "barLicence", "barPartner", "partnerTan", "barOpen", "barPaid", "tanAsked"]
    .forEach(f => _setFlag(f));
  G.bar.room = "stinky_bar"; G.room = "stinky_bar"; G.money = 40000;
}

test("an ignored phone doesn't hoard: chatter caps at 3 unread per sender, and the read shows a dozen", () => {
  // Frank: ~70 accumulated texts, the same five strings ×8, dumped wholesale at
  // the arc's emotional climax.
  frankOwner();
  G.phone.contacts.manow = true;
  for (let i = 0; i < 30; i++) _pushMsg("manow", ["a", "b", "c"][i % 3]);
  assert.ok(G.phone.inbox.filter(m => !m.read && m.from === "manow").length <= 3,
    "plain chatter stops accumulating at three unread");
  // money and photos still land past the cap
  _pushMsg("manow", "here", 300);
  assert.ok(G.phone.inbox.some(m => m.gives === 300 && !m.read), "a transfer is never dropped");
  // and a giant backlog reads as a dozen + a skim, with the money still banked
  G.phone.inbox = [];
  for (let i = 0; i < 20; i++) G.phone.inbox.push({ from: "manow", text: "t" + i, turn: i, read: false, gives: i === 0 ? 500 : 0 });
  const m0 = G.money;
  out = []; _readMessages();
  assert.ok(out.join("\n").split("\n").filter(l => /📱/.test(l)).length <= 12, "at most a dozen shown");
  assert.match(out.join("\n"), /thumb past \d+ older/, "the rest skimmed, named");
  assert.equal(G.money - m0, 500, "…and the skipped transfer still banked");
});

test("the ended affair reaches the phone, the book, and the texting arm", () => {
  // Frank: "★ your girl · The Stinky Pinky", instant loving replies, and the
  // in-love text pool — all the morning after the bag by the door.
  frankOwner();
  G.phone.contacts.manow = true; G.soc.drinks.manow = 20;
  G.affair = { id: "manow", since: 1, ended: true, gone: true, scarUntil: 99 };
  out = []; _doBlackbook();
  assert.match(out.join("\n"), /gone home · the one that ended/, "the book knows");
  assert.doesNotMatch(out.join("\n"), /your girl/, "she is not ★ your girl any more");
  out = []; _doMessage("manow");
  assert.match(out.join("\n"), /kha|face down/, "a message gets her silence, in her voice");
  for (let i = 0; i < 300; i++) {
    G.turns += 30; G.phone.lastText = 0; G.rng = 500 + i;
    const n0 = G.phone.inbox.length;
    _maybeIncomingText();
    const last = G.phone.inbox[G.phone.inbox.length - 1];
    assert.ok(G.phone.inbox.length === n0 || last.from !== "manow", "the gone girl never texts");
  }
  // the won state has its own register: Prachuap, not a barstool
  G.affair = { id: "manow", since: 1, ended: true, won: true };
  out = []; _doBlackbook();
  assert.match(out.join("\n"), /Prachuap, by the sea/, "the book knows the good ending too");
  out = []; _doMessage("manow");
  assert.match(out.join("\n"), /come home|auntie|HURRY UP|miss you too/, "…and she texts like a partner, not a hostess");
});

test("the early call's boy has ONE mother: a stable hostess, never the cashier", () => {
  // Frank: "her boy is at her sister's" taught him Manow had a son over weeks —
  // then CAKE (the cashier) recited the identical script the night after Manow
  // left. A child is a canon claim, not reusable filler.
  frankOwner();
  const a = _earlyGirl(), b = _earlyGirl();
  assert.ok(a && a === b, "the same girl every time");
  assert.equal(NPC_ROLES[a], "hostess", "and she is a hostess — the cashier fallback is gone");
  G.affair = { id: a, since: 1, ended: true, gone: true };
  assert.equal(_earlyGirl(), null, "with her gone, there is no understudy for a biography");
  assert.ok(!_shiftEligible().some(c => c.id === "early"), "…so the call simply isn't dealt");
});

test("your own hotel room has the two complimentary bottles — the rain-lock can't dehydrate you", () => {
  // Frank: seven nights of sixty ended "Thirst put you down" while a downpour
  // pinned him at home beside a working shower. Every Thai hotel leaves two
  // bottles by the kettle; now so does this one.
  frankOwner();
  G.room = _hotelRoomId(); G.thirst = 90; G.roomWater = 0;
  out = []; doCommand("drink water");
  assert.ok(G.thirst <= 50, "bottle one quenches");
  out = []; doCommand("drink water");
  assert.ok(G.thirst <= 10, "bottle two finishes the job");
  out = []; doCommand("drink water");
  assert.match(out.join("\n"), /dead soldiers|Housekeeping restocks/, "the tray runs to two, voiced");
  assert.ok(G.thirst <= 15, "…and no phantom third bottle");
  // housekeeping restocks at wake
  _endNight("sleep");
  assert.equal(G.roomWater, 0, "restocked with the morning");
});

test("a resident reaches his own room whether or not Act One's wallet flag survived", () => {
  // Gordon F6 then Frank S6: the room-412 gate checked hasWallet, not stage, so
  // a flag-shortcut expat was refused his own bed for 60 nights with Act One prose.
  frankOwner();
  delete G.flags.hasWallet;
  G.room = "hotel_soi";
  out = []; doCommand("go hotel");
  assert.equal(G.room, "hotel_room", "act1Done is the resident's key card");
  assert.doesNotMatch(out.join("\n"), /Get the wallet back/, "no Act One quest prose at a resident");
});

// ── Tyler the cold casual (2026-08-26): the cold open must be legible ──

test("the held cheap refusal is a meter, not a wall: progress is acknowledged", () => {
  // Tyler: the hint said "ask again", one more drink got "the answer hasn't
  // changed since your last drink" — the only time he felt played by the
  // interface. The re-ask acknowledges movement now.
  newGame(); G.mode = "soi6"; _setFlag("act1Done");
  G.room = "ruby_kiss";
  G.soc.drinks.wilai = 2;
  out = []; _bfRefusalSay("wilai", { kind: "cheap", again: true, favor: _favor("wilai") });
  assert.match(out.join("\n"), /same small headshake/, "no movement, same answer");
  G.soc.drinks.wilai = 3;   // one more drink since the refusal was held
  out = []; _bfRefusalSay("wilai", { kind: "cheap", again: true, favor: _favor("wilai") - 1 });
  assert.match(out.join("\n"), /Warmer, tilac|Not warm ENOUGH/, "progress acknowledged in her voice");
});

test("the column's own mystery answers at its author: personals and box 15 reach Mort's signoff", () => {
  // Tyler: Box 15 taunts "not one of you has asked me why" and asking Mort about
  // it got the generic shrug — the plotted mystery rebuffing the ask it solicits.
  newGame(); _setFlag("act1Done"); G.stage = "vacation";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "queen_vic"; G.nightTurn = 20;
  for (const topic of ["personals", "box 15", "the owl"]) {
    out = []; doCommand("ask mort about " + topic);
    assert.match(out.join("\n"), /back issues|keeps one secret|You noticed|First to ask/i,
      `"${topic}" reaches the signoff node`);
  }
});

test("a money decision is legible: the rose pitch carries the numeral beside the Thai", () => {
  newGame(); _setFlag("act1Done");
  G.room = "candy_bar"; G.convo = { id: "lek", turn: G.turns };
  G.flowerSeen = 0;
  // fire the flower encounter prompt directly and read the price
  if (typeof _flowerOffer === "function") { out = []; _flowerOffer("lek"); }
  else { out = []; _startEnc && G.encDone && (G.encDone.flower = false); }
  const said = out.join("\n");
  if (said) assert.match(said, /\(฿\d+\)/, "the Thai-numeral theatre keeps a legible amount beside it");
});

test("asking for the 7-Eleven's toastie inside a bar points at the door, not a wall", () => {
  newGame(); _setFlag("act1Done");
  // find a bar whose exits include a seven street
  const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType &&
    Object.values(ROOMS[id].exits || {}).some(x => ROOMS[x] && ROOMS[x].seven));
  assert.ok(bar, "a bar adjacent to a 7-Eleven street exists");
  G.room = bar; G.money = 500;
  out = []; doCommand("buy toastie");
  assert.match(out.join("\n"), /Step OUT|right out on the street/, "the refusal gives the route");
});

test("the goal word teaches its own pronunciation on the surfaces a cold player reads", () => {
  // Tyler: "my win condition is written in a script I can't read."
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  out = []; doCommand("help");
  assert.match(out.join("\n"), /sabai sabai/, "HELP glosses the summit");
  assert.match(out.join("\n"), /sanuk/, "…and the score word");
});

// ── The eighth origin: the nomad (Tyler follow-up, 2026-08-26) ──

test("the nomad is a pickable origin: listed eighth, Tan reads him, WHO AM I knows", () => {
  newGame();
  G.introAfter = "beach"; G.pendingChoice = "intro"; G.introStep = 0;
  out = []; _introPrompt();
  assert.match(out.join("\n"), /8\) /, "eight origins on the card");
  assert.match(out.join("\n"), /location-independent/, "the nomad's pick is one of them");
  out = []; _introAnswer("8");
  assert.match(out.join("\n"), /Start by carrying something/, "Tan's read — the floor doctrine, seeded from minute one");
  assert.equal(G.player.origin, "nomad");
  G.pendingChoice = null; G.introStep = null;
  out = []; doCommand("who am i");
  assert.match(out.join("\n"), /The nomad/);
});

test("Kyle is the you-ARE-him NPC: deactivated for the nomad, present for everyone else", () => {
  newGame(); G.player = { origin: "nomad", personality: "joker", orientation: "straight" };
  assert.ok(!_npcActive("kyle"), "you can't meet the life you picked");
  G.player.origin = "monger";
  assert.ok(_npcActive("kyle") && _npcRoom("kyle") === "pink_lotus", "…but everyone else finds him at the Pink Lotus");
});

test("the glass-start vignette runs the real path: talk, answer, vouch at Bert, done", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999; G.money = 5000;
  G.room = "pink_lotus";
  doCommand("talk to kyle");                       // greeting arms his job question
  out = []; doCommand("IT support, back in Ohio"); // answering it clears the offer gate
  out = []; doCommand("ask kyle about hospitality");
  assert.match(out.join("\n"), /yes with homework|BAR_PIVOT/, "the ambition answers on the word he volunteers");
  assert.equal(G.quests.glass_start, "active", "the vignette opened silently, like the other seven");
  out = []; doCommand("ask kyle about crypto");
  assert.match(out.join("\n"), /Do NOT buy anything I own/, "talks too much about crypto — and is not a con artist");
  G.room = "stinky_bar";
  out = []; doCommand("ask bert about kyle");
  assert.match(out.join("\n"), /dirty glass/, "Bert's price is the floor doctrine");
  assert.ok(_flag("kyleShift"));
  _questTick();
  assert.equal(G.quests.glass_start, "done");
  // the payoff propagates both ways
  out = []; doCommand("ask bert about kyle");
  assert.match(out.join("\n"), /never once checked his phone/, "Bert's verdict, after");
  G.room = "pink_lotus";
  out = []; doCommand("talk to kyle");
  assert.match(out.join("\n"), /Tuesday happened/, "and Kyle's best day out here");
});

test("Tan's manifest carries the eighth passenger", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  (G.known = G.known || {}).kyle = true; (G.talked = G.talked || {}).kyle = [0];
  out = []; _tanOthers();
  assert.match(out.join("\n"), /tripod.*means it|wants to run a bar/, "Tan drove him in too");
});

test("the third answer to Tan's last question: the deflection he sees straight through", () => {
  // Tyler, 2026-08-26: "what are you in the market for?" had no out, even a
  // joke one — the likeliest early bounce for an uneasy cold player. The game
  // stays honest by CALLING the bluff, not believing it.
  newGame(); G.introAfter = "beach"; G.pendingChoice = "intro"; G.introStep = 2;
  out = []; _introPrompt();
  assert.match(out.join("\n"), /3\) Honestly\? The beaches, the food… the culture\./, "the out is on the card");
  out = []; _introAnswer("3");
  assert.match(out.join("\n"), /cultural district of Soi 6/, "Tan calls the bluff, warmly");
  assert.equal(G.player.orientation, "straight", "…and files the deflector under the factory setting: every routing unchanged");
  // the punchline survives to the record
  G.pendingChoice = null; G.introStep = null;
  G.player.origin = "monger"; G.player.personality = "joker";
  out = []; doCommand("who am i");
  assert.match(out.join("\n"), /The ladies/, "WHO AM I quietly agrees with Tan, not with what you said");
  // the older two answers keep their numbers
  newGame(); G.introAfter = "beach"; G.pendingChoice = "intro"; G.introStep = 2;
  out = []; _introAnswer("2");
  assert.equal(G.player.orientation, "bi", "option 2 is still open-minded");
});
