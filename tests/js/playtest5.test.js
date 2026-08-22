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
