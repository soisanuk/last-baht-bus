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
  assert.match(text(), /spent ฿1,000|spent ฿1000/);
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

test("the last bus doesn't wait for a slow payer; the same wall gives the same refusal", () => {
  G.room = "beach_rd_c"; G.nightTurn = 78; G.money = 500;
  doCommand("ride bus to naklua road");
  assert.ok(G.pendingFare);
  G.nightTurn = LAST_BUS_TURN + 1; out = [];
  doCommand("pay 15");
  assert.equal(G.pendingFare, null);
  assert.match(text(), /run out of night|heads for the depot/);
  assert.notEqual(G.room, "naklua_rd", "the ride did not complete after the curfew");
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
  _endNight("dawn");
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
  G.room = "buakhao_market";              // out on the street at dawn
  out = []; _endNight("dawn");
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
