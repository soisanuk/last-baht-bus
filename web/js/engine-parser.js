// The Last Baht Bus — game engine, part 5/5: the command surface — verb
// handlers, fast travel, the Zork ledger, autocomplete, the parser, and boot
// text. Loads last (see engine-core's header for the split's load-order contract).

// ── Verb handlers ──────────────────────────────────────────────────────────

const _DIRS = {
  n: "n", north: "n", s: "s", south: "s", e: "e", east: "e", w: "w", west: "w",
  in: "in", inside: "in", out: "out", outside: "out",
  up: "up", u: "up", upstairs: "up", down: "down", d: "down", downstairs: "down",
  alley: "alley", office: "office",
};

// ── Varied response pools for the hot loop (picked via _pickVary, no repeats) ──
// The favor grind and the common misfires are the most-printed lines in the game;
// deep pools keep them from wearing a groove. _ladyPrice() is read lazily at call
// time, so these can sit above its definition.
// _fmt templates (not raw interpolation): the {n}/{p} placeholders let the German
// catalog reorder them. EN output is byte-identical to the old strings.
const _LADY_DRINK_LINES = [
  n => _fmt("One lady drink for {n} — ฿{p} on the tab that is your life.", { n, p: _ladyPrice() }),
  n => _fmt("{n} gets her cola-with-benefits; {m}'s biro logs ฿{p} without looking up.", { n, p: _ladyPrice(), m: _mamaRef() }),
  n => _fmt("A thimble of something mostly ice lands in front of {n} — ฿{p}, gone in three sips.", { n, p: _ladyPrice() }),
  n => _fmt("“Chon kaew!” {n} toasts you with her ฿{p} lady drink and means it for exactly one sip.", { n, p: _ladyPrice() }),
  n => _fmt("You buy {n} a drink; she rewards it with a smile calibrated to the exact value of ฿{p}.", { n, p: _ladyPrice() }),
  n => _fmt("A ฿{p} lady drink for {n} — the house's real product, sold by the glass.", { n, p: _ladyPrice() }),
  n => _fmt("{n}'s glass runs dry the way a meter does; ฿{p} restarts it.", { n, p: _ladyPrice() }),
  n => _fmt("The waitress doesn't even ask — {n}'s drink, ฿{p}, straight onto your tab.", { n, p: _ladyPrice() }),
];
// At regular+ bond the transactional lines ("a smile calibrated to ฿150", "the
// way a meter does") contradict the courtship the player has built — she's not
// metering YOU any more (Alan playtest, 2026-08-17). A warm sub-pool for her.
const _LADY_DRINK_WARM = [
  n => _fmt("{n}'s usual arrives before you've asked — she caught your eye, the waitress caught hers. ฿{p}, and she holds the toast a beat longer than the tab explains.", { n, p: _ladyPrice() }),
  n => _fmt("You get {n} a drink; she bumps your glass, says \u201csame-same as always,\u201d and the ฿{p} feels beside the point, which is new.", { n, p: _ladyPrice() }),
  n => _fmt("Another for {n} \u2014 ฿{p} \u2014 but she drinks half and pushes the rest back to share, which no meter has ever done.", { n, p: _ladyPrice() }),
  n => _fmt("{n} lets the drink sit. \u201cYou don\u2019t have to keep buy, na,\u201d she says, and means it, which costs her ฿{p} she\u2019d rather have than have you think she\u2019s counting.", { n, p: _ladyPrice() }),
];
// A lazy girl (type:"lazy") takes the drink and gives you the minimum back — the
// favor rarely sticks (the "you spend, get little" punishment). Not unkind, just
// not working for it; a savvy player reads it and stops paying.
const _LAZY_DRINK_LINES = [
  n => `${n} says thanks without looking up from {{her phone}}, and the ฿${_ladyPrice()} drink sits between you like a receipt.`,
  n => `${n} clinks your glass on autopilot, already half-turned toward the door and whoever comes through it next. ฿${_ladyPrice()}.`,
  n => `${n} takes the ฿${_ladyPrice()} drink, gives you a smile with the wattage turned right down, and lets the silence finish her shift.`,
  n => `"Thank you na." That is, it turns out, the whole of it — ${n} isn't unkind, she's just not going to work for ฿${_ladyPrice()}.`,
];
// Bar etiquette: a girl already sitting with another customer declines a lady drink
// from you — poaching is a scene nobody asked for. Insist (send it again) and she'll
// take it, money being money, and that's when her customer starts to turn.
const _BUSY_DECLINE = [
  n => `${n} gives you a gracious little smile and the smallest shake of the head — she's sitting with someone, and a drink from a second man is a scene nobody wants. "Thank you, na. Maybe later." The 'later' is manners, not a promise.`,
  n => `The waitress carries your offer over; ${n} glances at the man already beside her, then back, and declines it soft. "I am with customer now, tilac. Is not polite." She means the etiquette — and she's right about it.`,
  n => `${n} looks up, clocks that she's already got company, and waves the drink off with an apologetic wince. "Sorry sorry — not now. You see I am busy, na?" The man beside her has noticed you noticing.`,
];
const _BUSY_INSIST = [
  n => `You send it again, and this time ${n} takes it — money is money, and you left her no graceful way to say no twice. She sips fast, not looking at you, very aware of the man beside her, who has gone quiet in the particular way that isn't calm.`,
  n => `${n} accepts the second offer with a thin smile and an apology aimed sideways — at the customer whose evening you've just walked into. He sets his glass down a shade too precisely.`,
];
function _girlBusy(id) {
  if (NPC_ROLES[id] !== "hostess") return false;   // mamas/cashiers aren't "with a customer"
  const r = ROOMS[_npcRoom(id)];
  if (!r || r.region !== "Soi 6") return false;    // the crowded soi is the etiquette context
  if (_convoActive() === id) return false;         // she's with YOU right now
  if ((G.soc.drinks[id] || 0) > 0) return false;   // already your acquaintance tonight
  const block = G.day + ":" + Math.floor((G.nightTurn || 0) / 10); // stable per hour-ish
  return _hh(id + ":" + block, 61) % 100 < 25;     // ~1 in 4 un-engaged girls is taken
}
function _poachAnger(id) {
  const name = NPCS[id].name;
  const boils = _rand() < (_pers("whiteknight") ? 0.6 : 0.4); // the WK doesn't read the room
  if (boils) {
    _say(`The man beside ${name} is on his feet before her glass is down. This is the part ` +
      "where it becomes your problem: a chest, a finger, a voice raised in a language you " +
      "half-follow — and the mamasan moving fast to get between you before security does it " +
      "less gently. Out on the soi you go, and lucky it's only that.", "alert");
    if (_rand() < 0.3 && _hurt(1)) return; // sometimes a shove lands hard enough for the clinic
    _addHeat(3);   // → kicked out
    return;
  }
  _say(`The man beside ${name} has gone quiet in the way that isn't calm — jaw working, glass ` +
    "set down too precisely. You bought his whole attention for one lady drink; on this soi " +
    "that has started fights over less. Push it again and it stops being a look.", "alert");
  _addHeat(2);
}
const _NO_EXIT = [
  "You can't go that way.",
  "That's a wall, boss — the soi doesn't run that way.",
  "No road there: shuttered shophouses and somebody's parked Click.",
  "Nope. The night isn't laid out like that.",
  "Dead end. Pattaya keeps its exits where it keeps them.",
];
// Indoors, every one of those is about a street you are not standing on. A blind
// player lost in the Tree Town maze stepped into a bar and was told "the soi
// doesn't run that way" — handed the wrong mental model at the exact moment they
// were trying to build one (opening auditor 2026-08-23).
// …and an open-air market is not indoors. Rompho has one door on the map and a
// `bar` display name, which made it read as an interior — so walking north out of
// a sprawl of plastic stools under tarpaulins answered "you're indoors"
// (persona report A#6, 2026-08-23).
const _NO_EXIT_OPEN = [
  "Not that way — the sprawl only opens back onto the road you came in from. (OUT)",
  "Stalls, stalls, and then a wall of somebody's kitchen. The way you came in is the way there is. (OUT)",
  "You get three stalls further and find the whole thing backs onto a building. (OUT)",
];
const _NO_EXIT_IN = [
  "You're indoors. The only way out of here is OUT.",
  "That's a wall with a beer fridge against it. OUT is the way you came.",
  "Not from in here — this room has one door, and you came through it. (OUT)",
];
// Soi 6 challenge mode: the rest of the city is off-limits this trip.
const _SOI6_BOUND = [
  "Not this trip. You made yourself a rule — Soi 6, top to bottom, and nothing else — and the rest of Pattaya keeps for next time.",
  "You get to the edge of the soi and turn around. That way is the whole rest of the city, and the whole rest of the city isn't what you came for.",
  "One week, one street: those were the terms. Pattaya can wait. Back into Soi 6.",
  "You could. You don't. For seven days Soi 6 is the entire world by your own decree — and there's plenty of world left in it.",
];
// The Orchid CLUB (Naklua, an ordinary if exclusive gents villa) is a different
// room from the Orchid ROOM below (White Dish's back table) — same name-root,
// unrelated canon. "Tourists never find it. That is the entire point" is the
// venue's own desc, so a bare compass exit that walked anyone straight in
// undercut its one piece of characterisation. Reachable only once vouched or
// told (orchidVouched/orchidReported — same flags the "Step inside:" listing
// already filters on; this closes the other half, actual entry).
// NAMED BY THE ROOM, DENIED BY THE ROOM. Naklua Road's own description says
// "no sign, just a brass bell, and THE ORCHID CLUB, if you know to ask" — and
// these lines used to answer that you'd never heard of the place and neither
// had anyone (Gerry, round 34). The gate is real and stays: you get SENT to the
// Orchid, you don't find it. But the wall is right there in the prose, so the
// refusal is about STANDING, not existence — "if you know to ask" means you do
// not know who to ask, which is the actual thing you're missing.
const _ORCHID_CLUB_UNKNOWN = [
  "The wall gives you nothing: no sign, no handle, no window, and a brass bell you have " +
    "precisely no standing to ring. Places like this don't open to a man who walked up. " +
    "Somebody sends you, or you spend the evening looking at render.",
  "You stand in front of it long enough to feel conspicuous. Whatever the Orchid is, it is " +
    "not for people who arrive on their own initiative — and the one thing you'd need is a " +
    "name to drop, which you haven't got.",
];
const _ORCHID_BOUNCER = [
  "A man the size of a doorway fills the doorway. He doesn't ask a question; he just looks at you until you understand the answer. \"Members,\" he says, once. You are not, yet, a member.",
  "The velvet rope stays hooked. The doorman glances at a phone, glances at you, and finds no match. \"Not tonight, boss.\" The 'boss' is doing a lot of work, and none of it is for you.",
  "You reach for the rope and a hand the weight of a Chang crate settles on your shoulder. \"This one's White Dish's room. You White Dish?\" You are not, and he already knew it, and that was the whole conversation.",
  "The doorman doesn't move and doesn't blink. \"Friends of the group only.\" A beat. \"You want in, be a friend of the group. Everybody knows how that works.\" The rope does not lift.",
];
const _NOT_CARRYING = [
  "You're not carrying that.",
  "You pat your pockets. Not there.",
  "You don't have that on you — just lint and regret.",
  "Nothing like that in your pockets.",
];
const _NOT_HERE = [
  "They're not here.",
  "Whoever that is, they're somewhere else on the soi.",
  "Not here right now — the regulars drift around.",
  "Empty stool where you were looking.",
];
// Voiced refusals for people the room's OWN prose describes. Derived from the
// room text rather than a hand-kept list, so a new room is covered the day it is
// written: if the player is asking about a word the description just used, the
// person is real and the answer must not be "nobody by that name".
const _FOLK_MOTO = [
  "The piwin surfaces about halfway, establishes that you are not a fare yet, and goes back under his cap. (MOTOSAI TO <place> when you want him.)",
  "He tips the cap up with one finger, waits to hear a destination, doesn't hear one, and puts it back. (MOTOSAI TO <place>.)",
];
const _FOLK_SECURITY = [
  "He looks at you with the flat, entirely un-hostile attention of a man whose whole job is knowing which of tonight's problems you are. He has decided you are not one. That is the conversation.",
  "A nod, and nothing after it. Security here talks to two kinds of people and you are neither, which is the best outcome available.",
];
const _FOLK_TOUT = [
  "She has the professional smile up before you finish crossing the pavement and drops it the moment you turn out to be talking rather than coming in. Business, not rudeness.",
];
const _FOLK_GENERIC = [
  "They are there, and they are not looking for a conversation with you \u2014 which on this soi is most people, most of the time.",
  "You get about half a second of eye contact and a face that says the night is already spoken for.",
  "Not everybody in a room is somebody to talk to. They go back to whatever they were doing, which was not this.",
];

// The words the room actually printed, lower-cased \u2014 the same text the player
// just read, so anything they can quote back at us came from here.
function _roomProse(r) {
  return String((r && r.desc) || "").toLowerCase();
}

const _FOLK_SEVEN = [
  "The 7-Eleven lad looks up from his phone. “Sawatdee khrap.” Then back down. That is the whole conversation available, and it is not unfriendly.",
  "The girl on the till gives you the smile the uniform requires and the eyes it doesn't. “Toastie?” No? The smile stays; the attention goes.",
  "The clerk is restocking the fridge and does not stop. “Khrap?” Whatever you were going to ask, the answer is on a shelf, and he points at the shelves.",
];
function _promptedFolk(arg) {
  const r = _room();
  if (!r) return false;
  const a = String(arg).toLowerCase().trim();
  if (!a) return false;
  if (/\b(motosai|piwin|driver|rider|bike ?boy)\b/.test(a) && r.motosai) {
    _say(_pickVary(_FOLK_MOTO, "folkmoto")); return true;
  }
  if (/\b(clerk|cashier|staff|lad|counter|shop ?(girl|boy|assistant))\b/.test(a) && r.seven) {
    _say(_pickVary(_FOLK_SEVEN, "folkseven")); return true;   // three refusals for a lad the receipt named (Bronwyn, round 39)
  }
  const prose = _roomProse(r);
  if (!prose) return false;
  // every word of the ask has to be in the room's own description, so "security"
  // answers where the room mentions security and misses where it doesn't
  const words = a.split(/\s+/).filter(w => w.length > 2 && !/^(the|and|a|an|to|of)$/.test(w));
  if (!words.length || !words.every(w => prose.includes(w))) return false;
  if (/\b(security|guard|bouncer|doorman)\b/.test(a)) {
    _say(_pickVary(_FOLK_SECURITY, "folksec")); return true;
  }
  if (/\b(tout|greeter|hostess|girls?|women|ladies|masseuse)\b/.test(a) && (r.massage || r.soapy)) {
    _say(_pickVary(_FOLK_TOUT, "folktout")); return true;
  }
  _say(_pickVary(_FOLK_GENERIC, "folkgen"));
  return true;
}

const _NOBODY_NAME = [
  "Nobody by that name here.",
  "No one here answers to that.",
  "That name doesn't land on anyone in the room.",
  "Nobody here goes by that — not tonight.",
];
// A first-timer types sentences: "what should I do", "where am I", "look
// around", "I'm lost". The opening night answered "I didn't understand that"
// (Bronwyn, round 39). Voiced, and pointed at the four verbs that get you home.
function _naturalHelp(lower) {
  const l = lower.trim();
  if (/^(where am i|where is this|where are we|look around|look about|have a look)\b/.test(l)) { _describeRoom(true); return true; }
  if (/^(what (should|do|can) i do|what now|what next|help me|i'?m (lost|stuck|confused)|i don'?t know what to do)\b/.test(l)) {
    _say("(LOOK shows where you are. TALK to whoever is here and ASK them about your wallet — this town runs on asking. HINT when you're stuck; HELP for everything.)", "dim");
    return true;
  }
  return false;
}
const _HUH = [
  "I didn't understand that. (HELP lists commands.)",
  "That one didn't parse. (HELP lists commands.)",
  "The soi blinks at you. Try again — (HELP lists commands.)",
  "No idea what you're after there. (HELP lists commands.)",
];
const _BEER_LINES = [
  "One big Chang, cold enough to hurt.",
  "A sweating bottle of Leo, cap flicked into the gutter — the first pull the best one.",
  "Cold Singha, condensation already running for the door. The bar exhales; so do you.",
  "Another big one, cracked and poured over the last of the ice. The true national anthem.",
];
// Water and food are the survival loop — pressed at 7-Elevens, street carts, and
// KISS all night. Caller appends the "(฿X left.)" receipt; STALL_EAT follows a
// "฿X buys <name>." opener that carries the data, so its lines stay posture-neutral
// (they have to fit both a plastic stool at KISS and eating on your feet at a cart).
// Stepping into the 7-Eleven. `seven: true` marks a STREET room with a store on
// it — one per district, deliberately not 15 more rooms to walk in and out of
// for a thirty-second errand. But nothing narrated the doorway, so a cold water
// simply appeared on the pavement, and some lines gave the game away by
// mentioning a doorbell you had never gone through ("the doorbell jingles in
// celebration" on the charger). Playtest: "it feels weird that you can buy
// stuff without actually entering the store."
//
// So the first purchase of a visit walks you in, and the rest read as you
// already being inside. Cleared on arrival (_arriveAt), so leaving and coming
// back rings you in again.
const _SEVEN_IN = [
  "You step in under the aircon and the door goes dong-ding — that two-note chime, the " +
    "same one in every branch in the country, playing you in like a small national anthem.",
  "Dong-ding. The cold hits you like a wall and the light is bright enough for surgery.",
  "In through the glass door, dong-ding, out of the heat and into a room that smells of " +
    "floor cleaner and hot toasties.",
  "The door chimes you in. Somebody behind the counter says sawatdee without looking up, " +
    "and the aircon takes the night off your shoulders.",
];

function _sevenIn() {
  if (!_room().seven || G.sevenAt === G.room) return;
  G.sevenAt = G.room;
  _say(_pickVary(_SEVEN_IN, "sevenin"), "dim");
}

const _WATER_LINES = [
  "A cold bottle of water, gone in one go. Civilisation.",
  "Ice-cold plastic, sweating in your hand; half of it's gone before you lower the bottle.",
  "Cold water straight down, and your body files a quiet note of thanks.",
  "You crack the cap and drink it where you stand — sweet, cold, worth ten times what it cost.",
  "A litre of cold water vanishes and the heat loosens its grip a notch.",
  "Frosted, capped, cracked, drained. The worst of the thirst just... stops.",
];
const _NOODLE_LINES = [
  "A pot of Mama noodles off the shelf, hot water from the urn by the till, three minutes standing at the counter with the lid held down by a wooden chopstick. It is exactly as good as it needs to be.",
  "Tom yum flavour, because the others are for people with a plan. You eat it standing up under the aircon vent, which is the correct way, and the girl behind the till does not comment.",
  "The lid, the water, the wait, the fork from the box by the door. Fifteen baht and the ancient dignity of the man who knows this is the right decision at this hour.",
  "You get the pork one. It is salty enough to be medicinal and hot enough to hurt, and it puts a floor under the evening that was not there a minute ago.",
];
const _TOASTIE_LINES = [
  "The iconic 7-Eleven cheese toastie, pressed twice while you wait, eaten molten on the kerb " +
    "like every farang before you back to the dawn of time. There are worse religions.",
  "A ham-and-cheese toastie, folded and branded with grill lines, handed over blistering. " +
    "You eat it on the kerb and resent how perfect it is.",
  "The cheese toastie comes out structurally unsound and molten in the middle. Gone in four " +
    "bites — a 7-Eleven sacrament.",
  "฿35 of pressed-bread engineering. You burn the roof of your mouth on the cheese toastie " +
    "exactly as intended, and would do it again.",
  "You eat the toastie leaning on a bollard, cheese cauterising your tongue, and understand — " +
    "briefly, completely — why the expats never leave.",
];
const _STALL_EAT_LINES = [
  "You eat, and the night quietly improves.",
  "You eat where you are, no ceremony, and something knotted in the evening comes loose.",
  "Cheap, correct, and exactly what the night needed.",
  "Hot, unfussy, gone too soon — the good kind, and the hunger backs off.",
  "You clean the plate. The world softens a degree at the edges.",
  "Every baht of it earns out; the night steadies on a full stomach.",
];

// The go-go back staircase is right there in the room prose, but you don't just
// wander up it: the mamasan heads you off — choose a lady and pay her barfine
// first, THEN upstairs. Turns a dead-end UP into a nudge toward the mechanic.
const _GOGO_UPSTAIRS = [
  "A hand lands on your chest before your foot finds the first stair — the mamasan, all smile, no give. \"Upstairs later, tilac. First you choose a lady, buy her a drink, pay her barfine — THEN up. Not before.\"",
  "The mamasan slides between you and the staircase like she teleported there. \"Ah-ah. No lady, no upstairs. Find one you like, take care of her proper, and the stairs are yours. Backwards no good, na.\"",
  "You get one hand on the rail. The mamasan clears her throat and the rail is suddenly hers. \"Nothing up there for a man on his own, handsome. BARFINE a girl, do it right — then I show you up myself.\"",
  "The staircase is right there and entirely off-limits: the mamasan plants herself on the bottom step. \"You want to go up? Buy a lady, pay her fine, she takes you. Only way the stairs work here.\"",
];

// ── Crossing Sukhumvit on foot ───────────────────────────────────────────────
// Eight lanes, at night, with drunk drivers and unlit bikes: the highway kills a
// handful of pedestrians every year doing exactly this (Mario, 2026-09-03 —
// "should be reflected in the prose", and it is, in both rooms; this is the
// other way to reflect it). The roll runs on the one foot move that IS the
// crossing — sukhumvit_crossing ↔ khao_talo_strip — whether you walk it or
// TRAVEL through it. Bus and bike never roll here (the piwin's own risk lives
// in _motoCrashRisk). Drink and the small hours raise it, as they do on the
// road. Player-initiated, so the dice are fine. Outcomes: a clean crossing
// (voiced — the act is felt), a near-miss telegraph, a clip (G.hurt +1, the
// ward at three), or the truck: _endNight("roadhit"), the public ward,
// insurance, no bill. Returns true when the night ended, so callers stop.
const _CROSS_CLEAN = [
  "You wait for a gap that is never quite a gap, then go — four lanes, the central reservation's knee-high kerb, four more, a horn from somewhere that may or may not be for you. Your heart is doing something you can hear.",
  "Eight lanes, taken in two runs with a wait on the concrete in the middle while a convoy of pickups goes past close enough to feel. You arrive on the far side walking too fast.",
  "You cross the way the locals do — a hand held up flat at the traffic as if it were a spell, eyes on the far kerb, never on the lights. It works. You are not sure why it works.",
  "A bus's slipstream, a bike's horn, the sodium lights making every distance a guess. You run the last two lanes and stand on the far verge breathing like a man who has been told something.",
];
const _CROSS_NEAR = [
  "A pickup you never saw comes out of the dark lane with no lights on it at all. The wing mirror passes your elbow close enough to feel the paint. He does not slow down. He may not have seen you either.",
  "Halfway across, the gap you read closes — a bike overtaking a truck on the inside, dark, fast, drunk or just Thai. You stop dead on the line between lanes and it goes past both sides of you. Then you finish crossing, badly.",
  "The horn comes after the car, not before. You are on the far kerb by then and only realise how close it was when your hands won't hold the lighter still.",
];
const _CROSS_CLIP = [
  "The last lane, the one you stopped watching: a bike with no headlight takes your hip with its handlebar and you spin onto the verge. The bike wobbles, recovers, and is gone. You get up. Everything works, more or less. Something in the hip disagrees.",
  "A wing mirror — a pickup's, at speed — catches your shoulder and turns you round. You end up sitting on the central reservation with gravel in both palms and the traffic going past a metre from your knees, and you wait there a long time before finishing the crossing.",
];
const _CROSS_HIT = [
  "The gap closes. You have time to see it close — a Vigo, high beams, a driver looking at his phone — and then the road takes the rest of the night.",
  "You never see it. Something big and dark and fast, and the highway does what the highway does to people on foot at this hour.",
];
function _footCrossing(from, to) {
  const pair = (from === "sukhumvit_crossing" && to === "khao_talo_strip") ||
    (from === "khao_talo_strip" && to === "sukhumvit_crossing");
  if (!pair || G.mode === "soi6") return false;
  const late = G.nightTurn >= LAST_BUS_TURN;
  const risk = Math.min(0.45, 0.04 + 0.03 * (G.soc.drunk || 0) + (late ? 0.04 : 0));
  const roll = _rand();
  if (roll < risk) {
    // a hit: the truck, when you're deep in drink or the dice are cruel; else the clip
    if (G.soc.drunk >= 6 || _rand() < 0.4) {
      _say(_pickVary(_CROSS_HIT, "crosshit"), "alert");
      _endNight("roadhit");
      return true;
    }
    G.hurt = (G.hurt || 0) + 1;
    _say(_pickVary(_CROSS_CLIP, "crossclip"), "alert");
    if (G.hurt >= 3) { _endNight("hurt"); return true; }
    return false;
  }
  if (risk >= 0.1 && _rand() < 0.4) _say(_pickVary(_CROSS_NEAR, "crossnear"), "alert");
  else _say(_pickVary(_CROSS_CLEAN, "crossclean"), "dim");
  return false;
}

function _doGo(dirWord) {
  // aliases first; then ANY literal exit key of this room (pub, hotel, …) —
  // the Exits line decorates every key as a tap target, so every key must walk
  const r = _room();
  const dir = _DIRS[dirWord] || (r.exits && r.exits[dirWord] ? dirWord : null);
  // The go-go short-time rooms are up the back staircase the prose keeps
  // mentioning — but you don't just climb it. The mamasan sends you to BARFINE
  // a lady first (only when there's no real `up` exit to honour).
  if ((dirWord === "up" || dirWord === "upstairs" || dir === "up") &&
      r.barType === "soi6" && !(r.exits && r.exits.up)) {
    _say(_pickVary(_GOGO_UPSTAIRS, "gogoup"));
    return;
  }
  if (!dir || !r.exits[dir]) {
    // A hotel room is indoors — the street "no road" pool ("shuttered shophouses,
    // a parked Click") reads as nonsense from a third-floor room. Point at the real
    // way out instead, with the exit(s) as live taps.
    if (typeof _HOTELS !== "undefined" && Object.values(_HOTELS).some(h => h.room === G.room)) {
      _say(`No door that way — the only way out of the room is the stairs. (${
        Object.keys(r.exits).map(d => d.toUpperCase()).join(" · ")})`);
      return false;
    }
    // ALLEY is a real exit key elsewhere (the Metropole's fire stairs), so it
    // reaches the wall handler here — but on a Darkside street with a back
    // door open to you it is the most natural word for the thing you were
    // just told to do. Route it rather than answering "that's a wall".
    if (/^(alley|back|back ?door|side ?door)$/.test(dir) && _lockInDoorHere()) {
      doCommand("round the back");
      return true;
    }
    // indoors gets its own set — see _NO_EXIT_IN
    const _r = _room(), _inside = !!(_r.bar || _r.barType || _r.massage || _r.shop || _isHotelRoom(G.room)) &&
      !(_r.exits && (_r.exits.n || _r.exits.s || _r.exits.e || _r.exits.w));
    const _openAir = _inside && /market|bazaar|food court/i.test(_r.name || "");
    const _pool = _openAir ? _NO_EXIT_OPEN : _inside ? _NO_EXIT_IN : _NO_EXIT;
    _say(_pool[_hh(G.room + ":" + dir, 17) % _pool.length]); // the same wall answers the same way
    // A wall is not an action. Returning false lets the caller skip the tick —
    // the same contract _gameInput uses for "not a move". This mattered: walking
    // into a refusal still advanced the clock AND rolled the dark-room soi dog,
    // so a player probing for the exit out of an unlit soi was bitten for
    // commands the parser had already rejected (thorough-player playtest
    // 2026-08-23: two of three bites, and the night lost at nightTurn 2).
    return false;
  }
  // OUT of a multi-door venue returns you to the road you entered by; any other
  // move invalidates that memory. (Single-door venues: enteredVia === exits.out.)
  const to = (dir === "out" && G.enteredVia) ? G.enteredVia : r.exits[dir];
  G.enteredVia = null;
  if (_footCrossing(G.room, to)) return;   // eight lanes of Sukhumvit, on foot — the night may end here
  // a downpour owns the street: nothing moves except into shelter
  if (G.rain > 0) {
    // …unless you had the sense to buy an umbrella. The rain still owns the
    // buses, the motosais and the mood; it no longer owns your itinerary.
    if (!_sheltered(to) && (G.itemLoc.umbrella === "inventory")) {
      _say(_pickVary([
        "You put the umbrella up. It is instantly the most competent object you own — " +
          "the rain hammers a foot above your head and the street, which belonged to nobody a " +
          "second ago, belongs to you.",
        "Umbrella up, trousers soaked to the knee inside ten steps, and entirely worth it. " +
          "Two girls under one awning watch you go past with open respect.",
        "Under the umbrella the downpour becomes a sound rather than a wall. You walk. " +
          "Everyone still sheltering watches you the way people watch a man who brought the right coat.",
      ], "umbrellaGo"), "dim");
    } else if (!_sheltered(to)) {
      if (_sheltered(G.room)) {
        // room-aware: "the mamasan doesn't look up" printed inside a hotel room
        // (Frank, 2026-08-26 — state-blind flavour)
        _say(_isHotelRoom(G.room)
          ? "You get as far as the window. The soi below has become a shallow " +
            "brown river with motorbikes fording it; the rain is hitting the " +
            "glass sideways. The room, the kettle, and the bed all make the " +
            "same argument, and the argument wins."
          : _inBar()
          ? "You get one step toward the door before the doorway itself talks " +
            "you out of it — a solid moving wall of water where the street used " +
            "to be. The mamasan doesn't even look up. Nobody leaves in this; " +
            "that's what the rain is FOR."
          // a street with a 7-Eleven counts as shelter, but it has no doorway and
          // no mamasan (Colin, round 37: the bar line on the Soi 6 pavement)
          : "You get to the edge of the awning and no further — the street beyond it " +
            "is a moving brown river with a motorbike fording it. Everyone under the " +
            "7-Eleven's lights has made the same decision you're about to make.");
      } else {
        _say("Not in this. The street is a river, the rain is horizontal, and " +
          "the awning above you is the entire habitable world. It can't last " +
          "much longer. Probably.");
      }
      return;
    }
    if (!_sheltered(G.room)) {
      _say("You pick your moment and dive through the doorway, shedding water " +
        "like a soi dog.", "dim");
    }
  }
  // hotel rooms open for their guests only
  const _hotelOf = Object.keys(_HOTELS).find(k => _HOTELS[k].room === to);
  if (_hotelOf && _hotelOf !== G.hotel && _flag("hasWallet")) {
    _say(`The ${_HOTELS[_hotelOf].name} desk takes one practiced look at you: ` +
      "\"Guest, sir?\" Your key card opens a different hotel tonight. The " +
      `smile that follows is kind and absolutely final. (Your room is at the ${_HOTELS[G.hotel].name} — TRAVEL HOME.)`);
    return;
  }
  // gentleman's clubs, most of Soi 6 and the Darkside keep the law's hours and
  // shut at midnight (a Darkside lock-in is the exception — but a bolted door
  // doesn't open for you either way)
  if (_closedNow(to)) { _say(_closedMsg(to)); return; }
  // leaving a lock-in is a one-way door
  if (dir === "out" && G.soc.lockIn && G.soc.lockIn[G.room]) {
    delete G.soc.lockIn[G.room];
    // "no coming back in tonight" is the printed promise. The back-door
    // welcome for a returning face checked which NIGHT you were locked in,
    // not whether you had just walked out of it — so OUT / ROUND THE BACK
    // cycled the door for +2 สนุก a time, uncapped, a free farm to the
    // summit in fifty keystrokes (Stan, round 35). Walking out ends it.
    (G.soc.leftLockIn = G.soc.leftLockIn || {})[G.room] = true;
    _say("The mamasan walks you to the door herself, slides the bolt, and lets " +
      "the night air in for exactly as long as you take to leave. “Goodnight, " +
      "tilac.” The bolt goes back across behind you. Whatever the party becomes " +
      "now, it becomes without you.", "dim");
  }
  // room 412's key card is in the wallet: no wallet, no room. Act One ONLY —
  // this is the opening quest's gate, and it leaked into the expat stage when a
  // harness shortcut skipped the flag (Gordon F6, then Frank got 60 straight
  // all-nighters off it). A resident is past the wallet story by definition.
  if (to === "hotel_room" && !_flag("hasWallet") && !_flag("act1Done")) {
    _say("The night clerk looks up, takes in the sand, the sunburn, the eyes. " +
      "“Key card, sir?” The key card is in your wallet. The wallet is out there " +
      "somewhere in the neon. He spreads his hands, genuinely sorry: no card, " +
      "no room, hotel policy since forever.", "alert");
    _say("(Get the wallet back. The trail is out there — the bar ladies know " +
      "everything that happens in this town.)", "dim");
    return;
  }
  // office door: locked unless the DJ has security singing
  if (to === "oy_office" && !_flag("officeOpen")) {
    if (_flag("sabaiPlaying")) {
      _setFlag("officeOpen");
      _say("Security are mid-chorus with their backs turned and their hearts full. " +
        "You slide behind the bar; the ห้ามเข้า door is unlocked, exactly as Ploy promised.");
    } else {
      _deliver("security", _pickDialogue("security"));
      G.officeTries = (G.officeTries || 0) + 1;   // the guard talks on the second try
      return;
    }
  }
  _arriveAt(to);
}

// Arrival side-effects shared by _doGo and _doTravel: door policy, the room
// description, the light warning, the debt scene, quiz capture, standing
// invitations, street encounters. Everything that happens because you're
// suddenly *here*, however you got here.
function _arriveAt(to) {
  // Soi 6 challenge mode fences you into the soi + its beach — the choke point for
  // walking and fast-travel. MOTOSAI is refused separately in _doMotosai, because
  // both of its arrival paths set G.room directly and never reach here; the bus is
  // refused in _doRideBus. Three exits, three gates — if you add a fourth way to
  // move, gate it too.
  if (G.mode === "soi6" && !SOI6_ROOMS.has(to)) { _say(_pickVary(_SOI6_BOUND, "soi6bound")); return; }
  // A question somebody has put to YOU does not follow you out of the room. It
  // used to: a midnight ejection stranded Barry's ask on the street, where the
  // numbered answer the game had just PRINTED came back "I didn't understand
  // that" — the last-resort line, fired by the game's own affordance
  // (Marguerite, 2026-08-27). Lapse it with a beat; _convoLapsed already brings
  // it back next time you sit with them, so nothing is lost but the dead end.
  if (G.convoQ && to !== G.room && _npcRoom(G.convoQ.id) !== to) {
    const _who = _convoName(G.convoQ.id);
    if (G.convoQ.q) (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q };
    G.convoQ = null; G.convo = null; G.convoIdx = null;
    _say(_fmt("({who}'s question goes unanswered behind you — it will keep.)", { who: _who }), "dim");
  }
  // The Orchid Room is White Dish's members-only back room — the velvet rope only
  // lifts for a friend of the group (Gavin's "doors open for our friends"). Do the
  // errand, earn the standing, get in. It's also the one place Ryan Powers ever is.
  if (to === "orchid_room" && _faction("wdg") < 2) { _say(_pickVary(_ORCHID_BOUNCER, "orchidrope")); return; }
  // sent by Candy, introduced to Rose, or arrived via Doyle's recon — any of the
  // three is a reason the wall has a door in it tonight
  if (to === "orchid_club" && !_flag("orchidSent") && !_flag("orchidVouched") && !_flag("orchidReported")) {
    _say(_pickVary(_ORCHID_CLUB_UNKNOWN, "orchidclubunknown")); return;
  }
  // closed for the night? (also covers fast-travel, which skips the doGo gate)
  if (_closedNow(to)) { _say(_closedMsg(to)); return; }
  // THE FRONT DOOR STAYS SHUT. Even for a face they know — especially for a
  // face they know, because the whole value of the front is that it looks
  // closed from the street, and a farang being admitted through it at one in
  // the morning is the one thing that would spoil it (Mario's call). So they
  // crack it, place him, and send him round the back, where this trade has
  // always been done. Placed after _closedNow (which defers to
  // _lockInWelcome) and before the ban checks — a banned face is still banned.
  if (_lockInWelcome(to)) {
    _say("The front is dark and the shutters are down and the door does not move — and " +
      "then it does, four inches, on a face you half recognise from the other side of a " +
      "bar. A beat while she places you.", "win");
    _say("She does not open it any further. \"Ssst. Not the front, tilac.\" A flick of " +
      "the eyes down the side of the building, and the ghost of a smile. \"Round the " +
      "back, na. You know.\" The four inches close, quietly, and the street is a shut " +
      "shopfront again — which is exactly what the street is supposed to see.");
    _say("(ROUND THE BACK — the alley door, the way it's actually done.)", "dim");
    return;
  }
  // barred from a queer venue (no barType, so the bar-ban block below misses it):
  // the bigotry ejection radios the whole strip for the rest of the night.
  if (_QUEER_ROOMS.includes(to) && G.soc.banned[to] !== undefined) {
    if (G.turns - G.soc.banned[to] < BAN_TURNS) {
      _say("The security guy who waved you in earlier just shakes his head now, slow " +
        "and final. Word travelled the whole strip. Not tonight.", "alert");
      return;
    }
    delete G.soc.banned[to];
  }
  if (ROOMS[to].barType) {
    const b = G.soc.banned[to];
    if (b !== undefined) {
      if (G.turns - b < BAN_TURNS) {
        _say("The doorman's arm comes down like a toll gate, and the head-shake " +
          "is slow and final. Not tonight — or at least not this shift.", "alert");
        return;
      }
      delete G.soc.banned[to]; // shift change; you're merely on notice now
      G.soc.heat[to] = 1;
    }
    if (G.soc.patronBusy[to] === undefined) {
      // Store WHICH girl the regular is attending, not a room-wide boolean — the
      // ambient "laughing beside him" line and the drink-snipe jealousy both read
      // this, and a bare boolean let them name/blame different girls (Gaz
      // playtest, 2026-08-17: the room said Noi, buying Sara triggered "her").
      const hos = Object.keys(NPC_ROLES).filter(x =>
        NPC_ROLES[x] === "hostess" && _npcRoom(x) === to);
      // prefer a girl the room's own prose doesn't feature: the desc may have
      // just put her "in your lap", and this line would seat her with a regular
      // four lines later (fabulist playtest F5, 2026-08-25 — Praewa, both at once)
      const _unfeat = hos.filter(x =>
        !new RegExp("\\b" + NPCS[x].name + "\\b").test(String((ROOMS[to] || {}).desc || "")));
      const _busyPool = _unfeat.length ? _unfeat : hos;
      // …and only where there IS a regular to be jealous: the line printed one
      // command after "the far stools are empty tonight" (Trevor, round 39)
      const _railAt = Object.keys(NPCS).some(rid => NPCS[rid].patron && _npcWhere(rid) === to) ||
        !(typeof _lowSeason === "function" && _lowSeason());
      G.soc.patronBusy[to] = (hos.length && _rand() < 0.4 && _railAt)
        ? _busyPool[Math.floor(_rand() * _busyPool.length)] : false;
    }
  }
  G.room = to;
  if (typeof _stuckReset === "function") _stuckReset(); // you moved: not stuck
  if (typeof _partyArrive === "function") _partyArrive(to); // company makes an entrance of every new door
  if (typeof _fonPour === "function") _fonPour();   // Wednesday, first hour, her bar only
  if (typeof _newbieNudge === "function") _newbieNudge();   // once ever: a number, then the bell
  if (typeof _questHail === "function") _questHail();       // once ever: the first job finds you
  if (typeof _roomSafeBeat === "function") _roomSafeBeat();  // the stash, whenever you get to your room
  if (typeof _dailyJoke === "function") _dailyJoke();        // the unknown number, once a day
  if (typeof _bkkArcTick === "function") _bkkArcTick();      // Sao's texts, on a Bangkok clock
  if (typeof _chamTick === "function") _chamTick();          // the barista's apron selfies, and the slip
  G.sevenAt = null;   // back on the pavement — the next buy walks you in again
  _describeRoom(true);
  _lightNotice(); // walking in with the torch burning gets you clocked
  // walked in during the final half hour — the courtesy warning, and a barfine nudge
  if (_flag("act1Done") && _closesMidnight(to) && G.nightTurn >= 55 && G.nightTurn < 60 &&
      !(G.soc.lockIn && G.soc.lockIn[to])) _lastCall(to);
  // a girl you've built something with greets you by name (once per bar a night).
  // An invite being honoured THIS arrival is its own, bigger recognition scene —
  // both fired back to back ("lights up like payday" twice in a row, Alan
  // playtest 2026-08-17), so the invite consumes the greeting slot.
  const _invHere = G.phone.invite && G.phone.invite.day === G.day &&
    _npcRoom(G.phone.invite.id) === to;
  // A month later, she still knows the face: the one-girl playtest (2026-08-22)
  // came back to "a name and a number" after five nights, three LTs and the ride.
  // Once per girl per vacation — a beat and a small head start, not the old ledger.
  const back = G.prevBond && _npcsHere().find(n => NPC_ROLES[n] === "hostess" &&
    G.prevBond[n] >= 2 && !(G.returned && G.returned[n]));
  if (back && ROOMS[to].barType) {
    (G.returned = G.returned || {})[back] = true;
    (G.soc.greeted = G.soc.greeted || {})[to] = true;
    _addBond(back, G.prevBond[back] >= 3 ? 4 : 2);
    _say(_pickVary([
      `${NPCS[back].name} looks up, and it takes her a second — then the whole face changes. ` +
        `"You come BACK!" She is round the rail before the mamasan can say anything, both hands on ` +
        `your arm, checking you're real. "I think maybe you forget. I think maybe everybody forget."`,
      `A stool scrapes. ${NPCS[back].name} has seen you from the far end and is not pretending ` +
        `otherwise. "Ohhh. Tilac. You COME." She says it twice more on the way over, and your seat ` +
        `— it is still, somehow, your seat — is wiped without a word.`,
      `${NPCS[back].name} stops with a tray in her hands. "You." Not the bar voice. "How long you ` +
        `gone? One month? More?" She knows exactly how long. "I keep your seat one week, then I ` +
        `stop keep. Now I keep again, na."`,
    ], "returnGreet"), "win");
  } else if (ROOMS[to].barType && !(G.soc.greeted && G.soc.greeted[to]) && !_invHere) {
    const party = (G.party && G.party.ids) || [];   // she's on your arm — she doesn't "spot you across the room"
    const her = _npcsHere().filter(n => NPC_ROLES[n] === "hostess" && !party.includes(n))
      .sort((a, b) => _bondTier(b) - _bondTier(a))[0];
    if (her && _bondTier(her) >= 1) { (G.soc.greeted = G.soc.greeted || {})[to] = true; _relGreeting(her); }
  }
  _repArrival(); // your street name precedes you at a stranger bar (notable tiers only)
  _managerWelcome(); // a bar manager stands you the house's first shot (once/bar/night)
  if (typeof _priewReveal === "function") _priewReveal(); // the hospital mirage, scene two (once ever)
  _amuletNotice();   // a piwin reads the amulet you are wearing (once ever)
  _nokAmulet();      // Auntie Nok sees what you are wearing
  // the partnerTan route comes due: he said he'd ask, and this is him asking
  // the deposit: the one moment the money has to actually exist
  if (typeof _barDepositDue === "function" && _barDepositDue()) { _barDeposit(); }
  if (typeof _tanFavourDue === "function" && _tanFavourDue()) { _tanFavour(); return; }
  // procurement: a name on a list was free, the cleaning contract is not
  if (typeof _shiftDue === "function" && _shiftDue()) { _shiftAsk(); return; }
  if (typeof _synDue === "function" && _synDue()) { _synAsk(); return; }
  // and if you've stayed outside it, the weather at your own bar changes
  if (typeof _synFrictionTick === "function") _synFrictionTick();
  // your own bar tells you it's yours, and what the two owner verbs are
  if (typeof _barOwnerNudge === "function") _barOwnerNudge();
  // the anti-Simon machine: when the book gets heavy, the town catches you.
  // Candy settles it at whichever of her bars she's working tonight.
  if (G.hotelDebt >= 800 && !_flag("tabSettled") &&
      (G.room === "stinky_bar" || G.room === _npcRoom("candy"))) {
    _setFlag("tabSettled");
    const owed = G.hotelDebt;
    G.hotelDebt = 0;
    if (G.room === "stinky_bar") {
      _say("Bert refills without being asked. \"Night clerk at your hotel rang " +
        "around about a farang on the book,\" he says, racking the balls. " +
        `\"It's handled, bud. ฿${owed}, squared.\" He won't discuss it further ` +
        "and won't take it back. \"You buy the next man's beer. That's the " +
        "whole system.\"", "win");
    } else {
      _say("Candy sets your glass down and, with it, a folded receipt from your " +
        `hotel — ฿${owed}, marked PAID in the clerk's careful hand. \"Everybody's ` +
        "problems come to Candy,\" she says, already looking past you at the " +
        "soi. \"Even the ones you don't bring. You get famous when you owe " +
        "money, tilac. Be famous for something else.\"", "win");
    }
  }
  // quiz night: walk in during the window and the microphone finds you
  if (_quizHere()) { _startQuiz(); return; }
  // a standing invitation, honoured: she said come, and you came
  const inv = G.phone.invite;
  if (inv && inv.day === G.day && _npcRoom(inv.id) === G.room) {
    G.phone.invite = null;
    _addBond(inv.id, 1);
    (G.soc.greeted = G.soc.greeted || {})[G.room] = true; // this IS tonight's greeting
    _say(`${NPCS[inv.id].name} spots you from across the room and her whole evening ` +
      "visibly reorganises itself around your arrival — the kept seat is produced, a " +
      "cold towel appears, and for one whole minute you are the only customer who has " +
      "ever existed. Showing up counts double in this town.", "win");
    _addHappy(2);
  }
  _maybeEncounter();
}

// ── Fast travel ────────────────────────────────────────────────────────────
// TRAVEL <bar|hotel>: autopilot to any bar (or your own hotel) you've stood
// in before. Costs exactly what walking would — the BFS hop count in turns,
// each paying full _tick — so it saves keystrokes, never time. Rain still
// owns the street, and the night can end (or a bar encounter corner you)
// mid-walk, same as walking by hand.

// The route itself, not just its length — TRAVEL walks it room by room so that
// an interruption (an encounter, a game, the dawn) leaves you WHERE YOU GOT TO
// rather than back where you started. Before this, a stopped 6-hop walk charged
// six turns and put you back in the bar you left, which read as the journey
// having both happened and not happened (actuary playtest 2026-08-23).
// Same BFS as _hops; returns the list of rooms after `from`, ending at `to`.
function _path(from, to) {
  if (from === to) return [];
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    const nbrs = Object.values(ROOMS[cur].exits || {}).concat(ROOMS[cur].venues || []);
    for (const nxt of nbrs) {
      if (prev[nxt] !== undefined) continue;
      prev[nxt] = cur;
      if (nxt === to) {
        const out = [];
        for (let n = to; n && n !== from; n = prev[n]) out.unshift(n);
        return out;
      }
      q.push(nxt);
    }
  }
  return null;
}

function _hops(from, to) {
  if (from === to) return 0;
  const seen = { [from]: 0 };
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    // exits AND venues: in the migrated-geography rooms (all of Soi 6, plus ~16
    // full-game rooms) a bar's door lives in its host street's `venues` list, not
    // in `exits` — so a BFS over exits alone can leave the street but never reach a
    // bar, making TRAVEL/GO find zero destinations. Treat venues as edges too.
    const nbrs = Object.values(ROOMS[cur].exits || {}).concat(ROOMS[cur].venues || []);
    for (const nxt of nbrs) {
      if (seen[nxt] !== undefined) continue;
      seen[nxt] = seen[cur] + 1;
      if (nxt === to) return seen[nxt];
      q.push(nxt);
    }
  }
  return null;
}

function _travelDests() {
  // never offers where you already stand — a zero-turn trip isn't a trip
  const out = Object.keys(G.visited).filter(id =>
    id !== G.room && ROOMS[id] && ROOMS[id].bar);
  // your hotel needs no discovering — knowing where you sleep is the premise
  const home = _hotelRoomId();
  if (home !== G.room) out.push(home);
  return out;
}

function _doTravel(arg) {
  const w = (arg || "").toLowerCase().replace(/^to (the )?/, "").trim();
  const dests = _travelDests();
  if (!w) {
    // Only list places actually reachable on foot from here — at a dead-end like
    // the Sukhumvit crossing every hop is null, so the header would otherwise sit
    // above an empty list.
    const rows = dests.map(id => [id, _hops(G.room, id)]).filter(([, h]) => h !== null);
    if (!rows.length) {
      _say("You don't know the way anywhere from here yet. Places join the list once you've stood in them.");
      return;
    }
    _say("You know the way to:", "dim");
    for (const [id, h] of rows)
      _say(`  ${_barName(id)} — ${h} turn${h === 1 ? "" : "s"}`, "dim");
    _say("(TRAVEL <place>. Walking pace — no shortcuts through the clock.)", "dim");
    return;
  }
  // Already standing in it — a venue's own name, tapped from inside it, must not
  // route anywhere. Check the CURRENT room before any hotel/destination match, or
  // "Queen Vic Inn" (the pub) resolves to "Your Room — Queen Vic Inn" and walks you
  // upstairs. (The later !dest branch keeps this for the never-found case.) EXACT
  // match only here: a loose/substring match would let a numbered sibling venue
  // ("Candy Bar 2") swallow a query for its own un-numbered twin ("Candy Bar") —
  // Reg the publican caught this from inside the "2" (2026-08-30). The substring
  // fallback still runs below, once no OTHER known venue matches exactly.
  const _here0 = _room();
  const _hereExact = (r) => (r.bar && _pnm(r.bar) === _pnm(w)) || _pnm(r.name) === _pnm(w);
  const _hereLoose = (r) => (r.bar && _pnm(r.bar).includes(_pnm(w))) || _pnm(r.name).includes(_pnm(w));
  if (_hereExact(_here0)) { _say("You're standing in it."); return; }
  const home = _hotelRoomId();
  let dest = null;
  // "home"/"my room"/etc. always mean your room.
  if (/^(hotel|my room|your room|home|room)$/.test(w)) dest = home;
  // An EXACT name match among known destinations outranks the room you're
  // standing in, so "candy bar" from inside "Candy Bar 2" resolves to the real
  // Candy Bar rather than being swallowed by its own numbered sibling.
  if (!dest) {
    // An exact name match wins — unless it's the OTHER branch. "Cheap
    // Charlie's" is the exact name of the Buakhao original and a prefix of
    // "Cheap Charlie's (Jomtien)", so from one room away in Jomtien the exact
    // branch walked 19 turns to Buakhao (Malcolm, round 36). A namesake in
    // your own region outranks an exact match in somebody else's.
    const here = _room().region;
    const exact = dests.filter(id => id !== home && ROOMS[id] &&
      ((ROOMS[id].bar && _pnm(ROOMS[id].bar) === _pnm(w)) || _pnm(ROOMS[id].name) === _pnm(w)));
    const namesake = dests.filter(id => id !== home && ROOMS[id] && ROOMS[id].region === here && !exact.includes(id) &&
      ((ROOMS[id].bar && _pnm(ROOMS[id].bar).startsWith(_pnm(w))) || _pnm(ROOMS[id].name).startsWith(_pnm(w))));
    const local = exact.find(id => ROOMS[id].region === here) || namesake[0];
    dest = local || exact[0] || null;
  }
  // Only now fall back to a loose match on the room you're standing in — the
  // Queen Vic Inn case ("queen vic" typed inside the pub, loosely matching both
  // it and "Your Room — Queen Vic Inn") lands here with no exact dest above it.
  if (!dest && _hereLoose(_here0)) { _say("You're standing in it."); return; }
  // Then a visited venue by name — bars first, and skip the home room here so the
  // Queen Vic *pub* wins over "Your Room — Queen Vic Inn" (both contain "queen vic
  // inn"); the room is reachable via the keywords above and the hotel-name match below.
  if (!dest) {
    // Two Cheap Charlie's, two Candy Bars, two Sundowners: among loose matches
    // the one in YOUR region wins, else the nearest. ENTER CHEAP CHARLIE'S from
    // one room away in Jomtien walked 19 turns to the Buakhao original
    // (Malcolm, round 36).
    const loose = dests.filter(id => id !== home && ROOMS[id] &&
      ((ROOMS[id].bar && _pnm(ROOMS[id].bar).includes(_pnm(w))) || _pnm(ROOMS[id].name).includes(_pnm(w))));
    const here = _room().region;
    loose.sort((a, b) => ((ROOMS[b].region === here) - (ROOMS[a].region === here)) ||
      ((_hops(G.room, a) ?? 999) - (_hops(G.room, b) ?? 999)));
    if (loose.length) dest = loose[0];
  }
  // Finally the hotel's own name (so "travel sabai palms" works) — after venues,
  // so a same-named pub isn't shadowed by the hotel you happen to sleep in.
  if (!dest && _pnm(_HOTELS[G.hotel].name).includes(_pnm(w))) dest = home;
  // "travel home" while standing in your room: the keyword branch resolves before
  // the standing-in-it check can, so catch the zero-hop self-trip here.
  if (dest === G.room) { _say("You're standing in it."); return; }
  if (!dest) {
    const here = _room();
    if ((here.bar && _pnm(here.bar).includes(_pnm(w))) ||
        _pnm(here.name).includes(_pnm(w))) {
      _say("You're standing in it.");
      return;
    }
    // "go round the back" / "go to the back door" — the natural phrasings for
    // the thing the lock-in's own hint just told him to do. GO reaches here
    // before the ROUND/BACK verb case ever sees it, so route it across.
    if (/round\s*(the\s*)?back|back\s*door|backdoor|alley|side\s*door/.test(_pnm(w) + " " + w) && _lockInDoorHere()) {
      doCommand("round the back");
      return;
    }
    // the journal just NAMED a bar TRAVEL then refused (Frank, round 38), and ENTER
    // from inside a bar was refused for a bar on the same soi (Dex): say where it is
    {
      const _bn2 = x => String(x || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      const wq = _bn2(w);
      const named = wq && Object.keys(ROOMS).find(id => ROOMS[id].bar && (_bn2(ROOMS[id].bar).includes(wq) || wq.includes(_bn2(ROOMS[id].bar))));
      if (named) {
        const outside = _room().exits && _room().exits.out;
        if (outside && (ROOMS[outside].venues || []).includes(named))
          _say(`${_barName(named)} fronts the same soi as this bar — OUT, then ENTER ${_barName(named).toUpperCase()}.`);
        else
          _say(`${_barName(named)} is over in ${ROOMS[named].region} — you haven't found it yet, and TRAVEL only ` +
            "knows the places you've been. Walk it, or a MOTOSAI to the district.");
        return;
      }
    }
    _say("You only know the way to bars and hotels you've already found. (Bare TRAVEL lists them.)");
    return;
  }
  if (G.rain > 0) {
    _say("Not in this. The whole town is under the awnings waiting it out, and " +
      "so are you.");
    return;
  }
  if (dest === "hotel_room" && !_flag("hasWallet") && !_flag("act1Done")) {
    _say("No key card, no room — the clerk was politely immovable about it. The wallet first.");
    return;
  }
  const hops = _hops(G.room, dest);
  if (hops === null) {
    // "You can't get there from here" is TRUE and says nothing (Gerry, round
    // 34). The places TRAVEL can't reach are the ones across the highway — the
    // Darkside and the lake — and they are motosai-only on purpose: the fare
    // is the only thing that makes them feel like the different country the
    // prose keeps calling them. So the refusal keeps the rule and names the
    // ride, by finding a motosai stop that CAN walk to where you asked for.
    const ride = typeof MOTOSAI_DESTS !== "undefined" && Object.keys(MOTOSAI_DESTS)
      .find(k => MOTOSAI_DESTS[k].room === dest || _hops(MOTOSAI_DESTS[k].room, dest) !== null);
    if (ride) {
      const _q = _motoFare(MOTOSAI_DESTS[ride], true), _qNow = _motoFare(MOTOSAI_DESTS[ride]);
      _say(_fmt("No walking route to {v} — that side is across Sukhumvit, and nobody walks " +
        "Sukhumvit. The bikes do it in twenty minutes. (MOTOSAI TO {r} — ฿{p}" +
        "{late})", { v: _barName(dest) || ROOMS[dest].name, r: ride.toUpperCase(),
          p: _q, late: _qNow > _q ? `, ฿${_qNow} at this hour` : "" }), "dim");
      return;
    }
    _say("You can't get there from here — no route you know, on foot or otherwise.");
    return;
  }
  // Don't spend the whole walk to arrive at shutters, or walk into the dawn
  // (expat playtest 2026-08-22: eleven turns to a bolted Orchid; 22 turns to a
  // hotel with 22 left in the night).
  if (typeof _closesMidnight === "function" && _closesMidnight(dest) && !(typeof _lockedIn === "function" && _lockedIn(dest)) &&
      G.nightTurn + hops >= 60 && G.nightTurn < NIGHT_TURNS) {
    _say(_fmt("{v} shuts at midnight — {n} turns of soi from here puts you at its shutters. " +
      "Somewhere that's still open, or a MOTOSAI.", { v: _barName(dest), n: hops }), "dim");
    return;
  }
  if (G.nightTurn + hops >= NIGHT_TURNS) {
    // …but not a motosai in the challenge, where you made yourself a rule and the
    // piwins are part of what you gave up (Soi 6 completionist, 2026-08-29:
    // recommended the one vehicle the mode refuses).
    _say(_fmt(G.mode === "soi6"
      ? "That's {n} turns of soi and the night hasn't got {n} left — you'd be walking into the " +
        "dawn. One street, you said. Make your peace with where you are."
      : "That's {n} turns of soi and the night hasn't got {n} left — you'd be walking into " +
        "the dawn. A MOTOSAI, or make your peace with where you are.", { n: hops }), "alert");
    return;
  }
  _say(hops === 1
    ? _fmt("You point yourself at {v} and let your feet do the remembering — " +
        "one turn of soi, neon, and shortcuts.", { v: _barName(dest) })
    : _fmt("You point yourself at {v} and let your feet do the remembering — " +
        "{n} turns of soi, neon, and shortcuts.", { v: _barName(dest), n: hops }), "dim");
  // walking pace: hops turns in total; doCommand pays the last at the bottom.
  // Move along the real route as you go, so being stopped partway leaves you
  // partway — not back at the door you set out from.
  const startDay = G.day, g0 = G;
  const route = _path(G.room, dest) || [];
  for (let i = 0; i < hops - 1; i++) {
    if (route[i] && _footCrossing(G.room, route[i])) return;   // TRAVEL walks the real route, highway included
    if (route[i]) G.room = route[i];   // a step of actual soi, quietly walked
    _tick();
    if (G !== g0) return; // an Act One dawn mid-walk rebuilt the world (same-day reset — see _doWait)
    if (G.day !== startDay || G.over) return; // the night ended mid-walk
    if (G.pendingEnc || G.game) {
      _say(`(${_clockStr()} — you've got as far as ${_barName(G.room) || _room().name} ` +
        "and the street has other plans.)", "dim");
      return;
    }
  }
  // same contract as ENTER: remember which road you actually walked in from,
  // so OUT of a venue fronting more than one road (Take Care Me, on the
  // Jomtien/Thappraya corner) returns you to where you really were, not
  // wherever its static exits.out happens to point (Cartographer, 2026-08-27).
  G.enteredVia = G.room;
  _arriveAt(dest);
}

// Venue-name comparison, apostrophe-proof: _norm strips quotes from typed input,
// so "cheap charlies" must match "Cheap Charlie's" — normalize BOTH sides.
// (Playtest 2026-08-17: the room's own "(ENTER <name>)" hint failed on exactly
// this bar and fell through to TRAVEL's "you only know the way to…".)
// Also collapse articles: doCommand strips "a/an/the" as filler, so the typed
// side of "Hyper A Go-Go" arrives as "hyper go-go" — the NAME side must shed
// its articles too or the venue is unenterable by its own printed name
// (caught by the enumerate-every-doorway test, 2026-08-17).
function _pnm(s) {
  return (s || "").toLowerCase().replace(/['\u2019]/g, "")
    .replace(/\b(?:a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();
}

// A venues[] door skips _doGo entirely (it calls _arriveAt directly), so it
// also skipped _doGo's rain arrival flavor ("shedding water like a soi dog")
// — a venue is always shelter (_sheltered checks .bar), so there's nothing to
// BLOCK, but the dash-through-the-downpour beat was silently missing for
// every migrated door. Mirrors _doGo's unsheltered→sheltered print.
function _rainDiveIn() {
  if (G.rain > 0 && !_sheltered(G.room)) {
    _say("You pick your moment and dive through the doorway, shedding water " +
      "like a soi dog.", "dim");
  }
}

function _doEnter(arg) {
  const r = _room();
  // digits → the safe
  const asThai = parseThaiDigits(arg.replace(/\s/g, ""));
  const asNum = /^\d+$/.test(arg) ? parseInt(arg, 10) : asThai;
  if (asNum !== null && !Number.isNaN(asNum) && arg) return _doSafe(asNum);
  if (!arg) {
    // bare ENTER: the obvious single door, else the old `in`, else ask which
    if (r.venues && r.venues.length === 1) { G.enteredVia = G.room; _rainDiveIn(); return _arriveAt(r.venues[0]); }
    if (r.exits && r.exits.in) return _doGo("in");
    if (r.venues && r.venues.length) {
      _say("Which one? " + r.venues.map(id => ROOMS[id].bar || ROOMS[id].name).join(", ") + ".");
      return;
    }
    return _doGo("in");
  }
  const w = arg.toLowerCase();
  // a building fronting this block (migrated road node): enter it by name, and
  // remember which door you came in by so OUT returns you to that road.
  if (r.venues) {
    for (const id of r.venues) {
      const v = ROOMS[id];
      if ([v.bar, v.name].filter(Boolean).some(s => _pnm(s).includes(_pnm(w)))) {
        G.enteredVia = G.room;
        _rainDiveIn();
        return _arriveAt(id);
      }
    }
  }
  // legacy (un-migrated districts): a named bar still sits on a compass exit
  for (const [dir, to] of Object.entries(r.exits)) {
    const target = ROOMS[to];
    if (target.bar && _pnm(target.bar).includes(_pnm(w))) return _doGo(dir);
    if (_pnm(target.name).includes(_pnm(w))) return _doGo(dir);
  }
  if (/7.?eleven|seven.?eleven|\b7-11\b/.test(w) && _room().seven) {
    _say("You step into the 7-Eleven — the doorbell, the aircon, the glow. (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM · CHARGE PHONE)", "dim");
    return;
  }
  _doTravel(w); // not adjacent — maybe it's somewhere you know the way to
}

function _doSafe(num) {
  if (_isHotelRoom(G.room)) {
    _say(_flag("act1Done")
      ? "Your own room safe, the size of a shoebox: passport, the spare card, a folded " +
        "receipt. The emergency stash went into your pocket the night you finally got " +
        "home, and nothing in here has been worth a keypad since."
      : "A hotel room safe, the size of a shoebox. Not yours yet — nothing in this room is, until you've got your wallet back.");
    return;
  }
  if (G.room !== "oy_office") { _say("There's no keypad here."); return; }
  if (_flag("hasWallet")) { _say("The safe hangs open and empty. You've pushed your luck far enough."); return; }
  if (num === SAFE_PIN) {
    _say(`You press ${thaiDigits(SAFE_PIN)} — the number from the poster, and the ` +
      "lucky nine. A pause. A clunk that sounds like forgiveness. The safe swings open.");
    G.itemLoc.wallet = "inventory";
    _setFlag("hasWallet");
    G.money += WALLET_CASH;
    _say(`(You take your wallet. Most of the cash is still in it — ฿${WALLET_CASH} back in ` +
      "play — and there's a note inside, worth reading.)", "dim");
  } else {
    G.safeTries++;
    if (G.safeTries >= 3) {
      G.room = "tt_deep";
      G.safeTries = 0;
      _say("A third wrong code. Somewhere a buzzer buzzes. Two security guys appear " +
        "with the calm of men who enjoy their work, walk you out through the bar, " +
        "and deposit you in the lane with impeccable politeness.", "alert");
      _addHappy(-2);
      _describeRoom(true);
    } else {
      _say("The keypad blinks red. " + (G.safeTries === 2 ?
        "It feels like one more wrong try would be a mistake." :
        "Nothing happens. Yet."));
    }
  }
}

const _ALREADY_HAVE = [
  "You already have {it}. Taking it twice would be greedy and, more to the point, impossible.",
  "You have {it} on you already. You pat the pocket to check, which is how everybody checks.",
  "Got it already \u2014 {it}, right where you put it.",
];
function _doTake(arg) {
  if (!arg) { _say("Take what?"); return; }
  // TAKE WATER in your room pulls a free bottle from the minibar (not an item —
  // it goes straight down, like a bought one, and cuts thirst).
  if (/water|\bnam\b/.test(arg) && _isHotelRoom(G.room)) { _takeFridgeWater(); return; }
  if (_isDarkHere()) { _say("You grope around in the dark and find nothing but regret. (LIGHT ON)"); return; }
  const id = _findItem(arg, "room");
  if (!id) {
    // Already in your pocket. Checked BEFORE the advertised-fixture branch, which
    // owns words like "bottle" and was answering "that's fixtures, not luggage;
    // the bar would notice" about a Leo bottle the player was carrying on an
    // empty beach (persona report A#14, 2026-08-23).
    const held = _findItem(arg, "inventory");
    if (held) {
      _say(_fmt(_pickVary(_ALREADY_HAVE, "alreadyhave"), { it: ITEMS[held].name }));
      return;
    }
    // a fixture the room ADVERTISES (a reads: noun, e.g. the Queen Vic dartboard)
    // exists — it just isn't luggage. Denying it's here reads as a bug.
    const _advertised = (() => {
      try {
        const esc = arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("\\b" + esc + "s?\\b", "i").test(stripMarkup(_room().desc || ""));
      } catch (e) { return false; }
    })();
    // A generic _SCENERY noun (poster, sticker, ceiling…) answers EXAMINE
    // anywhere it plausibly fits, without needing the room's own prose to say
    // the word — but TAKE's "advertised" check only scanned that prose, so
    // EXAMINE POSTER could describe one and TAKE POSTER call it a bare
    // contradiction in the same room (verb-auditor playtest, 2026-08-23).
    const _sceneryHere = (() => {
      const s = _sceneryMatch(arg);
      if (!s) return false;
      const ctx = _sceneryCtx();
      return s.fn ? !!s.fn(ctx) : !!(s.lines[ctx] || (ctx === "pub" && s.lines.bar) || s.lines.any);
    })();
    if (/bottle/.test(arg) && !_inBar()) {
      _say("No bottle worth the bending here tonight — they come and go with the drinkers and the tide."); return;
    }
    if ((typeof _roomRead === "function" && _roomRead(arg, true)) || _advertised || _sceneryHere) {
      _say(_inBar() ? "That's fixtures, not luggage. It stays; the bar would notice."
        : "That's part of the place, not something you carry off. It stays.");
      return;
    }
    _say("You don't see that here."); return;
  }
  const it = ITEMS[id];
  if (!it.portable) { _say(it.name === "marigold offering" ?
    "Taking a shrine offering? With YOUR luck tonight?" :
    "That's staying where it is."); return; }
  G.itemLoc[id] = "inventory";
  if (G.dropped) delete G.dropped[id]; // no longer on a floor
  _say(`Taken: ${it.name}.`);
}

// The in-room minibar: housekeeping leaves two free bottles of water a day.
// Lazy restock — reconcile the day whenever the fridge is opened or a bottle is
// taken, so it refills at the day rollover without a hook in the morning routine.
function _fridgeStock() {
  if (G.fridgeDay !== G.day) { G.fridgeWater = 2; G.fridgeDay = G.day; }
}
function _doFridge() {
  if (!_isHotelRoom(G.room)) {
    _say("No fridge out here — you'd have to be back in your room for that.");
    return;
  }
  _fridgeStock();
  if (G.fridgeWater > 0) {
    _say(`The mini-fridge hums in the corner. Inside, on the house: ${G.fridgeWater} cold ` +
      `bottle${G.fridgeWater > 1 ? "s" : ""} of water — housekeeping leaves two fresh every ` +
      "day. (TAKE WATER.)");
  } else {
    _say("The mini-fridge hums, empty but for the cold: you've had today's two free bottles. " +
      "Housekeeping refills it tomorrow. (Any 7-Eleven sells more in the meantime.)");
  }
}
function _takeFridgeWater() {
  _fridgeStock();
  if (G.fridgeWater <= 0) {
    _say("The fridge is out of water until tomorrow's restock — you've had your two free " +
      "today. (A 7-Eleven has more.)");
    return;
  }
  G.fridgeWater--;
  G.thirst = Math.max(0, G.thirst - 45);
  _say(`You crack a cold bottle from the mini-fridge and drink it down — free, and never more ` +
    `welcome than when you're this dry. (${G.fridgeWater} free bottle${G.fridgeWater === 1 ? "" : "s"} ` +
    "left today.)");
}

function _doDrop(arg) {
  // DROP ALL used to drop... your wallet, and only your wallet: substring
  // matching found "all" inside "w-ALL-et" (veteran playtest, 2026-08-17 —
  // "comedy-grade data loss"). ALL gets a voiced refusal; a Pattaya pocket
  // is not a Zork trophy case.
  if (/^(all|everything)$/.test(arg)) {
    _say("Everything, on the floor of a Pattaya bar? The pockets decline as one. " +
      "One thing at a time, and think hard about the wallet.");
    return;
  }
  const forced = /\b(anyway|really|force|for real|yes)\b/.test(arg);
  const target = arg.replace(/\b(anyway|really|force|for real|yes)\b/g, " ").replace(/\s+/g, " ").trim();
  const id = _inv().find(i => ITEMS[i].name.toLowerCase().includes(target) ||
    ITEMS[i].aliases.some(a => a.includes(target)));
  if (!id) { _say(_pickVary(_NOT_CARRYING, "notcarry")); return; }
  if (id === "masseuse_note") {
    const nm = G.offShift ? G.offShift.name : "her";
    G.itemLoc.masseuse_note = null; G.offShift = null;
    _say(`You bin ${nm}'s number — a beer mat in a wastebasket somewhere on the soi. Some roads you don't walk.`);
    return;
  }
  // A quest/clue item is not litter — dropping one can strand a job (or, for the
  // wallet, the whole night). Strong warning + a confirm gate; DROP <it> ANYWAY
  // overrides. And wherever it lands, QUESTS shows you where (see _doQuests) so
  // it's never truly lost — the anti-softlock rule, applied to your own pockets.
  if (ITEMS[id].keepsafe && !forced) {
    const w = id === "wallet"
      ? "Your WALLET? The one thing this entire night is about? Put it down on a bar " +
        "floor and you are playing tonight twice."
      : `${ITEMS[id].name} is tied to a job you're carrying — set it down and you'll be ` +
        "walking back for it, or worse.";
    _say(w + ` (DROP ${(ITEMS[id].aliases[0] || arg).toUpperCase()} ANYWAY if you're sure.)`, "alert");
    return;
  }
  G.itemLoc[id] = G.room;
  if (ITEMS[id].keepsafe) (G.dropped = G.dropped || {})[id] = true; // QUESTS tracks it
  _say(`Dropped: ${ITEMS[id].name}.` +
    (ITEMS[id].keepsafe ? " (It's on the floor here — QUESTS will remind you where.)" : ""));
}

// The masseuse's number reads dynamically (it names whoever wrote it), so READ
// and EXAMINE both route here rather than printing the static item desc.
function _readNote() {
  const os = G.offShift;
  _say(os ? `${os.name}'s number, biro'd on a soggy beer mat — under it, underlined twice: “my place.” ` +
    `She finishes work late; the offer was for after. (MEET her when the night's old — or DROP it and let it go.)`
    : "A beer mat, a phone number smeared past reading. Whoever wrote it, that road's closed now.", "dim");
}

function _doInventory() {
  const inv = _inv();
  _say(`฿${G.money} · phone ${G.battery}%${G.lightOn ? " (flashlight on)" : ""} · ` +
    `${_clockStr()} day ${G.day} · hunger ${G.hunger} · thirst ${G.thirst}`, "dim");
  const carried = inv.map(id => _L(ITEMS[id].name));
  // Protection is carried, not a placed item — surface it here so a player can
  // see the three they start the week with (and when they've run out).
  if (G.condoms > 0) carried.push(_fmt("{c} condom{s}", { c: G.condoms, s: _plural(G.condoms) }));
  _say(carried.length ? _L("You are carrying: ") + carried.join(", ") + "." :
    _L("You are carrying nothing but experience."));
}

// Readable fixtures a room advertises in its prose — menus, tap boards, cheeky
// notices, price lists. A room's `reads: { menu|board|poster|sign: "flavor" }`
// backs them; READ <noun> and EXAMINE <noun> both surface it. Pattaya signage is
// English, so no printed-Thai here — the Thai-script directional signs stay on the
// separate `sign`/SIGNS path (a room with a real Thai sign won't set reads.sign).
const _READ_NOUNS = {
  menu: ["card", "menus", "price list", "prices", "price board"],
  alley: ["lane", "side alley", "the alley"],
  beach: ["sea", "bay", "water", "gulf", "the beach", "the sea"],
  // the one `reads.board` in the game is Myth Night's DJ request sheet — the
  // tap-list aliases went with the craft-beer bars that never existed there
  board: ["chalkboard", "blackboard", "clipboard", "slip", "request", "requests", "request sheet"],
  poster: ["flyer"],
  // "fridge" rides the photos key because the one room that authors both has
  // them on the same object — the Sundowner's fridge IS the photo wall, so a
  // player who examines either gets the story (Wes, round 33). Harmless in the
  // other photos rooms: a fridge they don't have is a noun nobody types there.
  photos: ["photo", "photograph", "photographs", "picture", "pictures", "wall of photos", "portrait", "fridge"],
  sign: ["notice", "placard", "arrows", "arrow", "signage"],
  // the Shamrock's darts-and-fixtures wall (renamed from `board`, whose aliases
  // were all DJ-sheet words — the authored elegy was unreachable by any noun a
  // player would type; critic playtest 2026-08-22)
  fixtures: ["fixtures list", "list of fixtures", "darts", "dartboard", "dart board", "season"],
  jukebox: ["juke"],
  // the night bazaar's stalls — the room advertises five kinds of tat by name
  // and, until these were registered, only the frogs answered to a close look
  singlet: ["singlets", "chang singlet", "chang singlets", "vest", "vests", "tank top"],
  shirt: ["shirts", "football shirt", "football shirts", "fake shirts", "fake football shirts", "kit", "kits"],
  phonecase: ["phone case", "phone cases", "phonecases", "cases"],
  trousers: ["trouser", "elephant trousers", "elephant-print trousers", "elephant pants", "fisherman pants"],
  cloth: ["bolts", "bolts of cloth", "fabric", "material", "textiles"],
  crane: ["cranes", "origami", "napkin", "napkins"],
  cherries: ["cherry"],
  card: ["show times", "showtimes", "show-times"],
  // A room may author its own shrine (the beach spirit house at jomtien_beach_s3);
  // bars with no `reads.shrine` still fall through to _doScenery's bar-shrine prose.
  shrine: ["spirit house", "spirit-house", "spirithouse"],
  // 2026-08-14 examine-audit: distinctive one-room objects (the Night Heron's
  // clock, The Bucket's bucket, the dead market) opt in via reads; rooms
  // without the key fall through to scenery/brush-off as before.
  clock: ["wall clock"],
  bucket: ["sand bucket", "ice bucket"],
  market: ["old market", "market block"],
  // The singleton-tail pass: distinctive one-room props. A key here does nothing
  // until a room's `reads:` opts in, so generic words are safe to register.
  shelf: ["back shelf", "shrine shelf"],
  gecko: ["lizard"],
  guitar: ["acoustic"],
  bee: ["plywood bee"],
  bird: ["painted bird"],
  dragon: ["gold dragon"],
  blender: [],
  jar: ["jars", "tip jar", "mason jars"],
  wheel: ["ship's wheel", "ships wheel", "floats"], // barometer got its own Anchor entry (playtest 2026-08-22)
  barometer: ["glass", "brass barometer"],
  horseshoe: ["horseshoes", "clover", "clovers"],
  bullseye: ["bulls-eye", "bulls eye"],
  trophies: ["trophy", "trophy shelf"],
  skunk: ["cartoon skunk"],
  rabbit: ["white rabbit", "neon rabbit"],
  frog: ["frogs", "wooden frog"],
  certificate: ["diploma"],
  crocodile: ["croc", "spit"],
  keys: ["numbered keys", "ring of keys"],
  recliner: ["lounger"],
  door: ["forbidden door"],
  "mirror ball": ["disco ball", "mirrorball"],
  table: ["good table", "best table"],
  notebook: ["spiral notebook", "biro"],
  hatch: ["serving hatch", "ply", "plywood"],
};
// A reads value is a plain string, or an ARRAY of gated nodes {req, notFlags,
// text, sets?, reveal?} resolved first-match like dialogue — so a close look can
// change once you know things (the Orchid's good table pre/post the recon), and
// exactly one fixture in the game can give something up (reveal: itemId places
// the hidden item in the room; TAKE does the rest). Side effects are idempotent
// on purpose: _doExamine truthy-checks _roomRead before _doRead resolves it again.
function _resolveRead(val) {
  if (typeof val === "string") return { text: val };
  if (!Array.isArray(val)) return null;
  for (const e of val) {
    if (e.req && !e.req.every(f => _flag(f))) continue;
    if (e.notFlags && e.notFlags.some(f => _flag(f))) continue;
    // `when(G)` for the state a flag cannot express — chiefly PRESENCE. A close
    // look at a man's notebook asserted his forearm was on it on the nights he
    // was not in the pub (round 22, found independently by two personas), and
    // no flag can say "he is on his stool tonight" because that answer changes
    // with the rota, the season and the hour. Same shape as a dialogue node's
    // when(st, G); the last node must still be ungated, which reads.test pins.
    if (e.when && !e.when(G)) continue;
    return e;
  }
  return null;
}
function _roomRead(arg, peek) {
  const reads = _room().reads;
  if (!reads) return null;
  for (const [key, aliases] of Object.entries(_READ_NOUNS)) {
    if (reads[key] && (arg.includes(key) || aliases.some(a => arg.includes(a)))) {
      const e = _resolveRead(reads[key]);
      if (!e) return null;
      if (!peek) {   // _doExamine truthy-checks first — effects only on the real read
        if (e.sets) for (const f of e.sets) _setFlag(f);
        if (e.reveal && G.itemLoc[e.reveal] == null) G.itemLoc[e.reveal] = G.room;
        // the noticer's book: every distinctive fixture you have actually looked at
        (G.examined = G.examined || {})[G.room + "." + key] = 1;
      }
      return e.text;
    }
  }
  return null;
}

function _doExamine(arg) {
  if (!arg) return _describeRoom(true, true); // LOOK always gives the full desc

  // EXAMINE PHONE opens the home screen (battery, flashlight, messages, weather,
  // headlines), not the flat item blurb — only "phone"/"mobile", so torch/light
  // fall through to the LIGHT machinery. The phone lights its own screen, so it
  // reads in the dark.
  // YOUR phone, not any phrase containing the word: EXAMINE PHONE CASES at the
  // night bazaar — a thing the market visibly sells — silently opened your own
  // home screen instead (Nadia, round 33). Anchored, so "phone"/"my phone"/
  // "the mobile" still open it and a stall's stock does not.
  if (/^(my |your |the )?(phone|mobile)$/.test(arg.trim()) && _inv().includes("phone")) { _doPhoneScreen(); return; }
  // YOUR POCKETS ARE YOUR INVENTORY. The opening's own tutorial line says
  // "EXAMINE what's in your pockets", and a literal-minded first-timer types
  // exactly that — and got "Nothing special about that — or it isn't here."
  // The first instruction the game gives, failing, with the working verb
  // (INVENTORY) buried in an 80-line HELP (Col, round 33, 2026-09-01). Works in
  // the dark: you can feel your own pockets. Sits above the darkness gate for
  // that reason.
  if (/\b(pockets?|my stuff|belongings)\b/.test(arg)) { _doInventory(); return; }
  // Everything past here is a close LOOK, and you can't look closely in the dark —
  // point at the fix rather than describing what you plainly cannot see.
  if (_isDarkHere()) { _say("It's too dark to make anything out. (LIGHT ON, if you want a proper look.)"); return; }
  if (G.dog && (/\b(dog|sai krok)\b/.test(arg) ||
      (G.dog.name && arg.includes(G.dog.name.toLowerCase())))) {
    _say(_dogN(`Sai Krok: a Pattaya-special soi dog with one clipped ear and the settled ` +
      `bulk of a professional. He chose you on day ${G.dog.since} and has never once ` +
      `revisited the decision. Currently ` +
      (_room().barType === "beer" ? "under your stool, officially off duty, actually on duty." :
       (_room().bar || _room().barType) ? "outside the door, chin on paws, one ear on the room." :
       "at your heel, reading the street.")));
    return;
  }
  // …but only where the mini-bar IS. This fired everywhere, so a bar whose own
  // description leads with "a fridge of Chang and Leo papered with regulars'
  // photos" answered "No fridge out here — you'd have to be back in your room"
  // (Wes, round 33, 2026-09-01: the Sundowner denying the fixture it opens
  // with). Outside a hotel room it now falls through to the room's own reads —
  // at the Sundowner, straight onto the photos the fridge is papered with.
  if (/\b(fridge|refrigerator|mini.?bar)\b/.test(arg) && _isHotelRoom(G.room)) { _doFridge(); return; }
  if (/\bbed\b/.test(arg) && _isHotelRoom(G.room)) {
    _say("A firm double under a thin batik cover, the pillows veterans of a thousand " +
      "previous guests. Right now it is the single most persuasive object in Pattaya. " +
      "(SLEEP to turn in and end the night.)");
    return;
  }
  // A go-go's poster is generated (which girl depends on the bar and the trip),
  // so it is handled here rather than as a static room `reads` entry.
  if (/\b(poster|flyer|promo)\b/.test(arg) && _hasPoster()) { _doPoster(); return; }
  // The sticker on the film poster at the LK Metro mouth (docs/ctf.md). Its own
  // branch rather than a `reads` entry because the QR needs a display class, and
  // `reads` prints unclassed prose.
  if (G.room === "lk_entrance" && /\b(qr|qr ?code|sticker|rabbit)\b/.test(arg)) {
    _doQrSticker(); return;
  }
  // An authored fixture beats look-resolution — EXAMINE NOTEBOOK should read the
  // notebook, not resolve to the owlish old-timer scribbling in it. Peek only;
  // the effects fire in _doRead below.
  if (_roomRead(arg, true)) return _doRead(arg);
  // An exact venue name beats a generic noun contained inside it: "Daeng's
  // Place" must not resolve through the scenery entry for "place", nor "The
  // Water Buffalo" through the one for a tree. Authored room detail still wins,
  // because a room may describe its own neighbour better than this can.
  if (_venueLook(arg)) return;
  const npc = _findNpc(arg);
  if (npc) {
    // _findNpc's fuzzy prefix/substring match can pick up a same-prefixed NPC
    // name for a fixture word that was never meant to name her ("bell" →
    // Belle at Pink Lotus, where the bell is a live mechanic) — an exact
    // id/full-name match still wins outright (verb-auditor playtest,
    // 2026-08-23: EXAMINE BELL resolved to Belle instead of the bell fixture).
    const exactNpc = npc === arg.toLowerCase() || NPCS[npc].name.toLowerCase() === arg.toLowerCase();
    if (!exactNpc && _sceneryMatch(arg) && _doScenery(arg)) return;
    _say(NPCS[npc].desc);
    // a regular's profile card — his age and nationality moved here off the
    // presence line long ago, and one cast table must not lose them
    if (NPCS[npc].age) _say(`(${NPCS[npc].age}, ${NPCS[npc].nat}.)`, "dim");
    // The Regular, visible: a bonded lady's close-up warms by tier. Only the
    // drinks ledger feeds _bondTier, so this can only ever fire for the girls
    // (and mamasans/cashiers) you've actually courted — strangers, managers and
    // patrons read exactly as before.
    const role = NPC_ROLES[npc];
    if ((role === "hostess" || role === "mamasan" || role === "cashier") && _bondTier(npc) >= 1) {
      _say(_pickVary(_BOND_LOOK[_bondTier(npc)], "xbond" + npc), "dim");
    }
    return;
  }
  const id = _findItem(arg);
  if (id === "masseuse_note") { _readNote(); return; }
  if (id) { _say(ITEMS[id].desc); return; }
  if (/dartboard|darts/.test(arg) && _room().darts) {
    _say("A bristle board on the wall, the treble-20 bed worn pale by decades of " +
      "closing-time optimism. Chalk and a scoreboard hang beside it. (PLAY DARTS.)");
    return;
  }
  if (_roomRead(arg, true) || /\bsign|signage|arrows?\b/.test(arg)) return _doRead(arg);
  if (_doScenery(arg)) return;
  // Last resort: EXAMINE <the bar you are standing in>. "examine shamrock",
  // inside the Shamrock, got "Whatever that is, it isn't here" (Stan, round
  // 35). Last because a bar named after a thing — the Dolphin Bar's painted
  // dolphin — must let the thing answer first; exact after normalisation
  // because "second road traditional massage" contains "second road" and is
  // a different building.
  {
    const norm = x => String(x || "").toLowerCase().replace(/\s*\(.*\)$/, "")
      .replace(/^the\s+/, "").replace(/\s+(bar|inn|pub|lounge|club)$/, "").trim();
    const r = _room(), a = norm(arg);
    if (a.length >= 4 && [r.bar, r.name].some(nm => nm && norm(nm) === a))
      return _describeRoom(true, true);
  }
  _say(_pickVary(_NO_SUCH_THING, "xnothing"));
}

// ââ EXAMINE <venue>: the door you can walk through must look back ââââ
// Every street room names its bars in CAPS, offers them under "Step inside", and
// (in the browser) renders each as a tappable keyword â and then EXAMINE answered
// "Whatever that is, it isn't here, and it isn't interesting anyway" about a door
// two steps away. That is the promise defect in its purest form, and it was true
// of EVERY venue on the map, so it wants one engine answer rather than ~90
// authored entries (thorough-player playtest B#2, 2026-08-23).
//
// Derived from the exits graph, so a new bar is covered the day it is added.
// Deliberately an EXTERIOR look: what you can see from the pavement, keyed on
// what kind of place it is, plus the venue's own name â never the roster, which
// belongs to the room you have not walked into yet.
const _VENUE_LOOK = {
  gogo: [
    "Blacked-out glass, a door curtain, and a cold breath of aircon every time somebody works it. The board outside promises a great deal in two languages and commits to nothing in either.",
    "Chrome, dark glass, and a doorway you cannot see into from out here, which is the entire architectural intention. The bass arrives through the pavement rather than the air.",
  ],
  soi6: [
    "Open frontage, a row of stools, and a line of girls on them who clock you at forty metres and are already saying so. There is no door to speak of; the whole front IS the door.",
    "Stools out to the kerb, a beer fridge you can see from here, and a staircase at the back that the frontage is entirely honest about.",
  ],
  beer: [
    "Open-fronted, a roof of woven palm over a horseshoe rail, a fan turning at half speed. You can see straight through it to the back wall, which is rather the point of a beer bar.",
    "A rail, a fridge, a fan, and enough light spilling onto the pavement to read by. Nothing about the outside is trying to be anything.",
  ],
  gents: [
    "A wall, a discreet sign, and a door with no glass in it. It gives away nothing at all from the pavement, and the cars parked outside are better than the ones on the street.",
  ],
  pub: [
    "Frosted glass, a hanging board, and a menu in a case by the door with the fixtures taped up beside it. Somebody's roast is in there somewhere.",
  ],
  host: [
    "A lit board of photographs by the door, every face on it male and beautifully turned out. The lettering is Thai first and English second, which tells you who it is actually for.",
  ],
  shop: [
    "Strip lights, glass frontage, and the specific white glow that means cold drinks and an aircon that works.",
  ],
  massage: [
    "A lit sign with a price list under it, a rank of plastic chairs on the pavement, and the women in matching polo shirts who go with them. One of them wais at you on the off-chance.",
  ],
  soapy: [
    "A porte-cochere, a car park with an attendant in it, and a frontage that has been expensively persuaded to look like a hotel. Nothing about it is subtle and none of it is accidental.",
  ],
  market: [
    "Strip lighting on wires, tarpaulin roofs, and the noise of a hundred small businesses all closing at slightly different times.",
  ],
  cabaret: [
    "Poster boards of sequins and cheekbones under coloured bulbs, a showtime printed larger than anything else on the frontage, and a rope for a queue that has not formed yet.",
  ],
  food: [
    "Steel tables, a laminated menu on a board, and the specific smell that makes the decision for you before you have finished reading it.",
  ],
  other: [
    "Lit frontage, an open door, and the ordinary business of the evening going on behind it.",
  ],
};

// A third of the map's venues carry no barType at all \u2014 massage shops, markets,
// a cabaret, a host club \u2014 so defaulting them to a beer bar would assert a
// horseshoe rail under woven palm about a massage shop, which is the false-claim
// defect this whole exterior look exists to fix. Read their own flags instead,
// and fall through to something that commits to nothing.
function _venueKind(r) {
  if (r.barType && _VENUE_LOOK[r.barType]) return r.barType;
  if (r.soapy) return "soapy";
  if (r.massage) return "massage";
  if (r.hostBar) return "host";
  if (r.seven) return "shop";
  if (/market|bazaar|mall/i.test(r.name || "")) return "market";
  if (/cabaret/i.test(r.name || "")) return "cabaret";
  if (r.food) return "food";
  if (r.barType) return "other";
  return r.bar ? "other" : "other";
}

function _venueLook(arg) {
  const here = _room();
  if (!here || !here.exits) return false;
  const norm = t => String(t).toLowerCase()
    .replace(/['\u2019\u02bc]/g, "")
    .replace(/\b(?:a|an|the)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  const a = norm(arg);
  if (!a) return false;
  // Only somewhere you could step into from where you stand â a venue three rooms
  // away is not a thing you are looking at. BOTH tables: most bars hang off a
  // block's `venues` list rather than its compass exits, and walking only the
  // exits missed every one of them — caught by my own sweep being exits-only,
  // which is the instrument sharing the code's blind spot exactly as CLAUDE.md
  // warns.
  for (const to of [...Object.values(here.exits), ...(here.venues || [])]) {
    const r = ROOMS[to];
    if (!r) continue;
    const label = norm(r.bar || r.name || "");
    if (!label) continue;
    const isName = a === label || (a.includes(" ") && label.startsWith(a + " "));
    if (!isName) continue;
    const name = r.bar || r.name;
    _say(_fmt("{name}. {look}",
      { name, look: _pickVary(_VENUE_LOOK[_venueKind(r)], "vlook" + _venueKind(r)) }));
    _say(_fmt("(You are outside it. ENTER {name} to go in.)", { name }), "dim");
    return true;
  }
  return false;
}

// ── Scenery: EXAMINE as a reward, not a dead end ─────────────────────────────
// The parser honours the Zork ledger (XYZZY, DIAGNOSE, SMELL, LISTEN) and in
// that lineage EXAMINE is the verb that pays you for being curious. Ours paid
// out for the 29 things in ITEMS and answered everything else — the sea, the
// ceiling, your own hands — with one flat "Nothing special about that", which
// is the dead end the house rule exists to prevent.
//
// Keyed on the noun and resolved by CONTEXT, so the same word answers
// differently on the sand, in a bar, and on a street. Two of them are doors
// rather than jokes: the bell and the ceiling are live mechanics that a curious
// player has, until now, had no way to discover by poking at the room.
function _sceneryCtx() {
  const r = _room();
  // The Queen Vic is the one bar with no hostesses at all (CLAUDE.md: the pub
  // gets no mamasan, cashier or floor girls), so the go-go furniture is a lie
  // in it — EXAMINE CEILING promised the pasties game and THROW COVER answered
  // "this room is short one dancer" on the very next turn. Its own context.
  if (r.barType === "pub") return "pub";
  if (r.bar) return "bar";
  if (/beach|promenade/i.test(r.name) && !/\b(road|rd)\b/i.test(r.name)) return "sand";
  return "street";
}

// A scenery key matches a NOUN, and some of those nouns are also modifiers
// inside longer ones. "glass" and "chang" both live on the `drink` key, so
// EXAMINE ONE-WAY GLASS in a soapy fishbowl and EXAMINE CHANG SINGLETS at the
// night bazaar both answered with a half-drunk beer (Nadia, round 33,
// 2026-09-01, who found the same wrong bottle in three different rooms). An
// entry may now declare `unless`: a phrase that means the player is plainly
// asking about something else, tested before the match.
function _sceneryMatch(arg) {
  return _SCENERY.find(s => s.m.test(arg) && !(s.unless && s.unless.test(arg)));
}
function _doScenery(arg) {
  const e = _sceneryMatch(arg);
  if (!e) return false;
  const ctx = _sceneryCtx();
  // a pub is still a bar for everything the two genuinely share (the stool, the
  // mirror, the floor) — it only needs its own line where the trade differs
  // An entry may carry BOTH: fn is an override that gets first refusal (a room
  // that named its own teak, a stage with a band on it), and returning null
  // falls through to the pooled lines rather than abandoning the noun. An entry
  // with fn and no lines behaves exactly as before.
  if (e.fn) {
    const line = e.fn(ctx);
    if (line) { _say(line); return true; }
    if (!e.lines) return false;
  }
  const pool = e.lines[ctx] || (ctx === "pub" && e.lines.bar) || e.lines.any;
  if (!pool) return false;
  _say(_pickVary(pool, "scn_" + e.key + "_" + ctx));
  return true;
}


// One shrine per COMPLEX, not per bar — authored, because "is this a complex"
// is not a thing the room data says. Each is the shared one for every bar
// trading on that ground.
const _COMPLEX_SHRINE = {
  myth_night: "On the corner where the small road meets the complex, one spirit house on a " +
    "single post, at about eye level. Not one per bar — one for the whole place, because it " +
    "belongs to the ground and the ground is one plot however many people are trading on it. " +
    "Today's water is fresh. So are the marigolds. Somebody does this before the shutters go up.",
  tt_entrance: "Just inside the arch, a spirit house on a post, and beneath it a lower one on " +
    "four legs shaped like a little Thai house. Two shrines, two different tenants: the one up " +
    "high came with the shrine, the one down low was here before the maze was. Every bar in " +
    "Tree Town uses both, and the building's shadow has been carefully kept off them.",
  lk_entrance: "A spirit house at the mouth of the complex, garlanded, with three sticks of " +
    "incense burnt down to stubs and a bottle of red Fanta with a straw in it. Shared by every " +
    "bar in here — the same reason the ban is: one ground, one landlord, whatever the signage says.",
};

// The shelf every bar has: shrine, garland, water, the king beside it. What is
// NOT here any more is the photograph of a dead farang owner — it was in two of
// three pooled lines, which quietly gave every bar in Pattaya a dead foreigner.
// Mario, on seeing it twice: "the farang photo in particular is odd to have
// consistent across different bars." Correct. A memorial is the most specific
// object in a room and it was the most generic line in the game.
//
// It belongs in _SHRINE_OWNER below — authored per bar, where the canon has
// somebody to remember. Same doctrine as darkLight and narrow: generic default,
// authored exceptions.
const _SHRINE_BAR = [
  "High on the back wall behind the rail: a small shelf-shrine, a garland going brown, a " +
    "glass of water. Beside it and slightly higher, a portrait of the king. Somebody puts " +
    "fresh flowers up there before the shutters go up, every day, and nobody mentions it.",
  "The shelf above the optics: incense stubs, a fresh jasmine garland, a little water, and " +
    "the king's portrait hung beside it rather than in it. It is the tidiest thing in the bar " +
    "by a distance.",
  "Behind the bottles, up where the smoke goes: a shrine shelf, a garland, a water glass " +
    "changed today. The king is beside it. Whatever else slides in here, that does not.",
];

// Bars with somebody to remember. Only where the canon actually has a farang
// who is gone — an invented dead owner in every bar is worse than none.
const _SHRINE_OWNER = {
  queen_vic: " Beside the king, in a black frame: a heavy Englishman behind this same bar, " +
    "in a shirt that dates him. Nobody currently drinking here can tell you more than the " +
    "year, and the year is on the frame.",
};

const _SHRINE_PUB = [
  "High on the back wall between a horse brass and a framed pub sign: a shrine shelf, a fresh " +
    "garland, a water glass changed this morning. The king's portrait hangs beside it. However " +
    "English the panelling is, somebody Thai opens this building every day, and it shows here first.",
  "Above the optics, sharing a wall with a dartboard and a photograph of a football team: the " +
    "shrine, properly kept — incense, flowers, water. The rooms upstairs need making up whether " +
    "or not the pub downstairs is pretending to be in Bermondsey.",
  "The shelf over the till, garlanded, with a bottle of red Fanta and a straw in it, three feet " +
    "from a brass plaque about warm beer. Nobody finds this incongruous except you.",
];

const _SHRINE_STREET = [
  "Not out here. The spirit houses sit where a business sits — outside the complexes, and " +
    "high on the back wall inside the bars themselves.",
  "Nothing on this stretch. They belong to premises, and this is just road.",
];

// What a bonded girl looks like when YOU look — the tier overlay _doExamine
// appends under her desc. Authorial narration (register-free), pooled per tier.
const _BOND_LOOK = {
  1: [
    "She catches you looking and doesn't mind. You've bought enough drinks to be a face " +
      "now — the smile you get has your name somewhere in it, even if she'd have to check " +
      "her phone for the spelling.",
    "You know things about her the walk-ins don't: which laugh is work and which one " +
      "escapes, where she stashes her phone, how she takes her som tam. Small things. " +
      "They add up at a rate nobody warns you about.",
    "A face to her now, not a wallet — she'd clock you from the street and wave. It's not " +
      "nothing. On this soi it's actually quite a lot.",
  ],
  2: [
    "Looking at her now you see the things she doesn't perform: the tiredness she parks " +
      "when a customer sits down, the real laugh she saves, the glance she sends you when " +
      "another table gets loud — you, specifically, as if you'd both already discussed it.",
    "You're her regular and it shows in what she no longer bothers to hide — the yawn, " +
      "the phone, the opinion. The performance was for strangers. You've been quietly " +
      "moved to a different list.",
    "Somewhere in the last few nights she stopped selling to you. What's left when the " +
      "selling stops is a person leaning on a rail, and you know her, and that is a " +
      "stranger thing to have bought with lady drinks than anyone admits.",
  ],
  3: [
    "She looks back at you the way you look at her, and neither of you performs anything. " +
      "The bar, the drinks ledger, the whole apparatus — it's still there, but between the " +
      "two of you it has gone quiet, like a radio in another room.",
    "Hers now, is what the other girls' glances say, and they're not wrong. What you see " +
      "when you look is someone who has decided about you — and on this soi a woman who " +
      "has decided is a different creature entirely from one who is deciding.",
    "You know the face under the makeup and the voice under the Tinglish and the girl " +
      "under the girl. She lets you know it, which is the actual gift — everything else " +
      "on this soi can be bought, and that can only be given.",
  ],
};

const _NO_SUCH_THING = [
  "Nothing special about that — or it isn't here.",
  "You look. The soi declines to elaborate.",
  "Whatever that is, it isn't here, and it isn't interesting anyway.",
  "Not here. Or not a thing. The night is unclear on the distinction.",
];

const _CAT_LINES = {
    bar: [
      "A bar cat, asleep on the one stool nobody ever seems to claim. It opens one eye, " +
        "prices you, and closes it. You are not worth the second eye.",
      "It lives here the way the mamasan lives here: it was here before you, it will be " +
        "here after you, and the arrangement is not up for discussion.",
    ],
    any: [
      "A soi cat gives you the long unhurried blink of an animal that owns real estate on " +
        "this street and knows sunburn when it sees it.",
      "It sits in the exact centre of the pavement, washing a paw, making the entire " +
        "street route around it. Correctly.",
    ],
  };
const _SCENERY = [
  // the animals the prose names (dog-person playtest 2026-08-22): the tide-line dog
  // before you have one, the rats with routines, the Dolphin Bar's dolphin, Tree
  // Town's fish tank, the phakhama round his neck
  { key: "rats", m: /\brats?\b|\bvermin\b/, fn: () => "Rats with routines: the same one crosses the same " +
    "gap at the same minute every night, unhurried, with the air of a man who has a bar to get to. " +
    "Nobody looks. The rat doesn't either." },
  { key: "dolphin", m: /\bdolphins?\b/, fn: () => G.room === "dolphin_bar"
    ? "The Dolphin Bar's dolphin: painted over the bar in three colours of house paint, grinning " +
      "with a confidence the artist did not share. Repainted once a decade, badly, on purpose."
    : "No dolphins here — the roundabout up the road has the statues, and the bar up in Naklua has the painting." },
  { key: "fishtank", m: /\bfish ?tank\b|\baquarium\b/, fn: () => /^tt_/.test(G.room)
    ? "Somewhere in this maze a bar has a big fish tank out the front. Everybody who is lost in " +
      "here is looking for it, and it is always one lane over from wherever you are."
    : "No fish tank here. Tree Town has one, famously, in front of a bar nobody can find twice." },
  { key: "phakhama", m: /\bphakhama\b|\bscarf\b|\bpakama\b/, fn: () => G.dog && G.dogPhakhama
    ? _dogN("The checked phakhama knotted round Sai Krok's neck — a bar girl's gift, 'for handsome'. " +
      "He wears it like rank, and it has started to smell of him, which he considers an improvement.")
    : "A phakhama — the checked Isan cloth that is a towel, a belt, a sling and a scarf depending on " +
      "the hour. Half the soi owns one. None of them are yours." },
  { key: "straydog", m: /\b(soi |stray |tide.?line )?dogs?\b|\bstray\b|\bpuppy\b/, fn: () => {
    if (G.dog) return null; // your own is answered by name above
    if (/beach/.test(G.room)) return "A soi dog working the tide line — nose down, one ear up, entirely " +
      "self-employed. He checks you for food from a distance and decides not yet. (FEED DOG, if you've any.)";
    return "The soi's freelancers: on duty, unbothered, and every one of them knows the bars' " +
      "kitchens better than the health inspector. Affection is not the currency. (FEED DOG.)";
  } },
  { key: "bargame", m: /\bconnect ?4\b|\bconnect four\b|\bjackpot\b|\bdice box\b|\bshut the box\b|\bgame ?frame\b/, fn: () => {
    // the room prose advertises "a Connect 4 frame and a Jackpot dice box" — give
    // them a look rather than a dead-end (fiddler playtest 2026-08-22)
    if (!_room().barType) return "Nothing to play here — that's a bar thing.";
    return "The bar-games corner: a scuffed Connect 4 frame with the counters gone " +
      "cloudy from a thousand hands, and a shut-the-box dice tray beside it. The house " +
      "will happily take a small stake off you at either. (PLAY CONNECT 4 · PLAY JACKPOT.)";
  } },
  { key: "me", m: /\b(me|myself|my ?self|my body)\b/, fn: () => {
    const base = _pickVary([
      "Sunburn on the tops of your feet in the shape of your sandals, a shirt that was fresh " +
        "four hours ago, and an expression you would describe as game. (DIAGNOSE for the honest version.)",
      "A man on holiday, doing holiday at the intensity of a job. The forearms are going brown " +
        "and nothing else is. (DIAGNOSE if you want numbers.)",
      "You take stock. Everything is broadly where you left it, which at this hour is a win. " +
        "(DIAGNOSE for the unflattering detail.)",
      "Upright, solvent-ish, and pointed in a direction. Three out of three. (DIAGNOSE.)",
    ], "scn_me");
    // one honest clause when the numbers say so — worst condition wins
    if (G.hurt >= 2) return base + " Also: you are moving like furniture being carried, " +
      "and strangers have started offering you their seat. That is not a good sign.";
    if (G.drunk >= 6) return base + " Although the evidence — the lean, the generous " +
      "focus, the affection for everyone — suggests the survey was conducted drunk.";
    if (G.jaded >= 4) return base + " And behind the eyes, if you're honest, that flat " +
      "coin-counting stare the long-termers get. The soi is winning. It always does.";
    return base;
  } },

  { key: "hands", m: /\b(hands?|fingers?)\b/, lines: { any: [
    "Steady enough. There is a stamp on the back of one that you have no memory of receiving " +
      "and cannot read.",
    "Two of them, still. Somebody's biro number is fading off the left one into the creases.",
    "Warm, slightly sticky, faintly of lime. You decide not to reconstruct the sequence of " +
      "events that produced that.",
  ] } },

  { key: "sky", m: /\b(sky|stars?|moon|clouds?)\b/, lines: {
    sand: [
      "Off the sand you can actually see it — not many stars, the town sees to that, but " +
        "enough, and a moon doing its work over a black Gulf.",
      "Big and low and warm, with the Gulf breathing under it. Two stars are winning against " +
        "the neon. The rest have conceded.",
      "Clear enough to notice, which on a beach at night is the whole offer.",
    ],
    any: [
      "Above the signs there is a strip of it, orange-brown, the colour a town this bright " +
        "makes at night. No stars. Nobody here is looking up anyway.",
      "You look up and get cabling — a black knot of it, sagging between poles, carrying " +
        "everything anyone on this street has ever said to anyone.",
      "Somewhere up past the signage the actual sky continues, on its own time, unwatched.",
    ],
  } },

  { key: "sea", m: /\b(sea|ocean|gulf|waves?|surf|water)\b/, lines: {
    sand: [
      "Black, close, and busy. It arrives, considers the sand, and withdraws, and has been " +
        "doing that for a very long time without needing anybody to watch.",
      "The Gulf, doing the same thing it did last night. Warm as a bath and about as ambitious.",
      "Out there somewhere a light is moving very slowly — a fishing boat, or a tanker, or " +
        "somebody else's much larger evening.",
    ],
    bar: [
      "From in here? Nothing. A wall, a shelf of bottles, and the sea two hundred metres " +
        "away being comprehensively ignored by everybody in the room, including you.",
    ],
    street: [
      "You can smell it and you can hear it under the traffic, and between the buildings you " +
        "get one grey slice of it. Everybody on this road has decided that will do.",
      "It is over there, behind the parked bikes and the signage and the general commerce. " +
        "It has been over there all week.",
    ],
  } },

  { key: "ground", m: /\b(ground|floor|road|pavement|street|tarmac|sand)\b/, lines: {
    sand: [
      "Warm on top, cool an inch down, and printed with the whole day's traffic — sandals, " +
        "dog, somebody who was barefoot and in a hurry.",
      "Sand, still holding the afternoon's heat, with a bottle cap and a lolly stick in it.",
    ],
    bar: [
      "Swept, mopped, and losing anyway: the tacky patch by the rail is older than the " +
        "current management.",
      "Tile, going up at one corner, with a bar mat over the worst of it. Somebody's flip-flop " +
        "is under the stool and its owner is still here.",
    ],
    street: [
      "Concrete slabs of four different vintages, a drain grate you would not want to be " +
        "wearing heels near, and a strip of tarmac patched in a colour that never matched.",
      "Dry, dusty, warm through your soles. In the morning a woman will sweep this stretch " +
        "and by evening it will look exactly like this again.",
    ],
  } },

  { key: "crowd", m: /\b(crowd|people|punters?|tourists?|everyone|farangs?)\b/, lines: {
    bar: [
      "Half a dozen men at various points along the arc between arriving and being poured " +
        "into a taxi, and the staff tracking every one of them without appearing to look.",
      "The rail: a man telling a story he has told here before, two more being polite about " +
        "it, and a girl who has heard it four times doing a very good job.",
    ],
    any: [
      "Everybody is going somewhere with total confidence and no urgency. Some of them have " +
        "been going there since Tuesday.",
      "Couples, groups of lads, one family who took a wrong turn out of the hotel and are " +
        "handling it with enormous poise.",
      "A moving census: two-week men going brown, resident men going grey, and the women who " +
        "have been working this street since before either category arrived.",
    ],
  } },

  // \bbaht\b(?!\s*bus) — "baht bus" belongs to the bus entry below, not the wallet
  // `unless` because a CASH MACHINE is not cash: this entry sits ~900 lines
  // above the atm one and was eating the phrase, answering a man looking for
  // an ATM with a fold of notes in his own pocket.
  { key: "money", m: /\b(money|cash|notes?|change)\b|\bbaht\b(?!\s*bus)/, unless: /machine|point\b/,
    lines: { any: [
    "You count it without taking it out of your pocket, which is a skill this town teaches " +
      "in about three days. (You know the number. It's on the screen.)",
    "Purple ones are the ones to worry about. You have some. You will have fewer.",
    "A fold of notes gone soft at the edges from being counted in the dark.",
  ] } },

  // Generic scenery must not assert specifics the room's OWN prose contradicts:
  // this answered "chrome legs, vinyl top" at The Terrace, whose description says
  // "a long teak rail" (persona report A#8, 2026-08-23). Where the room names a
  // material, echo the room; otherwise stay off the subject.
  // "seating" too — Bay Watch's own description calls its stools "theatre
  // seating", so it is the word the room itself put in the player's mouth.
  { key: "stool", m: /\b(stools?|chairs?|seats?|seating|rail)\b/,
    fn: ctx => {
      const desc = String((_room() && _room().desc) || "");
      const mat = (desc.match(/\b(teak|brass|zinc|marble|bamboo|mahogany|copper|oak|concrete|stainless)\b/i) || [])[1];
      if (mat && ctx !== "sand" && ctx !== "street") {
        return "The " + mat.toLowerCase() + " has the particular shine that only comes " +
          "from forearms \u2014 thousands of them, over years, all resting in very " +
          "nearly the same place.";
      }
      return null;   // fall through to the pooled lines below
    },
    lines: {
    bar: [
      "Worn smooth where the forearms go and shimmed at one foot with a folded beer mat. " +
        "It is the correct height for this bar and no other.",
      "Worn shiny in the middle by ten thousand identical evenings. Yours now, until it isn't.",
      "There is a stool with your name on it in the sense that nobody else wants it either.",
    ],
    any: [
      "Plastic, stackable, and out on the pavement because the pavement is where the trade is.",
    ],
  } },

  // Breadth rows off tools/examine-audit.mjs — one entry each closes a whole
  // column of rooms whose prose foregrounds the noun (round 15/16 personas).
  { key: "list", m: /\b(drinks? list|price list|menu board|tariff|lists?)\b/, lines: {
    bar: [
      "Laminated, sun-faded at one corner, and written in the confident hand of somebody " +
        "who has never once been challenged on it. Beer, spirits, lady drink, and a line " +
        "at the bottom that is deliberately not itemised.",
      "Prices in two columns and a third column that is just a smile. Nothing on it has " +
        "changed since the last time petrol did.",
    ],
    any: [
      "A price board, angled at the pavement, doing the only advertising this place has " +
        "ever paid for.",
    ],
  } },
  // TIP BOX at the Rock Factory examined as beer crates — the box key ate it
  // (Malcolm, round 36). A tip box is its own thing everywhere it exists.
  { key: "tipbox", m: /\btip ?(box|jar)\b|\btips\b/, fn: () => "The tip box: a Chang carton with a slot cut in the lid and " +
    "TIPS in marker, positioned where the band can see it and you can't pretend not to. Whatever's in it " +
    "is the difference between this being a job and a hobby, and the drummer knows to the baht." },
  { key: "box", m: /\b(box|boxes|crate|crates)\b/, unless: /\btip\b/, lines: {
    bar: [
      "Beer crates, stacked four high behind the ice, holding up a corner of the operation " +
        "in a way the architect never drew.",
    ],
    any: [
      "Stacked, taped, and re-used past the point where anyone remembers what came in it " +
        "originally. This town runs on them.",
    ],
  } },
  { key: "bench", m: /\b(benches?|loungers?|sun ?beds?)\b/, lines: {
    sand: [
      "Stacked in threes under the folded umbrellas, chained through the frames, waiting " +
        "for a morning that pays better than the night does.",
    ],
    any: [
      "Concrete, warm from the day, and occupied at either end by two people determined " +
        "not to acknowledge one another.",
    ],
  } },
  { key: "tank", m: /\b(fish ?tank|aquarium|tanks?)\b/, lines: {
    bar: [
      "Green at the edges, one pump louder than it should be, and three survivors who have " +
        "outlasted several members of staff.",
    ],
    any: [
      "Somebody's pride, somebody else's chore, and the light in it is on whether anybody " +
        "is watching or not.",
    ],
  } },
  // The street-food hint, made only where the till exists. Sits above the shared
  // `streetfood` pool so a room with a real stall gets the actionable version.
  { key: "stall", m: /\bfood stalls?\b|\bthe stall\b|\bfood carts?\b|\bfood court\b/, fn: () => {
    if (typeof FOOD_STALLS !== "undefined" && FOOD_STALLS[G.room])
      return "It is doing steady, unhurried trade with people who live here, which is the " +
        "only review that has ever mattered. Nothing is written down and everything has a " +
        "price. (BUY FOOD)";
    return null;
  } },

  { key: "shelf", m: /\b(shelves|shelf|racks?|stalls?)\b/, lines: {
    any: [
      "Stacked to the ceiling and organised by a logic that is completely opaque until you " +
        "have needed something from it twice.",
    ],
  } },
  { key: "couch", m: /\b(couches?|sofas?|banquettes?)\b/, lines: {
    bar: [
      "Low, deep, and upholstered in something wipeable. The lighting over them has been " +
        "chosen with the same care as everything else in here, which is to say enormous.",
    ],
    any: [
      "It has been rained on at least once and has entirely forgiven the world for it.",
    ],
  } },
  { key: "plant", m: /\b(plants?|pot plants?|greenery|palms?)\b/, lines: {
    any: [
      "Doing better than it has any right to in this heat, and watered by whoever happens " +
        "to remember, which turns out to be enough.",
    ],
  } },
  // NOT folded in with the plants: bunting is fabric, and "watered by whoever
  // remembers" is exactly the kind of false claim this pass exists to remove.
  { key: "bunting", m: /\b(bunting|flags|pennants|streamers|garlands?)\b/, lines: {
    any: [
      "Triangles of plastic on a string, sun-bleached on the side that faces the road and " +
        "still vivid on the side that doesn't. Nobody remembers what they went up for.",
    ],
  } },
  { key: "safe", m: /\b(safes?|room safe|strongbox)\b/,
    fn: () => _isHotelRoom(G.room)
      ? "A grey steel box bolted through the back of the wardrobe, four buttons worn " +
        "paler than the others by a decade of guests choosing their birthdays. " +
        "Whatever you leave in here survives a bad night out; whatever you carry " +
        "does not."
      : null },
  { key: "window", m: /\b(windows?|balcony door|shutters?)\b/,
    fn: () => _isHotelRoom(G.room)
      ? "Aluminium frame, a gap at one corner that lets the soi in whether you want " +
        "it or not, and the same view every hotel in this town sells: somebody " +
        "else's air-conditioning, and a slice of something better past it."
      : null,
    lines: {
      bar: [
        "Propped open on a length of dowel, because the aircon lost this argument years ago.",
      ],
      any: [
        "Glass, grille, and a strip of sun-curled film that was supposed to keep the heat " +
          "out and has settled for keeping the view interesting.",
      ],
    } },
  { key: "mirror", m: /\b(mirrors?)\b/, lines: {
    bar: [
      "Behind the bottles, and doing the room a favour with the lighting. You look better in " +
        "it than you have any right to, which is the entire design brief.",
      "Smeared at hand height, spotless above it, and reflecting the back of somebody's head " +
        "at an angle that means they can see you looking.",
      "A strip of it behind the optics, and in it a man on holiday, holding a beer, at an " +
        "hour when people at home are asleep. He seems fine about it.",
    ],
  } },

  { key: "ceiling", m: /\b(ceilings?|roof|rafters?)\b/, lines: {
    pub: [
      "Dark beams, horse brasses, and a Union Jack that has been up there long enough " +
        "to be the same colour as the beams. Nothing has ever been thrown at this ceiling " +
        "and nothing ever will be.",
      "Low, dark, and hung with the sort of tat an English pub accumulates whether anybody " +
        "wants it or not: brasses, a bugle, and a framed shirt nobody can identify any more.",
      "Beams and a slow fan, and up in the corner a dartboard scoreboard chalked with a " +
        "game that finished some time before you were born.",
    ],
    bar: [
      "Low, and studded with the evidence: nipple covers, thrown and stuck, in a constellation " +
        "going back years. Some have names biro'd on. (THROW COVER, if you want a star.)",
      "Fans, fairy lights, and a scatter of pasties stuck up there by previous management of " +
        "the evening. It is a scoreboard nobody officially keeps. (THROW COVER.)",
      "Corrugated, painted, and decorated with things that were briefly items of clothing. " +
        "The oldest ones are grey with dust. (THROW COVER.)",
    ],
    any: [
      "Open air, cables, and whatever the building next door is doing with its guttering.",
    ],
  } },

  { key: "bell", m: /\b(bells?)\b/, fn: (ctx) => {
    // While the glow holds, the bell is not an option, it's an event you caused.
    if ((ctx === "bar" || ctx === "pub") && typeof _bellActive === "function" &&
        _bellActive(G.room)) {
      const n = (G.soc.bells && G.soc.bells[G.room]) || 1;
      return n >= 3 ?
        "The bell still swings on its rope. Three rings deep, the brass might as well be " +
          "glowing — the room is yours, the girls are yours, and the only law left in here " +
          "is your own judgement, which rang the thing three times. (RING BELL, if you dare.)" :
        "The bell hangs there freshly swung, and the room is still vibrating at your " +
          "frequency — every glass in the house came off that rope. It would ring again. " +
          "It wants to. (RING BELL.)";
    }
    if (ctx !== "bar" && ctx !== "pub") return null;
    return _pickVary([
      "Brass, mounted over the rail, rope hanging within easy reach of a man making a decision " +
        "he will price up later. Ringing it buys the house a round and the room will let you " +
        "know how it feels about you afterwards. (RING BELL.)",
      "The bell. Polished where hands have taken it, and hung deliberately at the height of a " +
        "good idea. (RING BELL.)",
      "It hangs there being an option. That is its whole job, and it is extremely good at it. " +
        "(RING BELL.)",
    ], "scn_bell_bar");
  } },

  // Two shrines, two jobs (docs: the luck-ritual notes). OUTSIDE, a complex
  // keeps ONE spirit house for every bar trading on the ground — because it
  // belongs to the ground, and the ground is one property however many
  // operators are on it. INSIDE, each bar keeps its own shelf behind the rail,
  // with the king's portrait beside it and sometimes a photograph of a farang
  // who used to own the place. Deliberately EXAMINE-only: it is a thing worth
  // noticing, not a thing worth announcing at every door.
  { key: "shrine", m: /\b(shrines?|spirit house|spirit-house|altar|joss)\b/,
    fn: (ctx) => {
      // The Queen Vic is the one bar with no Thai staff at all, and it shows:
      // the shelf is there, because the premises came with one, and nobody
      // whose job it is has changed the water in a while.
      if (ctx === "pub") return _pickVary(_SHRINE_PUB, "scn_shrine_pub") + (_SHRINE_OWNER[G.room] || "");
      if (ctx === "bar") return _pickVary(_SHRINE_BAR, "scn_shrine_bar") + (_SHRINE_OWNER[G.room] || "");
      const c = _COMPLEX_SHRINE[G.room];
      if (c) return c;
      return _pickVary(_SHRINE_STREET, "scn_shrine_street");
    } },

  { key: "bikes", m: /\b(bikes?|motorbikes?|scooters?|traffic|taxis?|piwins?|motosais?)\b/, lines: {
    street: [
      "Parked three deep and angled in by a system everybody understands and nobody wrote " +
        "down. Two are running with nobody on them.",
      "A rank of them and a knot of drivers in numbered vests playing on their phones, none of " +
        "whom will look up until you want something, at which point all of them will.",
      "Baht buses going past at the speed of a man who wants to be waved at, and a scooter " +
        "carrying a family of four and a case of water.",
    ],
    any: [
      "Somewhere out front there's the usual rank. In here it's somebody else's problem.",
    ],
  } },

  // ── the 2026-08-14 examine-audit batch ─────────────────────────────────────
  // tools/examine-audit.mjs played EXAMINE against every noun the room prose
  // advertises and found the genre's furniture dead-ending by the dozen —
  // tables in 16 rooms, the till in 12, the queue in 8. One context-aware entry
  // per noun clears a whole row. Same doctrine as the rest of the table:
  // EXAMINE pays out for curiosity, and a voiced refusal beats the brush-off.

  // BEFORE the generic table entry — _doScenery takes the first regex match,
  // and "pool table" contains "table".
  { key: "pooltable", m: /\bpool table\b|\bfelt\b|\bcues?\b|\bbaize\b/, fn: (ctx) => {
    if (_room().pool) return "The table holds the middle of the room the way an altar " +
      "holds a church. Decent felt, straight-ish cues, and chalk that lives on the rail " +
      "light. (PLAY POOL)";
    if (ctx === "bar" || ctx === "pub") return "No table in here — this is a drinking " +
      "bar. The nearest felt is a soi away, and the ladies there sharked their rent out " +
      "of better players than you.";
    if (ctx === "street") return "The clack you can hear is coming from inside one of " +
      "the bars — a break, a pause, and the little cheer that means somebody's money moved.";
    return null;
  } },

  { key: "table", m: /\btables?\b/, lines: {
    bar: [
      "Ring-stained, wiped in the shape the rag naturally travels, one leg shimmed with a " +
        "folded coaster. It has heard more honest conversation than most embassies.",
      "A bar table in the standard state: two coasters, one ashtray, somebody's change " +
        "drying in a puddle of its own making.",
      "Sticky in the specific way that means cleaned often and succeeding never. The " +
        "surface of choice for every deal this town has ever shaken hands on.",
    ],
    any: [
      "Plastic, stackable, currently load-bearing. The whole coast runs on furniture " +
        "exactly this ready to be abandoned in a downpour.",
      "A table doing table work. Out here that mostly means holding somebody's som tam " +
        "and hearing somebody's life story.",
    ],
  } },

  { key: "till", m: /\btills?\b|\bcash ?register\b/, lines: {
    bar: [
      "The till sits where the till sits — behind the rail, under the shrine, inside the " +
        "cashier's exact field of vision. It opens for her and closes for everyone.",
      "An old drawer-clanker with a laminated price list taped beside it and the night's " +
        "arithmetic living entirely in the head of the woman guarding it.",
      "You look at the till. The cashier looks at you. The two events are not unrelated.",
    ],
    any: [
      "No till out here — money on this stretch moves hand to hand, folded small.",
    ],
  } },

  // The signature fixture of a soapy, and the reason `glass` needed the guard
  // below: three rooms describe a wall of one-way glass with numbered girls
  // behind it, and every one of them answered with a half-drunk beer. fn-only
  // and room-aware, so it returns null (and falls through) anywhere the
  // fixture doesn't exist. naklua_massage sees the Emperor's from the street.
  // Named in the shared massage-shop line ("Reclining chairs, tiger balm, a
  // price list on the wall") in four rooms, and examinable in none of them —
  // the room advertised its own furniture and then denied it existed.
  { key: "tigerbalm", m: /tiger ?balm|liniment|\bbalm\b/,
    fn: () => (_room().massage || _room().soapy)
      ? "The little hexagonal jars, red and white, lined up where you can see them. The " +
        "smell gets into everything — the towels, the curtain, the back of your throat — " +
        "and for the rest of your life it will mean this hour, this shop, and a woman " +
        "who found the knot before you finished saying where it was."
      : null },

  { key: "fishbowl", m: /one.?way glass|fish ?bowl|tiered bench|numbered girls/,
    fn: () => _room().soapy
      ? "The glass is lit from their side and dark from yours, which is the entire " +
        "technology of the place: they are on display and you are not. Numbers on little " +
        "discs, tiered benches, a room-temperature hush, and a mamasan somewhere behind " +
        "you doing sums. (SOAPY, if you want to pick a number.)"
      : G.room === "naklua_massage"
        ? "The Emperor's tank, four floors up and lit like an aquarium — you can see the " +
          "shapes of the tiered benches from the street and nothing else, which is the " +
          "point. The door is the only way to see more, and the door is right there."
        : null },

  // `glass` and `chang` are the two that double as modifiers: the fishbowl's
  // one-way glass is a wall, and a Chang singlet is a garment on a market rail.
  { key: "drink", m: /\b(beer|beers|drinks?|bottles?|glass|chang|leo|singha)\b/,
    unless: /one.?way|looking.glass|glass(es)? case|singlet|shirt|vest|tank ?top|shorts/,
    lines: {
    bar: [
      "Yours is where you left it, sweating its label loose. The rule of the coast: never " +
        "measure the night in empties. The staff already are.",
      "Cold enough, cheap enough, half gone. Somewhere behind the rail a fresh one is " +
        "already being uncapped on spec.",
      "The bottle's gone warm at the shoulders and cold at the heart, same as everybody.",
    ],
    sand: [
      "Empties, is it? The tideline keeps a few — under the loungers, wedged by the " +
        "spirit house, wherever a night ended. The intact ones are worth five baht " +
        "each to Auntie Nok, and three of them are a bus fare.",
      "You scan the sand with a scavenger's eye. Most of what glitters is crushed, " +
        "but a whole bottle turns up for whoever walks far enough — the beach's " +
        "one honest economy.",
    ],
    any: [
      "You're between drinks — a state this town regards as temporary and slightly " +
        "alarming, like standing in a doorway.",
    ],
  } },

  { key: "queue", m: /\bqueues?\b|\bline of people\b/, lines: {
    street: [
      "The queue has the patience of people who know the thing they're queueing for isn't " +
        "going anywhere and neither are they.",
      "Farang sunburn, Thai umbrellas, one man asleep standing up. The queue moves the way " +
        "the town moves: suddenly, then not at all.",
      "You study the queue. The queue studies nothing. It has reached a higher state.",
    ],
    any: [
      "No queue in here — this is a sit-down operation. The queueing happens outside, in " +
        "the heat, where it builds character.",
    ],
  } },

  // fn so the one summit gets its due — everywhere else picks from ctx pools.
  { key: "view", m: /\b(view|vista|bay|panorama|lookout|overlook)\b/, fn: (ctx) => {
    if (G.room === "buddha_hill") return "From up here it stops being scenery and " +
      "becomes geography — the whole bay at once, the town reduced to a glitter along " +
      "its rim, the sea doing the real work in the dark. (WATCH THE BAY)";
    const pools = {
      sand: [
        "The bay does its evening trick — fishing boats becoming lights, lights becoming " +
          "stars, the horizon giving up the distinction.",
        "A long curve of dark water with the town burning at one end of it. People pay " +
          "rooftop-bar prices for exactly this, minus the sand in their shoes.",
      ],
      street: [
        "Between the buildings you get slices of it — a wedge of sea here, a run of neon " +
          "there. The town sells the view by the sliver and keeps the whole for the birds.",
        "The best view on this stretch is the street itself, which knows it, and performs.",
      ],
      bar: [
        "The view from a bar stool is the bar — which, give it its due, is the show most " +
          "people actually came for.",
      ],
    };
    const pool = pools[ctx] || (ctx === "pub" && pools.bar);
    return pool ? _pickVary(pool, "scn_view_" + ctx) : null;
  } },

  { key: "doorman", m: /\b(doorman|doormen|bouncers?)\b/, lines: {
    bar: [
      "Big, calm, and paid to be exactly this bored. His job is ninety-nine nights of " +
        "nothing and one night of everything, and he dresses for the one.",
      "He clocks you, files you under harmless, and goes back to watching the street with " +
        "the patience of a man who is the door.",
    ],
    street: [
      "Every lit doorway on this stretch has one — arms folded, feet planted, doing the " +
        "arithmetic on everybody who slows down.",
      "The doormen along here all know each other. It's the same shift, the same street, " +
        "the same forty faces going past on a loop.",
    ],
  } },

  { key: "climate", m: /\bfans?\b|\bair ?con(ditioner|ditioning)?\b|\bac unit\b/, lines: {
    bar: [
      "The fan does its slow police-search of the room, finding nothing, agreeing to look " +
        "again. The cold spots are known territory and the regulars are sitting in them.",
      "Somewhere a compressor is fighting the tropics to a draw, and the draw is why " +
        "everybody's in here.",
      "It moves the heat around with an air of accomplishment. Moving it is not removing " +
        "it, but nobody has told the fan.",
    ],
    any: [
      "Out here the climate control is the sea breeze, when it can be bothered, and the " +
        "shade, where somebody hasn't already claimed it.",
    ],
  } },

  { key: "counter", m: /\bcounters?\b/, lines: {
    bar: [
      "Wiped smooth by years of forearms. The territory behind it is sovereign and the " +
        "treaty is: your money crosses, you don't.",
    ],
    any: [
      "A counter is a border, and this one has the usual customs post: a price list, a " +
        "calculator turned to face you, and somebody who has seen every trick you haven't " +
        "thought of yet.",
      "Formica, mostly clean, manned by somebody who could make change in three currencies " +
        "asleep.",
    ],
  } },

  { key: "sound", m: /\bsound ?system\b|\bspeakers?\b|\bsubwoofer\b|\bsound\s?desk\b|\bsystem\b/, lines: {
    bar: [
      "Stacked speakers with the grilles dented in, run at the volume where music stops " +
        "being heard and starts being weather.",
      "The system is worth more than the furniture and it shows — the bass arrives in " +
        "your chest a half-second before the song reaches your ears.",
    ],
    any: [
      "The sound out here is the town's own mix — traffic under bass under somebody's " +
        "karaoke, mastered by nobody, playing forever.",
    ],
  } },

  { key: "cooler", m: /\bcool ?box(es)?\b|\bcoolers?\b|\bice ?box(es)?\b|\bice bucket\b|\bice\b|\bfreezer\b/, lines: {
    bar: [
      "The cool box holds the real inventory — ice to the brim and bottles racked in it " +
        "like artillery. A girl tops it from a sack without being asked. The night is long " +
        "and the ice knows.",
      "Scuffed, sat on, opened every forty seconds. The most important object in the bar " +
        "and priced accordingly at nothing.",
    ],
    any: [
      "A cool box on a strap — the whole shop. Somebody carried the price of a beer down " +
        "this beach so you wouldn't have to walk. That's the economy, working.",
    ],
  } },

  // A room with a band on it is not a go-go, and the go-go furniture read as a
  // flat contradiction at Take Care Me (persona report A#8).
  { key: "stage", m: /\bstages?\b|\bpodium\b|\bcatwalk\b/,
    fn: () => _room() && (_room().band || _room().liveMusic) && _room().barType !== "gogo"
      ? "Knee-high, carpeted in something that was once red, and colonised by more " +
        "cables than instruments. Two monitor wedges, a drum riser that is really a " +
        "pallet, and a strip of tape on the floor where the singer stands."
      : null,
    lines: {
    bar: [
      "Raised, mirrored, lit from angles that flatter. Empty, it looks like furniture. " +
        "Occupied, it is the entire reason the room is shaped the way it is.",
      "The stage takes the light and gives back the night's argument: that everything " +
        "else — the till, the ice, the rent — is just infrastructure for this.",
    ],
    any: [
      "No stage out here, unless you count the street, which performs nightly and never " +
        "takes a bow.",
    ],
  } },

  { key: "curtain", m: /\bcurtains?\b/, lines: {
    any: [
      "The curtain is doing the most important job in the building: being a wall that " +
        "forgives. What's behind it is between the curtain and its conscience.",
      "Thin, floral, drawn. A curtain in this town is not a decoration, it's a treaty.",
    ],
  } },

  { key: "bus", m: /\bbaht ?bus(es)?\b|\bsongthaews?\b|\bbus(es)? ?stop\b|\bbus(es)?\b/, lines: {
    street: [
      "Blue, slow, and circling — the town's bloodstream. One is always thirty seconds " +
        "away until the exact moment you need one. (WAVE to hail it.)",
      "A songthaew grumbles past, bench seats half full of strangers pretending not to " +
        "study each other. Cheapest theatre in Thailand. (WAVE)",
    ],
    any: [
      "No bus is coming through here. The blue trucks keep to the real roads — flag one " +
        "there when you're ready to move.",
    ],
  } },

  // EXAMINE CAT at the Lucky Tiger described a sleeping bar cat where the prose
  // has a golden waving cat with dead batteries (Malcolm, round 36). A first
  // separate entry shadowed the real cats — one entry, the desc decides.
  { key: "cat", m: /\bcats?\b|\bkittens?\b|\b(waving|lucky|golden|maneki|beckoning) cat\b/, fn: () => {
    if (/waving cat/i.test(String(_room().desc || "")))
      return "The golden waving cat on the bar top — a maneki-neko, paw raised for luck, batteries dead " +
        "since whenever. The paw is frozen mid-beckon. Somebody has put a Chang cap on its head. It has " +
        "never once been asked to bring in money it didn't.";
    const L = _CAT_LINES;
    const pool = _inBar() ? L.bar : /beach|sand/.test(G.room) ? (L.sand || L.street) : L.street;
    return _pickVary(pool || L.any || L.bar, "cat");
  } },


  // ── batch 2 (the singleton-tail pass, same day) ────────────────────────────

  // Real sockets are room data (`outlet`/`seven`) — answer with the hint where
  // one exists, a voiced refusal in bars that guard theirs, silence elsewhere.
  { key: "outlet", m: /\b(power )?outlets?\b|\bsockets?\b|\bplug\b/, fn: (ctx) => {
    if (_room().outlet || _room().seven) return "A working socket, which in this town is " +
      "not furniture, it's hospitality. (CHARGE PHONE)";
    if (ctx === "bar" || ctx === "pub") return "There'll be a socket behind the bar " +
      "somewhere, but it belongs to the fridge and the fairy lights, and the staff decide " +
      "who joins that queue.";
    return null;
  } },

  { key: "menu", m: /\bmenus?\b|\bprice ?lists?\b|\btariff\b/, fn: (ctx) => {
    if (/soapy/.test(G.room)) return "Laminated, tiered, and mercifully numeric — the " +
      "menu does the talking so nobody in the lobby has to. The prices climb by floor.";
    if (_room().massage) return "The laminated tariff by the door, sun-faded to pastel: foot, Thai, oil, " +
      `aloe for the sunburned — a Thai massage is ฿${MASSAGE_LEGIT}, the oil ฿${MASSAGE_OIL}. (MASSAGE)`;
    if (ctx === "bar" || ctx === "pub") return _pickVary([
      "Laminated, sun-faded, sauce-spotted. The prices are best read as opening positions.",
      "One page, two columns, and the lady-drink line doing the heavy lifting for the " +
        "whole document.",
      "The menu is mostly a formality — everyone here orders the same three things, and " +
        "the kitchen knows which before you do.",
    ], "scn_menu_bar");
    return null;
  } },

  { key: "football", m: /\bfootball\b|\bthe match\b|\bpremier league\b/, lines: {
    bar: [
      "Up on the corner telly, mostly unwatched until it suddenly, loudly, isn't. " +
        "(SCORES for the day's results.)",
      "The football murmurs away above the optics — the one broadcast this coast never " +
        "turns off, in case somebody's team is playing. Somebody's team is always playing. " +
        "(SCORES)",
    ],
    any: [
      "No screen out here — the football happens indoors, and you'll hear the goals " +
        "from the street.",
    ],
  } },

  { key: "tailor", m: /\btailors?\b/, lines: {
    street: [
      "A tailor's window: mannequins in suits nobody has worn since the fitting, and a " +
        "man in the doorway who can tell your measurements — and your resistance level — " +
        "at forty paces. \"Sir! Suit! Best quality!\"",
      "Bolts of cloth, a curled poster of a farang in a blazer from 1994, and a promise " +
        "of anything by Thursday. The suits are real. Thursday is negotiable.",
    ],
    any: [
      "No tailor in here — but give the strip outside a minute and one will find you.",
    ],
  } },

  { key: "laundry", m: /\blaund(ry|erette)\b|\bwash.?kilo\b/, lines: {
    street: [
      "Wash-by-the-kilo: sacks of the town's shirts in cheerful jumbles, a scale, a " +
        "ticket book, and somebody's gran folding with the speed of a card dealer.",
      "The laundry hums and steams. Forty baht a kilo and everything comes back smelling " +
        "faintly of a flower that doesn't grow anywhere.",
    ],
    any: [
      "The laundry situation is a problem for daylight hours, and this isn't one.",
    ],
  } },

  { key: "trees", m: /\btrees?\b|\bcasuarinas?\b|\bpalms?\b/, lines: {
    sand: [
      "Casuarinas mostly, leaning the way the wind spent years teaching them, holding the " +
        "dune together and the shade where it lands.",
      "The trees take the sea wind first so the beach doesn't have to. They've made their " +
        "peace with the arrangement — you can see it in the lean.",
    ],
    street: [
      "The town's trees survive in gaps — a rain tree the pavement was poured around, " +
        "palms in concrete collars, all of them wearing at least one staple from an old " +
        "poster.",
    ],
    any: [
      "Greenery out here is wherever the concrete forgot to finish.",
    ],
  } },

  { key: "shade", m: /\bshade\b|\bawnings?\b/, lines: {
    street: [
      "Shade is real estate on this coast, and it is fully let — piwins under the sign, " +
        "a dog under the cart, a girl under the awning with the good breeze.",
      "The awnings do the real municipal work here. Every strip of shadow has a tenant " +
        "and the tenancy is enforced.",
    ],
    any: [
      "In here the aircon does what the shade does outside, at a price somebody is " +
        "quietly passing on to you.",
    ],
  } },

  { key: "railing", m: /\brailings?\b|\bsea ?wall\b|\bbalustrade\b/, lines: {
    sand: [
      "The rail between the town and the sand — leaned on by generations of elbows, " +
        "warm from the day long after dark, holding up more life stories than the bars do.",
    ],
    street: [
      "The promenade railing runs the whole front, polished at elbow height and rusting " +
        "everywhere else. People come to it to look at the sea and end up looking at " +
        "their phones, but the rail doesn't mind. It has time.",
    ],
    any: [
      "No sea rail in here — the only thing to lean on is the bar, which was built for it.",
    ],
  } },

  // One object, three rooms: the Dolphin Roundabout and the Tree Town arch each
  // get a single authored answer keyed to where you're standing.
  { key: "roundabout", m: /\broundabouts?\b|\bdolphin statue\b/, fn: () => {
    if (["dolphin", "dolphin_bar", "beach_rd_top", "naklua_rd"].includes(G.room))
      return "The Dolphin Roundabout — leaping concrete dolphins, repainted every few " +
        "years in a blue the sea has never once been, marking where Beach Road gives up " +
        "and Naklua begins. Traffic circles it with the confidence of people who have " +
        "stopped believing in rules and started believing in momentum.";
    return "No roundabout on this stretch — the traffic here prefers its chaos linear.";
  } },

  { key: "arch", m: /\barch(way)?\b/, fn: () => {
    if (["tt_entrance", "buakhao_tt", "buakhao_myth"].includes(G.room))
      return "The TREE TOWN arch: neon and fairy lights over a gap between shophouses, " +
        "doing its level best to look like the entrance to somewhere instead of the exit " +
        "from your money. It works. It has always worked.";
    return null;
  } },

  { key: "streetfood", m: /\bsom ?tam\b|\bmoo ?ping\b|\bskewers?\b|\bgrill(ed)?\b|\bnoodle stall\b|\bnoodle carts?\b|\btandoor\b|\bkhanom\b/,
    // A venue that SELLS food must not say it doesn't. The `bar` pool below
    // opens "The bar doesn't do food" — printed at KISS Jomtien, a food stall
    // that had just quoted ฿120 for a plate (Nadia, round 33). Rooms carrying
    // the `food` flag get told the truth and pointed at the verb.
    fn: () => _room().food
      ? "The grill is right there and it is the whole point of the place — charcoal, a " +
        "battered fan, and somebody who has been turning skewers since before you landed. " +
        "(BUY FOOD.)"
      : null,
    lines: {
    street: [
      // NOTE the missing (BUY FOOD): this pool is shared by every street in the
      // game, so the hint travelled into rooms with no stall — a persona read it
      // off the noodle carts on the Thappraya hill and got "Not for sale here"
      // from the room that had just printed it (round 23). A parenthesised CAPS
      // command is a promise, and a promise cannot ride in a pool that does not
      // know where it is being printed. The room-aware version is the `fn` entry
      // directly below, which IS told where it is standing.
      "Charcoal smoke, fish sauce, lime — the smell that runs this town's actual economy. " +
        "The carts feed the girls, the piwins, and any farang smart enough to point at " +
        "what the locals are having.",
      "A grill going full tilt, skewers turning, a mortar thumping out som tam somewhere " +
        "behind it. Twenty metres of pavement doing more honest trade than the whole soi.",
    ],
    bar: [
      "The bar doesn't do food, but the smell of somebody's grill drifts in anyway, " +
        "patient as a creditor. You'll deal with it on the way out.",
    ],
    any: [
      "Nothing cooking right here — follow the charcoal smell and you'll hit a cart " +
        "before you hit a decision.",
    ],
  } },

  { key: "foodcourt", m: /\bfood ?court\b/, lines: {
    any: [
      "Laminated photo menus, numbered stalls, arctic air, and fifty-baht plates that " +
        "shame every tourist menu on the strip. The town's best-kept open secret, kept " +
        "mostly by farang never looking up from Beach Road.",
    ],
  } },

  { key: "cart", m: /\bcarts?\b|\bvendor'?s? cart\b/, lines: {
    street: [
      "A vendor's cart — glass box, gas bottle, one wheel with opinions — carrying a " +
        "whole livelihood at walking pace. It'll be at the same corner tomorrow, and the " +
        "day after, and the year after that.",
    ],
    sand: [
      "A drinks cart parked where the sand meets the shade: cooler, folding stool, " +
        "twenty years of the same pitch. The beach runs on these.",
    ],
    any: [
      "No cart in here — the carts keep to the street, where the living is.",
    ],
  } },

  { key: "oilshop", m: /\bwarm oil\b|\bmassage oil\b|\boil\b/, fn: () => {
    if (/massage|oil|soapy|thai$/.test(G.room)) return "The oil is the trade's one " +
      "honest promise: warmed, scented, applied with professional indifference or " +
      "professional interest depending entirely on which shop and which sticker.";
    return null;
  } },

  { key: "lobby", m: /\blobb(y|ies)\b/, fn: () => {
    if (/soapy/.test(G.room)) return "Fake marble, real chlorine, jasmine somewhere " +
      "under it, and lighting calibrated to flatter everyone equally — the lobby is the " +
      "airlock between the street and the arrangement, and it takes its job seriously.";
    if (_isHotelRoom(G.room)) return "The lobby is a lift ride away — fake orchids, " +
      "real aircon, and a night clerk who has seen every hour you could possibly come " +
      "home at, and judges none of them out loud.";
    return null;
  } },

  { key: "fishtank", m: /\bfish ?tank\b|\baquarium\b/, fn: () => {
    // the soapies' street frontage shows the lobby tank to the pavement
    if (["second_rd_n", "naklua_massage"].includes(G.room)) return "Through the soapy's " +
      "glass front you can see the lobby fish tank doing its work — real fish, real " +
      "castle, a small honest aquarium advertising a large dishonest one.";
    if (/soapy/.test(G.room)) return "There are two tanks in the building. This one has " +
      "actual fish, circling their castle with no idea what an honest living they're " +
      "doing. Nobody looks at it twice, which may be the point.";
    return null;
  } },

  { key: "desk", m: /\bdesks?\b/, fn: () => {
    if (/soapy/.test(G.room)) return "A small desk holding a laminated menu, a phone, " +
      "and the manageress — the entire administration of the building, running at the " +
      "unhurried speed of somebody whose product sells itself.";
    return null;
  } },

  { key: "poster", m: /\bposters?\b/, lines: {
    any: [
      "Sun-curled, taped at the corners, advertising a night that has already happened. " +
        "Nobody takes posters down in this town — they just layer, like sediment.",
      "The poster promises more than the venue will deliver, in brighter colours than " +
        "the venue owns. This is understood by all parties.",
    ],
  } },

  // The mirror sticker is massage-shop canon — the small print of the whole trade.
  { key: "sticker", m: /\bstickers?\b/, fn: () => {
    if (/massage|oil|thai$/.test(G.room)) return "The sticker on the mirror — small, " +
      "peeling, doing more regulatory work than any sign in the building. Which sticker " +
      "a shop has, and how small it is, tells you everything the pink light doesn't.";
    return null;
  } },

  // ── batch 3 (the singleton skim) ───────────────────────────────────────────

  // The staircase is THE Soi 6 mechanic in architectural form — the prose names
  // it constantly ("three staircases the menus don't mention") and until now the
  // curiosity verb pretended not to understand. Venue decides what stairs mean.
  { key: "tancard", m: /\b(?:business )?card\b/, fn: () => {
    // the taxi intro plants it ("taps the card already in your pocket") and the
    // hint says it has a number — it must survive EXAMINE (desktop playtest)
    if (G.phone && G.phone.contacts && G.phone.contacts.tan)
      return "A plain card, creased from the pocket: TAN — TRANSPORT · AIRPORT · " +
        "ANYTHING, a Thai mobile number, and nothing else. No surname, no company. " +
        "The confidence of a man whose number is enough. (CALL TAN)";
    return "No card on you worth reading.";
  } },

  { key: "flipflops", m: /\bflip[- ]?flops?\b|\bsandals?\b|\bthongs\b/, lines: {
    sand: [
      "Somebody's flip-flops, parked neatly by a lounger with the confidence of a " +
        "man who expected to come straight back. Hours ago, by the sand drifted " +
        "into them. The sea says nothing.",
      "Abandoned footwear, the beach's most reliable crop. This pair waits with " +
        "more patience than its owner ever had.",
    ],
    any: [
      "No footwear worth studying here — and on this coast, that's saying something.",
    ],
  } },

  { key: "condoms", m: /\bcondoms?\b|\brubbers?\b|\bjohnn(?:y|ies)\b/, fn: () => {
    // carried as a counter (G.condoms), not an ITEMS record, so the generic
    // shrug used to answer a pocket item (desktop playtest 2026-08-17)
    if (G.condoms > 0) return `A pocket pack, ${G.condoms} left — 7-Eleven's finest, ` +
      "riding next to your phone like a very small insurance policy. The clinic " +
      "hands out stickers; this is the grown-up version.";
    return "You're not carrying any — which is either fine or famous last words. " +
      "Any 7-Eleven has them by the till, and the till girl has seen everything.";
  } },

  { key: "staircase", m: /\bstaircases?\b|\bstairs\b|\bstairway\b/, fn: () => {
    const r = _room();
    if (r.barType === "soi6") return "The staircase behind the bar, going up. No sign, " +
      "no menu entry, no explanation — and none needed, because it is the entire " +
      "business model rendered in concrete. The girls watch you notice it. Noticing it " +
      "is a known first step.";
    if (r.barType === "gogo") return "Stairs to the short-time rooms, behind a curtain " +
      "the DJ booth politely doesn't light. Everyone in the building knows where they " +
      "go. The stagecraft is in never quite saying so.";
    if (r.barType === "gents") return "A staircase with carpet on it — carpet, in this " +
      "climate — which tells you the rooms above are part of the offer, not an " +
      "afterthought. The club's whole pitch is that nothing here needs to be furtive.";
    if (G.room === "queen_vic") return "The staircase behind the bar leads up to the " +
      "guest rooms — actual lodging, actually slept in, which on this soi makes it the " +
      "most eccentric staircase in a hundred metres. (UP, if you're staying.)";
    if (r.bar) return "No stairs in here worth the name — this is a one-storey " +
      "operation, and everything it sells happens at ground level.";
    // the Soi 6 STREET advertises "the same staircases behind the bar" — answer
    // from the pavement too, not only from inside (mobile playtest 2026-08-17)
    if (r.region === "Soi 6") return "From the street you can just see them — through " +
      "each doorway, past each rail, the same staircase going up at the back. " +
      "Thirty bars, one floor plan, one business model. You'd have to step " +
      "inside to learn any more, which is of course the idea.";
    return null;
  } },


  { key: "cage", m: /\bcashier'?s? cage\b|\bcage\b/, lines: {
    bar: [
      "The cashier's cage — strung with fairy lights, glittering like a shrine, and " +
        "exactly as decorative as a bank vault. Every baht in the building passes through " +
        "it, and the woman inside has never once lost count.",
    ],
    any: [
      "No cage out here. The money moves hand to hand, which is its own kind of honesty.",
    ],
  } },

  { key: "boats", m: /\bsquid boats?\b|\bboats?\b|\bferry\b/, lines: {
    sand: [
      "Out past the swimmers' limit, the squid boats hang their green lamps over the " +
        "water — a second, more sensible town, doing a night shift that actually produces " +
        "something.",
      "A couple of hulls pulled up past the tideline, awnings rolled, ropes coiled by " +
        "somebody who has done it ten thousand times. The bay works days; the bars work " +
        "nights; the sand holds both coats.",
    ],
    street: [
      "You can see the squid-boat lamps between the buildings if you catch the right " +
        "gap — a string of green stars lying on the horizon, entirely indifferent to the " +
        "neon competing from this side.",
    ],
    bar: [
      "From here the boats are just lights on the black — green for squid, white for " +
        "the ferry, and the regulars can tell you which is which without turning round.",
    ],
  } },

  // The evening checkpoint is a mechanic where it's watchable — hint it there.
  { key: "checkpoint", m: /\bcheckpoints?\b/, fn: () => {
    if (["beach_rd_n", "stinky_bar", "blue_dog"].includes(G.room)) {
      // Same 18:00-19:00 window as WATCH POLICE (_shakedownOn) — after that the
      // cones go in the truck and the answer should say so, not lie about it.
      if (G.nightTurn < 10)
        return "The evening checkpoint, working the road south of the junction: cones, a " +
          "table, helmetless farang waved over for a paperwork stop and an on-the-spot " +
          "fine. The bars' front rows treat it as live theatre, which it is. (WATCH POLICE)";
      return "The checkpoint's packed up for the night — cones in the truck, table folded, " +
        "the road running unexamined. The first hour of the evening is the harvest; after " +
        "that the officers have somewhere better to be, and so does everyone they'd catch.";
    }
    return "No checkpoint on this stretch tonight — the police prefer the junctions, " +
      "where the catch is better.";
  } },

  { key: "rope", m: /\bvelvet rope\b|\bwristbands?\b/, lines: {
    any: [
      "The velvet rope is doing what velvet ropes do everywhere: converting a doorway " +
        "into a judgement. It has no opinion of you personally. That's the doorman's job.",
      "A rope, some brass posts, and the oldest trick in nightlife — nothing makes a " +
        "room desirable like making it briefly difficult.",
    ],
  } },

  { key: "booth", m: /\bcurrency booth\b|\bexchange booth\b|\bmoney ?changer\b/, lines: {
    street: [
      "The currency booth's rate board glows green — a number honest enough to beat the " +
        "banks and precise enough to remind you somebody is still making money on it.",
    ],
    any: [
      "No exchange in here — the only rate on offer is the bar's, and it is not posted.",
    ],
  } },

  // Bare "machine" too: the only machines the street prose names are the cash
  // machines outside the 7-Elevens, and that is the noun a player types when
  // he wants the one mechanic attached to it. Excluded are the machines the
  // word would otherwise steal — the bar games have their own handlers.
  { key: "atm", m: /\bcash ?machines?\b|\bcashpoint\b|\batm\b|\bmachines?\b/,
    unless: /slot|fruit|washing|sewing|vending|coffee|ice|time/, lines: {
    street: [
      "A glowing box that dispenses regret in ฿1000 notes, plus the fee. It has a queue " +
        "at midnight and a guard's chair nobody sits in. (WITHDRAW, if you must.)",
      "The ATM's screen glow is the coldest light on the street. Every man in this town " +
        "has stood in front of one at 1 a.m. doing arithmetic he already regrets. (WITHDRAW)",
    ],
    any: [
      "No machine in here — the till only works in one direction. The street ATMs have " +
        "the other one covered.",
    ],
  } },

  // Prose only — reads G.rain / the bake's _wxRainy, consumes no dice, moves
  // nothing (the weather->mechanics door stays the one sanctioned downpour path).
  { key: "rain", m: /\brain\b|\bdownpour\b|\bstorm\b/, fn: () => {
    if (G.rain > 0) return "It is not falling so much as arriving — a white roar off the " +
      "gulf that has turned the street into a river with lighting. The awnings are " +
      "drumming, the girls are shrieking happily under them, and nobody sane is walking " +
      "anywhere until it stops. Which it will. All at once, like a tap.";
    if (typeof _wxRainy === "function" && _wxRainy()) return "Not raining — yet. But the " +
      "air has that pressed-down weight, the geckos have gone quiet, and the street " +
      "vendors are already glancing at their tarps. Everyone on this coast can smell it " +
      "coming an hour out. You're starting to.";
    return "No rain in the sky and none coming that anyone's tarps believe in. In the " +
      "dry season the rain is a rumour the town tells to sell you a roof seat.";
  } },

  { key: "kettle", m: /\bkettles?\b|\bthermos\b/, lines: {
    any: [
      "A kettle, mid-career, never quite off the boil. Where there is a kettle there is " +
        "somebody's actual life being lived behind the trade, and it is none of your business.",
    ],
  } },

  // Mabprachan: the lake cluster's one shared view.
  { key: "lake", m: /\blake\b|\breservoir\b/, fn: () => {
    if (["lake_bar", "lake_beer", "firefly_bar", "lake_mabprachan"].includes(G.room))
      return "Mabprachan lies flat and dark across the road, holding the last of the " +
        "light the way water does long after the sky has given it up. No neon, no bass — " +
        "just insects, a dog somewhere, and the town a rumour over the trees. The expats " +
        "out here call it the lake and mean it the way you'd mean a friend.";
    return null;
  } },

  { key: "fairylights", m: /\bfairy lights?\b|\bstring lights?\b|\bled rope\b/, lines: {
    bar: [
      "Fairy lights by the metre — the soi's load-bearing decoration. Half the strings " +
        "have a dead bulb somewhere and none of them have ever been taken down, only " +
        "added to.",
      "The wiring is a handshake agreement with physics, but the effect is the effect: " +
        "any bar, anywhere, becomes somewhere you might stay for one more.",
    ],
    any: [
      "Strings of them sag between poles and shopfronts, doing the job neon does at a " +
        "tenth of the wattage and twice the charm.",
    ],
  } },

  { key: "tv", m: /\btelly\b|\btv\b|\btelevision\b|\bscreens?\b/, lines: {
    bar: [
      "The corner telly, on with the sound down, the way bar tellies live. Football, " +
        "muay thai, the news nobody reads out loud. (WATCH TV)",
      "A screen doing its quiet work above the optics — mostly ignored, until the whole " +
        "room turns to it at once, and then it's the most important object in Thailand. " +
        "(WATCH TV)",
    ],
    any: [
      "A television murmurs from somewhere inside a shophouse — the sound of somebody's " +
        "ordinary evening, carrying out into everyone else's extraordinary one.",
    ],
  } },

  // "A number" means three different things by venue — a go-go's badge, a
  // soapy's disc, Soi 6's quoted price — so answer by room, else fall through.
  { key: "numbers", m: /\bnumbers?\b|\bbadges?\b|\bfishbowl\b|\bdiscs?\b/, fn: () => {
    if (_room().barType === "gogo") return "Every dancer wears one — a plastic disc on " +
      "the bikini hip, because the music is too loud for names and the mamasan's ledger " +
      "runs on digits. You don't point at a girl here. You quote her.";
    if (_room().barType === "soi6") return "The number here isn't worn, it's said — " +
      "leaned in close, matter-of-fact, the price and the promise in one breath. Soi 6 " +
      "doesn't do menus. It does arithmetic, early.";
    if (/soapy/.test(G.room)) return "The numbered discs are the whole catalogue system — " +
      "quoted, noted, fetched. Somewhere between a deli counter and a dream, and nobody " +
      "in the building finds that strange any more.";
    if (_room().barType === "hostbar") return "The hosts sit in numbered order along the " +
      "bench — same system as everywhere else on this coast, aimed the other way. The " +
      "arithmetic doesn't care who's buying.";
    return null;
  } },

  // ── the architecture the rooms keep naming ──────────────────────────────────
  // Furniture the prose puts in the reader's eye across several rooms and no
  // noun answered to: the ramp down into the Doghouse, the villa's hedge and
  // porch, Sandy Toes' deck. Each is room-aware and returns null where the word
  // is only a figure of speech — Candy Bar is "run like a harbourmaster's deck"
  // and has no deck, and both "corridors" in the game are made of noise and
  // neon, so those deliberately fall through rather than answer about a thing
  // that isn't there.
  { key: "ramp", m: /\bramps?\b/, fn: () => {
    if (G.room === "bali_hai") return "The pier ramp, wide enough for a pickup and worn " +
      "smooth down the middle by forty years of the same trolleys. The piwins have the " +
      "corner of it, which is the good corner, because everything coming off a boat has " +
      "to pass them and everything going onto one is already late.";
    if (G.room === "doghouse" || G.room === "pratumnak_clubs")
      return "A short concrete ramp dropping under the villa — no rail, wet in one corner " +
        "all year, and steep enough that everybody going down it does the same small " +
        "involuntary hurry. Whatever the building was for originally, it was not this.";
    return null;
  } },
  { key: "basement", m: /\bbasements?\b|\bcellars?\b/, fn: () =>
    (G.room === "doghouse" || G.room === "pratumnak_clubs")
      ? "A villa basement with no windows anywhere, which is the entire design: nothing " +
        "in here tells you the hour, and the aircon is set for people who intend to stay. " +
        "Somebody's cold store or somebody's garage once. It keeps the temperature it kept then."
      : null },
  { key: "hedge", m: /\bhedges?\b/, fn: () => /succubus|orchid|pratumnak/.test(G.room)
    ? "The hedge is the point: kept high, kept dense, kept trimmed by somebody at an hour " +
      "when nobody is watching. Discretion here is landscaping. A place that wanted your " +
      "attention would have put up neon and saved on the gardener."
    : null },
  { key: "porch", m: /\bporch(es)?\b|\bveranda(h)?\b/, fn: () => {
    if (G.room === "orchid_club") return "One orchid in the porch, in a pot, immaculate, " +
      "replaced the moment it turns — the only thing out here doing the job neon does " +
      "everywhere else. No sign, no barker. If you needed telling, you are not expected.";
    if (/succubus|villa|orchid/.test(G.room)) return "A proper villa porch, tiled and swept, " +
      "with shoes off to one side and the door propped just enough to let the cold air out. " +
      "The step up onto it is where the street stops, and the room behind it knows it.";
    return null;
  } },
  { key: "deck", m: /\bdecks?\b/, fn: () => G.room === "sandy_toes"
    ? "A raised wooden deck, one step up off the pavement and a rail along the front — and " +
      "that step is the whole business model. It is just enough of a threshold that the " +
      "soi's pullers won't come up it, so the bar gets the men who wanted to sit down " +
      "rather than the men who were caught."
    : null },
  { key: "fridge", m: /\bfridges?\b|\bcool ?box\b|\bchiller\b/, fn: () => {
    if (_isHotelRoom(G.room)) return null;          // the mini-bar has its own handler
    if (!_inBar()) return null;
    return _pickVary([
      "The bar fridge: sliding glass, condensation on the inside, ranks of the same three " +
        "lagers and one bottle of something nobody has ordered since it went in. It hums, " +
        "stops, thinks about it, and starts again.",
      "A fridge doing the hardest job in the building — held at the temperature this town " +
        "considers non-negotiable, opened four hundred times a night, and never once " +
        "cleaned during opening hours.",
      "Beer, water, a row of mixers, and the ice box beside it that matters more than any " +
        "of them. Everything in here is cold in the way that is the actual product.",
    ], "fridgescenery");
  } },
];

// ── HANDOVER ─────────────────────────────────────────────────────────────────
// UNADVERTISED as of 2026-08-24: the macro game these hand a character to
// (Second Road) is being set aside for the Bangkok follow-on, so the verbs no
// longer appear in HELP or autocomplete — a game that no longer exists should
// not be promised on a surface a player reads. The MACHINERY IS DELIBERATELY
// KEPT and still works if typed: it is ~190 lines, tested (tests/js/baton.test.js),
// depended on by nothing else, and it is a working implementation of "export a
// character subset across games at a clean seam" — which is exactly what a
// Pattaya-raised protagonist arriving in Bangkok would want. Cheaper to leave
// dormant than to rebuild. NB Second Road still syncs this repo as read-only
// upstream and another agent maintains it, so removing the baton outright is a
// cross-repo decision, not a refactor (see CLAUDE.md, repo ownership).
// The baton: hand this character to the macro game (Second Road) and take it
// back later. exportBaton/importBaton have existed in engine-core since the
// contract was agreed, with NOTHING calling them — no verb, no button, no
// storage path — so a baton had nowhere to go and the only thing that ever
// completed the round trip was a vm test. Second Road's side is built; this is
// the entry point that closes the loop.
//
// Split the usual way: the engine decides whether the handover is legal and
// says what is in it, and main.js writes the file. Same division as SHARE,
// where the engine prints the card and the frontend does the clipboard.
function _doHandover() {
  const r = batonReady();
  if (!r.ok) {
    _say("Not now. " + r.why.charAt(0).toUpperCase() + r.why.slice(1) + ".", "alert");
    _say("A handover happens at dawn, between nights. Finish the night you're in " +
      "and try again.", "dim");
    return;
  }
  const b = exportBaton();
  _say("── HANDING OVER ──", "win");
  _say(_fmt("Day {d} · ฿{m} in your pocket, ฿{bank} banked · สนุก {h}" +
    "{bar}.", {
      d: G.day, m: G.money, bank: G.bank, h: G.happy,
      bar: G.flags && G.flags.barOpen ? " · your bar is open" : "",
    }));
  _say("Everything that makes this person who they are travels with them: what " +
    "they know, who they know, what they owe, and who owes them. The night itself " +
    "does not — a body arrives fresh.", "dim");
  _say("(Your save here is untouched. Bring the same character back with RESUME.)", "dim");
  return b;
}

// RESUME is entirely a frontend affair — it has to open a file picker, which
// the engine cannot and should not do. main.js intercepts it. This case exists
// so the verb explains itself rather than dead-ending in "I didn't understand
// that" on a headless build or an older frontend.
function _doResume() {
  _say("RESUME takes a character back from the macro game — it opens a file picker " +
    "for the baton you were handed.", "dim");
  _say("Nothing happened: this build has no file picker wired to it.", "alert");
}

// ── WEAR ─────────────────────────────────────────────────────────────────────
// Only the amulet is wearable, and deliberately not straight away: it came off
// the sand on a snapped cord, so putting it on costs a trip to a 7-Eleven and
// twenty baht. That is the whole design of the step — wearing it has to be a
// DECISION ("this is mine now"), not a state that arrives with the pickup.
function _doWear(arg) {
  const a = String(arg || "").trim().toLowerCase();
  if (!a) { _say("Wear what?"); return; }
  if (!/amulet|buddha|pendant|medallion/.test(a)) {
    // a plausible verb never dead-ends — see the Zork ledger in CLAUDE.md
    _say(_pickVary(_WEAR_NO, "wearno"));
    return;
  }
  if (!(G.itemLoc.amulet === "inventory")) { _say("You aren't carrying it."); return; }
  if (G.amuletWorn) { _say("It's already round your neck."); return; }
  if (!(G.itemLoc.cord === "inventory")) {
    _say("The cord it came on is snapped — perished through, probably years ago in the " +
      "sand. It'll take a new one, and a new one is the sort of thing a 7-Eleven sells " +
      "off the counter for about twenty baht. (BUY CORD.)");
    return;
  }
  G.itemLoc.cord = null;
  G.amuletWorn = true;
  _say("You thread the new cord through and put it on. The clay sits cool against your " +
    "chest for a second and then stops being noticeable, the way these things do. " +
    "Somewhere between picking it up off the sand and this, it stopped being something " +
    "you found and started being something you wear.", "win");
  _addHappy(1);
}
const _WEAR_NO = [
  "Not really a wearing sort of thing.",
  "You hold it up, consider it, and put it back. No.",
  "That isn't going round your neck and you know it.",
  "You could. You are not going to.",
];

function _doRead(arg) {
  if (/news|paper/.test(arg)) return _doPaper();
  if (/column|owl/.test(arg)) return _doColumn(); // READ (THE) COLUMN / NITE OWL
  // READ MENU and the bare MENU verb are separate paths and both have to reach
  // the Vic's generated card, or one of the two natural phrasings dead-ends.
  if (G.room === "queen_vic" && /menu|card|price|board/.test(arg || "")) { _qvCard(); return; }

  const flavor = _roomRead(arg);
  if (flavor) { _say(flavor); return; }
  if (/\bsign|signage|arrows?\b/.test(arg)) {
    const s = _room().sign && SIGNS[_room().sign];
    if (!s) {
      // Auntie Nok's hand-lettered cart sign — the ฿5/bottle offer her blurb
      // promises, wired to the real SELL BOTTLES mechanic (she buys where she stands)
      if (_npcsHere().includes("nok")) {
        _say("Auntie Nok's hand-lettered cart sign: “ขวด ห้าบาท” — five baht a returned bottle.", "thai");
        _engineSpeak("ขวด ห้าบาท");
        _say("(SELL BOTTLES here to cash in any empties you're carrying — the beach is full of them.)", "dim");
        return;
      }
      _say("No signs worth reading here."); return;
    }
    _say(`The sign reads: ${s.th}`, "thai");
    _engineSpeak(s.th);
    _say(`(${s.hint})`, "dim");
    return;
  }
  const id = _findItem(arg);
  if (!id) { _say("You don't have that to read."); return; }
  if (id === "masseuse_note") return _readNote();
  const it = ITEMS[id];
  if (id === "receipt") {
    _say(it.readTh, "receipt"); // mono, un-enlarged Thai so the columns align
    _say(it.readEn);
    if (!_flag("knowWasHere")) {
      _setFlag("knowWasHere");
      _say("(Soi Buakhao, 3 a.m. That's a lead — and proof of where you were.)", "dim");
    }
    return;
  }
  if (id === "wallet") { _say(it.desc); return; }
  _say(it.desc);
}

// The Orchid Room describes two untouchables at the corner tables — a patched MC
// president and the silent Thai man everyone defers to (the real power behind
// White Dish). They're scenery you can't approach: try, and the muscle (or a
// suddenly-serious Powers) heads you off. Keeps the room's central menace intact
// without dead-ending the player on "nobody by that name."
const _ORCHID_DEFLECT = [
  "You take half a step toward the good table and a wall of a man in a too-tight polo is simply " +
    "there — not touching you, not needing to. \"Not that table, boss.\" A smile with nothing " +
    "behind it. \"Everything else in this room is for you. That corner isn't on the menu.\"",
  "A hand the size of a dinner plate settles on your shoulder before you've finished turning, and " +
    "walks you back two steps, pleasant as a maître d'. \"Nobody at that table is taking meetings, " +
    "na. Drink, dance, spend — anything but that.\" The men in the corner never even look up.",
  "Powers clocks where you're looking and is beside you fast, steering you off by the elbow, the " +
    "party grin gone. \"Mate. MATE. You don't go over there. You don't LOOK over there. Have a drink " +
    "on me, yeah? Trust me on this one.\" For once he isn't performing.",
  "Two men you hadn't noticed peel off the wall and close the lane to the corner tables without a " +
    "word — just standing where you were about to walk. Whatever that quiet man is, he is emphatically " +
    "not tonight's entertainment.",
];

function _doTalk(arg, topic) {
  _doTalkBody(arg, topic);
  // surface the player's response options in the prose, every conversational turn
  if (_convoActive()) _convoPrompt(_convoActive());
}
// Is the person you're talking to right now holding this topic? Used to let a
// bare word lose to a verb everywhere EXCEPT mid-conversation with someone who
// has something to say about it.
function _convoTopicHere(topic) {
  const id = G.convo;
  if (!id || !NPCS[id]) return false;
  if (!_npcsHere().includes(id)) return false;
  const d = _pickDialogue(id, topic);
  return !!(d && _topicHits(d.topic, topic));
}

// Asking for it AGAIN — the one way back to a story you've already had. Repeats
// are the gist by design (nobody retells unprompted), so this is how a player
// who wants the whole thing says so: "ask terry about white dish again", "tell
// me the whole story". Stripped off the topic here so the node lookup still
// matches; the flag rides through to _deliver. Deliberately NOT the bare AGAIN
// verb, which repeats your last command and must keep doing so.
const _RETELL_RE = /\s*\b(again|once more|one more time|whole story|full story|properly|in full)\b\s*$/i;

const _HELLO_AGAIN = [
  "{n} has said hello. She raises her glass an inch instead and waits for you to bring a subject. (ASK {N} ABOUT <something>.)",
  "\"Mm?\" {n} is already looking at you. The greeting was earlier; this is the part where you say something. (ASK {N} ABOUT <something>.)",
  "{n} tilts her head — the look of a woman who has been said hello to and is now waiting for the rest. (ASK {N} ABOUT <something>.)",
  "A small smile from {n}, and nothing else: you have her attention, and it wants a question. (ASK {N} ABOUT <something>.)",
];
function _doTalkBody(arg, topic) {
  arg = (arg || "").trim();
  let _retell = false;
  if (topic && _RETELL_RE.test(topic)) { _retell = true; topic = topic.replace(_RETELL_RE, "").trim(); }
  // The coconut bar (north_beach): the freelance ladies are the room's whole
  // point and the prose names them, so TALK must reach them (playtest #16) —
  // approaching deliberately arms the same freelancer encounter that otherwise
  // arms by chance on the eligible streets. Once a night, like the encounter.
  if (G.room === "north_beach" && /lad(y|ies)|girls?|freelancers?|women|coconut/i.test(arg)) {
    if (G.pendingEnc) { _say("One thing at a time."); return; }
    if (G.encDone.freelancer) {
      _say("The stools under the palms have emptied for the night — whoever was " +
        "working the dark sand has found her walk-up or called it. The cigarette " +
        "embers are somebody else's now.");
      return;
    }
    _startEnc("freelancer");
    return;
  }
  // the piwin at a stand is a real person in the fiction and not an NPCS entry
  if (/^(piwin|motosai|driver|bike ?boy|taxi)$/i.test(arg)) {
    if (!_piwinHere()) { _say("No stand here — the bikes are on the corners."); return; }
    return topic ? _piwinAbout(topic) : _piwinTalk();
  }
  // Pronoun / bare target → the person already in play (scope resolution). The
  // resolved id flows on as the "name" (_findNpc matches an exact id), regulars
  // included: one cast, one talk path. Ambiguous/none falls through to the usual
  // not-here / nobody handling below.
  if (!arg || _PRONOUN.test(arg.toLowerCase())) {
    const a = _resolveActor(arg, _addressable());
    if (a) arg = a;
  }
  if (G.dog && arg && _isDogWord(arg)) {
    _say(_dogN(_pickVary([
      "Sai Krok gets the whole story of your night. He listens like a professional — head on one side, " +
        "the full attention — and offers no opinion, which is the kindest thing anyone's done today.",
      "Sai Krok hears you out, yawns hugely at the important part, and leans against your leg. " +
        "That's the whole review.",
      "He looks up at the sound of his name, holds your eye for a long second, and goes back to " +
        "reading the street. Conversation over; nothing was needed.",
    ], "dogtalk")));
    return;
  }
  if (!arg) {
    // bare TALK with nobody in play: name the room, don't shrug "nobody by that name"
    const here = _npcsHere().map(n => _npcLabel(n)); // one cast — the regulars are in it
    _say(here.length ? "Talk to whom? Here: " + here.join(", ") + "."
      : "Nobody here to talk to but yourself, and you've heard all that before.");
    return;
  }
  const npc = _findNpc(arg);
  if (!npc) {
    // The Orchid Room's corner-table untouchables: described, never approachable.
    if (G.room === "orchid_room" &&
        /thai man|quiet man|\bboss\b|president|\bmc\b|banquette|good table|best table|silent|\bpower\b|man in the corner|corner table/i.test(arg)) {
      _say(_pickVary(_ORCHID_DEFLECT, "orchiddef"));
      return;
    }
    // (a NAMED regular already resolved through _findNpc above — one cast)
    if (_inBar() && /patron|regular|expat|customer|guy|bloke|farang/.test(arg)) {
      _doPatron();
      return;
    }
    // A named character who exists but is elsewhere: a moved regular, or an NPC
    // at another bar. Place them (or say the regulars move about) instead of a
    // flat "nobody here", which reads as a bug mid-conversation. See _elsewhereLine.
    const away = _elsewhereLine(arg);
    if (away) { _say(away); return; }
    // Somebody the ROOM ITSELF just put in front of you \u2014 the dozing motosai
    // driver, the security on the plastic stools, the women on a massage step.
    // "Nobody by that name here" about a man described two lines up reads as a
    // bug rather than as flavour, and the house rule is that a plausible verb
    // gets a voiced refusal (thorough-player playtest B#3, 2026-08-23).
    if (_promptedFolk(arg)) return;
    _say(_pickVary(_NOBODY_NAME, "noname")); _noteMiss("noname", arg);
    return;
  }
  _convoStart(npc); // this NPC is now the active conversation partner (bare topics aim here)
  _trace(topic ? "ask" : "talk", NPCS[npc].name, topic || ""); // breadcrumb
  // remember the last day you sat with her AFTER this turn's lines (so "yesterday"
  // claims read the previous visit, not this one) — see _bondTalk
  const _seenAfter = NPC_ROLES[npc] ? npc : null;
  // Try the literal topic first (so a node keyed on a word that's ALSO a synonym —
  // Mercedes's "german" backstory vs the german→language rule — keeps its literal
  // match), then fall back to the synonym-normalised key when nothing literal hit.
  // This makes typed "ask jenny about boyfriend" resolve on the first ask (boyfriend
  // → sponsor) without stealing literal keys. _pickDialogue returns the topicless
  // greeting on a miss, so `!d.topic` is the miss signal.
  // Tan's roll-call of "the others" is generated, not authored: it names the
  // ones you have actually sat down with and points obliquely at the ones you
  // haven't, which makes the hub a soft guide to the rest of the cast instead
  // of a wall of names. It cannot be a dialogue `fx` — those fire on first
  // delivery only, so the list would freeze on the night you first asked.
  if (npc === "tan" && _convoTopic(topic || "") === "others" && _tanOthers()) return;
  if (npc === "tan" && topic && typeof _tanAbout === "function" && _tanAbout(topic)) return; // "meet somebody, then ask me who they are" — honoured
  if (npc === "nont" && topic && typeof _nontLocate === "function" && _nontLocate(topic)) return; // the priced locator: anybody, tonight, ฿200
  // the civilian at the table: "how much" is not a topic she answers, it's the
  // scene (chameleon economy) — no dialogue node, so the wheel never advertises it
  if (npc === "cream" && topic && (topic === "price" || _convoTopic(topic) === "price") &&
      typeof _chamAsk === "function") { _chamAsk(); return; }
  // Your own staff, at the bar you own, greet you as the guv'nor and won't sell
  // you your own girls — the customer register is wrong once you sign the lease.
  // Personal topics fall through to normal dialogue (an owner asks after her kids).
  if (typeof _ownBarTalk === "function" && _ownBarTalk(npc, topic || null)) return;
  // Some regulars have a sore subject that turns them belligerent (Fergie: Bert,
  // Candy, their bars). It PRE-EMPTS the node lookup — you don't get a story
  // out of a man you've just set off — so it sits above _pickDialogue, where
  // the patron path always had it.
  if (topic && NPCS[npc].rage && NPCS[npc].rage.some(k => topic.includes(k))) { _patronRage(npc); return; }
  let d = _pickDialogue(npc, topic || null);
  if (topic && (!d || !d.topic)) {
    const norm = _convoTopic(topic);
    if (norm !== topic) { const d2 = _pickDialogue(npc, norm); if (d2 && d2.topic) d = d2; }
  }
  // The girl you jilted tonight — walked out with somebody else in front of
  // her — gives one cooled hello before normal service resumes. The bond and
  // rep costs were already paid; this is the cost being VISIBLE.
  if (!topic && NPC_ROLES[npc] && G.soc.miffed && G.soc.miffed[npc] === G.day) {
    delete G.soc.miffed[npc];
    _say(_fmt(_pickVary(_MIFFED_HELLO, "miffedhello"), { n: NPCS[npc].name }));
    return;
  }
  // a regular you TALK to warms up: generic Tinglish register for the filler
  // girls, unless she has a more specific line (a topic, or a bond-gated entry
  // that just fired). Hand-authored NPCs speak their own bond: lines instead.
  if (!topic && NPCS[npc].filler && NPC_ROLES[npc] === "hostess" &&
      _bondTier(npc) >= 2 && !(d && d.bond)) {
    _bondTalk(npc);
    if (typeof _otherLedger === "function") _otherLedger(npc);
    _questOffer(npc);
    (G.seenDay = G.seenDay || {})[npc] = G.day;
    return;
  }
  if (!d) {
    _say(topic ? `${NPCS[npc].name} doesn't have much to say about that.` :
      `${NPCS[npc].name} smiles politely.`);
    return;
  }
  // A topic that found no node: say so in her voice. Falling through to the
  // greeting spent its repeat path on a question never asked (playtests 2026-08-22).
  if (topic && !d.topic && /\bquiz\b|trivia/.test(topic)) { _say(_quizTalk()); return; }
  if (topic && !d.topic && /\bdarts?\b/.test(topic)) { _say(_dartsTalk()); return; }
  if (topic && !d.topic && G.dog && (/\bdogs?\b|sai ?krok|\bpuppy\b|\bpaddy\b/.test(topic) || _isDogWord(topic))) {
    _say(_dogTalk(npc)); // the dog at your heel is a subject everyone has
    return;
  }
    // An authored girl asked the three questions every girl gets — home, family,
  // plan — and stonewalled where a filler girl would have answered (Eamonn,
  // round 39: a dozen Soi 6 girls "went dead flat"). The filler pools are the
  // trade's stock answers; a story girl without her own line draws from them.
  if (topic && !d.topic && NPC_ROLES[npc] === "hostess" && !NPCS[npc].filler && /^(home|hometown|village|family|plan|future|dream)$/.test(_convoTopic(topic) || topic)) {
    const t = _convoTopic(topic) || topic;
    const from = _H_FROM[_hh(npc, 3) % _H_FROM.length];
    const line = /home|village/.test(t) ? `"${from}, Isan side. Small village, big family." She says it like a postcode, and then, softer: "Very far."`
      : /family/.test(t) ? _H_FAMILY[_hh(npc, 7) % _H_FAMILY.length].replace(/\{from\}/g, from)
      : _H_PLAN[_hh(npc, 11) % _H_PLAN.length];
    _say(`${NPCS[npc].name}: ${line}`);
    _questOffer(npc);
    return;
  }
  // Her own stated reason must be askable: she just told you her friend takes
  // care of her, and "ask about sponsor/friend" answered "not my story" one
  // line later (grapevine playtest F3, 2026-08-25). Generic, so every kept
  // girl on the roster answers — in town he is a subject she closes gently;
  // gone, a fact of the ledger she is entirely unembarrassed about.
  if (topic && !d.topic && NPC_ROLES[npc] === "hostess" &&
      typeof _hasSponsor === "function" && _hasSponsor(npc) &&
      /\bsponsor\b|\bfriend\b|take care|\bboyfriend\b|your man\b/.test(topic)) {
    _say(_sponsorInTown(npc)
      ? `${NPCS[npc].name} glances at her phone, then away. “He is good man. Older. ` +
        "He fly home soon, na — then I am working girl again.” A small, closing " +
        "smile. “We no talk about him in here. Is better for everybody.”"
      : `${NPCS[npc].name} shrugs, entirely matter-of-fact. “He send every month, he ` +
        "come two time a year. I no ask his business, he no ask mine.” She taps the " +
        "bar twice. “Is arrangement, not love story. Love story is extra.”");
    return;
  }
  // …and the phone and the bar share a memory: money you sent her is a thing
  // she remembers in person (grapevine playtest F11 — Pukky texted the medicine
  // ask, took the ฿300, then answered "that one I don't know" at her own rail).
  if (topic && !d.topic && G.soc.given && G.soc.given[npc] > 0 &&
      /medicine|\bmama\b|\bsick\b|hospital|\bmoney\b|\bsend\b/.test(topic)) {
    _say(`${NPCS[npc].name} puts a hand flat on her heart, no performance in it. ` +
      "“You help me that time. I no forget, na. My family also no forget — they " +
      "ask, who is this farang?” A quick grin. “I say: good one. Rare model.”");
    return;
  }
  // Have you met? One permanent book for the whole cast since retells were
  // retired — a miss only says "not my story" to somebody you've already got
  // talking; a stranger still gets the greeting.
  const _met = (G.talked[npc] || []).length > 0;
  if (topic && !d.topic && _met) {
    // Mort is the town's designated observer — "I watch, I write it down" — so
    // ASK MORT ABOUT <somebody he'd know> must pay off rather than dead-end. He
    // knows exactly who; he just won't hand it across a bar, and he points at
    // where the gossip actually lives. Self-excluded, or he'd decline to gossip
    // about himself.
    if (npc === "mort") {
      const who = String(topic).trim();
      const known = Object.keys(NPCS).find(i => i !== "mort" &&
        (NPCS[i].name.toLowerCase() === who || NPCS[i].name.toLowerCase().split(" ").pop() === who));
      if (known) {
        // HE SAYS IT ONCE PROPERLY, AND THEN HE STOPS SAYING IT. The full
        // sixty-word refusal printed identically for every name a persona tried
        // — "characterful once, a wall by the third" (round 23), and she tried a
        // dozen. A man who declines the same question all night gets shorter
        // about it, and Mort of all people would find repeating himself
        // undignified. Counted per night, so a new evening restores the speech.
        G.mortDeclined = (G.mortDeclinedDay === G.day) ? G.mortDeclined + 1 : 1;
        G.mortDeclinedDay = G.day;
        const nm = NPCS[known].name;
        if (G.mortDeclined === 1) {
          _say(`Mort's biro stops. He looks at you over the horn-rims, and for a second ` +
            `you see forty years of watching behind them. \u201c${nm}.\u201d He does not write ` +
            `it down; he already has, somewhere. \u201cI know exactly who that is. But I do not ` +
            `put people in the column by their names, to their faces, across a bar. That is ` +
            `not the job.\u201d The biro starts again. \u201cRead the COLUMN. If they are in it, ` +
            `they are in it as everybody \u2014 the only fair way to do it.\u201d`, "dim");
        } else if (G.mortDeclined === 2) {
          _say(`\u201c${nm},\u201d Mort agrees, not looking up. \u201cAlso not going in the column ` +
            `by name. You are working through the room alphabetically and I admire the ` +
            `method, but the answer does not improve.\u201d`, "dim");
        } else if (G.mortDeclined === 3) {
          _say(`The biro does not stop this time. \u201cSame answer, and you knew it before you ` +
            `asked.\u201d A page turns. \u201cTry me on a THING rather than a person. Things I will ` +
            `talk about until they close.\u201d`, "dim");
        } else {
          _say(`Mort raises the biro an inch without looking up \u2014 the whole reply, ` +
            `delivered in one gesture.`, "dim");
        }
        return;
      }
    }
    // Before the brush-off: can he talk about it because HE said it? A node of
    // his own that names the thing as a proper noun is a better answer than
    // "not my story" about a word out of his own mouth (see _selfNamedNode).
    const own = _selfNamedNode(npc, topic);
    if (own) { _deliver(npc, own, false, true); _questOffer(npc); return; } // asNew: a new question, an old node
    // she HAS that story but its gate hasn't opened: a "not yet", not a "not mine"
    const _n2 = _convoTopic(topic);
    const gated = NPCS[npc].dialogue.some(e => e.topic && String(e.topic).split("|").some(k => k === topic || topic.includes(k) ||
      (_n2 !== topic && (k === _n2 || _n2.includes(k)))));
    _say(gated ? _topicLocked(npc) : _topicMiss(npc));
    _questOffer(npc);
    return;
  }
  // A bonded girl with nothing new to say printed her hello's gist three times
  // in a row — "the same eleven words at me like a doorbell" (Frank, round 38).
  // The hello lands once a night; after that a bare TALK asks for a subject.
  // The doctrine stands: the SECOND talk is the terse gist. It is the third and
  // fourth that turn her into a doorbell.
  // Scoped to the girls (a regular's gist is his character), and only to a hello
  // already SEEN — a new when-gated hello still lands; it is the repeat of a
  // repeat that becomes the doorbell.
  const _helloSeen = !topic && !d.topic && !d.gives && !d.sets && !d.choices && !d.asks && !_retell &&
    NPC_ROLES[npc] && (G.talked[npc] || []).includes(NPCS[npc].dialogue.indexOf(d));
  if (_helloSeen) {
    G.soc.helloed = G.soc.helloed || {};
    G.soc.helloed[npc] = (G.soc.helloed[npc] || 0) + 1;
    if (G.soc.helloed[npc] >= 2) {
      _say(_fmt(_pickVary(_HELLO_AGAIN, "helloagain"), { n: NPCS[npc].name, N: NPCS[npc].name.toUpperCase() }), "dim");
      if (typeof _otherLedger === "function") _otherLedger(npc);
      _questOffer(npc);
      return;
    }
  }
  _deliver(npc, d, _retell);
  if (NPCS[npc].manager) _managerChatTick(npc);
  // the other ledger: sitting with a girl you've earned a tier with, she shows
  // you the books the transaction hides (engine-play _otherLedger). After the
  // talk, never instead of it — it's a follow-on beat, like a quest offer.
  if (!topic && typeof _otherLedger === "function") _otherLedger(npc);
  _questOffer(npc);
  if (_seenAfter) (G.seenDay = G.seenDay || {})[_seenAfter] = G.day;
}

// ── Conversation layer ───────────────────────────────────────────────────────
// A thin layer over the parser (NOT a replacement): once you're talking to
// someone, bare words resolve against them, so play reads like a conversation
// ("angela" / "90s" / "depression" / "bye") instead of "ask angela about …"
// every line. It is invoked ONLY from doCommand's default branch, so every real
// verb, direction, and modal gate keeps first refusal — bare topics can never
// shadow LOOK, MAP, movement, or a shop. See _convoActive/_convoStart in
// engine-core.js for the sticky partner pointer and its self-teardown.

// Natural phrasings → the canonical topic word the dialogue nodes are keyed on.
// Topic matching (see _pickDialogue) is "player-topic CONTAINS
// node-key", so a phrasing that already contains the key ("your wife" → wife,
// "the darkside" → darkside) resolves with no help — this list is ONLY for
// phrasings that share no word with the key ("where you from" → home). Keys
// chosen from the topics that actually recur across the roster. Ordered: first
// regex to match wins, so specific sits above general.
const _CONVO_TOPIC_RULES = [
  // A quest tells you to let Glam "tell you about the tour" and the hint beside
  // it says ASK GLAM ABOUT MUSIC — both honest, but "tour" is the word in the
  // sentence and therefore the word a player types (persona report 2026-08-23,
  // now caught by tools/asktopic-audit.mjs). One alias row serves typed ASK, the
  // wheel and the conversation layer alike, which is what this table is for.
  [/\btours?\b|\bon the road\b|\bgigs?\b|\btouring\b/,                        "music"],
  [/\bmunich\b|\bm\u00fcnchen\b|\bbavaria\b/,                                  "german"],
  [/\bwhite dish\b|\bwdg\b/,                                                  "ryan powers"],
  [/\bvillage\b|\bhometown\b|\bsad story\b|\byour story\b/,                   "home"],
  // the after-hours question (Dex, round 38): "after", "late", "karaoke", "bike" all missed on the girl who then drove him there
  [/\bafter ?hours?\b|\bafter (?:two|midnight|close|closing|work|the bar)\b|\blate[- ]?night\b|\blate\b|\bkaraoke\b|\bthai disco\b|\bran ?lao\b|\bmotorbike\b|\bwhere.*(?:go|party) after\b/, "late"],
  // …and the words the column itself puts in a reader's mouth: Box 15's
  // personal taunts "not one of you has asked me why", and the reader typed
  // exactly "personals"/"box 15" at its author and got the generic shrug
  // (Tyler, 2026-08-26 — the plotted mystery rebuffing the ask it solicits)
  [/\bcipher\b|four letters|\bsign.?off\b|box ?15\b|\bpersonals?\b|\bowl\b/, "signoff"],
  // Doyle's President's-Table recon: the desc says ASK ABOUT THE TABLE, but a
  // player who forgot that types the natural words — and vignette quests don't
  // show in the journal to remind them (civilian playtest F1, 2026-08-26)
  [/\bpresident\b|back room|good table|patched vest|blue label|the president|orchid room/, "table"],
  // The same class, from the next blind session: an NPC volunteers a subject in
  // their own greeting and then misses on the word they used (persona reports
  // A#18 / B#4, 2026-08-23). Where a node already exists under a different key,
  // one alias row serves typed ASK, the wheel and the conversation layer alike.
  [/\bkinnaree\b|\bthe missus\b|his wife|your wife/,                          "wife"],
  // The filler girls' hash-picked bios volunteer sisters, a son, school fees and
  // a dream — words a courting player types straight back and missed on (Frank,
  // 2026-08-26: "ask manow about sisters/son" brushed off while her own
  // family/plan nodes held the answers). NOTE the table is global first-match:
  // "coffee shop" stays with Cream's "job" rule below, so keep this one narrow.
  [/\bsisters?\b|\bbrothers?\b|\bson\b|\bher boy\b|\bkids?\b|\bchildren\b|school fees?|\bmama\b|her mother/, "family"],
  [/\bdream\b|\bfuture\b|\bsavings?\b/, "plan"],
  [/\bhosts?\b|\bhost bar\b|the boys\b/,                                      "scene"],
  [/\bsims?\b|\bunlock(ing|ed)?\b|screen fix|cracked screen/,                  "job"],
  [/house rules?|the rules\b|your rules/,                                       "rules"],
  // the nomad's pitch words — a player types back the ambition Kyle volunteers
  [/\bhospitality\b|bar ?manage(?:r|ment)?\b|\bthe pivot\b|\bpitch(?:ing|ed)?\b/, "bar"],
  // The Act One safe: four people hold a piece of the code and every one of them
  // holds it under `oy`, so the words a player actually types missed on the
  // critical path (persona report B#5, 2026-08-23). Literal keys still win, so an
  // NPC with a real `code`/`safe` node keeps it.
  [/\bcode\b|\bsafe\b|\bkeypad\b|\bcombination\b|\bthe pin\b/,             "oy"],
  [/where.*(from|grew up|born)|whereabout|your country|back home|where.*\blive/, "home"],
  [/smartphone|\bphones\b|the phones|\bline app\b|social media/,                   "1998"],
  [/for a living|line of work|what.*you do\b|what.*you did/,                     "job"],
  [/marri(ed|age)|the missus|other half|settle down/,                            "wife"],
  [/\bkids?\b|children|your folks|your parents/,                                 "family"],
  [/\bcash\b|how much.*(make|earn|cost)|afford|expensive/,                       "money"],
  [/\bmy score\b|out of ten|rate me|how.*(you )?rate|\brating\b/,                 "rating"],
  [/\blanguages?\b|\benglish\b|\bkorean\b|\bjapan(ese)?\b|\bfrench\b|\bgerman\b|do you speak/, "language"],
  [/front stool|the window/,                                                     "stool"],
  [/\bcranes?\b|\bnapkins?\b|\borigami\b|paper bird/,                             "crane"],
  [/\bscam\b|\bhustle\b|the act\b|playing me|working me|you real|for real/,       "game"],
  [/you okay|you alright|are you (ok|alright|fine)|everything okay/,              "okay"],
  [/\bfollower|instagram|tiktok|content|famous|algorithm|the app/,                "content"],
  [/\btemper\b|\bangry\b|\bjealous\b|too much|crazy/,                             "temper"],
  [/you lie|lying|the truth|honest with me/,                                     "lie"],
  [/\bbook\b|studying|\bstudy\b|\bdegree\b|university|accounting|the textbook/,   "book"],
  [/football|soccer|liverpool|united|the match|premier league|the game\b/,       "football"],
  [/homesick|miss home|miss your home/,                                          "sad"],
  [/the free|free drink|welcome drink|why.*free|on the house/,                   "free"],
  [/go.?go|the gogo/,                                                            "go-go"],
  [/\btom\b|are you.*tom|lesbian|you gay|the ladies/,                            "tom"],
  [/danc(e|ing|er)\b|why.*stage|on stage/,                                             "dance"],
  [/warn (her|them)|tell her the truth|should.*tell her|help nong|save nong/,           "warn"],
  [/changed? her|save (her|them)|\brescue\b|good girl now|left the bar|out of the bar/,  "change"],
  [/\bsponsor\b|your man|who take care|klaus|\bdave\b|\bboyfriend\b|my friend|your friend|the friend/, "sponsor"],
  [/the ring|promise ring/,                                                      "ring"],
  [/ladyboy|kath?oey|were you born|are you.*(girl|woman|real)/,                  "ladyboy"],
  [/\bcigarette|ยาดม|inhaler|\byadom\b|\bciggy\b/,                                "smoke"],
  [/military|armed forces|the forces|you serve|were you in/,                     "navy"],
  [/ninet(y|ies)|1990s|the 90s/,                                                 "90s"],
  [/nightlife|the scene/,                                                        "scene"],
  [/this town|round here|around here/,                                           "pattaya"],
  [/this country|living here|life (out )?here|being here/,                       "thailand"],
  [/the ladies|working girls/,                                                   "girls"],
  [/love life|relationship|\bdating\b|you single|got a girl/,                    "girlfriend"],
  // The White Rabbit (Naklua) — Fast Eddy and his Lao family (docs/rabbit-arc.md)
  // NB: not \bryan\b / \bpowers\b — doug owns the "ryan" topic and bert "ryan powers".
  [/white dish|\bwdg\b|the rollup|soi ?6 bar/,                                   "wdg"],
  [/\bvegas\b|\bbitcoin\b|\bcrypto\b|the wallet|the coin|tumbl(e|ed|ing)/,       "vegas"],
  [/\bsober\b|don'?t (you )?drink|the wagon|drinking|year off|the incident/,     "sober"],
  [/the handle|your handle|nickname|real name|\bhacker\b/,                       "rabbit"],
  [/white rabbit|this bar|this place|your bar|the nominee|the books|the ledger|the accounts/, "bar"],
  [/the boss|\beddy\b|the owner/,                                                "eddy"],
  [/\bnuan\b|the mamasan|your mama\b/,                                           "mama"],
  [/you like me|why.*(nice|warm|like me)|into me|interested in me|flirt/,        "likeyou"],
  [/\bcousins?\b|relatives|all related|one family|your people/,                  "family"],
  // Nont (Buakhao market — docs/bangkok-concept.md)
  [/\brabbit\b/,                                                                 "rabbit"],
  [/\bmom\b|\bmum\b|mother|\bschool\b|dropped? out/,                             "family"],
  [/\bhustle\b|computers?|\btech\b|hacking|unlock/,                              "job"],
  [/\bnont\b|\balex\b|two names|half thai|luk ?khrueng|mixed|farang or thai/,    "name"],
  // a girl's own child → her family node (the common case). Duangjai (Nont's
  // mother) keeps her son-story: it is keyed on his NAME, so "ask her about
  // nont" reaches it, and she has a family node too (civilian playtest F6).
  [/\bson\b|your boy|your kid|your child/,                                        "family"],
  [/\bfather\b|\bhusband\b|his dad|the dad/,                                     "father"],
  // Thomas, the ghost of Jomtien (jomtien_beach_s3) — the second coffee, the vendor
  [/second (cup|coffee|one)|the other (cup|coffee)|that cup|both coffee/,        "coffee"],
  [/barista|coffee shop|the shop|day job|apron/,                                "job"],
  [/\bdancer\b|number 72|number seventy|your dancing|walking street|\bphoto\b/,   "dancer"],
  [/\borchid\b/,                                                                "rose"],
  // Rose's reply — carried back to Candy — names "the photographs" as the
  // memorable noun; "tuesday" is the literal topic key, this is its alias
  // (round 32, the Rose/Candy return-errand fix).
  [/\bphotographs?\b/,                                                       "tuesday"],
  [/khanom|the cart|sticky rice|coconut vendor|snack cart|the vendor/,          "vendor"],
  // Nok — the Jomtien regular who stopped coming (The Quiet Side, docs/map-coverage.md)
  [/\bgordon\b|the regular|who stopped/,                                         "regular"],
  // Neil / Nigel — the Darkside counterweight and the grapevine that tells it wrong
  [/\bdark ?side\b|east pattaya|over the highway|across (the )?(highway|sukhumvit)|the lake\b|\bneil\b/, "darkside"],
  [/the lads\b|town lads|the chorus|old boys|the veterans|sports bar|your mates/,  "mates"],
  [/\bdaughter\b|your girl\b|the kid\b|your kid\b/,                             "daughter"],
  [/^bars?$/,                                                                     "bars"],
  [/\b(my|your|this|the) bar\b/,                                                  "bar"],
  // Act One: the thief by name, or by description, is the wallet story
  [/\bmot\b|the thief|pickpocket|who (took|lifted|stole)/,                        "wallet"],
  // Cream (the chameleon economy) — the inevitable question, however it's dressed
  [/how much|take you|come with me|go with me|your price|my hotel|my room|short ?time|long ?time|\bbarfine\b|pay you/, "price"],
  [/your job|what.*you do|\bbarista\b|coffee shop|the shop|the apron|\bwork\b/,      "job"],
];

function _convoTopic(s) {
  const t = s.replace(/[?.!,]+\s*$/g, "").trim();
  for (const [re, topic] of _CONVO_TOPIC_RULES) if (re.test(t)) return topic;
  // no synonym match: strip leading framing so "tell me about X" / "your X" pass
  // X through cleanly (the CONTAINS match then finds the node keyed on X).
  return t.replace(/^(tell me about|talk about|about|whats|what is|your|the)\s+/, "").trim() || t;
}

// A topic key as a chip label: Title Case the words ("queen vic" → "Queen Vic",
// "90s" stays "90s"). The chip's cmd is the bare topic — the conversation is
// live when these show, so it resolves straight through _convoResolve.
// A few canonical topic keys read cryptic as bare chips ("Sponsor" on the
// COLUMNIST is about the kept girls, not his own) — label those by meaning.
const _TOPIC_LABELS = { sponsor: "the kept girls" };
function _topicLabel(t) { return _TOPIC_LABELS[t] || t.replace(/\b\w/g, c => c.toUpperCase()); }

// When the partner has asked YOU something (G.convoQ), your plain reply lands
// here: it's remembered (globally in G.player.said, and per-partner in st.heard
// so they can catch a change), and they react. First time you open up warms them
// a touch; a different answer than before gets caught.
// the jilted regular's one cooled hello — hurt worn lightly, professionally
const _MIFFED_HELLO = [
  "{n} looks up, and the smile arrives half a second late and one degree cooler. \u201cOh. You come back.\u201d She wipes a glass that is already clean. \u201cHave fun last night, na?\u201d It is not a question that wants an answer.",
  "\u201cWelcome back, tilac.\u201d {n}'s voice does everything right and none of it warm. She serves you like a customer, which from her is the whole message.",
  "{n} greets you with perfect politeness, which is how you know. \u201cYou want beer?\u201d No nickname tonight. The nickname is on probation.",
];
const _ANSWER_ACK = [
  n => `${n} takes it in and files it somewhere. You've handed something over, and it counts for a little.`,
  n => `A small nod from ${n}, the question put away satisfied — the talk feels a degree warmer for it.`,
];
const _ANSWER_CAUGHT = [
  (n, pr = { s: "they", o: "them", p: "their" }) => `${n} tilts ${pr.p} head a fraction. "Hm. That's not what you told me before." The change lands, and not only on you.`,
  (n, pr = { s: "they", o: "them", p: "their" }) => `A flicker behind ${n}'s eyes. "Funny — I had you down differently." ${_ucfirst(pr.s)} lets it sit. People misremember. Or they don't.`,
];
// The soi grapevine: you never told THIS person, but you told someone else
// something different, and word got around. A soft catch — a shrug, not an
// accusation — but the discrepancy is noted, and it earns no warm "opening up".
const _ANSWER_GOSSIP = [
  (n, p, pr = { s: "they", o: "them", p: "their" }) => `${n} pauses half a beat. "Funny — somebody, some bar, had you from ${_wrapSaid(p)}." A small shrug, filed away. The soi talks, out here.`,
  (n, p, pr = { s: "they", o: "them", p: "their" }) => `"${_wrapSaid(p)}?" ${n} says it before you can stop ${pr.o}. "That's what I heard. Now you tell it different." Nothing's really private on this street.`,
  (n, p, pr = { s: "they", o: "them", p: "their" }) => `${n}'s eyes do a slow, amused inventory. "Word travels, na. I heard ${_wrapSaid(p)} — from you, they say." ${_ucfirst(pr.s)} lets the gap hang, then moves on. But it's noted.`,
];
// Quote the player's own past words back — verbatim, but suppress any decorate()
// tap-decoration inside (it's remembered free text, not a live entity).
function _wrapSaid(v) { return "{{“" + v + "”}}"; }
function _partnerHasTopic(id, t) {
  const nodes = ((NPCS[id] || {}).dialogue) || [];
  return nodes.some(d => d.topic && String(d.topic).split("|").some(k => k === t || t.includes(k)));
}
// Canned replies for the question currently on the table — your own voice,
// tappable. Identity-matched first (personality, then origin — the axis the
// player picked to BE), then the anybody entries, capped at 3 so the chip bar
// stays a bar conversation and not a dialogue tree. Data lives in world.js
// (ASK_REPLIES); free text remains the primary path and always will.
function _askReplies(key) {
  const table = (typeof ASK_REPLIES !== "undefined" && ASK_REPLIES[key]) || [];
  const mine = table.filter(r => (r.pers && _pers(r.pers)) || (r.origin && _isOrigin(r.origin)));
  const anyone = table.filter(r => !r.pers && !r.origin);
  const out = [];
  for (const r of [...mine, ...anyone]) if (!out.includes(r.text)) out.push(r.text);
  // Once the player HAS a story, the chips are his memory, not a menu. The
  // canned list kept offering "Portsmouth" to a man on record as Manchester —
  // he tapped the game's own suggestion, the grapevine caught the change, and
  // when he went BACK to the truth he was called a liar for it (Gerry, round
  // 34). The game must never hand you the lie it will then punish: his own
  // remembered answer leads, and any canned reply that contradicts it is
  // dropped (_saidAgrees, the same leniency the grapevine itself applies).
  const said = (G.player && G.player.said || {})[key];
  if (said && typeof said === "string") {
    // the stored answer is normalised (trailing stop dropped), so compare the
    // same way or the chips show "Back home. It'll keep" AND "Back home. It'll
    // keep." as two options (Nige, round 36)
    const norm = t => String(t).trim().replace(/[.!]+$/, "").toLowerCase();
    const keep = out.filter(t => norm(t) !== norm(said) && _saidAgrees(t, said));
    return [said, ...keep].slice(0, 3);
  }
  return out.slice(0, 3);
}

// Does a new answer AGREE with what the player said before? The old check was
// a literal string compare, which punished perfectly consistent stories: told
// one girl "fifteen years on the street, mind" and another "fifteen years,
// love", the player was caught "lying" — while an actual liar who repeated his
// lie verbatim sailed through (grapevine playtest F1, 2026-08-25, four
// instances). Substance, not spelling: two answers agree when they share any
// meaningful content word. Deliberately LENIENT — a missed lie costs nothing,
// but a false accusation calls an honest player a liar to his face and docks
// rep for it, which is the worse defect by a street mile.
const _SAID_STOP = new Set(["the", "a", "an", "i", "you", "me", "my", "im", "in",
  "on", "of", "to", "and", "it", "its", "is", "was", "are", "be", "not", "no",
  "yes", "na", "la", "love", "mate", "mind", "this", "that", "for", "with",
  "but", "so", "just", "very", "really", "well", "then", "than", "one", "bit",
  "lot", "some", "any", "all", "too", "still", "here", "there", "now", "dont",
  "cant", "wont", "ill", "ive", "id", "youre", "hes", "shes", "they", "them",
  "dunno", "maybe", "perhaps", "whatever", "nothing", "depends", "sometimes",
  "year", "years", "month", "months", "week", "weeks", "day", "days", "night", "nights",
  "sweetheart", "darling", "honey", "tilac", "dear", "babe", "boss", "pal"]);
function _saidTokens(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w && !_SAID_STOP.has(w) && (w.length >= 4 || /^\d+$/.test(w)));
}
function _saidAgrees(a, b) {
  if (a == null || b == null) return true;
  const na = String(a).toLowerCase().trim(), nb = String(b).toLowerCase().trim();
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = _saidTokens(a), tb = new Set(_saidTokens(b));
  // nothing substantive on either side ("dunno" vs "maybe") is not a lie
  if (!ta.length || !tb.size) return true;
  return ta.some(w => tb.has(w));
}

function _convoAnswer(text) {
  const { id, key } = G.convoQ;
  G.convoQ = null;
  const st = _npcState(id);
  const heard = (st.heard = st.heard || {});
  // prefer the raw-cased line the player actually typed: the grapevine quoting
  // "manchester" back in flattened lowercase read as a bug, not dialect
  const raw = (typeof _rawAnswer === "string" && _rawAnswer.toLowerCase().includes(text.slice(0, 24))) ? _rawAnswer : text;
  const val = raw.replace(/[.!?,]+$/, "").trim();
  const player = (G.player = G.player || {});
  const said = (player.said = player.said || {}); // harden: a hand-built/very-old state may lack .said
  const globalPrior = said[key]; // what you last told ANYONE (before this answer)
  said[key] = val;
  const prior = heard[key];
  heard[key] = val;
  const name = _convoName(id);
  const pr = _sheHe(id);
  if (prior && !_saidAgrees(prior, val)) {
    _say(_pickVary(_ANSWER_CAUGHT, "ansCaught")(name, pr));       // she caught you herself
    _repHit(2);                                                   // caught lying to her face
  } else if (!prior && globalPrior && !_saidAgrees(globalPrior, val)) {
    _say(_pickVary(_ANSWER_GOSSIP, "ansGossip")(name, globalPrior, pr)); // the soi grapevine caught you
    _repHit(1);                                                   // a softer catch — but the town noticed
    // no +1 — you didn't open up, you got caught telling it two ways
  } else {
    _say(_pickVary(_ANSWER_ACK, "ansAck")(name));
    if (!prior) st.trust = Math.min(5, st.trust + 1); // opening up, once
    _repGain(); // a straight, honest answer is part of being a good sort (throttled)
  }
  return true;
}

// Running a chosen action-choice: apply its flags/effects, print the partner's
// reaction, then either jump to another topic node (chaining its own choices) or
// clear the live choices (a terminal beat action). Effects reuse the node `fx`
// hook, so a choice can move st.trust, G.soc.drinks, _addHeat, _align — the whole
// standing toolkit — exactly like an authored node.
function _runChoice(id, c) {
  const st = _npcState(id);
  for (const f of c.sets || []) _setFlag(f);
  if (c.fx) c.fx(st, G);
  if (c.text) _say(_fillSaid(c.text));
  if (c.topic) { _doTalk(_convoName(id), c.topic); return; } // jump: delivers that node + its choices (+ prompt)
  G.convoIdx = null;                               // terminal — choices consumed
  if (_convoActive()) _convoPrompt(_convoActive()); // re-show the palette after the beat
}
// Did the player pick one of the partner's live action-choices? Matches a chip
// tap (exact lowercased label), a number, or a typed substring. Kept fairly
// strict so a real topic word doesn't get swallowed as a choice.
function _convoPickChoice(bare, exactOnly) {
  const id = _convoActive();
  if (!id) return false;
  let choices = _convoChoices();
  if (!choices.length) choices = _convoChoices(true); // the last offered set (a hint still on screen) — exact or loose
  if (!choices.length) return false;
  // Normalize away apostrophes/punctuation so a typed "tell him youre in" still
  // matches the label "Tell him you're in" — authors get natural labels, players
  // don't have to hit the apostrophe. Chip taps submit the exact label regardless.
  const nm = s => s.toLowerCase().replace(/['’]/g, "").replace(/[.,!?]+/g, "").trim();
  const nb = nm(bare);
  let c = /^[1-9]$/.test(bare) ? choices[+bare - 1] : null;
  if (!c) c = choices.find(x => nm(x.label) === nb);
  if (!c && !exactOnly && nb.length >= 3) c = choices.find(x => nm(x.label).includes(nb));
  if (!c) {
    // the label was printed but its moment has passed (a trust-gated choice after an
    // ask that earned the trust): say so, rather than hand "tell her Bert sent you"
    // to the TELL verb (completionist playtest 2026-08-22)
    const stale = _convoChoices("raw").find(x => nm(x.label) === nb);
    if (stale) { _say(`(That moment's passed — ${_convoName(id)} is past needing it now.)`, "dim"); return true; }
    return false;
  }
  _runChoice(id, c);
  return true;
}

// Last-resort interpretation of an otherwise-unrecognized line. Returns true if
// the conversation layer consumed it (the caller then ticks, like any real turn).
const _GAME_MOVE_WORDS = new Set([
  "finish", "steady", "go big", "big", "flip", "drop", "shot", "power", "safety",
  "quit", "concede", "hold", "roll",
]);

function _convoResolve(lower) {
  const bare = lower.replace(/[,.!?]+$/, "").trim();
  if (_GAME_MOVE_WORDS.has(bare) && !G.game) {
    _say("That was a move in a game that's over. (PLAY, if you want another.)", "dim");
    return true;
  }
  // 0a) An explicit action-choice the partner just offered wins over everything —
  //     if the line matches one, it IS the player's move (a chip tap or typed).
  //     Only consumes the line on a real match, so free-text answers still fall
  //     through to the pending-question handler below.
  if (_convoActive() && _convoPickChoice(bare)) return true;
  // 0) A pending question from the partner: your reply. A recognizable move
  //    (leave-taking, a name, or one of their own topics) changes the subject
  //    and lapses it; anything else is your answer, remembered and reacted to.
  if (G.convoQ && _convoActive() === G.convoQ.id) {
    // A bare number picks one of the offered canned replies (the prose numbers
    // them, the chips carry the text). Without this, "2" would be STORED as
    // your answer — and quoted back to you all week. An OUT-OF-RANGE digit
    // re-prompts instead of falling through to free text, for the same reason:
    // with numbered options on screen a stray digit is a misfire, not an answer.
    const reps = _askReplies(G.convoQ.key);
    if (reps.length && /^[1-9]$/.test(bare)) {
      if (reps[+bare - 1]) return _convoAnswer(reps[+bare - 1]);
      G.convoQ.shown = false; // a misfire earns the cue again
      // …but say WHY. Re-printing her question with no comment reads as the
      // game having ignored you, which is the one thing a pending question
      // must never look like: you can't tell a swallowed keystroke from a
      // refused one, so you don't know whether to retype it.
      _say(reps.length === 1
        ? _L("(There's only the one on the table — or answer in your own words.)")
        : _fmt("(There are only {n} on the table — or answer in your own words.)",
          { n: reps.length }), "dim");
      _convoPrompt(G.convoQ.id);
      return true;
    }
    // A QUESTION back to her ("what is your name", "where are you from") is not
    // an answer to HER question — capturing it stored a question mark of a
    // sentence as the player's identity and grapevine-checked it forever (Alan
    // playtest, 2026-08-17). Let it lapse the pending Q and fall through to ASK.
    const isQuestion = /\?$/.test(lower.trim()) ||
      /^(what|where|who|whom|how|why|when|which|whats|whos|hows)\b/.test(bare) ||
      /^(do|does|did|are|is|was|were|can|could|will|would|have|has)\s+(you|u|she|they)\b/.test(bare);
    const changingSubject = isQuestion ||
      /^(goodbye|bye|cheerio|laters?|later|see ?ya|ciao)$/.test(bare) ||
      _findNpc(bare) ||
      _partnerHasTopic(G.convoQ.id, _convoTopic(lower));
    if (!changingSubject) return _convoAnswer(lower);
    G.convoQ = null; // dodged (or a question back) — fall through to normal handling
  }
  // 0) A canned reply typed a beat late — the chip was still on screen after you
  //    turned to somebody else, and the game printed the phrase then rejected it
  //    (Bronwyn, round 39). If it matches a reply to a question that LAPSED
  //    tonight, it answers that question, late.
  if (!G.convoQ && G.convoLapsed && typeof ASK_REPLIES !== "undefined") {
    const norm = t => String(t).trim().replace(/[.!?"“”]+$/, "").toLowerCase();
    for (const [lid, l] of Object.entries(G.convoLapsed)) {
      const canned = (ASK_REPLIES[l.key] || []).map(r => typeof r === "string" ? r : r.text);
      if (canned.some(t => norm(t) === norm(lower))) {
        delete G.convoLapsed[lid];
        _say(`(You answer ${NPCS[lid] ? NPCS[lid].name : "the earlier"} question, a beat late.)`, "dim");
        G.convoQ = { id: lid, key: l.key, q: l.q };
        return _convoAnswer(lower);
      }
    }
  }
  // 1) Leave-taking ends an active conversation.
  if (_convoActive() &&
      /^(goodbye|bye|cheerio|laters?|later|see ?ya|ciao)$/.test(bare)) {
    _convoEnd(); return true;
  }
  // 2) A bare name for someone present starts (or switches) the conversation —
  //    this is the `> angela` opener. Routes through the normal TALK path, which
  //    delivers their greeting and sets the partner via _convoStart.
  if (bare && bare.split(" ").length <= 3 && (_findNpc(bare))) {
    _doTalk(bare, null); return true;
  }
  // A lone digit with no pending question is an ORPHANED answer — the numbered
  // prompt it belonged to lapsed when you switched partners. Routing it as a
  // topic produced "You asked Terry about 1" (veteran playtest, 2026-08-17).
  const id = _convoActive();
  if (id && /^[1-9]$/.test(bare)) {
    _say("(That numbered question has drifted past — the moment moved on. Ask again if it matters.)", "dim");
    return true;
  }
  // 3) While a conversation is live, take the line as a topic aimed at the
  //    partner — the same route as ASK <them> ABOUT <topic> — but only when it
  //    COULD be one: a short guess (≤2 words), or something the partner has a
  //    node for (literal or via the synonym map). A whole sentence in another
  //    language, or a mistyped command, used to be swallowed as "You asked Terry
  //    about untersuche notizbuch" (German playtest 2026-08-22) — that falls
  //    through to the parser's own voiced "didn't understand" now.
  if (id) {
    const t = _convoTopic(lower);
    const words = bare.split(/\s+/).filter(Boolean).length;
    if (words <= 2 || _partnerHasTopic(id, t) || _partnerHasTopic(id, bare)) {
      // pass the RAW words: _doTalkBody tries the literal topic first and falls
      // back to the synonym map itself. Normalising here killed every topic chip
      // whose key is also a synonym input — Terry's "white dish" became "wdg" and
      // missed his own node (thumbs-only playtest 2026-08-22).
      _doTalk(_convoName(id), bare); return true;
    }
  }
  return false;
}

// The player's half of the conversation, surfaced in the PROSE — not just the chip
// bar. Without this a typing player reads an NPC monologue with no visible way to
// answer, so the two-way exchange reads one-way. Mirrors _chipSet's talk palette
// exactly (same options, same order) so prose and chips agree; CAPS-in-parens makes
// each one tappable via the command-hint idiom, keeping mobile/desktop at parity.
// Dim, and printed at the end of every in-conversation turn.
function _convoPrompt(id) {
  if (!id || _convoActive() !== id) return;
  // The generic topic/compliment/joke/goodbye list already lives in the chip bar
  // every conversation turn — echoing it in the prose too is just clutter. So the
  // in-prose prompt now only fires when it carries something the chips DON'T make
  // obvious: an answer cue when the partner has put a question to you, or the
  // beat-specific action-choices a node offers.
  if (G.convoQ && G.convoQ.id === id) {
    // A question is on the table. The chip bar carries your own-voice replies
    // (see _askReplies); the prose numbers them so a typed "2" works too, and
    // free text stays the headline option — it's the whole point of the loop.
    // Printed ONCE per question — it re-printed under every turn (five times in
    // a row, playtest 2026-08-22); the chips keep carrying it after that.
    if (G.convoQ.shown) return;
    G.convoQ.shown = true;
    const reps = _askReplies(G.convoQ.key);
    if (reps.length) {
      _say(`(${_convoName(id)} put that to you. Answer in your own words — or:)`, "dim");
      _say(reps.map((t, i) => `  ${i + 1}) “${t}”`).join("\n"), "dim");
    } else {
      _say(`(${_convoName(id)} put that to you — just answer, in your own words.)`, "dim");
    }
    return;
  }
  const acts = _convoChoices();
  if (!acts.length) return; // an ordinary turn: the chip bar has it covered
  // An apostrophe breaks a CAPS-in-parens run into two dead kws ("YOU'RE" →
  // "YOU" + "RE"), so strip it — the tap command loses the apostrophe too, but
  // _convoPickChoice normalizes apostrophes out when matching, so it still fires.
  const CAP = s => s.toUpperCase().replace(/['']/g, "");
  const opts = acts.slice(0, 3).map(c => CAP(c.label));
  opts.push("GOODBYE");
  _say("(" + opts.join(" · ") + ")", "dim");
}

function _doWai(arg) {
  if (arg && /^(the )?(piwin|motosai|driver|bike ?boy|taxi)$/i.test(arg.trim())) {
    if (!_piwinHere()) { _say("No stand here — the bikes are on the corners."); return; }
    _say("You wai the piwin. He returns it one-handed, the other on the throttle, and grins — a " +
      "farang who wais the bike boys is a farang who gets the honest price.");
    return;
  }
  const npcs = _npcsHere();
  // bare WAI's sole-target rule considers STAFF only — a room whose one
  // occupant is a rail regular gets the wai-the-room line, as it did when the
  // regulars lived in their own table. WAI <name> still reaches him.
  const staff = npcs.filter(id => !NPCS[id].patron);
  const target = arg ? _findNpc(arg) : (staff.length === 1 ? staff[0] : null);
  if (!target) {
    if (!npcs.length) { _say(`You wai the empty ${/beach/.test(G.room) && !/_rd|beach_rd/.test(G.room) ? "sand" : "street"}. A passing soi dog looks moved.`); return; }
    _say("You press your palms together and wai the room in general. Approving nods.");
    for (const id of npcs) _waiEffect(id);
    return;
  }
  _say(`You wai ${NPCS[target].name} — palms together, small bow, like you mean it.`);
  _waiEffect(target);
}

function _waiEffect(id) {
  if (id === "oy" && !_flag("waiedOy")) {
    _setFlag("waiedOy");
    _say("Madam Oy's eyebrow rises one millimetre. From her, that's a standing ovation.", "dim");
    _addHappy(1);
  }
  if (id === "ploy" && !_flag("waiedPloy")) {
    _setFlag("waiedPloy");
    _say("Ploy's counting pauses for the first time tonight.", "dim");
    _addHappy(1);
  }
  if (id === "fon" && !_flag("greetedFon")) {
    _setFlag("greetedFon");
    _say("Fon lights up like the neon just found a new colour.", "dim");
    _addHappy(1);
  }
}

// Strip the polite particles a Thai speaker naturally appends (ค่ะ/คะ/ครับ/นะ…)
// so สวัสดีค่ะ matches the greeting — it was "gibberish" to a Thai woman NPC
// (Thai-speaker playtest 2026-08-22).
function _stripPolite(s) {
  return String(s || "").replace(/\s*(นะคะ|นะครับ|ค่ะ|คะ|ครับ|นะ)\s*$/g, "")
    .replace(/\s+(na )?(kha|ka|khrap|krub|krap|krab|na)\s*$/i, "").trim();
}
function _doSay(arg, targetWord) {
  const key = matchThaiPhrase(arg) || matchThaiPhrase(_stripPolite(arg));
  const target = (targetWord || "").trim();

  // SAY <phrase> TO <person>: aim it at one person, get their reaction — the
  // directed cousin of the room-wide SAY below, and distinct from TALK (which
  // fires the NPC's own dialogue, not yours).
  if (target) {
    let id = _findNpc(target);
    const patronHere = _inBar() && /patron|regular|expat|customer|guy|bloke|farang/.test(target);
    if (!id && /^(the )?(piwin|motosai|driver|bike ?boy|taxi)$/i.test(target) && _piwinHere()) {
      if (key === "how_much") { _say(`The piwin grins: “${thaiBaht(MOTOSAI_TOWN)} in town, ${thaiBaht(MOTOSAI_FAR)} to Darkside.”`, "thai"); return; }
      if (key === "hello" || key === "thanks") { _say("The piwin dips his chin — the stand's whole vocabulary of warmth — and goes back to his phone."); return; }
      _say("The piwin nods, unreadable behind the vest, and files you under 'tries'."); return;
    }
    if (!id && !patronHere) { _say("They're not here to hear it."); return; }
    const name = id ? NPCS[id].name : "the regular";
    if (!key) {
      // a Thai listener caught every word — it's the GAME that didn't
      if (id && typeof _thaiVoice === "function" && _thaiVoice(id) && /[\u0E00-\u0E7F]/.test(arg)) {
        _say(`${name} catches it — every word — and answers in kind, warm and far too fast for you to ` +
          "follow, then laughs at your face and slows down to English. (The game only knows a few " +
          "phrases of Thai: SAY offers them.)");
        return;
      }
      _say(`You try a phrase on ${name}, who receives it with the fond, baffled ` +
        "smile of someone who did not catch a word but liked the effort.");
      return;
    }
    const phrase = THAI_PHRASES.find(p => p.key === key);
    _say(`You say to ${name}: “${phrase.th}” (${phrase.rom})`, "thai");
    _engineSpeak(phrase.th);
    _sayDirectedReact(key, id, name);
    return;
  }

  if (!key) { _say("You give it your best shot. A passing lady pats your arm kindly."); return; }
  const phrase = THAI_PHRASES.find(p => p.key === key);
  _say(`You say: “${phrase.th}” (${phrase.rom})`, "thai");
  _engineSpeak(phrase.th);
  if (key === "hello") {
    for (const id of _npcsHere()) _waiEffect(id);
    _say("Faces soften. One word of Thai buys more than a round of drinks here.");
  } else if (key === "thanks") {
    _say("Warm smiles all round. Manners are the strongest currency on the soi.");
  } else if (key === "how_much") {
    const r = _room();
    if (r.busStop) _say(`A driver leans out: “${thaiBaht(BUS_FARE)}” (${thaiNumRoman(BUS_FARE)} baht).`, "thai");
    else if (r.motosai) _say(`A piwin grins: “${thaiBaht(MOTOSAI_TOWN)} in town, ${thaiBaht(MOTOSAI_FAR)} to Darkside.”`, "thai");
    else _say("Nobody here is selling anything. Officially.");
  } else if (key === "no") {
    _say("“ไม่เอา” — mai ao. You wave it off, whatever it was. The nearest vendor shrugs it back into the bag; " +
      "the nearest girl laughs: “Ooh, he know this one.”");
  } else {
    _say("Laughter and approval. สนุก!");
  }
}

// One matched phrase, aimed at one person. `id` is null for the ambient bar
// regular. Greetings run the per-NPC unlock (_waiEffect) so SAY สวัสดี TO FON
// works like WAI FON; the rest are targeted flavor.
function _sayDirectedReact(key, id, name) {
  const role = id ? NPC_ROLES[id] : null;
  if (key === "hello") {
    if (id) _waiEffect(id); // fires greetedFon / waiedOy / waiedPloy once
    _say(`${name} returns it — palms not quite together, but the warmth is real.`);
    return;
  }
  if (key === "thanks") {
    _say(`${name} wais back, pleased. Manners are the strongest currency on the soi.`);
    return;
  }
  if (key === "how_much") {
    if (role) {
      _say(`${name} laughs. “For talk? Free, tilac.” She taps the lady-drink menu. ` +
        `“Everything else start at ฿${_ladyPrice()}.”`, "thai");
    } else if (id === "bank" || (id && NPCS[id].emoji === "🏍️")) {
      _say(`${name} grins: “${thaiBaht(MOTOSAI_TOWN)} in town, ${thaiBaht(MOTOSAI_FAR)} to Darkside.”`, "thai");
    } else {
      _say(`${name} spreads ${id && NPCS[id] && NPCS[id].pronoun === "he" ? "his" : id ? "her" : "their"} hands. “Depends what you buying, boss.”`);
    }
    return;
  }
  if (key === "no") {
    _say(`${name} accepts the “mai ao” with theatrical, entirely insincere disappointment.`);
    return;
  }
  if (key === "delicious") {
    _say(`${name} beams. “Chai! Aroi mak.” Complimenting the food is never the wrong move.`);
    return;
  }
  // fun
  _say(`“Sanuk mak!” ${name} toasts the sentiment and the night nudges upward.`);
  _addHappy(1);
}

const _GIVE_GIFT_LINES = [
  (n, g) => `${n} unwraps ${g}, and the professional smile drops for a real one — nobody buys the girl a PRESENT, only drinks. "For me? Why?" She doesn't wait for an answer; she just holds it a moment longer than she needs to.`,
  (n, g) => `${n} turns ${g} over in her hands, works out it's really hers, and gives you a look that's recalculating the whole evening. "You are different, na." Whether that's true or just good manners, the bond is real either way.`,
  (n, g) => `"Aww, tilac." ${n} accepts ${g} with both hands and a wai, and tucks it away somewhere safe rather than showing it off — the tell that it landed.`,
];
const _GIVE_FOOD_LINES = [
  (n, f) => `${n} lights up — "For me?? Aroi!" — and eats ${f} right there, sharing the last bite back to you off the fork. Feeding someone means something here, and she knows you know it.`,
  (n, f) => `${n} takes ${f} with both hands and a small wai. "You think of me. Nobody buy the girl FOOD, only drink." She eats slowly, watching you, recalculating something.`,
  (n, f) => `"You eat already? No? We share." ${n} splits ${f} in half without asking and pushes the bigger piece at you. The bar's oldest courtship, and the realest.`,
];
const _GIVE_CONDOM_LINES = [
  (n, k) => `${n} looks at the ${k === 1 ? "one" : k} you're holding out, then bursts out laughing. "TILAC. So romantic!" She pockets ${k === 1 ? "it" : "them"} anyway — "Cannot have too many, this job" — and you're both grinning.`,
  (n, k) => `${n} accepts the ${k === 1 ? "packet" : "packets"} with a mock-solemn nod and a wicked grin. "Practical man. Mama always say, marry the practical one." ${k === 1 ? "It goes" : "They go"} straight in her bag.`,
  (n, k) => `"Ooh, gentleman!" ${n} palms ${k === 1 ? "it" : "them"} away smooth as a card trick, not embarrassed for a second — it's work kit, and thoughtful is thoughtful. "You save me a 7-Eleven trip, na."`,
];
const _GIVE_EMPTY_LINES = [
  n => `${n} looks at the empty bottle, then at you, then laughs. "For me? Aww. You keep — take to Auntie Nok, she give you five baht. Then you buy ME real drink, na."`,
  n => `${n} does not take the empty. "Tilac. Is empty. You want give me something, is a full one, or..." She taps the lady-drink menu and grins.`,
  n => `${n} holds up both hands, delighted and appalled. "I not the recycle lady! That five baht at Nok cart. Bring me the five baht, hahaha."`,
  n => `${n} accepts the empty with elaborate two-handed grace, sets it back in your hand exactly as gravely, and says nothing at all. Point made.`,
];
function _doGive(itemWord, npcWord) {
  // "give noodles to dog" — the dog isn't an NPC; feeding is its own path
  // (answers to the defaults and to whatever he's been renamed)
  if (/^(dog|sai|krok)$/.test(npcWord) ||
      (G.dog && G.dog.name && npcWord === G.dog.name.toLowerCase())) {
    // a drink, a rose, a phone: he sniffs it and sits. Food feeds.
    const it = _findItem(itemWord, "inventory");
    if (G.dog && it && !["noodles", "moo_ping"].includes(it) && !(ITEMS[it].kind === "food")) {
      _say(_dogN(`Sai Krok sniffs the ${ITEMS[it].name}, looks at you with enormous patience, and ` +
        "sits. Not food. He can wait."));
      return;
    }
    return _doFeedDog("dog");
  }
  // "give 500 to jenny" — a money amount isn't an item; hand it over the right way:
  // TIP if she's in front of you, else a pointer at TIP/SEND (don't hit not-carrying).
  if (/^\d+$/.test(itemWord)) {
    if (_findNpc(npcWord)) return _doTip(npcWord + " " + itemWord);
    _say("To hand someone cash: TIP <lady> <amount> if she's in front of you, or SEND <amount> TO <name> for a phone contact.");
    return;
  }
  const npc = _findNpc(npcWord);
  if (!npc) {
    // a known person who has just moved on gets placed, same as ASK/TALK
    // (verb-auditor playtest 2026-08-22: GIVE fell to the flat not-here pool
    // where ASK/TALK already point at where she actually is)
    const away = _elsewhereLine(npcWord);
    if (away) { _say(away); return; }
    _say(_pickVary(_NOT_HERE, "nothere")); return;
  }
  // Condoms are a pocket counter (G.condoms), not an ITEMS record — catch the
  // give here. To a working girl it's practical AND funny (they're work kit);
  // she takes a couple and warms a notch. Once per girl per night.
  if (/\bcondoms?\b|\brubbers?\b|\bjohnn(?:y|ies)\b|\bprotection\b/.test(itemWord)) {
    if (!NPC_ROLES[npc]) { _say(`${NPCS[npc].name} declines, with feeling.`); return; }
    if (!G.condoms) { _say("You're out — nothing to hand over. (7-Eleven by the till.)"); return; }
    const took = Math.min(G.condoms, 2);
    G.condoms -= took;
    const fed = (G.soc.gaveCondom = G.soc.gaveCondom || {});
    let warmed = "";
    if (!fed[npc]) { fed[npc] = true; _addBond(npc, 1); warmed = " She likes a man who thinks ahead."; }
    _say(_pickVary(_GIVE_CONDOM_LINES, "givecondom")(NPCS[npc].name, took) + warmed);
    return;
  }
  // giving your empties to the vendor who buys them IS selling them — route any
  // bottle-ish give (incl. the natural plural "bottles", which the strict item
  // matcher below misses) straight to the sale, which handles the empty case
  if (npc === "nok" && /bottle|glass/.test(itemWord)) return _doSellBottles();
  // handing the amulet back — she has already asked for it without asking
  if (npc === "nok" && /amulet|buddha|pendant|medallion/.test(itemWord)) {
    if (G.itemLoc.amulet !== "inventory") { _say("You aren't carrying it."); return; }
    return _nokTakeAmulet();
  }
  const id = _inv().find(i => ITEMS[i].name.toLowerCase().includes(itemWord) ||
    ITEMS[i].aliases.some(a => a.includes(itemWord)));
  if (!id) { _say(_pickVary(_NOT_CARRYING, "notcarry")); return; }
  _trace("give", NPCS[npc].name, ITEMS[id].name); // breadcrumb
  if (id === "helmet" && npc === "pim") {
    G.itemLoc.helmet = null;
    const d = _pickDialogue("pim"); // helmet entry matches on hasHelmet
    _deliver("pim", d);
    _setFlag("helmetDelivered");
    return;
  }
  if (id === "tiffin" && npc === "nont") {
    // "Look in on my boy": the hand-off is the witness beat (world.js, nont.tiffin)
    G.itemLoc.tiffin = null;
    _setFlag("tiffinDelivered");
    const d = _pickDialogue("nont", "tiffin");
    if (d) _deliver("nont", d);
    _say("(He dropped a Thai SIM in the empty tiffin — his thanks. Now back to the lake: " +
      "ASK DUANGJAI ABOUT THE OFFER.)", "dim");
    return;
  }
  if (id === "som_tam" && npc === "ploy") {
    G.itemLoc.som_tam = null;
    _setFlag("somTamDelivered");
    const d = _pickDialogue("ploy");
    _deliver("ploy", d);
    return;
  }
  if (id === "foreman_keys" && npc === "diamond") {
    G.itemLoc.foreman_keys = null;
    _setFlag("keysDelivered");
    _say("Diamond takes the ring of keys in both hands and goes somewhere very far away for a " +
      "moment — thumb moving over the worn brass the exact way its last owner's must have. \"I " +
      "knew him,\" she says at last, too evenly. \"Everybody here knew him. He built every wall " +
      "you are looking at, faster than any man should have had to.\" She hangs the ring on the " +
      "shrine behind the till, beside the marigolds and the strawberry Fanta, and straightens it " +
      "twice. \"Tell Wimon: they hang where they belong. And tell her—\" the voice catches, is " +
      "caught, recovers \"—tell her I said thank you.\"", "win");
    return;
  }
  if (id === "revue_flyer" && npc === "diamond") {
    G.itemLoc.revue_flyer = null;
    _setFlag("scoutSent");
    _say("Diamond reads the flyer front and back, and a slow, real smile gets past the vault. " +
      "\"Mala's little diamond. I saw her lip-sync at the temple fair when she was nineteen — the " +
      "whole soi stopped walking.\" She taps the biro note. \"The Alcazar man owes me from my " +
      "dancing days, and he hates that he does. I will make the call tonight; he will sit at the " +
      "back on Friday and pretend he came for the beer.\" The flyer goes under the till, dead " +
      "centre, like something valuable. \"Tell Mala: consider it done, and she owes me a " +
      "headdress.\"", "win");
    return;
  }
  if (id === "sang_som" && npc === "bee") {
    G.itemLoc.sang_som = null;
    _setFlag("sangsomDelivered");
    _say("Bee receives the boxed bottle with both hands, reads the card, and for " +
      "two full seconds the franchise smile is just a person's. “Auntie send " +
      "THIS?” She sets it on the opening shelf, dead centre, label out, then " +
      "presses thank-you money into your hand over your objections. Family rules.", "win");
    return;
  }
  // kind:"gift" — a bought present raises fondness with a working girl. The saleng
  // three carry bespoke role-aware prose (below); any other gift item falls to a
  // generic pool. No throttle: gifts cost real money, so they can't be farmed
  // (unlike the free food/condom fondness). (Design 2026-08-17: generalised from
  // the hardcoded saleng list.)
  if (ITEMS[id].kind === "gift" && NPC_ROLES[npc]) {
    G.itemLoc[id] = null;
    _addBond(npc, 1);
    const name = NPCS[npc].name;
    const GIFT_TEXT = {
      rose: {
        // pooled: a courting player gives roses REPEATEDLY and the single string
        // read verbatim four times (Frank, 2026-08-26). A THUNK, resolved only
        // when the rose branch actually prints — _pickVary in the object literal
        // would burn dice and pool memory on every unrelated gift.
        hostess: () => _pickVary([
          `${name} takes the rose and does the math on it instantly — cheap flower, ` +
            `kid's bucket, bought on the spot — and it lands anyway, because you thought to. ` +
            `She tucks it behind her ear and leaves it there the rest of the night. "Farang ` +
            `romantic," she says, like it's a diagnosis she doesn't mind.`,
          `${name} takes the rose, sniffs it — pure theatre, the soi roses smell of soi — ` +
            `and stands it in her lady-drink glass where the whole rail can see it. That's ` +
            `the point of it, and both of you know it, and it works anyway.`,
          `Another rose. ${name} accepts it the way royalty accepts tribute — as her due, ` +
            `graciously — then ruins the effect completely by grinning. "You again with ` +
            `flower. I start a garden soon, na."`,
          `${name} twirls the rose once between two fingers, looking at you over it. ` +
            `"You know what girl do with flower from customer?" A beat. "Throw away when ` +
            `he go home." She tucks it into her bag, carefully, stem wrapped in a napkin.`,
        ], "roseHostess"),
        mamasan: `${name} accepts the rose with a raised eyebrow and a slow smile — she has ` +
          `been given every gesture this soi has, twice, and still gives you points for the ` +
          `flower. It goes in the little vase by the till, where the good ones go.`,
      },
      saleng_sandals: {
        hostess: `${name} opens the bag, holds up one sandal, turns it sole-up, and grins. ` +
          `She tries them on right here. They fit. She gives you a look that says she's ` +
          `choosing to be impressed by this. "You buy from saleng?" Yes. "Good price?"` +
          ` She decides yes. She keeps them on for the rest of the night.`,
        mamasan: `${name} examines the sandals with professional eyes — heel height, ` +
          `sequin quality, sole thickness — and nods approval. "My size also." ` +
          `She puts them straight into her bag and pats your shoulder once. Understood.`,
      },
      saleng_heels: {
        hostess: `${name} pulls a platform heel out and holds it up in the bar light, ` +
          `tilting it. Then she looks at you with a very specific expression: genuine ` +
          `but surprised. She steps out of her work flats and into the heels without ` +
          `sitting down, which is more impressive than it should be. "Fit perfectly." ` +
          `She beams. You feel like you did something right by accident.`,
        mamasan: `${name} takes the heels, looks at the sole, flips them over, and ` +
          `checks the stitching on the strap. Then she looks at you. "You know my size?" ` +
          `You didn't. They fit anyway. She slides them under her stool and tops up your ` +
          `drink without you asking.`,
      },
      saleng_lingerie: {
        hostess: `${name} peeks into the bag, goes very still for one beat, and then ` +
          `laughs — not embarrassed, just surprised. "You buy this for me?" She looks ` +
          `at you again, differently. "From saleng, right?" She folds the bag carefully ` +
          `and puts it in her work bag. She keeps smiling for the next ten minutes ` +
          `without quite explaining why.`,
        mamasan: `${name} opens the bag, closes it, and gives you a look you won't be ` +
          `able to describe later but will remember. "Good quality for saleng." She ` +
          `nods once, puts the bag in her drawer, and refills your drink herself. ` +
          `This is a significant gesture. She also doesn't mention it again.`,
      },
    };
    const role = NPC_ROLES[npc] === "mamasan" ? "mamasan" : "hostess";
    let giftLine = GIFT_TEXT[id] && GIFT_TEXT[id][role];
    if (typeof giftLine === "function") giftLine = giftLine();   // pooled entries are thunks
    _say(giftLine ||
      _pickVary(_GIVE_GIFT_LINES, "givegift")(NPCS[npc].name, ITEMS[id].name), "win");
    _addHappy(1);
    _maybeSelfBarfine(npc);
    return;
  }
  // Food, freely given to a working girl: she gladly takes it, and feeding
  // someone is care on this soi (the som-tam-not-words canon) — a notch of
  // fondness, once per girl per night. Keepsafe/earmarked food skips this and
  // falls to the safe wave below, so a quest bite isn't spent as a gift.
  if (ITEMS[id].kind === "food" && !ITEMS[id].keepsafe && NPC_ROLES[npc]) {
    // The 26-baht night (monsoon-purgatory canon): on the rainy night she told
    // you the price story, food is the som-tam-in-silence doctrine made
    // playable — care is supper, not advice. Once; non-jading; bigger bond.
    if (npc === "lek" && _flag("heardPriceStory") && !_flag("fed26") &&
        (G.rain > 0 || (typeof _wxRainy === "function" && _wxRainy()))) {
      _setFlag("fed26");
      G.itemLoc[id] = null;
      _addBond(npc, 2);
      _addHappy(2);
      _say(`You don't say anything. You just set ${ITEMS[id].name} down in front of her ` +
        "on the rail, next to her face-down phone. Lek looks at it, then at you, and " +
        "doesn't say thank you either — which is how you know it landed. She eats " +
        "slowly, watching the rain, and somewhere in the middle of it her shoulders " +
        "come down from around her ears. The flood keeps moving past the step. The " +
        "meters keep ticking. But not tonight's, not all of them.", "win");
      return;
    }
    G.itemLoc[id] = null;
    const fed = (G.soc.fed = G.soc.fed || {});
    let warmed = "";
    if (!fed[npc]) { fed[npc] = true; _addBond(npc, 1); warmed = " She won't forget it — small things count for more than drinks out here."; }
    _say(_pickVary(_GIVE_FOOD_LINES, "givefood")(NPCS[npc].name, ITEMS[id].name) + warmed);
    return;
  }
  _traceCancel(); // she declined it — no "you gave" breadcrumb for a gift that bounced
  // Handing a working girl your empties is its own small comedy — and the empties
  // are worth ฿5 to Auntie Nok, so she points you there rather than a flat wave.
  if (/bottle|glass/.test(itemWord) && NPC_ROLES[npc]) {
    _say(_pickVary(_GIVE_EMPTY_LINES, "giveempty")(NPCS[npc].name));
    return;
  }
  _say(`${NPCS[npc].name} waves it away with a smile.`);
}

function _doSellBottles(arg) {
  // she buys glass, nothing else — SELL PHONE got the bottle pointer (broke playtest 2026-08-22)
  if (arg && !/bottle|glass|empties|empty/.test(arg)) {
    _say("The only thing anyone on this coast buys off a farang is glass — Auntie Nok, Jomtien Soi 7 " +
      "at the beach end, five baht a bottle. The rest of your pockets are your own problem.");
    return;
  }
  // Name the ROOM she is in, not the soi it is near. "Down at the beach end" of
  // Jomtien Soi 7 describes the soi's west end, and she is not there — her pitch
  // is a separate room off the sand. A broke player following this line walked
  // the whole soi and found nobody (churner playtest 2026-08-23; third sighting
  // in this corner of the map, after rounds 8 and 12).
  //
  // Read _npcRoom, not her static .room — during her first-hour evening feed
  // (round 32, 2026-08-31) she's genuinely standing at jomtien_beach, visible
  // and talkable, and this used to refuse "no bottle buyer here" at the exact
  // moment she was in front of the player (Mario's catch: she buys wherever
  // SHE actually is, not just her usual pitch).
  const nokRoom = _npcRoom("nok");
  if (G.room !== nokRoom) {
    _say(nokRoom === "jomtien_beach"
      ? "No bottle buyer here. Auntie Nok's down at the beach herself right now, feeding the cats — try there."
      : "No bottle buyer here. Auntie Nok's cart is at " + ROOMS[nokRoom].name +
        " — out on the sand itself at the foot of Jomtien Soi 7, not on the soi. (The Jomtien one, not Pattaya's.)");
    return;
  }
  const bottles = _inv().filter(id => ITEMS[id].bottle);
  if (!bottles.length) { _say("\"No bottle, no baht, tilac.\" Fair."); return; }
  for (const b of bottles) G.itemLoc[b] = null;
  const paid = bottles.length * 5;
  G.money += paid;
  // ฿5 and ฿10 are a single coin; ฿15+ takes two or more.
  const coinWord = (paid === 5 || paid === 10) ? "a coin" : "coins";
  _say(`Auntie Nok counts the glass, nods, and presses ${coinWord} into your hand: ฿${paid}. ` +
    `(You have ฿${G.money}.)`);
  if (G.money >= BUS_FARE && !_flag("gotBusFare")) {
    _setFlag("gotBusFare");
    _say("\"Enough for bus now! Go, go — town that way.\" She shoos you fondly.", "dim");
  } else if (!_flag("act1Done") && G.money < BUS_FARE && G.battery <= 0 && !_flag("nokFare")) {
    // Gated on a DEAD PHONE, which is the actual trap: with a live phone you
    // still have CALL TAN and are not stranded, and firing on the first sale
    // would undercut the bottle economy for everyone who isn't stuck.
    // The ฿5 gap, closed by the one person in the game who would close it.
    // Only TWO of the four bottles are in lit rooms (the third is in a dark one,
    // and the light that reaches it is the same battery as the phone that calls
    // Tan), so a player who spends the torch can bank ฿10 against a ฿15 fare and
    // is stranded south of the bay with no way back and nothing telling him so
    // — the opening's one genuine point of no return (opening auditor
    // 2026-08-23). She already shoos you at the bus when you make it; a woman
    // who calls you tilac and hands out mango does not watch you come up ฿5
    // short. Once ever, and she does not make a thing of it.
    const gap = BUS_FARE - G.money;
    G.money += gap;
    _setFlag("nokFare"); _setFlag("gotBusFare");
    _say(`Auntie Nok looks at the coins in your hand, and at you, and does the ` +
      `arithmetic faster than you did. Another ฿${gap} appears from the tin under ` +
      `the cart without comment. "Bus fifteen. Now is fifteen. Go home, tilac — ` +
      `you bring bottle again sometime." She is already turning back to the mangoes. ` +
      `(฿${G.money}.)`, "win");
  }
}

// Stand the bar manager a "man drink" — a beer's worth (_beerPrice()). Builds his
// goodwill (G.soc.manDrinks) and clears any "you've been monopolising me" debt.
function _buyManDrink(id) {
  if (!_inBar()) { _say("Buy a drink where drinks are sold, tilac."); return; }
  const name = NPCS[id].name;
  if (G.money < _beerPrice()) { _say(`A man drink runs ฿${_beerPrice()} and you're short. ${name} waves it off: “Next time, bud.”`); return; }
  // A MAN WHO WON'T OPEN YOU A BEER WON'T DRINK YOUR HEALTH EITHER. Bert ices a
  // player who ran White Dish's errand — and the very same visit, BUY MAN DRINK
  // printed "a manager who likes you is the best friend a farang has out here",
  // +2 สนุก, one line before the freeze (round 22, Priya). Two surfaces, opposite
  // states, back to back: the state-blind-prose defect exactly. He takes the
  // money, because he is a publican and it is a bar; what he does not do is
  // pretend. No happiness, no standing — you bought a drink, not a friend.
  if (typeof _mgrIced === "function" && _mgrIced(id)) {
    G.money -= _beerPrice();
    _say(`You put the ฿${_beerPrice()} on the wood. ${name} rings it in, pours one, and drinks it ` +
      `where he's standing, facing the felt. Not a word wasted, not a word given. The gesture is ` +
      `noted and it is not, tonight, accepted. (฿${G.money} left.)`, "dim");
    return;
  }
  G.money -= _beerPrice();
  G.soc.manDrinks = G.soc.manDrinks || {};
  G.soc.manDrinks[id] = (G.soc.manDrinks[id] || 0) + 1;
  if (G.soc.mgrChat) G.soc.mgrChat[id] = 0; // debt squared
  _addHappy(2); _repGain(); // standing the manager a drink is exactly the sort of thing that gets around well
  if (NPCS[id].dry) {
    // a sober manager (Fast Eddy): the gesture lands, the glass is soda water
    _say(`“Now you're speaking the language.” ${name} rings it up, pours himself a soda ` +
      `water with a wedge of lime, and chinks it against yours without a flicker — the ` +
      `gesture is the thing, the glass is nobody's business. ฿${_beerPrice()} well spent: the ` +
      `man whose name is over the door, on your side, is the best friend a farang has out here. (฿${G.money} left.)`, "win");
    return;
  }
  _say(`“Now you're speaking the language.” ${name} pours himself a proper one and ` +
    `chinks it against yours. ฿${_beerPrice()} well spent — a manager who likes you is the ` +
    `best friend a farang has out here. (฿${G.money} left.)`, "win");
  if (_rand() < 0.5) { G.soc.drunk++; _say("He racks up two more “for the road” before you can argue.", "dim"); }
}

// Lean on a manager's time and he'll (genially) angle for a man drink back.
function _managerChatTick(id) {
  if (typeof _atOwnBar === "function" && _atOwnBar()) return; // he works for you here; he doesn't angle you for a drink
  G.soc.mgrChat = G.soc.mgrChat || {};
  G.soc.mgrChat[id] = (G.soc.mgrChat[id] || 0) + 1;
  if (G.soc.mgrChat[id] === 3) {
    _say(NPCS[id].nudge || (`${NPCS[id].name} lets a beat hang, then taps the bar with two knuckles: “You're ` +
      "good company, bud — but a man gets thirsty holding up his end. Stand us one?” (BUY MAN DRINK.)"), "dim");
  }
}

// A named non-working regular present in the bar (Terry, Mort at the Queen Vic):
// someone you STAND a drink, not a working girl and not the manager. So "buy terry
// a beer" doesn't silently pour YOU one, and "buy drink for terry" doesn't answer
// "she's not working" about a bald man in a Chang vest.
function _regularHere(nameW) {
  if (!_inBar() || !nameW) return null;  // a bar-rail gesture only — the street/massage/
  // cabaret crowd has its own verbs, and the Adonis hosts run their own drink path
  const id = _findNpc(nameW);
  // `house` is the staff marker for somebody the roles don't cover — the Queen
  // Vic has no mamasan or cashier, so its landlady carried no role and read as
  // a punter (round 19: BUY DRINK FOR NUCH filed her as a rail regular).
  if (id && _npcsHere().includes(id) && !NPC_ROLES[id] &&
      !NPCS[id].manager && !NPCS[id].filler && !NPCS[id].house)
    return id;
  // A named rail regular (Chuck, Terry, Danny…) is stood a beer the same way.
  // One cast, so _findNpc above already resolved him — he just fails the
  // role-less test by carrying the patron flag rather than carrying nothing.
  if (id && NPCS[id].patron && _npcsHere().includes(id)) return id;
  return null;
}
// Standing a man a drink is the commonest social gesture available to a punter
// who isn't buying lady drinks, so it gets a real pool. {drink} is his own —
// the men whose prose names what they nurse carry a `drink`; everyone else gets
// "a cold one", which is true of anybody. Nobody's thanks is another man's
// anecdote: the old fixed line repaid every drink with Terry's.
const _STAND_BEER = [
  "You stand {who} {drink}. It's received like a sacrament, and repaid inside a minute with an opinion you did not ask for and will not forget.",
  "{drink} goes down the bar to {who}, who lifts it an inch in your direction — the full ceremony, out here.",
  "You get {who} {drink} in. Nothing is made of it, which is how you know it landed.",
  "{drink} for {who}. “Ah — you're all right, you are.” The next stool becomes, by some silent arrangement, yours.",
  "You put {drink} in front of {who}. It buys you the next twenty minutes of somebody's life, whether you wanted them or not.",
];

// display name for a stand-a-beer target, NPC or patron
function _regularName(id) {
  return (NPCS[id] && NPCS[id].name) || "the regular";
}
// Pronoun-free on purpose: the role-less rail crowd is male today, but nothing
// enforces that — keep the prose safe for whoever takes the stool next.
function _standRegular(id) {
  if (id === "cream" && typeof _chamDrink === "function") { _chamDrink(); return; } // a civilian, not a rail regular
  if (G.money < _beerPrice()) {
    _say(`A bottle for ${id ? _regularName(id) : "the regular"} runs ฿${_beerPrice()}; you have ฿${G.money}.`);
    return;
  }
  G.money -= _beerPrice();
  const who = id ? _regularName(id) : "the regular";
  if (G.soc.patronMiffed[G.room]) {
    delete G.soc.patronMiffed[G.room];
    G.soc.heat[G.room] = Math.max(0, (G.soc.heat[G.room] || 0) - 1);
    _say(`A cold one slides down the bar to ${who}, who studies it, studies ` +
      `you — and the shoulder unturns. “No harm done, lad.” Form restored. (฿${G.money} left.)`);
  } else {
    // What he actually drinks, where the man's own prose says so — Doyle nurses
    // a soda water and the game stood him a Chang, twice a night, for a year.
    // And the fixed line repaid EVERY drink with Terry's Walking Street
    // anecdote, in everyone's mouth including Terry's (round 19). Pooled, per
    // the house rule that a repeatable line is never a fixed string.
    if (id) (G.soc.roundFor = G.soc.roundFor || {})[id] = G.turns; // he'll tell it again, in full
    const drink = (id && NPCS[id] && NPCS[id].drink) || "a cold one";
    _say(_fmt(_pickVary(_STAND_BEER, "standbeer"), { who, drink }) + ` (฿${G.money} left.)`);
  }
}

// What the room you are standing in will actually sell you, as the tap-hint line
// the street version already prints. Null where nothing is for sale, so bare BUY
// keeps its honest refusal everywhere else.
// The street rooms carry `seven`; the two walk-in branches are their own rooms
// and carry only `shop`. Both are a 7-Eleven to the player.
function _is7Eleven() {
  const r = _room();
  return !!(r.seven || /7.?eleven/i.test(r.name || ""));
}

function _shopStock() {
  const r = _room();
  if (_isHotelRoom(G.room)) return null;
  if (/7.?eleven/i.test(r.name || "")) {
    return "(BUY TOASTIE \u00b7 BUY NOODLES \u00b7 BUY WATER \u00b7 BUY CHARGER \u00b7 BUY CONDOM \u00b7 CHARGE PHONE)";
  }
  if (FOOD_STALLS[G.room] || r.food) return "(BUY FOOD \u00b7 or EAT, which is the same thing done faster.)";
  if (r.seven) return "(The 7-Eleven is right there: BUY TOASTIE \u00b7 BUY WATER \u00b7 BUY CHARGER \u00b7 BUY CONDOM)";
  if (G.room === "queen_vic") return "(BUY BEER \u00b7 BUY FOOD \u00b7 BUY WATER)";
  if (_inBar()) return "(BUY BEER \u00b7 BUY WATER \u00b7 BUY DRINK FOR <name>)";
  return null;
}

const _NOT_TONIGHT = [
  "It's there, and it isn't open, and those are both permanent conditions as far as tonight is concerned.",
  "Whoever runs that packed up hours ago. Daytime trade — a different town wearing the same streets.",
  "Not at this hour. That one keeps office hours in a place that famously doesn't.",
];

// Sniping the girl a regular was attending: pooled, because the moment repeats
// across nights and printed verbatim three times in one blind week (closer
// playtest F10, 2026-08-26)
const _SNIPE_LINES = [
  n => `Down the bar, the regular who has been buying ${n} drinks all evening goes very still over his Chang. Bad form, and every lady in the room clocked it.`,
  n => `The man who has been keeping ${n} in colas all night sets his bottle down with exaggerated care and looks at a spot just past your head. The room's temperature moves one degree, all in your direction.`,
  n => `${n} takes it with a professional smile, and the regular she was sitting with becomes very interested in the football. Nobody says anything. Everybody noticed.`,
];

// A lady drink leaves your pocket; at the bar you OWN it also rings INTO your own
// till, instead of vanishing from the economy (Ronnie, 2026-08-26).
function _ladyDrinkCharge(id) {
  G.money -= _ladyPrice();
  // a drink buys one telling in full — the brush-off pools promise it (see _deliver)
  if (id) (G.soc.roundFor = G.soc.roundFor || {})[id] = G.turns;
  if (typeof _atOwnBar === "function" && _atOwnBar() && G.bar) G.bar.cash += _ladyPrice();
}

function _doBuy(arg) {
  const r = _room();
  // The Vic's kitchen: Aoy advertises it with an order pad in her hand, and it
  // sold nothing (grapevine playtest F6, 2026-08-25). Hours are hers: basket
  // till eleven, after that only crisp.
  // The kitchen. Routed off QV_MENU's own aliases plus the generic words, so a
  // dish added to the card is buyable the same day it is written — the card and
  // the till are one object (_qvMenu) by construction.
  if (G.room === "queen_vic" &&
      (/food|kitchen|dinner|snack|meal|eat/.test(arg) || _qvNamesDish(arg))) {
    _qvKitchen(arg);
    return;
  }
  // MAMA YAI'S KITCHEN. Her room is "half bar, half kitchen" and the som tam
  // "arrives unasked" — EAT delivers it, and BUY answered "not at this hour" one
  // command earlier, in a room whose kitchen was demonstrably serving (round 23).
  // BUY is the verb every other food in this town uses; hers cannot be the one
  // place where asking to pay reads as the kitchen being shut. She still won't
  // take the money — that is the whole point of her.
  if (G.room === "mama_yai" && (/som ?tam|food|plate|dinner|eat/.test(arg) || !arg)) { _doEat(arg); return; }
  // BUY MOT DINNER / BUY KHAO MAN GAI. Early, because Mot works an alley with no
  // stall in it, so every branch below correctly concludes there is nothing for
  // sale — which is how a dinner two characters promise by name and by price
  // answered "Not for sale here" for the whole life of the game.
  if (_npcsHere().includes("mot") &&
      (/\bmot\b/.test(arg) || /khao ?man ?gai/.test(arg))) { _motDinner(); return; }
  // BUY PIWIN A BEER. First, because a stand is not a bar and every branch
  // below assumes one — the beer path was answering "this calls for a bar stool".
  if (/\bcoffee\b/.test(arg) && /\btan\b/.test(arg) && _npcsHere().includes("tan")) { _doTalk("tan", "coffee"); return; }
  if (/\b(all|everyone|everybody|every ?girl|the girls|the room|the bar)\b/.test(arg) && /drink|round/.test(arg) && _inBar()) {
    _say("One at a time — a lady drink is a conversation, not a round. (BUY DRINK FOR <name>; the BELL buys the room.)", "dim");
    return;
  }
  if (/7.?eleven|seven.?eleven|\b7-11\b/.test(arg) && _room().seven) { // "enter 7-eleven": the shop is in the room, not a room
    _say("You step into the 7-Eleven — the doorbell, the aircon, the glow. (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM · CHARGE PHONE)", "dim");
    return;
  }
  // BUY PIWIN A BEER — and BUY BANK A BEER, which is the same act. The engine
  // prints "(These men see the whole town and tell nobody. BUY PIWIN A BEER —
  // then ask him about somebody.)", and a player who has since learned the man
  // is called Bank uses his NAME, which is what the game taught him to do, and
  // got "this calls for a bar stool" (round 23). An instruction the game hands
  // you has to survive you knowing more than you did when it was handed over.
  const _piwinNamed = _piwinHere() && _npcsHere().some(id =>
    NPCS[id].piwin && new RegExp("\\b" + NPCS[id].name.toLowerCase() + "\\b").test(arg));
  if (/\b(piwin|motosai|driver)\b/.test(arg) || _piwinNamed) {
    if (!_piwinHere()) { _say("No stand here — the bikes are on the corners."); return; }
    _piwinBeer();
    return;
  }
  // Host bar: "buy drink for <host>" / "buy <host> a drink" runs on the host
  // track, not the (female-coded) lady-drink path — and your own beer is
  // served here too (no barType, so the normal beer path won't fire), at the
  // house's premium and with unrequested ice.
  if (r.hostBar) {
    if (/beer|chang|leo|singha/.test(arg) && !arg.includes("drink")) {
      if (G.money < HOST_BEER) { _say(`฿${HOST_BEER} a bottle here — premium end. You have ฿${G.money}.`); return; }
      G.money -= HOST_BEER;
      G.soc.drunk++;
      G.thirst = Math.max(0, G.thirst - 20);
      _say(`฿${HOST_BEER} for your own bottle at host-bar prices — cold, ceremonial, and ` +
        `poured over ice whether you wanted ice or not. (฿${G.money} left.)`);
      _addHappy(G.soc.drunk <= 4 ? 1 : -1);
      _checkDrunk();
      return;
    }
    const nm = arg.replace(/\b(buy|order|a|an|the|drink|for|him)\b/g, " ").trim();
    if (arg.includes("drink") || _HOSTS.includes(_findNpc(nm))) { _doHostDrink(nm); return; }
  }
  if (arg.includes("charger")) {
    if (!(r.shop && r.shop.charger) && !r.seven) { _say("No chargers sold here. Try a 7-Eleven."); return; }
    if (G.itemLoc.charger === "inventory") { _say("You already own one heroic charger."); return; }
    if (G.money < CHARGER_PRICE) { _say(`The charger is ฿${CHARGER_PRICE}. You have ฿${G.money}. The cashier's sympathy is genuine but unhelpful.`); return; }
    G.money -= CHARGER_PRICE;
    G.itemLoc.charger = "inventory";
    _sevenIn();
    _say(`One USB charger, ฿${CHARGER_PRICE}. The doorbell jingles in celebration. (฿${G.money} left.)`);
    return;
  }
  if (/condom|rubber|johnny|protection/.test(arg)) {
    if (!r.seven && !(r.shop && r.shop.condom)) { _say("No condoms sold here. Any 7-Eleven has them by the till."); return; }
    if (G.money < CONDOM_PRICE) { _say(_fmt("A pack is ฿{p}. You have ฿{m}. The cashier slides it back with a knowing look.", { p: CONDOM_PRICE, m: G.money })); return; }
    G.money -= CONDOM_PRICE;
    G.condoms += CONDOM_PACK;
    _sevenIn();
    _say(`A pack of ${CONDOM_PACK}, ฿${CONDOM_PRICE} — the most ordinary purchase in this town, rung up without a flicker. ` +
      `(You're carrying ${G.condoms}. ฿${G.money} left.)`);
    return;
  }
  if (/umbrella|brolly/.test(arg)) {
    if ((G.itemLoc.umbrella === "inventory")) { _say("You already have one, and one is the correct number."); return; }
    const vendor = G.rain > 0 && !_inBar() && !_isHotelRoom(G.room);
    if (!(r.shop || r.seven || vendor)) {
      _say("Nowhere here sells them. Any 7-Eleven does — and the street sellers " +
        "find you the moment it starts, which is the whole of their business model.");
      return;
    }
    if (G.money < UMBRELLA_PRICE) {
      _say(_fmt("฿{p} for an umbrella, and you have ฿{m}. You are getting wet tonight.",
        { p: UMBRELLA_PRICE, m: G.money }));
      return;
    }
    G.money -= UMBRELLA_PRICE;
    G.itemLoc.umbrella = "inventory";
    if (!vendor) _sevenIn();
    _say(vendor
      ? _fmt("Out of nowhere — and it is always out of nowhere — a woman with an armful of " +
          "umbrellas is at your elbow, because the rain IS the advertisement. ฿{p}, no haggling " +
          "worth the name, and she is three doors down before you have it open. (฿{m} left.)",
          { p: UMBRELLA_PRICE, m: G.money })
      : _fmt("฿{p} for a clear plastic umbrella from the rack by the door — the one purchase " +
          "in this town that pays for itself the first time. (฿{m} left.)",
          { p: UMBRELLA_PRICE, m: G.money }));
    return;
  }
  if (/water|nam plao/.test(arg)) {
    // Your own hotel room has the two complimentary bottles every Thai hotel
    // leaves by the kettle — free, two a day, restocked by housekeeping. This is
    // both true to the country and the fix for the rain-lock dehydration loop: a
    // resident pinned home by a downpour died of thirst seven nights in sixty
    // beside a working shower (Frank, 2026-08-26).
    if (_isHotelRoom(G.room) && G.room === _hotelRoomId()) {
      if ((G.roomWater || 0) >= 2) {
        _say("Both complimentary bottles are dead soldiers on the tray. Housekeeping " +
          "restocks them tomorrow; tonight it's the 7-Eleven or the tap you know better than to trust.");
        return;
      }
      G.roomWater = (G.roomWater || 0) + 1;
      G.thirst = Math.max(0, G.thirst - 45);
      _say(_pickVary([
        "One of the two complimentary bottles by the kettle — warm as soup, free as air, and exactly what the body wanted. Housekeeping will replace it tomorrow, the quiet daily kindness of every hotel in the kingdom.",
        "You crack the seal on a house bottle from the tray. Not cold, not glamorous, entirely sufficient. The second one stands sentry for later.",
      ], "roomwater"));
      return;
    }
    const canBuy = r.shop || r.seven || r.water || _inBar() || FOOD_STALLS[G.room]; // r.water: a drinks cart in the desc
    if (!canBuy) { _say("No water for sale here. 7-Elevens, bars, and the street carts all have it."); return; }
    const price = _inBar() ? 20 : 10;
    if (G.money < price) { _say(_fmt("฿{p} for a cold bottle, and you don't have it. Grim.", { p: price })); return; }
    G.money -= price;
    G.thirst = Math.max(0, G.thirst - 45);
    _sevenIn();
    _say(_fmt("{line} (-฿{p}, ฿{m} left.)", { line: _L(_pickVary(_WATER_LINES, "water")), p: price, m: G.money }));
    return;
  }
  // seven:true marks a street with a 7-Eleven on it; the walk-in branches are
  // shop:true rooms. A cord is a counter-display item, so both sell it.
  if ((r.seven || r.shop) && /\bcord\b|\blace\b|\bstring\b|necklace/.test(arg)) {
    if ((G.itemLoc.cord === "inventory")) { _say("You already have one, and one is plenty."); return; }
    if (G.money < CORD_PRICE) {
      _say(_fmt("The cord is ฿{p}. You have ฿{m}.", { p: CORD_PRICE, m: G.money })); return;
    }
    G.money -= CORD_PRICE;
    G.itemLoc.cord = "inventory";
    _sevenIn();
    _say(_fmt("฿{p} for a black nylon cord off the counter display — the girl rings it up " +
      "without a flicker, because half the men in this country are wearing one. (฿{m} left.)",
      { p: CORD_PRICE, m: G.money }));
    return;
  }
  // Mama noodles are on the shelf in the prose and were the second thing a
  // methodical player tried; BUY NOODLES quietly resolved to a toastie instead
  // (persona report B#9, 2026-08-23). They are their own thing, and cheaper.
  if (_is7Eleven() && /\bnoodles?\b|\bmama\b|\bcup noodle/.test(arg)) {
    if (_fullNo()) return;
    if (G.money < NOODLE_PRICE) {
      _say(_fmt("The noodles are \u0e3f{p}. You have \u0e3f{m}.", { p: NOODLE_PRICE, m: G.money }));
      return;
    }
    G.money -= NOODLE_PRICE;
    G.hunger = Math.max(0, G.hunger - 30);
    G.thirst = Math.max(0, G.thirst - 5);
    _sevenIn();
    _say(_fmt("{line} (\u0e3f{m} left.)", { line: _L(_pickVary(_NOODLE_LINES, "noodles")), m: G.money }));
    _addHappy(1);
    return;
  }
  // asked for a 7-Eleven item from INSIDE a bar whose street has one: point at
  // the door instead of a flat "not for sale" (Tyler, 2026-08-26 — the street
  // prose advertised the toastie, the bar refusal gave no way to reach it)
  if (!r.seven && /toastie|cheese|sandwich/.test(arg) &&
      Object.values(r.exits || {}).some(x => ROOMS[x] && ROOMS[x].seven)) {
    _say("The bar doesn't do toasties — but the 7-Eleven's right out on the street. Step OUT and the grill's yours.");
    return;
  }
  if (r.seven && (/toastie|cheese|sandwich/.test(arg) || (/food|snack/.test(arg) && !FOOD_STALLS[G.room]))) {
    if (_fullNo()) return;
    if (G.money < 35) { _say(_fmt("The toastie is ฿{p}. You have ฿{m}. The doorbell jingles in sympathy.", { p: 35, m: G.money })); return; }
    G.money -= 35;
    G.hunger = Math.max(0, G.hunger - 40);
    _sevenIn();
    _say(_fmt("{line} (฿{m} left.)", { line: _L(_pickVary(_TOASTIE_LINES, "toastie")), m: G.money }));
    _addHappy(1);
    return;
  }
  // The generic words, plus ANY substantial word from this stall's own name —
  // so a stall that advertises grilled squid answers BUY SQUID without the noun
  // being added to a list here. The hand-written list below could only ever
  // name the foods somebody remembered to add (afford-audit, 2026-08-23: the
  // squid cart at pattaya_tai had prose, and nothing behind it).
  if (FOOD_STALLS[G.room] && (/food|eat|toastie|mango|som tam|somtam|chicken|kebab|rice|snack|crocodile|croc|skewer/.test(arg) ||
      (arg && FOOD_STALLS[G.room].name.toLowerCase().split(/[^a-z]+/)
        .some(w => w.length > 3 && arg.includes(w))))) {
    const f = FOOD_STALLS[G.room];
    if (_fullNo()) return;
    if (G.money < f.price) { _say(`฿${f.price}, and you're short. The smell alone is worth half that, and free.`); return; }
    G.money -= f.price;
    G.hunger = Math.max(0, G.hunger - f.hunger);
    if (f.thirst) G.thirst = Math.max(0, Math.min(100, G.thirst - f.thirst));
    _say(_fmt("฿{p} buys {name}. {line} (฿{m} left.)",
      { p: f.price, name: f.name, line: _L(_pickVary(_STALL_EAT_LINES, "stalleat")), m: G.money }));
    _addHappy(1);
    return;
  }
  // Moonshine Bar's whole pitch is "try the house infusion" — Prik and Mek's
  // dare has to actually be answerable (price auditor playtest, 2026-08-23:
  // BUY YA DONG and DRINK YA DONG both refused at the one bar built around it).
  if (/ya ?dong|infusion|unlabelled bottle|moonshine|house shot/.test(arg) && G.room === "moonshine_bar") {
    if (G.money < YA_DONG_SHOT) { _say(_fmt("The unlabelled bottle is ฿{p} a shot. You have ฿{m}. Prik shrugs — more for the brave.", { p: YA_DONG_SHOT, m: G.money })); return; }
    G.money -= YA_DONG_SHOT;
    G.soc.drunk += 2;
    _say(`Prik pours from the unlabelled bottle without measuring. It tastes like bark, ` +
      `chilli, and a decision — Mek bangs the bar once the shot's down, and the whole ` +
      `rail cheers like you've done something. (฿${G.money} left.)`, "win");
    _addHappy(G.soc.drunk <= 4 ? 2 : -1);
    _checkDrunk();
    return;
  }
  if (/beer|chang|leo|singha/.test(arg) && !arg.includes("drink")) {
    // a restaurant serves beer too — KISS's Item 47 IS 'BIG BEER'
    if (!_inBar() && !_room().food && !FOOD_STALLS[G.room]) {
      _say("The 7-Eleven fridge hums somewhere, but this calls for a bar stool."); return;
    }
    // Bert said "that's a beer on the house, bud" to the ex-married origin and
    // then the till charged ฿80 in the very next command (comparative playtest
    // 2026-08-24). He meant it; this is him meaning it. Once, at his own bar.
    if (_flag("bertFreeBeer") && G.room === "stinky_bar" && _npcsHere().includes("bert")) {
      G.flags.bertFreeBeer = false;
      G.soc.drunk++;
      G.thirst = Math.max(0, G.thirst - 20);
      _say("Bert has it open before you've finished asking, and waves your hand off your " +
        "pocket without looking up. \"On the house. I said.\" The cap goes in the tray with " +
        "everybody else's.", "win");
      _addHappy(1);
      _checkDrunk();
      return;
    }
    if (G.money < _beerPrice()) {
      // "the cashier's calculator" in a room with no cashier — Cheap Charlie's
      // has no cast at all (Stan, round 35). Name the money-holder the bar has.
      const _tk = typeof _tillKeeper === "function" && _tillKeeper();
      _say(_fmt("A big bottle is ฿{p} here. You have ฿{m}. {who}", { p: _beerPrice(), m: G.money,
        who: _tk ? `${NPCS[_tk].name}'s calculator stays in the drawer.` : "The till stays shut." }));
      return;
    }
    // standing a beer to the rail regular — the generic word, or a named male
    // regular present ("buy terry a beer" → Terry gets it, not you).
    const beerName = arg.replace(/\b(buy|order|get|a|an|the|beer|chang|leo|singha|bottle|for|him)\b/g, " ").trim();
    const regId = _regularHere(beerName);
    if (/patron|regular|expat|him|guy|bloke/.test(arg) || regId) { _standRegular(regId); return; }
    G.money -= _beerPrice();
    (G.soc.selfDrinks = G.soc.selfDrinks || {})[G.room] = ((G.soc.selfDrinks[G.room] || 0) + 1); // "sit like a customer" — the midnight gate reads it
    G.soc.drunk++;
    G.thirst = Math.max(0, G.thirst - 20);
    const d = G.soc.drunk;
    const _beerTail = d >= 6 ? "The room has developed a gentle rotation." :
      d >= 4 ? "The neon is starting to smear pleasantly." :
      d >= 2 ? "The night improves by one bottle's worth." : "";
    // the price on the line that charges it: no bar quoted a beer before it was
    // in his hand, and a go-go's ฿140 Chang was only detectable by subtraction
    // (Colin, round 37) — and the −1 สนุก past four bottles gets its reason
    _say(_fmt("{line} (-฿{p}, ฿{m} left.)", { line: _L(_pickVary(_BEER_LINES, "beer")), p: _beerPrice(), m: G.money }) +
      (_beerTail ? " " + _L(_beerTail) : "") + (d > 4 ? " One past the sweet spot." : ""));
    _addHappy(d <= 4 ? 1 : -1);
    _checkDrunk();
    return;
  }
  if (arg.includes("drink")) {
    // a "man drink" for the bar manager — the floor's social tax, kept off the
    // lady-drink path (managers aren't in NPC_ROLES). "man drink", or "drink for <mgr>".
    const nm = arg.replace(/\b(buy|order|a|an|the|drink|man|for|him|manager)\b/g, " ").trim();
    const mgr = /\bman drink\b/.test(arg) ? _managerHere()
      : (nm && NPCS[_findNpc(nm)] && NPCS[_findNpc(nm)].manager ? _findNpc(nm) : null);
    if (mgr) { _buyManDrink(mgr); return; }
    // "buy drink for terry" — a named male regular, not a working girl: stand him
    // one instead of the lady-drink path's "she's not working this bar".
    const regId = _regularHere(nm);
    if (regId) { _standRegular(regId); return; }
  }
  if (arg.includes("lady drink") || arg.includes("ladydrink") || arg.includes("drink")) {
    if (!_socialVenue()) { _say("Buy a drink where drinks are sold, tilac."); return; }
    // strip round-count words too — "buy ploy ANOTHER drink" left "ploy another"
    // and _findNpc missed her (Gaz playtest, 2026-08-17)
    const nameW = arg.replace(/\blady\b|\bdrinks?\b|\bfor\b|\banother\b|\bmore\b|\bagain\b|\bsame\b/g, " ").replace(/\s+/g, " ").trim();
    const girlsHere = _npcsHere().filter(id => NPC_ROLES[id]);
    if (!nameW && girlsHere.length) {
      _say(_fmt("A drink for who? Yours is a BEER (\u0e3f{b}); hers is \u0e3f{l} and goes on " +
        "her tally. (BUY BEER \u00b7 BUY WATER \u00b7 BUY DRINK FOR {who})",
        { b: _beerPrice(), l: _ladyPrice(), who: _npcLabel(girlsHere[0]) }), "dim");
      return;
    }
    const id = nameW ? _findNpc(nameW) : girlsHere[0];
    if (!id || !NPC_ROLES[id]) {
      // A resolvable MALE / manager / patron isn't "she" — point at the right verb
      // instead of "She's not working this bar" (skimmer + Gaz: "buy drink for tan")
      const who = nameW && (_findNpc(nameW));
      if (who && who !== id) {
        _say(`${_npcLabel(who)} doesn't do lady drinks — that's the ladies' racket. For a bloke, it's BUY MAN DRINK (the fella behind the bar).`);
      } else if (who && NPCS[who].house) {
        _standRegular(who); // the landlady takes one like anybody else
      } else if (/\bman drink\b/.test(arg)) {
        // the verb IS "buy man drink", so telling him to type it is no help at all
        _say("A man drink is for the fella running the bar, and this one hasn't got one — " +
          "the till here is somebody else's problem. (Stand one of the regulars a beer instead, " +
          "or BUY DRINK FOR <lady>.)");
      } else if (nameW) {
        _say("She's not working this bar — nobody here by that name. (Buy a drink for one of the girls on the rail, or BUY MAN DRINK.)");
      } else _say("Nobody here to buy one for.");
      return;
    }
    if (G.money < _ladyPrice()) { _say(_fmt("Lady drinks are ฿{p}. You have ฿{m}. The math is not on your side.", { p: _ladyPrice(), m: G.money })); return; }
    // At the bar you OWN, the drink rings through your OWN till instead of
    // vanishing (Ronnie, 2026-08-26: ฿150 left the pocket, credited ฿0, gone from
    // the ecosystem). _ladyDrinkCharge does both sides.
    // she's already sitting with someone: a polite decline first, then — if you insist —
    // she takes it and her customer starts to turn.
    // A girl you FORCED a drink past her decline stays CONTESTED all night: her
    // customer doesn't evaporate because you spent ฿150. Before this, the insist
    // itself made her "your acquaintance" (drinks>0 flips _girlBusy off), so the
    // warning's "push it again and it stops being a look" could never come true —
    // the third drink was cheerfully accepted with the fuming man still seated
    // (optimizer playtest, 2026-08-22). Now every further drink re-rolls the
    // boil-over the warning promised.
    if (G.soc.contested && G.soc.contested[id]) {
      _ladyDrinkCharge(id);
      _addBond(id, 1);
      _say(`${NPCS[id].name} takes it — quicker this time, not looking at the man beside her, ` +
        `which is its own kind of looking. (฿${G.money} left.)`);
      _addHappy(-1, "the whole rail is watching this now");
      _poachAnger(id);
      return;
    }
    if (_girlBusy(id)) {
      G.soc.declined = G.soc.declined || {};
      const insisting = (id in G.soc.declined) && G.turns - G.soc.declined[id] <= 30;
      if (!insisting) { G.soc.declined[id] = G.turns; _say(_pickVary(_BUSY_DECLINE, "busyd")(NPCS[id].name)); return; }
      delete G.soc.declined[id];
      _ladyDrinkCharge(id);
      _addBond(id, 1);
      (G.soc.contested = G.soc.contested || {})[id] = true; // the man remembers
      _say(`${_pickVary(_BUSY_INSIST, "busyi")(NPCS[id].name)} (฿${G.money} left.)`);
      _addHappy(-1);
      _poachAnger(id);
      return;
    }
    _ladyDrinkCharge();
    // a lazy girl banks the drink but rarely the warmth — favor sticks only ~40%.
    // (only lazy girls consume the extra die, so nothing else's determinism moves.)
    const _lazy = NPCS[id].type === "lazy";
    if (!_lazy || _rand() < 0.4) _boughtBond(id, 1);   // capped per girl per night
    const _warm = !_lazy && _bondTier(id) >= 2;
    const _pool = _lazy ? _LAZY_DRINK_LINES : _warm ? _LADY_DRINK_WARM : _LADY_DRINK_LINES;
    const _pk = _lazy ? "lazydrink" : _warm ? "warmdrink" : "ladydrink";
    _say(_fmt("{line} (฿{m} left.)", { line: _pickVary(_pool, _pk)(NPCS[id].name), m: G.money }));
    _boughtHappy(1); // bought สนุก tapers over an evening (see _boughtHappy)
    // TONIGHT means tonight: this counted soc.drinks, which accumulates across the
    // whole vacation, so the tease fired on the first drink of an evening and
    // announced four fingers' worth of news that hadn't happened yet (churner
    // playtest 2026-08-23). bondNight is the per-night book.
    // …and DRINKS means drinks. bondNight is written by tips and party arrivals
    // too, so a man who tipped three girls and took one out got four fingers on
    // the FIRST drink he actually bought (Gerry, round 34) — the tease's own
    // words are "you buy drink for how many girl tonight?". Its own book now.
    (G.soc.drinkNight = G.soc.drinkNight || {})[id] = true;
    (G.soc.drinkCount = G.soc.drinkCount || {})[id] = (G.soc.drinkCount[id] || 0) + 1;
    if (Object.keys(G.soc.drinkNight).length >= 4 && !G.soc.butterflyTeased) {
      G.soc.butterflyTeased = true;
      _say(_pickVary([
        `${NPCS[id].name} counts something on her fingers, eyes narrowing in delight: “Ohhh, I hear about you. BUTTERFLY!” She makes the wing motion. The whole bar makes the wing motion. This is your reputation now.`,
        `“You buy drink for how many girl tonight?” ${NPCS[id].name} holds up four fingers, then flaps them. “Butterfly, na. Pattaya small. Everybody know the butterfly.” She does not seem to mind. She seems to be keeping score.`,
        `${NPCS[id].name} leans to the girl beside her, a whisper, a giggle, and two hands go up making wings. “He fly bar to bar,” she tells you, delighted. “Flap flap. We all know you already.”`,
      ], "butterfly"), "dim");
    }
    // the mamasan's blessing: her bar warms to you, and the house may pour one back
    if (NPC_ROLES[id] === "mamasan" && _npcRoom(id) === G.room && !G.soc.mamaTreat[G.room]) {
      G.soc.mamaTreat[G.room] = true;
      _say(`${NPCS[id].name} raises the glass a centimetre in your direction — the ` +
        "royal assent. The temperature of the whole bar changes; from here on, " +
        "the girls treat you like a regular.", "dim");
      _addHappy(2);
      if (_rand() < 0.5) {
        G.soc.drunk++;
        G.thirst = Math.max(0, G.thirst - 20);
        _say("She flicks two fingers at the cashier and a cold one lands in front " +
          "of you. On the house.", "dim");
        _checkDrunk();
      }
    }
    // drink-sniping the specific girl the regular was attending: bad form. Legacy
    // saves stored `true` — treat that as "any hostess" so old games don't crash.
    const busyId = G.soc.patronBusy[G.room];
    const sniped = busyId === true ? NPC_ROLES[id] === "hostess" : id === busyId;
    if (sniped && !G.soc.patronMiffed[G.room]) {
      G.soc.patronMiffed[G.room] = true;
      _say(_pickVary(_SNIPE_LINES, "snipe")(NPCS[id].name), "alert");
      _addHeat(1, _fmt("the man who was buying {n}'s drinks all evening", { n: NPCS[id].name }));
    }
    if (id === "candy" && !_flag("knowMot")) {
      _setFlag("knowWasHere"); _setFlag("knowMot");
      _deliver("candy", _pickDialogue("candy"));
    } else if (id === "pim" && !_flag("pinPart9")) {
      _setFlag("helmetDelivered"); // she'll talk now regardless
      _deliver("pim", _pickDialogue("pim", "oy"));
    } else {
      _say(`${NPCS[id].name} toasts you and the conversation gets noticeably warmer.`);
    }
    _maybeSelfBarfine(id);
    return;
  }
  if (/\bbra\b|\bbrassiere\b/.test(arg)) {
    if (!_inBar()) { _say("The emergency bra is a bar-stool institution, not a street stall."); return; }
    const nameW = arg.replace(/\bbra\b|\bbrassiere\b|\bfor\b/g, " ").trim();
    const girlsHere = _npcsHere().filter(x => NPC_ROLES[x] === "hostess");
    const id = nameW ? _findNpc(nameW) : (girlsHere.length === 1 ? girlsHere[0] : null);
    if (!id || NPC_ROLES[id] !== "hostess") {
      _say(nameW ? "She's not one of the dancers, and would like you to know it." :
        girlsHere.length ? "Buy it for whom? BUY BRA FOR <name>." :
        "Nobody here is in the market for one.");
      return;
    }
    const name = NPCS[id].name;
    if (_favor(id) < 2) {
      _say(`You offer to buy ${name} a bra and she raises an eyebrow that could ` +
        "cut glass. “Buy me DRINK first, then we talk about my wardrobe.” " +
        "(Warm her up — a lady drink or two.)");
      return;
    }
    G.soc.bra = G.soc.bra || {};
    if (G.soc.bra[id]) {
      _say(`${name} is already wearing the one you bought, and enjoying the novelty ` +
        "of it roughly as much as you are.");
      return;
    }
    if (G.money < BRA_PRICE) {
      _say(`The mamasan's drawer bra runs ฿${BRA_PRICE}. You have ฿${G.money}. She ` +
        "keeps a straight face; the drawer stays shut.");
      return;
    }
    G.money -= BRA_PRICE;
    G.soc.bra[id] = true;
    _say(`The mamasan produces a lacy something from a drawer of legend, ${name} ` +
      "vanishes for a theatrical thirty seconds and returns having made the " +
      `evening's physics considerably more interesting. (-฿${BRA_PRICE}, ฿${G.money} left.)`, "win");
    _addHappy(1);
    _maybeSelfBarfine(id);
    return;
  }
  if (/\bband\b/.test(arg) && /\bround\b|\bdrink/.test(arg)) {
    if (!_inBar()) { _say("You'd need to be inside the bar to put a round on the tab."); return; }
    if (!_bandHere()) { _say("No band playing here tonight."); return; }
    if (G.money < BAND_ROUND) {
      _say(`A round for the band runs ฿${BAND_ROUND}. You have ฿${G.money}. The tip box ` +
        "is cheaper — TIP BAND [amount].");
      return;
    }
    const r = G.room;
    G.money -= BAND_ROUND;
    _ringBell(r);
    _say(`฿${BAND_ROUND} to the mama for the band. Four ice-cold Changs materialise on ` +
      "the monitor wedge — the vocalist nods, the guitarist raises his bottle, the " +
      "drummer doesn't stop playing but somehow conveys gratitude. The whole bar " +
      `notes this. (฿${G.money} left.)`, "win");
    _say("The girls approve of the gesture but point out, with their eyes, that the " +
      "bell is still up there.", "dim");
    _addHappy(2);
    return;
  }
  // last: the parked ซาเล้ง sells cart-only items (moo ping/som tam/heels/…) that
  // no bar stocks — checked after the bar goods so shared words (bra/drink) still
  // resolve to the bar. The cart lingers; buying doesn't send it away.
  if (_salengHere() && _salengMatchItem(arg)) { _salengBuy(arg); return; }
  // Bare BUY inside a shop listed nothing, while the STREET outside a 7-Eleven
  // prints the whole stock list — so standing in the shop gave you strictly less
  // information than standing outside it (persona report B#9, 2026-08-23).
  if (!arg.trim() && _shopStock()) { _say(_shopStock(), "dim"); return; }
  // a dish named off the menu card, where there's a kitchen: BUY PAD THAI is BUY FOOD
  if ((FOOD_STALLS[G.room] || r.food) &&
      /\b(pad|rice|khao|noodle|tam|soup|curry|fish|chicken|pork|beef|prawn|plate|dish|meal|dinner|lunch|supper|breakfast|fry|burger|pie|toastie|special)s?\b/.test(arg)) {
    _doBuy("food");
    return;
  }
  // Something the ROOM's own prose put in front of you but the mechanics don't
  // sell — an ice-cream cart that, in that same sentence, "shuts before anything
  // interesting happens". The flat refusal was true and read as a missing feature
  // (persona report A#23, 2026-08-23).
  const _named = arg.trim() && (() => {
    try {
      const esc = arg.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + esc.replace(/\s+/g, "[ -]?") + "s?\\b", "i")
        .test(stripMarkup(r.desc || ""));
    } catch (e) { return false; }
  })();
  if (_named) {
    _say(_pickVary(_NOT_TONIGHT, "nottonight"));
    return;
  }
  _say("Not for sale here.");
}

// Hail-anywhere (2026-08-15 canon): baht buses have no stops — any room on a
// route (busStop carries the LINE NAME) can flag one down. The town circuit is
// one-way counter-clockwise (Second Rd north, Beach Rd south), and beachrd +
// secondrd are ONE service, so being on either reaches the whole loop — riding
// "against" the flow just means the long way round for the same fare.
function _busLinesFor(roomId) {
  const r = ROOMS[roomId] || {};
  const ls = Object.keys(BUS_LINES).filter(l =>
    BUS_LINES[l].includes(roomId) || r.busStop === l);
  if (ls.includes("beachrd") !== ls.includes("secondrd")) {
    ls.push(ls.includes("beachrd") ? "secondrd" : "beachrd");
  }
  return ls;
}
// The circuit in travel order (counter-clockwise). Feeder rooms not listed
// borrow the junction's position; used for the long-way-round narration only.
const _LOOP_CCW = ["pattaya_tai", "second_rd_s", "second_rd_diana", "second_rd_honey",
  "second_rd_myth", "second_rd_mall", "second_rd_c", "second_rd_soi8", "second_rd_n",
  "pattaya_klang", "second_rd_soi6", "dolphin", "naklua_rd", "beach_rd_top",
  "beach_rd_n", "beach_rd_klang", "beach_rd_soi7", "beach_rd_soi8", "beach_rd_soi9",
  "beach_rd_c", "beach_rd_s"];
function _loopPos(roomId) {
  const i = _LOOP_CCW.indexOf(roomId);
  return i >= 0 ? i : _LOOP_CCW.indexOf("pattaya_tai");
}
// Where the trucks WAIT until full — board here and the queue is the system.
const _BUS_WAITING = new Set(["pattaya_tai", "dolphin"]);

// ── Riding the loop for its own sake ─────────────────────────────────────────
// Canon (Mario): some punters ride the circuit purely for the pleasure of it —
// hanging off the back rail for the breeze and the view. And occasionally the
// truck comes with a hazard: an old lonely expat who rides the loop as a way
// to trap tourists in conversation. Same man every time. There is no escape
// until your stop, which is the whole point of his system.
const _LOOP_RIDE = [
  "You take the back step, hook an arm round the rail, and let the town do the work: " +
    "neon smearing past, the breeze finally winning against the heat, girls on a scooter " +
    "pacing the truck for half a block just to shout something friendly and peel away.",
  "Benches full, nobody talking, everybody watching — the truck is a moving balcony and " +
    "the whole one-way town files past it in order: the sois firing, the sea flashing " +
    "between buildings, the Dolphin turning you loose down the other side.",
  "Hanging off the back rail with the wind in your shirt, you understand the fifteen-baht " +
    "secret: this is the best ride in Pattaya and it is not close. A tourist gets on, " +
    "clocks you grinning at nothing, and by the Dolphin he is grinning at nothing too.",
  "The loop, ridden for no reason, which turns out to be the best reason. Second Road's " +
    "shophouse glow, the turn at the top where Terminal 21 pretends to be an airport, " +
    "then the long float down the seafront with the bay breathing alongside.",
  "You ride the whole circuit with your chin on the rail like a dog with its head out " +
    "the window, and arrive back where you started having gone nowhere and seen " +
    "everything. The driver doesn't even look surprised. You are not his first.",
];
const _LOOP_EXPAT = [
  "You've barely taken the bench when he leans across — old boy, faded polo, carrier " +
    "bag of nothing in particular — and opens with \"First time in Pattaya?\" like a " +
    "chess move. It is not his first game. You are trapped until your stop and he knows " +
    "it: by the Dolphin you know his knee history, his ex-wife's village, and what this " +
    "town was before, quote, they ruined it.",
  "The old boy is aboard again, and this time you watch him work: a young couple board " +
    "at Central and he has them inside four seconds — \"You want to know the REAL " +
    "Pattaya?\" They do not. They will hear it anyway, the whole slow lap of it, and " +
    "get off two stops early, which is the standard escape and he takes no offence.",
  "\"Now your baht bus,\" he says, settling in with the contentment of a man who has " +
    "engineered this exact captive audience, \"was five baht when I came. FIVE.\" The " +
    "loop rolls on. The number does not change and neither does he, and somewhere past " +
    "the Dolphin you realise the fare history of Chonburi province is now permanently " +
    "installed in your head.",
  "He's there on the front bench, waiting the way an angler waits, and you make the " +
    "mistake of eye contact. The next twenty minutes are his: the exchange rate in " +
    "'ninety-seven, the bar he nearly bought, the wife in Udon he doesn't mention " +
    "twice. Under it all, unsaid and audible, the actual message: nobody else listens.",
  "Tonight he doesn't hunt. He just sits with his carrier bag as the town wheels past, " +
    "and for one strange stretch of seafront the two of you ride in silence like old " +
    "colleagues. At your stop he says, \"Same time tomorrow,\" as if you'd agreed to " +
    "something. In a way you can't name, you have.",
];
function _rideLoop() {
  // The whole circuit, ~forty minutes of town: paid in real ticks, TRAVEL-style
  const startDay = G.day, g0 = G;
  for (let i = 0; i < 5; i++) {
    _tick();
    if (G !== g0 || G.day !== startDay || G.over) return; // the night ended mid-lap
    if (G.pendingEnc || G.game) break;                    // something found you anyway
  }
  const expat = _rand() < 0.34;
  _say(expat ? _pickVary(_LOOP_EXPAT, "loopexpat") : _pickVary(_LOOP_RIDE, "loopride"));
  if (G.loopDay !== G.day) {
    G.loopDay = G.day;
    _addHappy(2); // non-jading — the spectator family (WATCH SOI, the cats, the hill)
  }
  G.pendingFare = { kind: "bus", price: BUS_FARE, dest: G.room };
  _say(`Back where you flagged it, one whole town later. The driver leans out: “${thaiBaht(BUS_FARE)}”`, "thai");
  _engineSpeak(thaiBaht(BUS_FARE));
  _say(`(${thaiNumRoman(BUS_FARE)} … the ride's over, the fare isn't. PAY <amount>.)`, "dim");
}

// The small-hours kerb: the buses still run, sparse — the wait is the mechanic
const _BUS_SMALL_HOURS = [
  "You put an arm out over an empty road. Nothing. The town at this hour runs on a different clock — the songthaews still circle, but sparse, on the long loop, and the kerb is yours until one of them remembers this street exists.",
  "The road gives you back your own arm. Somewhere out there a songthaew is doing the small-hours loop with three sleeping passengers and no hurry at all; all you can do is stand where it will pass, and wait, and be whatever you are at this hour in public.",
  "Arm out. Minutes. A motorbike, a dog, a man carrying ice for no reason you will ever learn. The buses run all night — everyone knows it — but between two and dawn they run on rumour, and the kerb collects whoever is waiting on one.",
  "Nothing comes. Then more nothing. The night bus exists the way luck exists — genuinely, but not on demand — and the street settles in to keep you company while you find out which kind of night this is.",
];
const _BUS_SMALL_HOURS_COMES = [
  "Headlights, finally — the real ones, high and slow, a blue songthaew with its cab light on and one man asleep against the tailgate. It swings in like it was always coming. It was. That was never the question.",
  "And then it simply arrives, the way they always do when you have stopped believing in it: a blue truck, half-lit, patient, the driver's cigarette a small red planet in the cab. He'll drop you.",
  "A songthaew comes out of the dark end of the road at walking pace, in no hurry because nothing at this hour is. The bench is empty and cold and it is the most beautiful furniture in Thailand.",
];
// …and past a certain state, the bikes won't have you — but the bench will.
const _MOTO_DRUNK_NO = [
  "The piwin looks at you the way a man looks at cargo. A slow head-shake. \u201cYou fall off, boss \u2014 my problem, my bike, my licence.\u201d He nods up the road, not unkindly. \u201cBus take you. Bus take anybody.\u201d",
  "You get one boot toward the bike and the piwin puts a flat hand up, friendly and final. \u201cNo, boss. Tonight you are luggage.\u201d He points at the road with his chin. \u201cSongthaew. Bench no fall off.\u201d",
  "The whole stand has a quiet laugh, and none of them moves. A pillion seat needs a passenger who can hold on, and the vote on whether that is you tonight is unanimous. Somebody mimes a bench with two flat hands: the bus will have you.",
];
const _MOTO_DRUNK_NO_EAST = [
  "The piwin looks at you the way a man looks at cargo. A slow head-shake. \u201cYou fall off, boss \u2014 my problem, my bike, my licence.\u201d No bench to point you at out here: he tips his chin toward the sodium glow of the highway. \u201cTrucks on Sukhumvit take anybody. Long walk. Or you sit, drink water, ask me again.\u201d",
  "One boot toward the bike and the piwin puts a flat hand up, friendly and final. \u201cNo, boss. Tonight you are luggage.\u201d He points west, at the dark between here and the highway. \u201cCrossing. Truck. Or a stool and a water, and we talk again.\u201d",
  "The whole stand has a quiet laugh, and none of them moves. Out here there is no bench to fall onto \u2014 the nearest truck is on the highway, and the highway is a walk. Somebody hands you a water, which is the stand's whole opinion.",
];
const _BUS_DRUNK_BENCH = [
  "(You board the way a sack of rice boards. The bench takes you; the driver has seen worse, tonight, already.)",
  "(Getting aboard takes three tries and the tailgate rail takes most of your weight. Nobody comments. The songthaew is the last vehicle in Thailand that will always have you.)",
  "(You fold onto the bench with enormous care, like a man handling somebody else's shopping. The truck pulls out. The night, mercifully, does the rest.)",
];

function _doRideBus(arg) {
  const r = _room();
  // Order matters: "no route here" (indoors/off-road) and the curfew both
  // describe the real situation, so they come before the soi6-mode refusal.
  if (G.room === "bali_hai") {
    // Trucks everywhere, none of them the loop: the pier rank is for HIRE.
    _say("The songthaews at the pier aren't running the loop — they're for hire, " +
      `point-to-point, and the ฿${BUS_FARE} bench-seat rules don't apply: you'd be chartering ` +
      "the whole truck, and the driver will name a number that knows where you're " +
      "standing. The circulating buses turn at the junction — walk up toward Pattaya " +
      "Tai and flag one there. (Or MOTOSAI.)");
    return;
  }
  if (_isHotelRoom(G.room)) {
    _say("From in here the fleet is somewhat theoretical. The street is where " +
      "the trucks are \u2014 OUT first.", "dim");
    return;
  }
  if (_inBar()) {
    _say("From in here the trucks are a rumour on the far side of the rail — OUT to the street first.", "dim");
    return;
  }
  if (!_busLinesFor(G.room).length) {
    // Naming "Second Road" while the player stands on JOMTIEN Second Road reads as
    // a bug — the routes are Pattaya's, but the sign doesn't say so (opening
    // auditor 2026-08-23, three turns and a walk lost to it).
    _say("No blue trucks come down here — they keep to the main roads. " +
      (/^(jomtien|dongtan)/.test(G.room)
        ? "Down this end that means the seafront road or Thappraya, up on the hill."
        : _room().region === "Darkside"
        ? "Out here that means the highway: the Pattaya Tai trucks stop at the Sukhumvit crossing."
        : "The seafront, Pattaya's Second Road, Thappraya, or one of the big junctions."));
    return;
  }
  if (G.rain > 0) {
    _say("Headlights crawl past behind the wall of water, but no songthaew is " +
      "stopping — the drivers can't tell a fare from a lamppost in this.");
    return;
  }
  if (G.mode === "soi6") {
    _say("A blue songthaew slows, hopeful, and you wave it on. The routes out of here " +
      "aren't yours this week — one day the whole city, but not this trip.");
    return;
  }
  // The real Pattaya has no bus curfew: the songthaews run all night, just
  // SPARSE after two. So the small hours don't refuse you — they make you
  // WAIT, at the kerb, in whatever state you're in, and the wait is where the
  // vulnerability lives. The only curfew is on you (design call 2026-08-25:
  // too drunk, too tired, too sick — the timetable was never the wall).
  if (G.nightTurn >= LAST_BUS_TURN && G.turns - (G.busCameTurn || -99) > 6) {
    _say(_pickVary(_BUS_SMALL_HOURS, "bussparse"), "alert");
    if (G.dog) _say(_dogN("(Sai Krok sits at the kerb beside you, in no hurry at all. " +
      "For him the small hours are just the hours, and the wait is only a wait if " +
      "you are alone in it. You are not.)"), "dim");
    const wait = 3 + Math.floor(_rand() * 6);   // 18–48 minutes of kerb
    const startDay = G.day;
    for (let i = 0; i < wait; i++) {
      _tick();
      if (G.day !== startDay || G.pendingChoice === "vacation_end") return; // the night ended where you stood
      if (G.pendingEnc) {
        _say("(Headlights, twice — neither of them a songthaew. The street found " +
          "you before the bus did; flag another when this is done.)", "dim");
        return;
      }
    }
    _say(_pickVary(_BUS_SMALL_HOURS_COMES, "buscomes"), "win");
    // the truck that just arrived STAYS a few minutes: answering its drop-off
    // menu must not conjure a second wait while it stands at the kerb (closer
    // playtest F4, 2026-08-26 — two arrivals, one ride)
    G.busCameTurn = G.turns;
  }
  const lines = _busLinesFor(G.room);
  const reachable = [...new Set(lines.flatMap(l => BUS_LINES[l]))].filter(s => s !== G.room);
  const w = (arg || "").toLowerCase();
  if (/\bloop\b|\bround trip\b|\bjoyride\b/.test(w)) {
    if (!(lines.includes("beachrd") || lines.includes("secondrd"))) {
      _say("This line runs out and back, not round — the loop is the town circuit. " +
        "Ride in to the Pattaya Tai junction and pick it up there.");
      return;
    }
    if (G.money < BUS_FARE) {
      _say(`The loop costs what any ride costs — ฿${BUS_FARE} — and you have ฿${G.money}. ` +
        "The breeze, tragically, is not self-financing.");
      return;
    }
    _rideLoop();
    return;
  }
  // strip parens/punct both sides: the drop-list PRINTS "Second Road (Soi Myth
  // Night)" and typing it back verbatim must match (critic playtest 2026-08-22)
  const _bn = x => x.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  // every word the player typed must appear in the stop's name — "second road myth
  // night" reaches "Second Road (Soi Myth Night)" without the player guessing "soi"
  const toks = _bn(w).split(" ").filter(Boolean);
  const dest = reachable.find(s =>
    (toks.length && toks.every(t => _bn(ROOMS[s].name).includes(t))) ||
    (w && ROOMS[s].region.toLowerCase().includes(_bn(w))));
  if (!w || !dest) {
    // OFF HIS ROUTE, BUT NOT OFF THE TABLE. A local shuttle (Soi Buakhao) runs
    // its soi and nothing else — but a songthaew is a truck with a driver, and
    // the driver will leave his route for a price: you are chartering the whole
    // thing, and he names the number (the same rule the pier rank states above).
    // Mario's call, round 33: "they only go up and down Soi Buakhao unless you
    // negotiate otherwise." Only offered on a line that ISN'T the town circuit —
    // the loop lines already go where you asked, so a miss there is a miss.
    const localOnly = lines.some(l => LOCAL_SHUTTLES.has(l));
    if (w && localOnly && !/\bloop\b/.test(w)) {
      const network = [...new Set(Object.values(BUS_LINES).flat())];
      const _farBy = pred => network.find(s => s !== G.room && !reachable.includes(s) && pred(s));
      const far = _farBy(s => toks.length && toks.every(t => _bn(ROOMS[s].name).includes(t))) ||
        _farBy(s => w && ROOMS[s].region.toLowerCase().includes(_bn(w)));   // "naklua" is Naklua Road before it is the Dolphin (Trevor, round 39)
      if (far) {
        if (G.money < BUS_CHARTER) {
          _say(_fmt("\"{where}?\" He tips his head down the soi — that is not where this " +
            "truck goes. \"I take you special. Two hundred baht.\" He can see your pocket " +
            "from there, and you have ฿{m}. The bench-seat price was never going to buy a " +
            "whole truck. (Ride to either end and walk to a main road — the loop is ฿{f}.)",
            { where: _ucfirst((arg || "").trim()), m: G.money, f: BUS_FARE }), "alert");
          return;
        }
        // `charter: true` is what makes this fare DECLINABLE — it's pre-ride,
        // no service consumed, and the prompt itself says "or WALK". The
        // ordinary bench fare stays undeclinable: you already rode.
        G.pendingFare = { kind: "bus", price: BUS_CHARTER, dest: far, charter: true };
        _say(_fmt("\"{where}?\" The driver looks down the soi, then at you, and does the " +
          "arithmetic out loud the way they all do. \"Not my route. I take you special — " +
          "฿{p}.\" It is not a bench-seat fare because it is not a bench seat: for the next " +
          "twenty minutes you are renting the truck. He waits, entirely relaxed, because he " +
          "knows the walk to a main road is ten minutes and it is not his ten minutes. " +
          "(PAY {p} · or WALK)",
          { where: _ucfirst((arg || "").trim()), p: BUS_CHARTER }), "alert");
        return;
      }
    }
    // A destination that ISN'T on this loop was silently discarded: the player
    // typed RIDE BUS TO NAKLUA, got the same wall of drop-off options as a bare
    // RIDE BUS, and reasonably concluded it had worked (persona report B#13,
    // 2026-08-23). Say the ask missed before re-printing the list.
    if (w && !/\bloop\b/.test(w)) {
      _say(_fmt("\"{where}?\" The driver shakes his head once \u2014 not this truck, not " +
        "this route. He is already looking past you for the next fare.",
        { where: _ucfirst((arg || "").trim()) }), "alert");
    }
    G.busAskTurn = G.turns; // a bare stop name on the next line answers this list
    _say((_BUS_WAITING.has(G.room)
      ? "The truck at the head of the rank waits, benches filling. He'll drop you: "
      : "You put an arm out; a blue truck swerves in. He'll drop you: ") +
      reachable.map(s => ROOMS[s].name).join(" · "), "dim");
    if (lines.includes("beachrd") || lines.includes("secondrd"))
      _say("(Or stay on and RIDE THE LOOP — the whole circuit, just for the breeze.)", "dim");
    return;
  }
  if (G.money < BUS_FARE) {
    _say(`You flag a bus and climb on… then remember. ฿${G.money} in your pocket, ` +
      `and the fare is ฿${BUS_FARE}. You climb off to the driver's eternal, silent judgement.` +
      ((!_flag("act1Done") && G.phone && G.phone.contacts && G.phone.contacts.tan)
        ? " (Your phone still has one number in it — CALL TAN.)" : ""));
    return;
  }
  G.pendingFare = { kind: "bus", price: BUS_FARE, dest };
  if (G.soc.drunk >= 7) _say(_pickVary(_BUS_DRUNK_BENCH, "busbench"), "dim");
  // Boarding: at a waiting area the queue is the system; mid-route he swerves in.
  if (_BUS_WAITING.has(G.room)) {
    _say("You climb onto the truck at the head of the rank and take a bench. It does " +
      "not move. It fills, one passenger at a time, at the pace of a town with no " +
      "timetable — and then, benches full, it pulls out all at once.");
  }
  // The one-way circuit: if your destination is "behind" you, the ride is the
  // whole loop — same fare, more town. Only the loop lines carry direction.
  const onLoop = lines.includes("beachrd") || lines.includes("secondrd");
  const destOnLoop = BUS_LINES.beachrd.includes(dest) || BUS_LINES.secondrd.includes(dest);
  const N = _LOOP_CCW.length;
  const ahead = onLoop && destOnLoop ? (_loopPos(dest) - _loopPos(G.room) + N) % N : 0;
  if (onLoop && destOnLoop && ahead > N * 0.6) {
    // which half of the circuit you board on decides what "the long way" looks like
    const northbound = _loopPos(G.room) < _LOOP_CCW.indexOf("dolphin");
    _say("The driver doesn't turn round, because nothing in this town turns round — " +
      "one-way, counter-clockwise, no exceptions. So you ride the loop the long way: " +
      (northbound
        ? "up Second Road with the northbound crowd, round the Dolphin, and back down " +
          "the seafront with the sea strobing between the buildings, "
        : "down the seafront with the sea on your right until Beach Road gives out at " +
          "the Walking Street gate, where the truck turns left up Pattaya Tai to the " +
          "junction, and back up Second Road with the northbound crowd, ") +
      "the whole lit length of the town for the same coin…");
  } else {
    _say("The blue songthaew rattles along with the flow of the one-way town, wind " +
      "through the rails, the streets sliding past in smears of neon…");
  }
  _say(`You hop off. The driver leans out and says: “${thaiBaht(BUS_FARE)}”`, "thai");
  _engineSpeak(thaiBaht(BUS_FARE));
  _say(`(${thaiNumRoman(BUS_FARE)} … he wants paying. PAY <amount>.)`, "dim");
}

// ONE fare arithmetic, quoted and charged. The TRAVEL refusal quoted the
// destination's table price (฿50 to Walking Street) while the bike charged the
// far-side fare with the night rate on top (฿160) — the quote was three times
// under the bill (Stan, round 35). Every surface that names a motosai price
// reads this; `base` skips the night rate so a caller can say "more at this hour".
function _motoFare(d, base) {
  let price = d.price;
  // the Darkside fare is the Darkside fare in BOTH directions — the table keys on
  // the destination, so the long leg back across the highway was the town rate
  if (_room().region === "Darkside" && ROOMS[d.room] && ROOMS[d.room].region !== "Darkside") price = MOTOSAI_FAR;
  if (_flag("helmetDelivered") && price === MOTOSAI_TOWN) price = 20;   // Bank's mates' rate
  // once the last baht bus has gone, the piwins know they're the only ride in town
  // and price the small hours accordingly (Bank's ฿20 mates' rate stays exempt)
  if (!base && G.nightTurn >= LAST_BUS_TURN && price !== 20) price = Math.round(price * LATE_MOTO_MULT / 10) * 10;
  return price;
}

function _doMotosai(arg) {
  const r = _room();
  // a stand that isn't there: nothing happened, so nothing is spent — and it is
  // checked BEFORE the rain, which used to describe an awning in your hotel room
  // (Darren, round 37)
  if (!r.motosai) { _say(_isHotelRoom(G.room) ? "No piwin in here. The stands are on the street — OUT first." : "No motosai stand here."); return false; }
  if (G.rain > 0) {
    _say("The piwins are packed under the stand's awning, smoking, watching the " +
      "water rise. One meets your eye and laughs, not unkindly. Not for any " +
      "money, boss. Not in this.");
    return;
  }
  // Past a certain state the bikes won't have you — a pillion needs a passenger
  // who can hold on. The songthaew bench is the vehicle that always will, which
  // is the whole thesis of the title (design call 2026-08-25). But the balk is
  // a BALK, not a wall: ask again straight away and he shrugs and takes your
  // money, because the authored crash arc is exactly the ride he shouldn't have
  // given you — refused once, chosen twice, paid for in the ward. Uniform: the
  // pity ride and the mates' rate balk at the same wobble.
  if (G.soc.drunk >= 7) {
    const insisting = G.motoBalkTurn != null && G.turns - G.motoBalkTurn <= 5;
    if (!insisting) {
      G.motoBalkTurn = G.turns;
      // the balk points at the bench — only where a bench exists. On a Darkside
      // soi "the bus will have you" named a bus that never came (Darren, round 37)
      const bench = typeof _busLinesFor === "function" && _busLinesFor(G.room).length;
      _say(_pickVary(bench ? _MOTO_DRUNK_NO : _MOTO_DRUNK_NO_EAST, bench ? "motodrunk" : "motodrunkeast"), "alert");
      return false;
    }
    G.motoBalkTurn = null;
    _say("You ask again, and the piwin looks at you for a long moment, then at the " +
      "empty road, then kicks the stand up. \u201cYour funeral, boss.\u201d He means " +
      "the fare. Probably the fare.", "alert");
  }
  let w = (arg || "").toLowerCase();
  // "hotel" / "home" / "my room" / your hotel's own name: the piwin knows where you
  // sleep — the nearest stand to your hotel's street (playtests 2026-08-22)
  if ((/\b(hotel|home|my room|the room)\b/.test(w) || /sabai|queen vic|metropole|areca/.test(w)) && _flag("act1Done")) {
    // the Areca was missing from both lists — "motosai to hotel" re-prompted a
    // guest with a menu that contained the word hotel (Lionel, round 36)
    w = { sabai: "naklua", queenvic: "soi 6", areca: "soi buakhao", metropole: "soi buakhao" }[G.hotel] || w;
  }
  const destKey = Object.keys(MOTOSAI_DESTS).find(k => w.includes(k) || k.includes(w));
  if (!w || !destKey) {
    // The challenge frame: the same piwin who refuses a NAMED destination in
    // voice was offering the whole city as a menu one command earlier
    // (grapevine playtest F4, 2026-08-25). His menu and his mouth agree now.
    if (G.mode === "soi6") { _say(_pickVary(_SOI6_BOUND, "soi6bound")); return; }
    _say("The piwin raises an eyebrow: where to? (" +
      Object.keys(MOTOSAI_DESTS).join(" · ") + " · hotel)", "dim");
    return;
  }
  const d = MOTOSAI_DESTS[destKey];
  // You cannot buy a ride to the kerb you are standing on. MOTOSAI TO KHAO TALO
  // from Khao Talo took ฿170 and re-described the room — "the fastest ฿170 of
  // your life" (Stan, round 35). TRAVEL already refuses this; so does the bike.
  if (d.room === G.room) {
    _say("The piwin looks at you, looks at the road you are both standing on, and " +
      "declines to charge you for it — the one free thing a piwin has ever done. " +
      "\"Boss. Is here.\"", "dim");
    return;
  }
  // Soi 6 mode is fenced to the pocket, and _arriveAt is where that is enforced —
  // but the two arrival paths below set G.room DIRECTLY, so a motosai walked
  // straight through the fence. It never showed until a stand landed inside the
  // pocket; the moment one did, the daily challenge could be ridden out of.
  // Refuse here rather than in _arriveAt, so the fare is never taken for a ride
  // that doesn't happen.
  if (G.mode === "soi6" && !SOI6_ROOMS.has(d.room)) {
    _say(_pickVary(_SOI6_BOUND, "soi6bound"));
    return;
  }
  const price = _motoFare(d);
  const lateGouge = G.nightTurn >= LAST_BUS_TURN && price !== 20 && price !== _motoFare(d, true);
  // a dog needs his own bike — flat, not gouged with the late-hour fare
  const dogFare = G.dog ? DOG_MOTOSAI_FARE : 0;
  const total = price + dogFare;
  if (G.money < total && !_flag("act1Done") && !(ROOMS[G.room].region === "Darkside")) {
    // Act One: the walk IS the opening — a free ride anywhere would make the bus
    // fare pointless (broke playtest 2026-08-22). The Darkside stranding still gets mercy.
    _say(`The piwin looks at your empty hands, then down the road, then back. “No money, no ride, boss. ` +
      `Bus is ${thaiBaht(BUS_FARE)}.” He is not unkind about it. He is just not a charity before you've ` +
      "earned one.", "dim");
    return;
  }
  if (G.money < total) {
    // Broke and stranded. Most of town is a free walk home, but the Darkside is
    // on the wrong side of the highway — a dawn-broke farang out here would be
    // stuck. A piwin who's seen it a hundred times fronts the ride back to town
    // (town-ward only; he won't run you deeper into the dark for free) — and if
    // you're riding on his mercy, the dog rides on it too. No ฿10.
    // "Can't pay", not "has exactly zero". Gated on === 0, ฿1 was strictly worse
    // than ฿0: stranded at the Sukhumvit crossing past the last bus with the ATM
    // cap spent, one coin in the pocket bought a refusal where an empty pocket
    // bought the ride, and the only escape was to let dawn take the coin
    // (stress-test playtest 2026-08-23). The mercy exists so the night can't
    // dead-end; a player who cannot afford the fare is in exactly that spot
    // whether he holds nothing or holds change.
    // ONCE A NIGHT. The mercy exists so a night cannot dead-end, and one ride
    // does that — a second is a free taxi service. With no cap it was strictly
    // better mobility than solvency: a broke man rode Naklua → Walking Street →
    // Naklua → Walking Street → Jomtien back to back, one turn each, for nothing,
    // while a paying man was still negotiating a fare (credit-analyst persona,
    // round 20). Walking home is always free and dawn always comes, so the
    // anti-soft-lock purpose survives the cap intact.
    if (G.money < d.price && d.price === MOTOSAI_TOWN && G.pityRideDay !== G.day) {
      G.pityRideDay = G.day;
      G.pityRides = (G.pityRides || 0) + 1;
      G.pityOwed = (G.pityOwed || 0) + d.price;   // "pay next time" is a promise the game keeps
      const _pityExtra = Math.max(0, _districtHops(_room().region, ROOMS[d.room].region) - 1);
      G.room = d.room;
      G.darkStreak = 0;
      if (_pityExtra) { G.offstage = true; const ended = _passTime(_pityExtra); G.offstage = false; if (ended) return; }
      _say(G.pityRides === 1
        ? "The piwin takes in the empty pockets, the hour, and the state of you, " +
          "and sighs the sigh of a man who has done this before. “Mai pen rai. Get " +
          "on. Pay next time, boss.” He threads the highway one-handed and sets you " +
          "back down among the living — no charge, no lecture, just a nod that says " +
          "don't make a habit of it."
        : "The piwin knows you before you have said a word. “Again, boss?” Not angry. " +
          "Tired, maybe, the way a man is tired of a thing he is going to do anyway. “Get on. " +
          `Now you owe the stand ฿${G.pityOwed}. Next time you have money, you remember us.” ` +
          "He threads the highway one-handed. The nod at the other end is shorter than last time.", "thai");
      if (G.dog) _say(_dogN(_DOG_MOTOSAI[Math.floor(_rand() * _DOG_MOTOSAI.length)] +
        " No charge for Sai Krok either, not tonight."), "dim");
      _describeRoom(true);
      _maybeEncounter();
      return;
    }
    _say(`“${thaiBaht(price)}${dogFare ? ` — and ฿${dogFare} for his lordship's ride` : ""},” ` +
      `says the piwin. You have ฿${G.money}. He shrugs — no hard feelings, no free rides.`, "thai");
    return;
  }
  G.money -= total;
  // The ride itself can go wrong — a real accident (sandbox only; the do-or-die
  // opening quest handles its own fails). Odds scale with drink, the hour, and the
  // fast Darkside run; the delivered helmet cuts them. A mercy ride home (handled
  // above, G.money === 0) is exempt — nobody crashes on the piwin's kindness.
  const risk = _flag("act1Done")
    ? _motoCrashRisk(G.soc.drunk, G.nightTurn >= LAST_BUS_TURN, d.price === MOTOSAI_FAR, _flag("helmetDelivered"))
    : 0;
  if (_rand() < risk) {
    _say(_pickVary(_MOTO_CRASH, "motocrash"), "alert");
    _endNight("accident");
    return;
  }
  // survived — but on an elevated-risk ride, telegraph it with a near-miss ~half the
  // time, so the danger is felt long before the crash odds ever land (no blind death).
  // Rolled here (the dice order is the save's contract), PRINTED after the fare line
  // below — it read as "crashed, then got on" (Darren, round 37).
  const nearMiss = risk >= 0.05 && _rand() < 0.5;
  // the ride takes the time the road takes: one turn within the district or the
  // next one over, one more for every district beyond that (Mario, 2026-09-03)
  const extraTurns = Math.max(0, _districtHops(_room().region, ROOMS[d.room].region) - 1);
  G.room = d.room;
  if (extraTurns) { G.offstage = true; const ended = _passTime(extraTurns); G.offstage = false; if (ended) return; }
  G.darkStreak = 0;
  if (lateGouge) _say("Gone two in the morning, the buses gone sparse and slow, and the " +
    "piwin reads the empty road and your lack of options and names his small-hours " +
    "number. You both know you'll pay it.", "dim");
  // The dog's ฿10 used to surface on its OWN line, printed AFTER the balance —
  // so "the fastest ฿50 of your life" sat right next to a balance that had
  // actually dropped by ฿60, with nothing on that line explaining the gap
  // (Reg the publican, round 32, 2026-08-30). State the real total where the
  // balance is shown; the dog's line stays flavor, not the number reveal.
  G.motoRides = (G.motoRides || 0) + 1;
  const pids = (G.party && G.party.ids) || [];
  let seat = "";
  if (pids.length >= 2) {
    // two girls: four-up (a coin the hash flips, or always when broke), else a
    // second bike and a second fare
    const names = pids.map(i => NPCS[i].name).join(" and ");
    const fourUp = G.money < price || _hh("fourup:" + G.vacation + ":" + G.motoRides, 13) % 2 === 0;
    if (fourUp) seat = " " + _fmt(_pickVary(_MOTO_FOUR_UP, "motofour"), { n: names });
    else { G.money -= price; seat = " " + _fmt(_pickVary(_MOTO_SECOND_BIKE, "motosecond"), { n: names }) + ` (Another ฿${price} for the second bike.)`; }
  } else if (pids.length === 1) {
    seat = " " + _fmt(_pickVary(_MOTO_THREE_UP, "motothree"), { n: NPCS[pids[0]].name });
  } else if (G.motoRides === 1) {
    seat = " " + _pickVary(_MOTO_HANDS, "motohands");
  } else if (_hh("hands:" + G.vacation + ":" + G.motoRides, 11) % 5 === 0) {
    seat = " " + _pickVary(_MOTO_HANDS_LATER, "motohandslater");
  }
  const rideLine = _pickVary(extraTurns ? _MOTO_RIDE_LONG : _MOTO_RIDE_SHORT, extraTurns ? "motolong" : "motoshort");
  // with a seat sentence in between, the ride becomes its own sentence — "swing on
  // the back, There is the question of your hands… and the piwin" was two fragments
  // welded without punctuation (Frank, round 38)
  const rideSentence = seat
    ? (rideLine.replace(/^and /, "").replace(/^(\w)/, c => c.toUpperCase()))
    : rideLine;
  _say(`“${thaiBaht(price)}${dogFare ? ` (plus ${thaiBaht(dogFare)} for his lordship's ride)` : ""}.” ` +
    `You pay${price === 20 ? " — Bank's special price" : ""}, swing on the back` + (seat ? "." + seat + " " : ", ") +
    rideSentence + ". " +
    `That was the fastest ฿${total} of your life` +
    (extraTurns
      ? ` — ${_minutesWord((extraTurns + 1) * 6).toLowerCase()} of it, ` +
        `${extraTurns >= 3 ? "the town going by in districts" : "one district into the next"}.`
      : ".") + ` (฿${G.money} left.)`, "thai");
  _engineSpeak(thaiBaht(price));
  if (nearMiss) _say(_pickVary(_MOTO_NEARMISS, "motonear"), "alert");
  // the night you had nothing: the piwin who fronted the ride remembers, and the
  // first paid fare after it settles the debt of honour (Darren, round 37: "never
  // remembers you"). Only what you can cover; he does not strand you for it.
  if (G.pityOwed && G.money >= G.pityOwed) {
    G.money -= G.pityOwed;
    _say(`The piwin holds his hand out a second longer. \u201cAnd the night you have nothing, boss.\u201d ` +
      `You pay the ฿${G.pityOwed} you owed the stand, and the nod you get back is worth more than the fare. (฿${G.money} left.)`, "dim");
    G.pityOwed = 0;
  }
  if (G.dog) _say(_dogN(_DOG_MOTOSAI[Math.floor(_rand() * _DOG_MOTOSAI.length)]), "dim");
  _describeRoom(true);
  _maybeEncounter();
}

function _doPay(arg) {
  // A LANDLORD WHO WILL NOT TAKE YOUR MONEY. He comes to the bar in person to
  // say "there is not a third time", you have five thousand in the till, and
  // PAY RENT answered "Nobody's waiting to be paid." An ex-publican of nineteen
  // years called it the most unbelievable thing in the game, and he is right:
  // the first thing anybody does when they are short is walk the money round.
  // HELP listed REPAY for the loan shark and DRAW for your own till, and
  // nothing at all for the two creditors who can actually finish you (round 24,
  // Keith). Sits above the fare so a bus ride is never ambiguous.
  if (!G.pendingFare && typeof _payCreditor === "function" &&
      /rent|landlord|note|arrears|old man|bert|bar/i.test(arg || "")) { _payCreditor(arg); return; }
  if (!G.pendingFare) { _say("Nobody's waiting to be paid."); return; }
  const amount = /^\d+$/.test(arg) ? parseInt(arg, 10) : parseThaiDigits(arg);
  const { price, dest } = G.pendingFare;

  if (amount === null || Number.isNaN(amount)) {
    _say(`He repeats, slower, the universal way: “${thaiBaht(price)}”. A number would help.`, "thai");
    return;
  }
  if (amount > G.money) { _say(`You don't have ฿${amount}.`); return; }
  if (amount < price) {
    _say(`He looks at the coins, then at you: “${thaiBaht(price)}!” Not a negotiation.`, "thai");
    return;
  }
  if (amount > price) {
    G.money -= amount;
    G.pendingFare = null;
    G.room = dest;
    _say(`He accepts your ฿${amount} with the serene absence of change-giving for which ` +
      "the profession is famous. An expensive listening lesson. (฿" + G.money + " left.)");
  } else {
    G.money -= amount;
    G.pendingFare = null;
    G.room = dest;
    _say(`฿${price}, exact. He taps the rail twice — thanks in driver — and is gone. (฿${G.money} left.)`);
  }
  if (G.dog) _say(_dogN(_DOG_BUS[Math.floor(_rand() * _DOG_BUS.length)]), "dim");
  G.darkStreak = 0;
  _describeRoom(true);
  _maybeEncounter();
}

function _doLight(on) {
  if (!_inv().includes("phone")) { _say("Your phone… you do still have your phone. Deep breaths."); return; }
  if (on) {
    if (G.battery === 0) { _say("The phone is dead. The flashlight is a memory."); return; }
    if (G.lightOn) { _say("The flashlight is already on, eating battery."); return; }
    G.lightOn = true;
    _say(`Flashlight on. (Battery: ${G.battery}% — it drains while it burns.)`);
    if (_room().dark) _describeRoom(true);
    else _lightNotice();
  } else {
    if (!G.lightOn) { _say("It's already off."); return; }
    G.lightOn = false;
    if (G.lightWarn.n > 0 && _room().barType === "gogo") {
      G.lightWarn.room = null; G.lightWarn.n = 0;
      _say("Flashlight off. The security shirts refold into the corner. The " +
        "mamasan's smile returns at its usual wattage, as if nothing happened — " +
        "because now, officially, nothing did.");
      return;
    }
    G.lightWarn.room = null; G.lightWarn.n = 0;
    _say("Flashlight off. Battery preserved; nerves, less so.");
  }
}

// A lit flashlight in a social space gets noticed. On a dark soi it's sense;
// under working neon it's either a fool or a camera — and in a go-go the house
// always assumes the camera. No photos is the one rule nobody bends.
function _lightNotice() {
  if (!G.lightOn || G.battery === 0 || _room().dark) return;
  const r = _room();
  const npcs = _npcsHere();
  if (!r.barType && !npcs.length) return;
  // Your own room is not an audience. A companion you brought back counted as
  // "people present", so the torch fired the BAR tease at her — "The other
  // girls are already laughing", in a locked hotel room with no other girls in
  // existence (Frank, round 34). A light in your own room is unremarkable.
  if (_isHotelRoom(G.room)) return;
  if (r.barType === "gogo") {
    G.lightWarn.mark = true; // this command's warning is spent; the tick skips
    _gogoLightWarn();
    return;
  }
  const girl = npcs.find(id => NPC_ROLES[id] === "hostess");
  let lines;
  if (girl) {
    const name = NPCS[girl].name;
    lines = [
      `${name} shields her eyes theatrically. "Hansum, why you have the torch? ` +
        `You look for your money? I save you time: it's gone."`,
      `${name} steps into the beam and strikes a pose. "Ooh, spotlight! You pay ` +
        `me like a star too, na?" The other girls are already laughing.`,
      `${name} leans over and gently pushes your phone hand down. "Tilac. The ` +
        `neon works fine. You look like you hunt ghosts."`,
    ];
  } else if (r.barType) {
    lines = [
      "The bartender squints into your beam and points, wordlessly, at the " +
        "fully functional lights overhead.",
      "\"Power cut is finish since 2015, boss,\" someone offers from the rail, " +
        "to general amusement.",
    ];
  } else {
    const name = NPCS[npcs[0]].name;
    lines = [
      `${name} tracks your flashlight beam with open amusement. On a street lit ` +
        `like a runway, you are the only one carrying your own sun.`,
      `${name} flicks a phone light back at you across the street — a little ` +
        `lighthouse conversation. You may be the joke here.`,
    ];
  }
  _say(lines[Math.floor(_rand() * lines.length)], "dim");
}

// Go-go escalation: two warnings about the light, then security ends the
// conversation. The counter is per-bar and resets when the light goes off
// or you leave; `mark` stops the entry notice and the same command's tick
// from counting as two warnings.
function _gogoLightWarn() {
  const w = G.lightWarn;
  if (w.room !== G.room) { w.room = G.room; w.n = 0; }
  w.n++;
  const npcs = _npcsHere();
  const mama = npcs.find(id => NPC_ROLES[id] === "mamasan");
  const who = mama ? NPCS[mama].name : "The mamasan";
  if (w.n === 1) {
    _say(`${who} is at your elbow before the beam settles, one flat hand over ` +
      "your phone, smile fixed: \"No photo. No video. House rule, tilac — the " +
      "girls dance, nobody films.\" Two security shirts have already unfolded " +
      "from the corner. Best switch that off.", "alert");
  } else if (w.n === 2) {
    _say(`${who} is back, and the smile is gone. \"OFF. Now.\" Behind her the ` +
      "two security shirts have stopped pretending to watch the stage. The DJ " +
      "has turned the music down half a notch, which somehow makes it worse.", "alert");
  } else {
    w.room = null; w.n = 0;
    _say("Nobody says anything this time. The music doesn't even pause.", "alert");
    _kickOut();
  }
}

function _doCharge() {
  if (!_inv().includes("charger") && typeof _nontHere === "function" && _nontHere()) {
    if (G.battery >= 100) { _say("Already full. Nont doesn't charge for nothing, and there's nothing to charge."); return; }
    if (G.money < NONT_CHARGE) { _say(`“Fifty.” He doesn't unplug the brick for less, and you haven't got fifty.`); return; }
    G.money -= NONT_CHARGE;
    _say(`Nont plugs your phone into a power bank the size of a house brick and goes back to his tweezers. (-฿${NONT_CHARGE}, ฿${G.money} left.)`, "dim");
    const startDay = G.day;
    for (let i = 0; i < 3 && G.day === startDay && !G.pendingEnc; i++) _tick();
    if (G.day !== startDay) return;
    G.battery = 100; G.lightOn = false;
    _say("100%. He hands it back without looking up. “Fifty well spent.”");
    return;
  }
  if (!_inv().includes("charger")) { _say("You need a charger. 7-Elevens sell them."); return; }
  if (!_room().outlet && !_room().seven) { _say("No outlet here. 7-Eleven has one; so do a couple of friendly bars."); return; }
  if (G.battery >= 100) { _say("Already full. A rare feeling of complete adequacy."); return; }
  // a bar's outlet is "for customers the boss likes" — buy something first
  if (_inBar() && _room().outlet && !_isHotelRoom(G.room) &&
      !((G.soc.selfDrinks && G.soc.selfDrinks[G.room]) || (G.soc.bells && G.soc.bells[G.room]) || _atOwnBar())) {
    _say("The socket behind the till is for customers. The cashier's eyebrow says so before you've asked. Buy a drink, then ask.", "dim");
    return;
  }
  // 5% → 100% in one command on a 7-Eleven pavement (Gordon, round 37): a charge
  // takes the minutes it takes, in full ticks, and stops early if the night does
  const startDay = G.day;
  _say(_isHotelRoom(G.room) ? "You plug in by the bed and let it drink." :
    _inBar() ? "You plug in behind the till and nurse a drink while it climbs." :
    "You plug in at the 7-Eleven's counter and stand there like a man waiting for rice.", "dim");
  for (let i = 0; i < 3 && G.day === startDay && !G.pendingEnc; i++) _tick();
  if (G.day !== startDay) return;
  G.battery = 100;
  G.lightOn = false;
  _say("You watch the number climb the way ancient man watched sunrise. 100%. You are reborn.");
  _addHappy(1);
}

function _doScore() {
  _say(_fmt("สนุก happiness: {h} — {lvl}", { h: G.happy, lvl: _L(_happyLevel(G.happy)) }), "win");
  _say(_fmt("{wd}, day {d}{stage} · {clock} · ฿{m} · battery {bat}%{quiz}", {
    wd: _L(_weekday()), d: G.day, stage: G.stage === "expat" ? _L(" · expat life") : _L(" of 7"),
    clock: _clockStr(), m: G.money, bat: G.battery,
    quiz: _quizDay() ? _L(" · QUIZ NIGHT 20:00-22:00") : "" }), "dim");
  let _body = _fmt("hunger {hu} · thirst {th}", { hu: G.hunger, th: G.thirst });
  if (G.soc.drunk) _body += _fmt(" · {d} bottle{s} deep", { d: G.soc.drunk, s: G.soc.drunk > 1 ? "s" : "" });
  if (G.hurt) _body += _fmt(" · banged up ({h}/3)", { h: G.hurt });
  _say(_body, "dim");
  // Soi 6 mode never plays Act One (act1Done/hasWallet are force-set at start),
  // so the "ACT ONE COMPLETE — scored 0 / WALLET RECOVERED" ledger below would be
  // nonsense to a player who never lost a wallet — suppress the whole full-game
  // progress block in the launch mode.
  if (_flag("act1Done") && G.mode !== "soi6") _say(`✓ ACT ONE COMPLETE — scored ${G.score}` +
    (G.vacation > 1 ? ` · vacation #${G.vacation}` : ""), "dim");
  if (_unreadCount()) _say(_fmt("📱 {c} unread message{s} (CHECK MESSAGES)", { c: _unreadCount(), s: _unreadCount() > 1 ? "s" : "" }), "win");
  // The three collections, on the one screen a player checks to see how he is
  // doing. They already existed and were each invisible: the gallery had no
  // total, the black book had no total, and the Thai you have been shown was
  // only ever visible in the trainer. A number with a denominator is a goal; a
  // number on its own is trivia.
  if (_flag("act1Done")) {
    const met = Object.keys(G.known || {}).filter(id => NPCS[id]).length;
    const faces = new Set(_photoList().map(p => p.id)).size;
    const nums = Object.keys(G.phone.contacts || {}).filter(id => G.phone.contacts[id] && NPC_ROLES[id]).length;
    const thai = (G.thaiSeen || []).length;
    if (met || faces || nums || thai) {
      _say(_fmt("{m} names known · {f} face{fs} in the gallery · {n} number{ns} · {t} Thai word{ts} picked up",
        { m: met, f: faces, fs: faces === 1 ? "" : "s", n: nums, ns: nums === 1 ? "" : "s",
          t: thai, ts: thai === 1 ? "" : "s" }), "dim");
    }
  }
  // vignettes are hidden from the journal AND hint (they're quiet origin scenes,
  // not jobs) — SCORE was the one surface that leaked them, so it said "active"
  // while QUESTS said "nothing on the books" (civilian playtest F1, 2026-08-26)
  const active = Object.entries(QUESTS).filter(([qid, q]) => G.quests[qid] === "active" && !q.vignette);
  for (const [, q] of active) _say(_fmt("▶ {name}", { name: _L(q.name) }), "dim");
  // Faction standing — only surfaces once you've actually taken a side; a player
  // who stays out of the politics never sees this line, and pays nothing for it.
  const standing = _FACTION_LABELS
    .filter(([f]) => _faction(f) !== 0)
    .map(([f, label]) => `${label} ${_faction(f) > 0 ? "+" : ""}${_faction(f)}`);
  if (standing.length) _say(_fmt("Standing: {s}", { s: standing.join(" · ") }), "dim");
  // Act One's own tick-list — printed with no heading right after any OTHER
  // active quest's own ▶ line, it read as belonging to that quest instead
  // (Reg the publican, round 32, 2026-08-30: "The Safe-Cracker" then five
  // Last-Baht-Bus ticks, no separator). QUESTS already headings this properly;
  // SCORE now matches, and stops repeating the full checklist forever once
  // the compact "ACT ONE COMPLETE" line above already covers it.
  if (G.mode !== "soi6" && !_flag("act1Done")) {
    _say("The Last Baht Bus:", "dim");
    for (const [f, label] of _ACT1_MILESTONES) if (_flag(f)) _say("✓ " + label, "dim");
  }
}
const _FACTION_LABELS = [
  ["wdg", "White Dish"], ["samson", "the Samsons"], ["indie", "the independents"], ["syndicate", "the syndicate"],
];

// ── The Zork ledger ──────────────────────────────────────────────────────────
// Verbs a text adventure must answer, even when the answer is no. Zork always
// had something to say; "I didn't understand that" is a last resort, not a
// personality. Flavor only — nothing here moves game state beyond the tick.

function _doDrink(arg) {
  if (/water|nam/.test(arg)) { _doBuy("water"); return; }
  if (/ya ?dong|infusion|unlabelled bottle|moonshine|house shot/.test(arg) && G.room === "moonshine_bar") { _doBuy(arg); return; }
  const w = arg.match(/^with (.+)$/);
  if (w) { _doBuy("lady drink " + w[1]); return; }
  if (!arg || /beer|chang|leo|singha|bottle|drink/.test(arg)) {
    if (!_inBar()) {
      _say("Nothing to drink out here but the humidity. Find a bar stool, or " +
        "a 7-Eleven fridge (BUY WATER).");
      return;
    }
    _doBuy("beer");
    return;
  }
  if (!_inBar()) { _say("No bar out here to pour it. A 7-Eleven fridge does water (BUY WATER); anything with a head on it wants a bar."); return; }
  _say("The bar does beer, lady drinks, and water — in descending order of enthusiasm.");
}

// Is there anything to eat within arm's reach? The same three sources BUY FOOD
// and _doEat already answer to: FOOD_STALLS keys the carts and kitchens,
// room.food the ones written into a room's own prose, room.seven the 7-Eleven
// toastie. Prose that claims food is near must ask this, or it promises a
// supper the parser then refuses.
// Plus the two kitchens that don't advertise through either field: the Queen
// Vic's card (tonight's _qvMenu, so an out-of-hours pub reads as foodless,
// which it is — Aoy goes home at eleven) and Mama Yai, who simply puts a plate
// in front of you without being asked.
function _foodHere() {
  const r = _room();
  if (G.room === "mama_yai") return true;
  if (G.room === "queen_vic")
    return typeof _qvMenu === "function" ? _qvMenu().length > 0 : true;
  return !!((typeof FOOD_STALLS !== "undefined" && FOOD_STALLS[G.room]) || r.food || r.seven);
}

function _doDiagnose() {
  const d = G.soc.drunk;
  const parts = [
    // The middle rung used to read "every cart on the street smells personal"
    // wherever you stood — including the two thirds of the map with nothing to
    // buy, where BUY FOOD then refuses. A body state was making a claim about
    // the room. Keep the good line for where it's true and let hunger be
    // hunger everywhere else.
    _L(G.hunger >= 70 ? "hungry enough to envy the soi dogs" :
      G.hunger >= 40 ? (_foodHere() ? "peckish, and every cart on the street smells personal"
        : "peckish, and starting to resent it") : "fed"),
    _L(G.thirst >= 70 ? "dry as a temple bell" :
      G.thirst >= 40 ? "thirsty" : "watered"),
    d >= 6 ? _fmt("{d} bottles deep and navigating by neon", { d }) :
      d >= 3 ? _fmt("{d} bottles deep, the world pleasantly loose at the hinges", { d }) :
      d >= 1 ? _fmt("{d} bottle{s} in", { d, s: d > 1 ? "s" : "" }) : _L("stone sober, which is fixable"),
  ];
  if (G.hurt) parts.push(_fmt("banged up ({h}/3 — a third strike ends the night)", { h: G.hurt }));
  if (d >= 7) parts.push(_L("past what any piwin will carry"));
  else if (d >= 5) parts.push(_L("a pillion the piwins will still take — hold on"));
  if (_stdSymptomatic()) parts.push(_L("nursing a barfine souvenir that itches and burns — a clinic job (GET TESTED, it's free)"));
  _say(_fmt("Self-diagnosis, {clock}: {parts}.", { clock: _clockStr(), parts: parts.join(" · ") }));
  _say(_fmt("Phone {bat}% · ฿{m} · สนุก {h} ({lvl}). You will live, which in this town is both a prognosis and a lifestyle.",
    { bat: G.battery, m: G.money, h: G.happy, lvl: _L(_happyLevel(G.happy)) }), "dim");
}

// GET TESTED — the free public clinic off Soi Buakhao. The responsible-choice
// counterpart to carrying condoms: it clears an infection (the only cure — the
// nightly drag doesn't lift on its own) or hands back a clean bill. Day elided,
// like the morning-after ward; not a baht changes hands, which is the point.
const _CLINIC_POS = [
  "The clinic off Soi Buakhao takes your details, your arm, and twenty minutes of the worst waiting " +
    "in the world. The nurse comes back matter-of-fact: yes — but the common kind, the fixable kind. " +
    "A jab, a blister-pack of antibiotics, a wag of the finger about next time. You walk out lighter " +
    "than you've felt in days.",
  "A cup, a blood draw, and a corridor where nobody meets anyone's eye. The doctor is kind and " +
    "completely unshockable: a course of pills, taken to the last one, and a leaflet you'll pretend " +
    "to read. Whatever the night gave you is leaving the way it came. The relief is almost worth the " +
    "fright. Almost.",
  "The lab line moves the way lab lines do, and when your number's called the news is the boring kind " +
    "of bad: treatable, common as rain, gone in a week of tablets. You take the antibiotics and the " +
    "small, useful humiliation together, and promise yourself the foil square next time. You might even mean it.",
];
const _CLINIC_CLEAN = [
  "The clinic runs the tests, the wait does its slow torture, and the nurse hands back the boring, " +
    "beautiful word: negative. Clean. Cheaper than a single lady drink, this peace of mind — and free, at that.",
  "Bloods drawn, cup filled, twenty minutes of imagining the worst, and then a clean bill and a " +
    "slightly pitying smile. Nothing's wrong. You'll be back to your bad decisions by sundown, but for " +
    "now the relief tastes like winning.",
  "A negative test and a leaflet about not needing one next time if you're sensible. You fold the good " +
    "news into your pocket next to the condoms you should have used, and step back out a free man.",
];
function _doClinic() {
  if (G.std) {
    _say(_pickVary(_CLINIC_POS, "clinicpos"), "alert");
    G.std = null;
    _addHappy(3); // the relief of it being dealt with
  } else {
    _say(_pickVary(_CLINIC_CLEAN, "clinicclean"), "dim");
    _addHappy(1);
  }
  _priewMeet(); // the waiting room has one more thing in it, once (hospital-mirage arc)
}

// ── The hospital mirage, scene one (canon 2026-08-22) ────────────────────────
// The clinic's twenty-minute wait is where you meet her: mask, eyes, the ankle,
// the lunch-only line — true in every particular. Once ever; sandbox only.
function _priewMeet() {
  if (_flag("metPriew") || !_flag("act1Done")) return;
  _setFlag("metPriew");
  G.priewDay = G.day;
  G.phone.contacts.priew = true;
  G.known.priew = true;
  _say("The waiting room does its slow business around you — a grandmother with a " +
    "numbered ticket, a ceiling fan, the smell of antiseptic and wet umbrellas. " +
    "Across the aisle, a girl in a surgical mask: cheap elephant pants, a faded " +
    "sequined cat t-shirt somehow pressed immaculate, and above the mask a pair of " +
    "eyes — deep, calm, laughing at something, possibly the fan.", "win");
  _say("Twisted her ankle, she says, when you trade small talk about the rain — the " +
    "scooter, the flooded soi, everyone's story this month. You mention lunch, some " +
    "day, the little place with the view. \"Why not,\" the eyes say, and the phone " +
    "comes out for LINE before you've finished the sentence. \"But only lunch. I " +
    "work evening shift at a restaurant — every day, until late.\" The nurse calls " +
    "her number. She hops, once, entirely gracefully, and is gone.", "win");
  _say("(Priew is in your phone now. A normal girl, with a normal job. All you had to " +
    "do was go to the clinic.)", "dim");
}

// Scene two: the first go-go you enter, two or more nights later. The rotation
// changes. Nobody lies here either — that's the entire point.
function _priewReveal() {
  if (!_flag("metPriew") || _flag("priewRevealed")) return;
  if (G.day < (G.priewDay || 0) + 2) return;
  if (_room().barType !== "gogo") return;
  _setFlag("priewRevealed");
  _say("The music shifts. The rotation changes. And in the stage lights, in towering " +
    "platform heels, a girl steps up whose face you know before you can say from " +
    "where — and then the eyes find you through the strobes, deep and calm and " +
    "laughing, and they smile at you EXACTLY the way they did across a clinic " +
    "aisle, over a surgical mask, in another life entirely. Priew. Evening shift. " +
    "Every day, until late. She never said restaurant of what.", "alert");
  const her = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
  if (her) {
    _say(`${NPCS[her].name} follows your frozen stare with professional interest. ` +
      "\"You know her? You want her? She have customer already — but I can tell " +
      "her come to you after.\"", "dim");
  }
  _say("Priew works the song to its end, steps down without hurry, walks past your " +
    "table close enough to touch — and slides onto the lap of a large Korean " +
    "tourist by the far rail, laughing at something he didn't say yet. Nothing " +
    "she told you was untrue. The mirage was never her job. It was the word " +
    "you put in front of 'girl'.", "alert");
  _addHappy(-2);
}

function _doViolence(arg) {
  // some regulars are protected by age, money, and long standing — the one
  // kind of violence the street answers back in kind, and fast.
  if (arg) {
    const pid = _findNpc(arg.replace(/^(on |at |the |old )/, "").trim());
    if (pid && NPCS[pid].protected) {
      const n = NPCS[pid].name;
      _say(`You so much as square up toward ${n} and the room changes temperature. The ` +
        "mamasan is between you before you've finished the thought; the security are already " +
        "moving; a piwin fills the doorway, cracking his knuckles like a man glad of the " +
        `excuse. Whatever ${n} is — old, rich, gone soft in the head — he is THEIRS, and they ` +
        "will put you in the road for a great deal less than this. You let the idea die where " +
        "it stands.", "alert");
      _addHeat(2);
      return;
    }
  }
  if (_inBar()) {
    _say("Security has already noticed you noticing them: large, patient men " +
      "whose entire job is farangs having this exact idea. Beyond them, the " +
      "motosai stand. There is no version of this where you win, and several " +
      "where you swim home. The idea evaporates.");
  } else {
    _say(_pickVary([
      "You know how this plays out: the motosai stand empties before your " +
        "first swing lands, and it does not empty in your favour. In Pattaya " +
        "the street polices itself. The urge passes, as urges here should.",
      "Your hands think about it. Then they think about the piwins on the corner, who have " +
        "been watching since before you decided, and who have a prior claim on every fight " +
        "on this soi. The idea sits down and orders a water.",
      "Nobody here fights a farang; they just wait for him to finish, then explain the " +
        "price. You've seen the explanation. The swing stays where it is.",
    ], "violence"));
  }
}

// ── Bigotry has a price in the queer venues ──────────────────────────────────
// The Peacock Cabaret and the Adonis Club do not turn the other cheek. A slur or
// a swing gets the classic response — the queens and the hosts and a whole room
// done taking it put you in the road, and it can cost you the night. Milder
// bashing just gets you barred. Checked in doCommand before normal dispatch, so
// it catches the hostility whatever verb it's dressed as. Returns true if it fired.
const _QUEER_ROOMS = ["peacock_cabaret", "adonis_club"];
function _queerVenue() { return _QUEER_ROOMS.includes(G.room); }
const _QV_SLUR = /\bfaggots?\b|\bfaggy\b|\bpoofters?\b|\btrann(y|ie|ies)\b|\bshemales?\b|\bbatty ?boys?\b/i;
const _QV_HOSTILE = /\b(disgusting|disgust|unnatural|abomination|perverts?|perverted|degenerates?|sinful|against god|not (a )?real (wo)?m(a|e)n)\b/i;
const _QV_VIOLENCE = /\b(punch|deck|smack|slap|belt|attack|headbutt|throttle|thump|clock|kick|hit)\b/i;

function _queerHostility(input) {
  const slur = _QV_SLUR.test(input), violent = _QV_VIOLENCE.test(input), hostile = _QV_HOSTILE.test(input);
  if (!slur && !violent && !hostile) return false;
  const cab = G.room === "peacock_cabaret";
  const who = cab ? "Miss Mala" : "Nott";
  const out = _room().exits.out || Object.values(_room().exits)[0];
  G.game = null;
  for (const rid of _QUEER_ROOMS) G.soc.banned[rid] = G.turns; // the alley radios ahead
  if (slur || violent) {
    if (cab) {
      _say("Miss Mala stops mid-sentence and the music cuts dead. Then the room you took for soft comes off " +
        "its stools — the queens first, six-inch heels and a lifetime of not taking it, and behind them the " +
        "whole delighted crowd who were having the best night of their year until you opened your mouth. " +
        "Security barely gets a turn. You leave the fast way, over a table, and the pavement is the gentlest " +
        "thing that happens to you.", "alert");
    } else {
      _say("Nott's easy smile goes out like a blown fuse. \"Out.\" Arm is already up — and Arm is built like a " +
        "door — with two of the other numbers vaulting the bench behind him. Whatever you came in to prove, you " +
        "prove the exact opposite, briefly and at speed, and land on the soi wearing your own bad idea.", "alert");
    }
    G.hurt = Math.min(HURT_CAP, G.hurt + 2);
    _addHeat(3);
    _addHappy(-8);
    _say(`(Banged up, and barred from the whole Supertown strip — ${cab ? "the hosts" : "the queens"} heard ` +
      "about it before you hit the ground.)", "dim");
    G.room = out;
    if (G.hurt >= HURT_CAP) { _endNight("hurt"); return true; }
    _describeRoom(true);
    return true;
  }
  // bigoted, but no slur and no swing — the silence and the door, no fists needed
  _say(`You say the ugly thing out loud. ${who} lets a silence fall that costs you more than any comeback — ` +
    `then lifts two fingers, and security walks you out into the alley, unhurried and final. "Not here," ` +
    `${who} says to your back. "Not ever." You are barred from the strip.`, "alert");
  _addHappy(-5);
  _addHeat(1);
  G.room = out;
  _describeRoom(true);
  return true;
}

function _doMagic(v) {
  if (v === "plugh") {
    _say("A hollow voice says the magic went out of that one around the same " +
      "time it went out of Walking Street.");
  } else if (v === "pray") {
    _say("The nearest spirit house glitters by a doorway, properly kept — " +
      "marigolds, incense, a strawberry Fanta with a straw in it. You add a " +
      "wai. It can't hurt, and everyone in this town has seen it help.");
  } else {
    _say("A hollow voice says “สบายสบาย.”");
  }
}

function _doHello(arg) {
  if (/sailor/.test(arg)) {
    _say("Nothing happens. The Royal Thai Navy is forty minutes down the road " +
      "in Sattahip, and it has heard them all.");
  } else if (_inBar()) {
    _say("“Herrooo, hansum man!” The nearest hostess returns your hello with " +
      "roughly four hundred percent interest. It's the house rate.");
  } else {
    _say("“HELLO WELCOME!” answer two bars at once, on reflex, without looking up.");
  }
}

const _SMELLS = {
  "Jomtien": "Salt, yesterday's sunscreen, grilled squid from a cart you can't see. Underneath it all, the sea — patient.",
  "Pratumnak": "Frangipani and cut grass. The hill smells like money sleeping.",
  "Beach Road": "Sea salt over two-stroke exhaust, coconut oil, and a base note of last night that nobody has hosed away yet.",
  "Second Road": "Traffic fumes, fried garlic, and the cold chemical exhale of mall air-con every time a door swings.",
  "Soi Buakhao": "Fish sauce off the som tam carts, motorbike exhaust, beer-soaked chipboard. The honest middle of town.",
  "Tree Town": "Pork fat on charcoal from the corner cart, bleach from a toilet that needed more than bleach, a drain under it all, and perfume from every doorway trying to win — the complex recycles its own air, and this is the air.",
  "LK Metro": "Hot concrete, motorbike exhaust, and enough perfume to suggest the alley is having a conversation with itself.",
  "Walking Street": "Dry ice, cigarettes, a hundred perfumes at war, and beneath it the Gulf, comprehensively ignored.",
  "Soi 6": "Perfume applied with intent from both kerbs at once, cheap floor cleaner, charcoal from the moo ping man, and hotel soap from rooms rented by the hour — the same overload as Tree Town, in a straight line.",
  "Myth Night": "Fresh paint and fryer oil — a complex still deciding what it wants to smell like when it grows up.",
  "Naklua": "Charcoal smoke, drying fish, temple incense. The town Pattaya used to be before Pattaya happened to it.",
  "Darkside": "Rain on hot dust, lake water, someone burning garden waste three sois over. You could almost be in Thailand.",
};

const _SOUNDS = {
  "Jomtien": "Waves, a beach dog arguing with a kite, the flat slap of sandals on the promenade.",
  "Pratumnak": "Wind in the palms and, far below, the whole town clearing its throat for the evening.",
  "Beach Road": "Baht bus diesel, wave-hiss, and a jet ski tout laughing at his own joke.",
  "Second Road": "Traffic in both directions, and a mall breathing muzak through its automatic doors.",
  "Soi Buakhao": "Motorbikes, Connect Four counters, and a dozen bars playing a dozen songs, every one of them Hotel California.",
  "Tree Town": "Three sound systems through shared walls, none of them winning — the whole complex has one throb and no tune, and every doorway sounds like the one you came out of.",
  "LK Metro": "Go-go bass bouncing off concrete walls, motorbikes threading through, someone's sequins catching the light.",
  "Walking Street": "Doof-doof from six doorways, touts quoting prices, and a bell ringing somewhere — some hero is buying a bar a round.",
  "Soi 6": "Every doorway on both sides has its own speaker and its own girl calling over it — short songs, shorter negotiations, laughter with a working edge on it. Overwhelming, and mercifully only two ways to walk.",
  "Myth Night": "A live band soundchecking the same four bars of a Scorpions song, apparently forever.",
  "Naklua": "Temple dogs, a wet market winding down, long-tail engines out on the water.",
  "Darkside": "Cicadas, karaoke drifting across the lake, and geckos calling the odds on it.",
};

function _doSmell() {
  if (_inBar()) {
    _say("Perfume, cold Chang, cigarette ghosts in the upholstery, and the " +
      "bleach that fights a nightly holding action against all three. Every " +
      "bar in town, one smell.");
    return;
  }
  _say(_SMELLS[_room().region] || "Pattaya. It's not describable, but it is memorable.");
}

function _doListen() {
  if (_bandHere()) {
    const lines = [
      "The band is mid-set: the guitarist squeezing a solo out of a song that has been " +
        "squeezed a thousand times before and still surrendering something new.",
      "Right now: a bass player who means it, a drummer keeping perfect time, and a " +
        "vocalist whose English is accented and whose pitch is exact.",
      "Four musicians doing the work of a jukebox and pulling it off by being visibly alive.",
      "The drummer hits the downbeat like he's making a point to someone who isn't listening.",
    ];
    _say(lines[G.turns % lines.length]);
    return;
  }
  if (_inBar()) {
    _say(_playOptions().length
      ? "{{Ice}} settling in buckets, Connect Four counters clacking, and the " +
        "chorus of “HELLO WELCOME” as somebody richer walks past outside."
      : "{{Ice}} settling in buckets, a fan turning over an empty table, and the " +
        "chorus of “HELLO WELCOME” as somebody richer walks past outside.");
    return;
  }
  _say(_SOUNDS[_room().region] || "Pattaya, idling.");
}

// Is there anybody on this floor to dance with? Take Care Me's prose says no
// house girls work it, and the Queen Vic has none by design.
function _hostessHere() {
  return _npcsHere().some(id => NPC_ROLES[id] === "hostess");
}

const _POOL_SWIM = [
  "Down to the garden pool in the hotel towel. Two long-stay couples are doing their slow lengths and make room without comment; the water is the temperature of the night and the soi's racket does not reach it. Ten lengths, and the day washes off.",
  "The pool is lit from underneath and empty at this hour. You swim until the count stops mattering, float, and watch the aircon units on the wall above breathe out into the dark.",
  "A few lengths of the hotel pool, the tiles cool, the water warmer than the air. A woman on a lounger nods without looking up from her book — the nod of one guest to another, nothing else in it.",
  "You swim. The garden pool is small enough that you turn more than you stroke, and it doesn't matter; it's wet and it's quiet and nobody wants anything from you in it.",
];
const _WATCH_SEA = [
  "The bay, doing what it does: a slow black breathing under the lamps, the lights of the fishing boats strung out toward Koh Larn, a jet-ski somebody forgot to bring in rocking on its mooring. You watch until the watching is the point.",
  "No sun to go down at this hour — but the sea is still there, and so is the line of lights across the water, and a couple further along the sand who have run out of things to say and are happy about it.",
  "Waves the size of a sigh. Beyond them the whole dark bay, and on it the boats' lights, and above it more stars than the town ever lets you see. You stand there longer than you meant to.",
  "The Gulf at night is a sound more than a sight. You listen to it come and go, and something in your shoulders comes down a notch that you didn't know was up.",
];
function _dirName(d) {
  return { n: "north", s: "south", e: "east", w: "west", in: "in", out: "out", up: "up", down: "down" }[d] || d;
}
function _doSwim() {
  // The one line "a hotel pool you are not a guest of" answered a guest of the
  // hotel with the pool, and a man stood on the promenade a step from the sand
  // (Lionel, round 36). Three honest answers now: your own hotel's pool, the
  // sand you can reach from here, and the old line only where it's true.
  if (G.room === _hotelRoomId() && _HOTELS[G.hotel].pool) {
    if (G.soc.drunk >= 4) { _say("The pool, this many bottles in, at this hour. The couples doing slow lengths would have to fish you out. You watch them instead."); return; }
    G.poolDay = G.poolDay || 0;
    _say(_pickVary(_POOL_SWIM, "poolswim"));
    if (G.poolDay !== G.day) { G.poolDay = G.day; _addHappy(1); }
    return;
  }
  const onSand = (/beach/.test(G.room) && !/_rd\b|beach_rd|_road/.test(G.room) && !ROOMS[G.room].bar) ||
    G.room === "promenade";
  if (!onSand) {
    const ex = _room().exits || {};
    const dir = Object.keys(ex).find(d => (/beach/.test(ex[d]) && !/beach_rd|_rd\b/.test(ex[d])) || ex[d] === "promenade");
    if (dir) { _say(`The sand is one step ${_dirName(dir)} of here (${dir.toUpperCase()}). Swim from there, not from the kerb.`); return; }
    _say("The nearest swimmable water is a hotel pool you are not a guest of.");
    return;
  }
  if (G.soc.drunk >= 4) {
    _say("The Gulf at night, this many bottles in? The Pattaya Flying Club has " +
      "a swimming division too, and the membership plaque is the same wall. " +
      "You stay on the sand.");
    return;
  }
  // Not on a beach whose own prose says "no deckchair men, no jet-skis, no flyer
  // girls" — the end nobody works (persona report A#20, 2026-08-23).
  const _worked = !/no jet.?skis?/i.test(stripMarkup(String(_room().desc || "")));
  _say("You wade in to your knees. The Gulf is bathwater with ambitions. " +
    (_worked
      ? "Somewhere off to your left a jet ski scam lies sleeping. "
      : "Nobody is selling you anything, because nobody works this end. ") +
    "It's actually rather lovely, which nobody tells you about this town.");
}

function _doDance() {
  if (_room().barType === "gogo") {
    // pooled + companion-aware: the surgeons line fired verbatim three times in
    // four turns, with the girl on his arm unacknowledged, in a CLUB
    // (Marguerite, 2026-08-27 — the one unpooled repeatable she found)
    const _with = (G.party && G.party.ids || []).filter(i => NPCS[i]).map(i => NPCS[i].name)[0];
    _say(_with
      ? _pickVary([
          "You dance, and {who} dances with you — properly, not the professional version, " +
            "laughing at you and joining in at the same time. The girls on the chrome award it " +
            "the small nod they keep for a punter who came with somebody.",
          "{who} takes both your hands and makes the whole thing her idea, which saves your " +
            "dignity and costs her nothing. Somebody up on the podium applauds with two fingers.",
        ], "dancewith").replace(/\{who\}/g, _with)
      : _pickVary([
          "You dance. The professionals up on the chrome observe with the mild clinical " +
            "interest of surgeons watching a man remove his own appendix. One of them, " +
            "kindly, copies you.",
          "You dance. Nobody stops you, which in a go-go is the review.",
          "You dance, briefly and with commitment. A dancer catches your eye in the mirror " +
            "and does the same move back, better, without once making it a competition.",
          "You dance. The bass is doing most of it. A girl at the rail films three seconds " +
            "for somebody who is not you, and everyone is happy with the arrangement.",
        ], "dancegogo"));
  } else if (_inBar() && _bandHere()) {
    // The partner clause is conditional: Take Care Me's own prose says no house
    // girls work it, and a hostess materialising at your elbow there contradicted
    // the room two lines after it printed (persona report A#9, 2026-08-23).
    _say("You dance. The band — who have seen everything and played for all of it — " +
      "lock in harder, the drummer hitting the groove where it helps." +
      (_hostessHere()
        ? " A hostess materialises at your elbow and either leads or follows, both equally convincing."
        : " Somebody near the rail whoops. A freelancer two tables over decides you are worth watching, which is a different thing from being worth joining, and watches."));
    _addHappy(2);
  } else if (_inBar()) {
    _say(_hostessHere()
      ? "You dance between the stools. A hostess joins you instantly and " +
        "without inquiry — enthusiasm is the house style — and for eight bars " +
        "of luk thung you are the floor show."
      : "You dance between the stools, unaccompanied, for as long as your nerve " +
        "holds. Nobody stops you. Nobody joins you either, and the difference " +
        "becomes apparent at about bar six.");
  } else if (_bandHere()) {
    _say("You dance in front of the stage. The guitarist points his headstock at you " +
      "approvingly. On the outside this looks ridiculous; on the inside you are having " +
      "the most fun you've had since you stopped caring what it looked like.");
    _addHappy(2);
  } else {
    _say("You dance alone on the pavement. A passing baht bus honks the beat, " +
      "which is generous, because you weren't keeping one.");
  }
}

const _SIT_LINES = {
  bar: [
    "You take a stool. It receives you the way this town receives everyone — no questions, a coaster down before you've settled.",
    "You sit. The rail is cool, the fan finds you, and somewhere a fresh coaster arrives like a dealt card.",
    "You park yourself at the rail. Nobody looks up, which is its own kind of welcome.",
    "The stool wobbles once, introduces itself, and holds. You're in.",
  ],
  beach: [
    "You sit on the sand, which is free, and watch the sea, which is also free. The town will correct this imbalance the moment you stand up.",
    "You drop onto the sand. The Gulf carries on with its one long exhale.",
  ],
  street: [
    "You perch on the kerb a moment. A motosai slows hopefully, reads you, moves on.",
    "You find a ledge and sit. The soi flows around you without comment — you are now furniture, which in Pattaya is a respectable career.",
  ],
};
const _TOILET_LINES = {
  bar: [
    "Out the back, past the ice buckets — the universal geography. The gents is small, honest, and someone has hung an aggressively optimistic air freshener. You return a new man.",
    "The hongnam is where hongnams always are: past the fridge, mind the step. A hostess points without being asked, without looking up.",
    "Back past the pool cues, a door with a cartoon gentleman on it. It does the job. The soap is a rumour, but there's a hose.",
  ],
  street: [
    "Not on the soi, sunshine. Every bar on this street has a gents and the price of admission is a beer — the system works because everyone honours it.",
    "The soi has rules and this is the first one. Duck into a bar; buy something; everybody wins.",
  ],
};

function _doSing() {
  if (_inBar() && _bandHere()) {
    _say("You add your voice. The band adjusts — subtly, professionally — and you're on " +
      "pitch or something close enough that nobody here is grading. Three hostesses " +
      "join the chorus and the song stops being yours, which is the best thing that " +
      "can happen to it.");
    _addHappy(2);
  } else if (_inBar()) {
    _say("You give it a verse. Three hostesses join the chorus without asking " +
      "what the song is. It has never once mattered.");
  } else if (_bandHere()) {
    _say("You sing along from the crowd. The vocalist grins and points the microphone " +
      "at you for a bar. The correct response is to commit completely, and you do.");
    _addHappy(1);
  } else {
    _say("You sing to the street. Somewhere down the soi a karaoke bar " +
      "answers, worse. Honour is satisfied.");
  }
}

function _doBandRequest(song) {
  const KNOWN_SONGS = [
    ["hotel california", "Hotel California",
      "The guitarist closes his eyes for a beat. 'We just played it.' A pause. " +
      "'We'll play it again.' And they will."],
    ["wonderwall", "Wonderwall",
      "The bassist winces. 'Every night,' he says. 'Every. Night.' But the guitarist " +
      "is already counting them in."],
    ["sweet home alabama", "Sweet Home Alabama",
      "The vocalist grins: 'Classic.' The drummer gets the snare crack on the " +
      "downbeat exactly right."],
    ["highway to hell", "Highway to Hell",
      "The lead guitarist says nothing — just steps to the mic and plays the opening " +
      "riff. The bar wakes up a little."],
    ["brown eyed girl", "Brown Eyed Girl",
      "A safe choice, diplomatically received. The hostesses know this one and they " +
      "prove it, collectively and at volume."],
    ["one more night", "One More Night",
      "Phil Collins at eleven pm in Pattaya. The band plays it straight. You're not " +
      "sure if that's brave or inevitable."],
    ["smells like teen spirit", "Smells Like Teen Spirit",
      "The drummer brightens visibly. It is the one song in the set where he is " +
      "technically doing the most, and he knows it."],
  ];
  const sl = (song || "").toLowerCase().replace(/[^a-z ]/g, "").trim();
  const match = KNOWN_SONGS.find(([k]) => sl.includes(k));
  if (match) {
    _say(`You request ${match[1]}. ${match[2]}`);
    _addHappy(1);
  } else if (sl.length > 1) {
    _say(`The guitarist cups an ear. "${song}?" He shrugs — not in the current set. ` +
      "He counterproposes Hotel California. There is always Hotel California.");
  } else {
    _say("REQUEST [song name] — the band will try to play it, if they know it. " +
      "They almost certainly know Hotel California.", "dim");
  }
}

function _doBandTalk() {
  const lines = [
    "The vocalist leans forward at the break: 'Pattaya — good crowd. You want a " +
      "request? Put it in the box.' He means the tip box on the monitor wedge.",
    "The guitarist, between songs: 'How long we been here? Four years. Go home? " +
      "Home is expensive.' He hits a chord to end the conversation. It's a good chord.",
    "The drummer doesn't take breaks — just adjusts his grip, sips from a water " +
      "bottle, and checks his phone in the three minutes between sets. 'Request?' " +
      "he says without looking up.",
    "The bassist catches your eye. 'Don't ask us for Despacito,' she says. " +
      "'We will play it and it will ruin both our nights.'",
  ];
  _say(lines[(G.turns + G.day) % lines.length]);
}

function _doTime() {
  _say(G.stage === "expat"
    ? _fmt("{clock}, {weekday} — day {day} of the rest of your life.",
        { clock: _clockStr(), weekday: _L(_weekday()), day: G.day })
    : _fmt("{clock}, {weekday} — day {day} of 7.",
        { clock: _clockStr(), weekday: _L(_weekday()), day: G.day }));
  // the month, for a resident who lives across the year (WEATHER carries the full note)
  if (G.stage === "expat" && typeof _seasonTier === "function") {
    _say(`(${_SEASON_MONTHS[_seasonMonth()]} — ${_SEASON_LABEL[_seasonTier()]}.)`, "dim");
  }
  const t = G.nightTurn;
  if (_quizDay()) {
    // name the venues: _quizBars() is a pure hash (no dice), and an unfindable
    // quiz is an unplayed one — the optimizer walked 6 bars in-window and hit
    // none (2026-08-22)
    const qv = (typeof _quizBars === "function" ? _quizBars() : [])
      .map(r => _barName(r)).filter(Boolean).join(" · ");
    _say(t < 20 ? _fmt(_L("(Quiz night tonight: 20:00–22:00 — {venues} — teachers in from Rayong.)"), { venues: qv || _L("three bars") }) :
      _isQuizWindow() ? _fmt(_L("(Quiz night is ON right now: {venues}.)"), { venues: qv || _L("three bars, somewhere") }) :
      "(Quiz night has been and gone.)", "dim");
  }
  _say(t < 30 ? "(Early doors: barfines run ×1.5 until 21:00.)" :
    t >= 60 ? "(Past midnight: most beer bars have quietly dropped the barfine.)" :
    "(Prime time. Standard rates apply.)", "dim");
  // Soi 6 mode never leaves the street (the bus is refused), so the last-bus
  // status — the titular tension of the full game — simply doesn't apply here.
  if (_flag("act1Done") && G.mode !== "soi6") {
    _say(t >= LAST_BUS_TURN ? _fmt("(Small hours: the songthaews run sparse — flag one " +
      "and wait the kerb out, ฿{f} when it comes. Or the piwin's night rate, if he'll " +
      "have you.)", { f: BUS_FARE }) :
      t >= LAST_BUS_TURN - 10
        ? _fmt("(The easy hour is nearly up — after two the buses go sparse and the ฿{f} ride home becomes a wait at the kerb.)", { f: BUS_FARE })
        : _fmt("(Baht buses circulating: ฿{f} the ride home, no waiting to speak of until ~2 a.m.)", { f: BUS_FARE }), "dim");
  }
}

function _hourToTurn(h) { // 24h clock → nightTurn; the game lives 18:00–04:00
  if (h >= 18 && h <= 23) return (h - 18) * 10;
  if (h >= 0 && h <= 4) return (h + 6) * 10;
  return null;
}

function _doWait(arg) {
  if (!arg) {
    // Bare WAIT is free — the joke is the point. But in a downpour a man
    // waiting for the rain fired it five times blind with no way to tell
    // whether to keep waiting or dive for a doorway (Ray, round 36). The
    // rain is a counter; read it to him, and name the verb that spends it.
    if (G.rain > 0) {
      _say(G.rain > 3
        ? `You wait. Pattaya doesn't, and neither does the rain — it's set in, ${G.rain * 6} minutes ` +
          "of it at a guess. (WAIT 5 sits some of it out; a bar door sits all of it.)"
        : "You wait. Pattaya doesn't. The rain, though, is easing — the gutters are still " +
          "running but the roof has gone quiet. A few more minutes. (WAIT 2)", "dim");
      return;
    }
    _say("You wait. Pattaya doesn't."); return;
  }
  let target = null;
  // accept 20:00 too — the game prints times that way (mobile playtest 2026-08-17)
  const until = arg.match(/^(?:until |till |for )?(?:(\d+)(?::\d\d)?|midnight)\s*(am|pm)?$/);
  if (/midnight/.test(arg)) target = _hourToTurn(0);
  else if (until && until[1]) {
    let h = parseInt(until[1], 10);
    if (/^(?:until|till)/.test(arg)) {
      if (until[2] === "pm" && h < 12) h += 12;
      else if (!until[2] && h >= 5 && h <= 11) h += 12; // "until 9" means 21:00 here
      if (h === 12 && until[2] !== "pm") h = 0;         // "until 12" means midnight
      target = _hourToTurn(h % 24);
      if (target === null) { _say("The night runs 18:00 to 04:00. Daylight is for sleeping."); return; }
    } else {
      target = G.nightTurn + Math.min(h, 60); // WAIT <n> turns
    }
  }
  if (target === null) { _say("WAIT <turns>, or WAIT UNTIL <hour> (say, MIDNIGHT)."); return; }
  if (target <= G.nightTurn) { _say(`It's already ${_clockStr()}. Time only runs one way, even here.`); return; }
  const startDay = G.day, inbox0 = G.phone.inbox.length, g0 = G, room0 = G.room;
  // leave one turn for the tick every command pays at the bottom of doCommand
  while (G.nightTurn < target - 1) {
    _tick();
    if (G !== g0) return;
    if (G.room !== room0) { _say(`(${_clockStr()} — you're somewhere else now; the waiting stops.)`, "dim"); return; } // Tan's sedan, a kick-out
    // The world was rebuilt out from under us: an Act One dawn mid-wait hard-fails
    // (_act1Fail → newGame() reassigns G) and resets to the SAME day number, so the
    // day guard below can't see it — without this check the loop ticks the fresh
    // game back to dawn forever (a frozen tab; found by the soak harness, seed 2).
    if (G !== g0) return;
    if (G.day !== startDay || G.pendingChoice) return; // the night (or the week) ended out from under you
    if (G.pendingEnc || G.game) { _say(`(${_clockStr()} — so much for waiting.)`, "dim"); return; }
    if (G.phone.inbox.length > inbox0) { _say(`(${_clockStr()} — your phone interrupts.)`, "dim"); return; }
  }
  // +1: the loop stops at target-1, and doCommand's bottom-of-loop tick will
  // land us on target — show THAT clock, not the pre-tick one (WAIT UNTIL 20:00
  // printed "19:00"; two personas, 2026-08-17).
  _say(_fmt("You let the night idle past — ice melting, songs turning over, the street " +
    "rearranging itself. {t}.", { t: _clockStr(G.nightTurn + 1) }));
}

// The Peacock Cabaret's performers — in NPC_ROLES for the courtship rails
// (drinks/flirt/bond/contact; a bi player's real option), but the theatre keeps
// no barfine ledger: _doBarfine refuses at the venue, _npcActions drops the
// barfine tap, and _maybeSelfBarfine skips queer venues. Tips stay the drag way.
const _CABARET_PERFORMERS = ["mala", "petch"];

function _doTip(arg) {
  const amtM = arg.match(/(\d+)/);
  // A bare TIP <name> used to spend ฿20 silently — a figure the player never
  // chose and was never shown, the same class as the Connect 4 stake that was
  // clamped without a word. It still defaults (the small note is the honest
  // default on this soi), but it SAYS so, and the tappable amounts are right
  // there (see _cAmounts).
  const amount = amtM ? parseInt(amtM[1], 10) : 20;
  const _defaulted = !amtM;
  if (amtM && amount === 0) { _say("Zero isn't a tip, it's a gesture — and not a kind one. Keep your hand in your pocket or put something in it."); return; }
  const nameW = arg.replace(/\d+|฿|baht/g, " ").trim();
  if (/\bband\b|\bmusicians?\b|tip.?box/.test(arg)) {
    if (!_bandHere()) { _say("No band playing here tonight."); return; }
    if (G.money < amount) { _say(`The tip box wants ฿${amount}; you have ฿${G.money}.`); return; }
    G.money -= amount;
    if (amount >= 100) {
      _say(`฿${amount} into the tip box. The guitarist catches your eye mid-riff and ` +
        "nods — you've been seen, which out here counts as a whole conversation. " +
        `(฿${G.money} left.)`, "win");
      _boughtHappy(1); _repGain();
    } else {
      _say(`฿${amount} drops into the tip box on the monitor wedge. The band plays on, ` +
        `professionally. (฿${G.money} left.)`);
    }
    return;
  }
  // The Peacock's performers take tips the drag way — folded long, held up,
  // blessed back — so handle them before the barType gate below. (Room-gated:
  // the same girls tip normally nowhere else, since they work nowhere else.)
  if (G.room === "peacock_cabaret") {
    const perf = nameW ? _findNpc(nameW) : "petch";
    if (!_CABARET_PERFORMERS.includes(perf)) {
      _say("Tip which one? MISS MALA compères; PETCH is the young star. (TIP PETCH <amount>.)");
      return;
    }
    if (G.money < amount) { _say(`Generosity of spirit, poverty of pocket: you have ฿${G.money}.`); return; }
    G.money -= amount;
    const nm = NPCS[perf].name;
    if (amount >= 100) {
      _say(`฿${amount}, folded long and held high — ${nm} sweeps over, takes it with a flourish ` +
        `that belongs on a bigger stage, and blesses you to a whole-room cheer that is, somehow, ` +
        `for YOU. (฿${G.money} left.)`, "win");
      _addHappy(1); _repGain();
    } else {
      _say(`฿${amount}, folded long and held up. ${nm} plucks it away, drops you a wink worth more ` +
        `than the note, and sails back into the number. (฿${G.money} left.)`);
    }
    return;
  }
  if (!_inBar()) {
    // a named person on the street answered in the piwins' voice — the doorman,
    // the security man, and Tan himself (millionaire playtest 2026-08-22)
    const who = nameW && (_findNpc(nameW));
    if (who === "tan") {
      _say("Tan looks at the money the way another man would look at a wasp. \"No.\" Then, " +
        "gentler, because he likes you: \"When I want something from you I will ask for it, " +
        "and it will not be this.\" The hand stays down until you put it away.");
    } else if (who) {
      const n = NPCS[who].name;
      _say(`${n} looks at the note, then at you, and doesn't take it. Out here a tip is for a ` +
        "service already done — hand it to a man who's done nothing and you've said something " +
        "about him you didn't mean to.");
    } else if (_room().motosai) {
      _say("The piwins wave it away, grinning — you haven't ridden anywhere. Tips " +
        "settle debts here; they don't open accounts.");
    } else {
      _say("Tip who? The street works for itself.");
    }
    return;
  }
  // `house` is staff the ROLES table doesn't cover — the Queen Vic has no
  // mamasan and no cashier, so its landlady and barmaids carry the house marker
  // instead. BUY DRINK FOR GAEW worked and TIP GAEW said "Tip who?" about a
  // woman standing on the Here: line who had just served him (round 22): two
  // verbs disagreeing about whether the person in front of you exists. Anyone
  // working the bar can be tipped.
  const tippable = id => !!(NPC_ROLES[id] || (NPCS[id] && NPCS[id].house));
  const girls = _npcsHere().filter(tippable);
  const id = nameW ? _findNpc(nameW) : girls[0];
  if (!id || !tippable(id)) { _say("Tip who? Name one of the ladies."); return; }
  if (G.money < amount) { _say(`Generosity of spirit, poverty of pocket: you have ฿${G.money}.`); return; }
  G.money -= amount;
  (G.soc.given = G.soc.given || {})[id] = (G.soc.given[id] || 0) + amount; // toward a sponsor flip
  const name = NPCS[id].name;
  if (amount >= 100) {
    // Money buys attention, not intimacy: ฿20,000 of tips used to buy her-farang
    // tier in ten turns with no conversation at all (millionaire playtest
    // 2026-08-22). A night's tipping can lift her a couple of notches; the rest
    // of the ladder is drinks, talk and turning up.
    const paid = (G.soc.tipBond = (G.soc.tipBond || 0));
    const bump = paid >= 3 ? 0 : (amount >= 300 ? 2 : 1);
    if (bump) G.soc.tipBond = paid + bump;
    if (bump) _boughtBond(id, bump);   // and the same per-girl nightly ceiling
    _say(_pickVary([
      `฿${amount}, folded small and passed with a wai. ${name} makes it vanish with a conjurer's economy, and the news crosses the bar by whole-room telepathy before your hand is back in your pocket.`,
      `฿${amount}, and ${name} doesn't look at it — she looks at you, which is the receipt. Somewhere behind the bar a biro makes a note that isn't about money.`,
      `You press ฿${amount} into ${name}'s hand under the rail. It's gone before it arrived; what stays is the half-second her face forgets to work.`,
      NPC_ROLES[id] === "mamasan"
        ? `฿${amount} — ${name} takes it with both hands and the small bow, and files you, permanently, under the short list of farang who understand how a bar works.`
        : `฿${amount} — ${name} takes it with both hands and the small bow, and the mamasan, who sees everything, decides you exist.`,
    ], "bigtip") + ` (฿${G.money} left.)`);
    if (!bump) _say("(She takes it, and thanks you, and it changes nothing between you — " +
      "the ledger she keeps isn't the one in the till.)", "dim");
    // A number past absurd stops reading as generosity and starts reading as a problem.
    if (amount >= 20000) {
      _say(_pickVary([
        `${name} counts it once, and the smile goes somewhere else — not offended, ` +
          "calculating. Money like that in a bar this size is not a tip, it's a story, " +
          "and by tomorrow it will be somebody's.",
        `The mamasan is across the room before the notes are folded. She doesn't take ` +
          `them off ${name}; she just stands there, pleasantly, until you understand ` +
          "that a sum like that is now the house's business too.",
        `${name} looks at the money, then at you, and asks the only sensible question: ` +
          "\"What you want?\" Not coy. The kind of asking a woman does when a number " +
          "has stopped making sense.",
      ], "hugetip"), "alert");
    }
    _boughtHappy(1); _repGain();
  } else {
    _say(`฿${amount} into ${name}'s tip jar. A warm smile, a small wai — noted, ` +
      `filed, appreciated. The big ledger, though, runs on lady drinks. (฿${G.money} left.)` +
      (_defaulted ? " (A bare TIP is the small note; TIP " + name.toUpperCase() +
        " <amount> if you meant more.)" : ""));
  }
  // a kept cashier you've tipped enough will text a selfie later, if she has your number
  if (typeof _sponsorDrip === "function") _sponsorDrip(id);
}

function _doWave(arg) {
  if (/bus/.test(arg) || (!arg && _busLinesFor(G.room).length)) {
    // only if a bus will actually come — else _doRideBus's refusal (off-route /
    // curfew / rain / soi6 routes-aren't-yours) would follow a "swerves in within
    // four seconds" that contradicts it. WAVE BUS indoors is the common trap.
    if (_busLinesFor(G.room).length && G.nightTurn < LAST_BUS_TURN && !G.rain && G.mode !== "soi6")
      _say(_BUS_WAITING.has(G.room)
        ? "No waving needed here — the rank IS the system. The front truck's benches " +
          "are filling; when they're full, it goes."
        : "You put an arm out at road height. A blue songthaew swerves in within " +
          "four seconds — they can smell an undecided farang at three hundred metres.");
    _doRideBus("");
    return;
  }
  if (_inBar()) {
    _say("You wave. Every hostess in the bar waves back at full wingspan, " +
      "delighted, as though you had just invented it.");
    return;
  }
  _say("You wave. Somewhere down the soi, somebody waves back. It's that kind of town.");
}

// The bar-mat map, OSM-checked (tools/gen-map.mjs --audit): the coast runs
// NNE, so the north end leans right and the sea hugs the whole west edge;
// Soi 6 hangs inland off Beach Rd North, a couple of km short of the Dolphin
// roundabout, with Naklua beyond it; Buakhao slants between Klang and Tai with LK Metro off its north
// end; the Darkside is a motosai ride east, off any bar mat this size.
const _MAP = `                    NAKLUA ─ Sabai Palms Hotel
        ~              │
        ~     BEACH RD N ─ SOI 6 (Queen Vic in the quiet middle)
        ~      │ (Blue Dog · Stinky Pinky)
        ~      │      PATTAYA KLANG ────► THE DARKSIDE
       ~       │       │      │   (Khao Talo · the lake · bike, or the
       ~       │       │      │    Pattaya Tai truck / the long walk east from Buakhao South)
       ~  BEACH RD C   │   MYTH NIGHT
       ~    │ (Tequila Queen)  │
       ~    │         SECOND  TREE TOWN (the fairy-lit maze)
       ~    │          RD C   │
       ~ CENTRAL Mall  │      BUAKHAO N ═ LK METRO
      ~     │ (police) │      │  (Metropole up the alley)
      ~     │          │   BUAKHAO MARKET
      ~     │          │      │
      ~  BEACH RD S ─ SECOND RD S ─ BUAKHAO S
      ~     │              │
     ~   WALKING ST     PRATUMNAK ─ Big Buddha
     ~    (the gate, then the deep)
    ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  JOMTIEN ~ the beach where it all began`;

// Soi 6 Challenge never leaves the street, so the greater-Pattaya bar-mat above
// is all noise — it names a dozen districts you can't reach. The confined mode
// gets its own strip map: the soi west-to-east, the beach at its head, the bars
// under each end. Keep the venue lists in step with SOI6_ROOMS.
const _MAP_SOI6 = `    THE BEACH ~~~ BEACH RD ─── WEST ──────── MIDDLE ──────── DEEP END
                  (junction)   (loud)         (quiet)         (loudest)

    north beach   Blue Dog     Pink Lotus     Queen Vic Inn   Kitten Corner
    Sai Krok's    Stinky       Golden Dragon  (your room ↑)   Cherry Pop
    surf          Pinky        Sunset Dreams  The Shady Lady  Ruby Kiss
                               ATM · 7-Eleven Front Row Bar
                                              The Verandah`;

// EXITS — IF-genre furniture, and load-bearing here: a bar's door and a street's
// continuation share bare compass letters, so `n` off a lively lane is a coin
// flip between walking on and walking INTO the Coco Bar (Marguerite, 2026-08-27:
// six mis-entries, two turns each). Naming the destinations costs the player
// nothing and removes the lottery.
function _doExits() {
  const r = _room();
  const rows = Object.keys(r.exits || {}).map(d => {
    const to = r.exits[d];
    const room = ROOMS[to];
    if (!room) return null;
    const venue = _barName(to);
    const kind = room.barType || room.shop || room.massage || room.soapy || room.hostBar;
    return "  " + d.toUpperCase() + " — " + (venue || room.name) + (kind && venue ? " (inside)" : "");
  }).filter(Boolean);
  // Buildings fronting this block (venues[]): no compass letter to hang a row
  // on, so the row shows the command instead — same "(inside)" label as a
  // legacy in-exits venue above, so EXITS reads the same regardless of which
  // model the room uses. This verb existed BECAUSE bar doors used to hide on
  // bare compass points; it had gone blind to every migrated venue since the
  // day venues[] shipped, which is the same class of bug (Cartographer, 2026-08-27).
  for (const id of (r.venues || [])) {
    const room = ROOMS[id];
    if (!room) continue;
    const venue = _barName(id) || room.name;
    rows.push("  ENTER " + venue.toUpperCase() + " (inside)");
  }
  if (!rows.length) { _say("No way out of here but the way you came, and that one's behind you."); return; }
  _say("Ways out:", "win");
  for (const row of rows) _say(row, "dim");
}

function _doMap() {
  if (G.mode === "soi6") {
    _say("Soi 6 — one street, west to east, the beach at its head:", "dim");
    _say(_MAP_SOI6, "map");
    return;
  }
  _say("The bar-mat map of greater Pattaya, not to scale, like all bar maps:", "dim");
  _say(_MAP, "map");
}

// PHOTO <someone here> is the collectible: it saves their portrait to the phone
// gallery (GALLERY/PHOTOS) and, since you're clearly on first-name terms now,
// learns their name. Bare PHOTO keeps the old throwaway scene shots.
const _PHOTO_NEW = [
  (nm) => `You catch ${nm} mid-laugh and the phone, for once, actually gets it. Saved to your gallery (GALLERY).`,
  (nm) => `${nm} gives the lens half a second of the real face before the pose snaps back. You keep the real one. (GALLERY)`,
  (nm) => `One frame of ${nm}, neon and all — proof you were here. It's in the gallery now. (GALLERY)`,
  (nm) => `${nm} throws a peace sign a beat too late. The blurry one's better; both go to the gallery. (GALLERY)`,
];
const _PHOTO_DUP = [
  (nm) => `Another ${nm} for the collection. The gallery already had a better one.`,
  (nm) => `${nm} again — same grin, same peace sign. Your gallery isn't complaining.`,
  (nm) => `You've got ${nm} already, but one more never hurt a gallery.`,
];
const _PHOTO_GOGO_NO = [
  `A hand closes over your lens before the shutter does. “No photo. No video. House rule, tilac.” The phone goes back in your pocket.`,
  `The mamasan is at your elbow before the screen even lights. “No camera, na.” Not a request. You put it away.`,
];
const _PHOTO_GOGO_YES = [
  (nm) => `${nm} palms your phone under the rail, out of the mamasan's sightline, and pulls you in cheek-to-cheek. One quick frame, then it's back in your pocket. (GALLERY)`,
  (nm) => `“Only you, na. Don't show nobody.” ${nm} angles the phone low, throws a quick pout, and the shutter's done before anyone looks up. (GALLERY)`,
];

function _photoWhere(id, entry) {
  // where the shutter went, when the entry recorded it — a rotating owner snapped
  // at the Dollhouse was filed under her other bar (Gordon, round 37); older
  // entries fall back to where she works
  if (entry && entry.room && ROOMS[entry.room]) return _barName(entry.room) || ROOMS[entry.room].name || "";
  if (NPCS[id]) return _barName(_npcRoom(id)) || "";
  return "";
}

// The gallery is an array of {id, cap?, turn}: a cap-less entry is a portrait you
// snapped, a captioned one is a photo she texted you. Coerce here so a save from
// the object-keyed prototype (or a missing field) can't throw.
function _photoList() {
  if (!Array.isArray(G.phone.photos)) G.phone.photos = [];
  return G.phone.photos;
}
function _hasPortrait(id) { return _photoList().some(p => p.id === id && !p.cap); }
// Add a photo to the gallery. No cap = a portrait (deduped per character); a cap =
// a texted selfie (always a distinct new frame). Learns her name either way.
function _addPhoto(id, cap) {
  if (!NPCS[id]) return false;
  if (!cap && _hasPortrait(id)) return false;
  if (cap && _photoList().some(p => p.id === id && p.cap === cap)) return false;   // she re-sent the same selfie (Frank, round 38)
  if (G.known) G.known[id] = true;
  _photoList().push(cap ? { id, cap, turn: G.turns } : { id, turn: G.turns, room: G.room });
  return true;
}

function _photoChar(id) {
  const n = NPCS[id];
  if (!n) return;
  // the go-go / Soi 6 house rule: the girls are never a photo op — for a stranger.
  // Your own regular (a contact, or bonded regular+) will sneak one, cheek-to-cheek.
  let sneaky = false;
  if (NPC_ROLES[id] && /gogo|soi6/.test(_room().barType || "")) {
    const close = (G.phone.contacts && G.phone.contacts[id]) ||
      (typeof _bondTier === "function" && _bondTier(id) >= 2);
    if (!close) { _say(_pickVary(_PHOTO_GOGO_NO, "photono"), "alert"); return; }
    sneaky = true;
  }
  G.battery--;
  const had = _hasPortrait(id);
  _addPhoto(id);
  if (had) _say(_pickVary(_PHOTO_DUP, "photodup")(n.name));
  else if (sneaky) { _say(_pickVary(_PHOTO_GOGO_YES, "photosneak")(n.name)); _addHappy(1); }
  else { _say(_pickVary(_PHOTO_NEW, "photonew")(n.name)); _addHappy(1); }
}

function _doPhoto(arg) {
  if (G.dog && arg && _isDogWord(arg.trim().toLowerCase())) {
    if (G.battery <= 0) { _say("Dead phone. He'll still be here when it isn't."); return; }
    G.battery = Math.max(0, G.battery - 1);
    _say(_dogN(_pickVary([
      "Three frames of blur and one of his nose, enormous, investigating the lens. He has no " +
        "interest in being photographed and every interest in the phone.",
      "You get him mid-yawn, which is the most honest portrait anybody has taken in this town " +
        "tonight. The soi, behind him, is out of focus and looks better for it.",
      "He holds still for exactly as long as it takes you to frame it, then steps out of frame " +
        "to check a smell. One good one. It'll do.",
    ], "dogphoto")), "dim");
    return;
  }
  if (G.battery <= 0) {
    _say("Your phone is dead. The moment goes unrecorded, like the best ones always do.");
    return;
  }
  arg = (arg || "").replace(/^(of|the|a|an|with|at)\s+/i, "").trim();
  if (arg) {
    const id = _findNpc(arg);
    if (id) {
      if (_npcsHere().includes(id)) { _photoChar(id); return; } // one cast
      _say("You raise the phone, but they've drifted off — nobody by that description in front of you now.");
      return;
    }
    // an unrecognised word ("sunset", "bar") falls through to a scene shot
  }
  if (_inBar() && /gogo|soi6/.test(_room().barType || "")) {
    _say(_pickVary(_PHOTO_GOGO_NO, "photono"), "alert"); // the house rule holds for the room, not just a named girl
    return;
  }
  G.battery--;
  if (_inBar()) {
    _say("The word “photo” assembles every hostess in the bar around you in " +
      "under two seconds, peace signs at maximum deployment. Your phone now " +
      "holds nine near-identical frames and one where everybody is beautiful. " +
      "Crowd shots don't make the gallery — it keeps faces. (PHOTO <someone>.)");
  } else if (["jomtien_beach", "dongtan_beach"].includes(G.room)) {
    _say("You photograph the Gulf doing its end-of-day routine. The photo will " +
      "not capture it. The photo has never once captured it. You take it anyway.");
  } else {
    _say("You take a photo you will never look at again. The neon doesn't " +
      "photograph. It never has.");
  }
}

function _doGallery() {
  if (G.battery <= 0) { // dead phone first — else an empty gallery nudges 'PHOTO someone' on a dead phone
    _say("Dead phone, dark gallery. The faces are in there somewhere. Find a charger.");
    return;
  }
  const photos = _photoList().filter(p => NPCS[p.id]);
  if (!photos.length) {
    _say("Your gallery is one blurry thumb and a lot of smeared neon. PHOTO someone — " +
      "a face at the rail, a lady who's caught your eye — to start a collection.");
    return;
  }
  const rows = photos.slice().sort((a, b) => (a.turn || 0) - (b.turn || 0)).map(p => {
    const n = NPCS[p.id];
    // a texted selfie shows its caption; a snapped portrait, where she works
    const detail = p.cap ? `«${p.cap}»` : _photoWhere(p.id, p);
    return `${n.emoji} ${n.name}${detail ? " — " + detail : ""}`;
  });
  // A denominator turns a list into a collection. NOT the 334-strong cast —
  // "3 of 334" reads as hopeless and most of them you will never meet. The
  // honest number is people you HAVE met, which is also the one that grows as
  // you explore, so the ratio pushes outward instead of down.
  const met = Object.keys(G.known || {}).filter(id => NPCS[id]).length;
  const have = new Set(photos.map(p => p.id)).size;
  const tail = met > have
    ? `  (${have} of the ${met} faces you've met — the rest haven't been asked.)`
    : `  (${have} of ${met} — everyone you've met is in here.)`;
  _say(`Gallery — ${rows.length} photo${rows.length > 1 ? "s" : ""}:\n` + rows.join("\n"), "room");
  _say(tail, "dim");
}

function _doCall(arg) {
  if (!arg) { _say("Call who?"); return; }
  // Tan answers — the one exception to the nobody-answers gag, and he keeps his
  // "any hour" promise for real (see _tanCall). Exact word only: "taan" is a
  // different person entirely (the Gold Rush hostess).
  if (arg.trim().toLowerCase() === "tan" && G.phone.contacts && G.phone.contacts.tan) {
    _tanCall(); return;
  }
  if (G.dog && _isDogWord(arg.trim().toLowerCase())) {
    _say(_dogN("You call him and he comes — not fast, never fast, but without any doubt about " +
      "where he's going. He arrives, sits, and looks up: well?"));
    return;
  }
  const id = _findNpc(arg);
  if (!id) { _say("Call who? Nobody by that name in your phone or your eyeline."); return; }
  if (G.battery <= 0) { _say("Dead phone. The town's most reliable excuse."); return; }
  const name = NPCS[id].name;
  _say(`You call ${name}. It rings out. Nine seconds later the phone buzzes in ` +
    `your hand: “ทำไมโทรมา 555 why you CALL???” — nobody in this town answers a ` +
    `phone. (MESSAGE ${name.toUpperCase()} instead.)`);
}

// CHECKOUT — after Act One, at the start of an evening, from your own room.
// The desk lists the other two hotels; the one you're leaving is understood.
function _doCheckout() {
  if (G.mode === "soi6") {
    _say("You're booked into the Queen Vic for the whole week — one soi, one room, no " +
      "reception desk to argue with. Sleep it off upstairs.");
    return;
  }
  if (!_flag("act1Done")) {
    _say("Check out? You haven't managed to check IN yet — the key card is in " +
      "the wallet, and the wallet is the whole adventure.");
    return;
  }
  if (G.room !== _hotelRoomId()) {
    _say(`Checkout starts in your own room at the ${_HOTELS[G.hotel].name} — ` +
      "pack the bag first.");
    return;
  }
  if (G.nightTurn >= 10) {
    _say("Reception runs checkout at the start of the evening, before 19:00, " +
      "while the desk is still awake and the day sheet is still open. " +
      "Tomorrow, na.");
    return;
  }
  if (G.hotelDebt > 0) {
    // nobody takes a bag down the stairs past an unpaid folio (broke playtest 2026-08-22)
    if (G.money >= G.hotelDebt) {
      _say(`The clerk slides the folio across first: ฿${G.hotelDebt} on the book. You settle it — ` +
        `(฿${G.money - G.hotelDebt} left) — and only then does the bag come down.`, "dim");
      G.money -= G.hotelDebt; G.hotelDebt = 0;
    } else {
      _say(`The clerk slides the folio across and keeps a hand on your bag: ฿${G.hotelDebt} on the book, ` +
        `฿${G.money} in your pocket. "Settle first, khun. Then anywhere you like." Nobody checks out of a debt.`, "alert");
      return;
    }
  }
  const others = Object.keys(_HOTELS).filter(k => k !== G.hotel);
  G.pendingChoice = "checkout";
  _say(`You set the key card on the desk at the ${_HOTELS[G.hotel].name}. The ` +
    "clerk produces the folio with the speed of a man who has seen farang " +
    "restlessness before, and gestures at the wide world:");
  _say(others.map(k =>
    `· (${_HOTELS[k].name.toUpperCase()} — ฿${_hotelRate(k)}/night)`).join("\n"), "dim");
  _say("(Name your new hotel — or STAY.)", "dim");
}

const _HOTEL_ARRIVALS = {
  sabai: "The baht bus north, the dark soi, the two palms — and 412, humming " +
    "its terrible faithful hum. The Sabai Palms takes you back the way Naklua " +
    "takes everyone back: without comment.",
  queenvic: "Terry watches your bag come up the stairs with the deep " +
    "satisfaction of a man whose lifestyle has just been endorsed. The balcony " +
    "room at the Queen Vic: below, Soi 6 is already warming up its evening " +
    "argument with itself.",
  metropole: "The Metropole lift hums you up the tower. Blackout curtains, " +
    "arctic aircon — and out the window, the LK Metro alley glowing below " +
    "like a lit fuse. The bellboy mentions the fire stairs again. Wink.",
  areca: "The Areca Lodge takes your bag with a smile that has checked in ten " +
    "thousand repeat visitors. A room over the garden pool, the whole racket of " +
    "Soi Diana thirty seconds out the door and none of it following you in. " +
    "Comfortable, central, and quietly pleased with itself.",
};

function _doShower() {
  if (G.room !== _hotelRoomId()) {
    _say(`Your shower is back at the ${_HOTELS[G.hotel].name}, enjoying the solitude.`);
    return;
  }
  if (G.soc.drunk >= 3 || G.hurt) {
    _say("You stand under water of legendary pressure until the night stops " +
      "ringing. You emerge, if not a new man, at least a rinsed draft of one.");
  } else {
    _say("Water pressure that could strip paint, towels folded into swans. " +
      "Whatever else happens tonight, this part of Thailand kept its promises.");
  }
}

// SMOKE is a flavor verb with a Soi 6 double meaning: to a ladyboy the word is
// slang for something you pay for, and she hears THAT before the Marlboro. Bebe,
// who also hates cigarette smoke, gets both jokes at once (the ยาดม comes out).
function _doSmoke() {
  const lb = _npcsHere().find(id => NPCS[id] && NPCS[id].ladyboy);
  if (lb) {
    const n = NPCS[lb].name;
    _say(`"Smoke." ${n} lets the word hang, one eyebrow arched, enjoying your face. "You know what that mean ` +
      "on this soi, tilac? The smoke I am famous for is not the Marlboro kind.\" A wicked, delighted beat. " +
      "\"THAT one is extra — barfine first, and no free sample, ha. The other smoke, the cigarette—\" " +
      (NPCS[lb].hatesSmoke
        ? "the ยาดม is already at one nostril, a wounded inhale, a shudder"
        : "she wrinkles her nose") +
      " \"—THAT one you take OUTSIDE. One word, two smoke, tilac: one kill the glamour, one very good for " +
      "business.\"", "");
    return;
  }
  const hater = _npcsHere().find(id => NPCS[id] && NPCS[id].hatesSmoke);
  if (hater) {
    _say(`You go to light one, and ${NPCS[hater].name} materialises a ยาดม like a duellist drawing — one ` +
      "nostril, then the other, a wounded, theatrical inhale. \"NO. Not near me — outside, the beer bar, " +
      "anywhere but here.\" You have never seen anyone quite so personally betrayed by a packet of Marlboro. " +
      "The cigarette goes back unlit.", "");
    return;
  }
  if (_inBar()) { _say("You light one; nobody minds. It does what cigarettes do — a little worse for you, a little calmer for a minute."); return; }
  _say("A cigarette out here on the soi, neon and noise all round. It fixes nothing; it never does. You have it anyway.");
}

// ── The ATM: pocket cash out of your account (G.bank) ───────────────────────
// WITHDRAW <amount> at any `atm:true` room; ฿300 fee, ฿20,000/day cap. CHECK
// BALANCE anywhere. Your card lives in the wallet, so no cash until Act One's
// wallet is back.
function _atmDrawnToday() { return G.atmDay === G.day ? (G.atmToday || 0) : 0; }

function _atmParse(arg) {
  const digits = String(arg || "").replace(/[^\d๐-๙]/g, "");
  if (/^\d+$/.test(digits)) return parseInt(digits, 10);
  const t = parseThaiDigits(digits);
  return t == null ? NaN : t;
}

function _doWithdraw(arg) {
  const _m0 = G.money;
  _doWithdrawInner(arg);
  if (G.money > _m0) G.atmTotal = (G.atmTotal || 0) + (G.money - _m0); // the morning ledger nets ATM cash out
}
function _doWithdrawInner(arg) {
  if (!_flag("hasWallet")) {
    _say("Your bank card was in the wallet — and the wallet is the whole problem. " +
      "No card, no cash. Solve that first.");
    return;
  }
  if (!_room().atm) {
    // On Soi 6 the only machine is at the West End by the junction — don't tell a
    // player already standing on the soi that "Soi 6 has one out on the street."
    if (["soi6_mid", "soi6_deep"].includes(G.room))
      _say("No ATM on this stretch — the only machine on Soi 6 is back at the West End, " +
        "by the beach-road junction. Head WEST.");
    else {
      if (typeof _nontHere === "function" && _nontHere()) { _say(`No machine here — but the kid at the table does cash, five percent, no card fee. (CASH <amount>)`); return; }
      const near = Object.keys(ROOMS).find(id => ROOMS[id].atm && ROOMS[id].region === _room().region);
      _say(near
        ? `No ATM here — the nearest machine is at ${ROOMS[near].name}, on this side of town.`
        : "No ATM here. There's one on the main drag of every nightlife area — Soi 6 has " +
          "one at the West End, by the junction.");
    }
    return;
  }
  const n = _atmParse(arg);
  // Any amount the note tray can compose is legal (฿1k multiples), up to the
  // daily cap — "WITHDRAW 20000" used to be refused though 2x฿10k is exactly
  // what the machine holds, forcing two pulls and a double fee (optimizer
  // playtest, 2026-08-22). Non-multiples still get the notes line.
  if (!n || n < 1000 || n % 1000 !== 0) {
    _say("The machine pays out in ฿1,000 · ฿5,000 · ฿10,000 notes — thousands only. (WITHDRAW <amount>)");
    return;
  }
  const drawn = _atmDrawnToday(), left = ATM_DAILY_CAP - drawn;
  if (n > left) {
    _say(left <= 0
      ? `Daily limit reached — ฿${_num(ATM_DAILY_CAP)} is the max, and you've hit it. ` +
        "The machine keeps your card just long enough to make the point, then spits it back."
      : `Over the daily limit. You've drawn ฿${_num(drawn)} of ฿${_num(ATM_DAILY_CAP)} ` +
        `today — only ฿${_num(left)} left until tomorrow.`);
    return;
  }
  const cost = n + ATM_FEE;
  if ((G.bank || 0) < cost) {
    _say(`Insufficient funds. ฿${_num(G.bank || 0)} in the account, and the machine ` +
      `wants ฿${_num(cost)} (฿${_num(n)} + ฿${ATM_FEE} fee).`);
    return;
  }
  G.bank -= cost;
  G.money += n;
  G.atmDay = G.day;
  G.atmToday = drawn + n;
  G.atmFees = (G.atmFees || 0) + ATM_FEE;   // the morning ledger counts the fee, which never touches the pocket (Stan, r35)
  _say(`The machine whirrs, thinks, and counts out ฿${_num(n)} — lighter a ฿${ATM_FEE} ` +
    `foreign-card fee. (฿${_num(G.money)} in pocket · ฿${_num(G.bank)} in the account.)`, "win");
}

function _doBalance() {
  if (!_flag("hasWallet")) {
    _say("Your card's in your wallet, wherever that's got to. Nothing to check until it's back.");
    return;
  }
  const drawn = _atmDrawnToday();
  _say(`Account: ฿${_num(G.bank || 0)} · in pocket: ฿${_num(G.money)} · ` +
    `withdrawn today: ฿${_num(drawn)} of ฿${_num(ATM_DAILY_CAP)} · foreign-card fee ฿${ATM_FEE} a pull, so pull big.`, "dim");
}

function _doAtmVerb() {
  if (!_room().atm) {
    _say(_flag("hasWallet")
      ? "No ATM in reach. Every nightlife area keeps one on the main drag."
      : "Your card was in the wallet, and the wallet is the whole problem. Solve that first.");
    return;
  }
  _doBalance();
  _say(`(WITHDRAW 1000) · (WITHDRAW 5000) · (WITHDRAW 10000) — ฿${ATM_FEE} fee, ` +
    `฿${_num(ATM_DAILY_CAP)}/day.`, "dim");
}

// Filing a police report — right now only the hair-tonic shop shakedown has a
// claim worth filing. Canon: reports mostly go nowhere (brown envelopes), but
// when PUSHED the police "settle" the dispute and you get most of your money
// back minus a "negotiation fee" that stays in Beach Road. Must be done at the
// station.
function _doReport(arg) {
  if (G.room !== "police_station") {
    _say("You'd file that at the Pattaya Central Police Station — up at the north " +
      "end of Beach Road, between the mall and the bars. (Go there, then REPORT it.)");
    return;
  }
  const owed = (G.tonicOwed || 0) + (G.curseOwed || 0);
  if (owed <= 0) {
    _say("The desk sergeant looks at you over his glasses with the unhurried " +
      "patience of a man who has heard every farang complaint ever invented. " +
      "“What you want to report?” Nothing you can prove, tonight.");
    return;
  }
  const onlyCurse = (G.curseOwed || 0) > 0 && (G.tonicOwed || 0) === 0;
  const fee = Math.round(owed * TONIC_POLICE_CUT);
  const back = owed - fee;
  G.money += back;
  G.tonicOwed = 0;
  G.curseOwed = 0;
  if (onlyCurse) {
    _say("You describe the robes, the red string, the beachfront, the four-figure " +
      "“cleansing”. The sergeant nods slowly, writes nothing, and observes — kindly " +
      "— that these are “not real monk, my friend, not real problem.” You push. You " +
      "keep pushing. Eventually a bored plainclothes officer strolls the promenade, " +
      "has a quiet word among the robes, and returns with a fold of your notes — " +
      "most of them.", "win");
  } else {
    _say("You describe the shop, the soi, the three smiling cousins. The sergeant " +
      "nods slowly, writes nothing, and explains — kindly — that these are " +
      "“misunderstanding, my friend, is business.” You push. You keep pushing. " +
      "Eventually a bored plainclothes officer is dispatched, has a quiet word in " +
      "the soi, and returns with a fold of your notes — most of them.", "win");
  }
  _say(`Recovered ฿${back}, minus a ฿${fee} “negotiation fee” nobody offers you a ` +
    `receipt for. (฿${G.money} in pocket.) You decline to speculate about brown ` +
    "envelopes out loud.", "dim");
  _addHappy(1);
}

function _doCheers() {
  if (!_inBar()) {
    _say("You toast the night air. The night, in fairness, has earned it.");
    return;
  }
  _say("“ชนแก้ว!” (chon gaew — glasses meet!) Every glass within reach angles " +
    "toward yours: the girls', the regular's, possibly the mamasan's calculator. " +
    "Nobody needs a reason. Not needing a reason is the entire custom.");
}

// TAO RAI — the veteran's reflex: ask the price before you accept anything. The
// one word that keeps a "free" favour from becoming a debt you can't see yet.
const _GRAB_LINE = "No app car worth the wait at this hour and this address — the piwins on the corner ARE the app, and they don't cancel. (MOTOSAI TO <place>.)";
// ── The ride itself ──────────────────────────────────────────────────────────
// "The piwin threads traffic like it owes him money" printed on every ride of
// every night (Mario, 2026-09-03: the prose should capture the moment — the
// weaving, the shortcuts, the pavement, where the hands go, and what happens
// when there's a girl with you). Three pools: the ride (short hop / long
// haul), the hands (the first ride of the game, then now and then), and the
// three-up (a companion — in the middle Thai-style, side-saddle, or on the
// back with her arms round you because you were a gentleman; two girls get
// a second bike, and a second fare). Hash-picked where it must not spend
// dice after the crash roll.
const _MOTO_RIDE_SHORT = [
  "the piwin threads traffic like it owes him money — between a songthaew and a wall, up the wrong side of a bollard, done",
  "and you're off before you've settled: a gap that isn't a gap, the mirror of a Fortuner an inch from your knee, the hot breath of a bus",
  "and the bike drops off the kerb, up the next one, along fifteen metres of pavement past a noodle cart whose owner doesn't look up, and back into the road",
  "and he takes a soi you didn't know existed, one lane wide, a dog asleep in the middle of it that he goes round without slowing",
  "and it is thirty seconds of horns, neon smearing, a U-turn through oncoming traffic executed with total serenity",
  "and the piwin rides the white line between two lanes of stopped traffic at a speed that makes the wing mirrors clap",
];
const _MOTO_RIDE_LONG = [
  "and the town unrolls: the soi, the big road, a shortcut through a temple car park, a stretch of highway shoulder where the lorries pass close enough to lean on, the bike singing flat out between them",
  "and it's a proper ride — traffic lights taken as suggestions, a wrong-way run up a one-way soi, a hundred metres of pavement outside a closed bank, then the long dark road with the wind pulling your shirt open",
  "and the piwin settles into the long haul: a hand off the bar to answer his phone, a swerve round a pothole he knows by name, the sodium lights going by like a metronome",
  "and the districts change under you — bar lights, then shophouses, then dark, then the highway with the trucks, then bar lights again — and at every red light he rolls through the gap between the stopped cars to the front",
  "and somewhere in the middle of it he stops for petrol, forty baht from a bottle at a stall, and you sit on the back holding your own elbows while the girl pours",
];
const _MOTO_HANDS = [
  "There is the immediate question of your hands. His shoulders? Too intimate. His waist? Worse. You settle for the chrome bar behind the seat, white-knuckled, and every brake throws your chest into his back anyway.",
  "Where do the hands go. You try the grab-rail behind you, which means every acceleration tries to leave you on the road; you try his waist and he flinches; you end up with one on the rail and one on your own knee, which fools nobody.",
  "Your hands find the piwin's shoulders before you've thought about it and he shrugs them off, not unkindly — the rail, boss, behind you. The rail is warm from the last farang.",
  "You hold the back of the seat, then the rail, then, on the first real corner, his hips, and he laughs and speeds up.",
];
const _MOTO_HANDS_LATER = [
  "You take the rail without thinking now. That is how long you have been here.",
  "Hands on the rail, knees in, chin down. You ride pillion like a man who has stopped being surprised by it.",
];
const _MOTO_THREE_UP = [
  "{n} settles between you and the piwin without discussion — that is how three ride here, the girl in the middle with a hand on his shoulder and your arms round her — and the bike takes the weight the way it takes everything, with a slight complaint and no change of speed.",
  "You do the gentleman's thing and put {n} on the back, arms round your waist, and hold the piwin's shoulders yourself; he sighs the sigh of a man who now has a farang's hands on him for the whole ride, and goes.",
  "{n} rides side-saddle behind you, knees together, both hands on your ribs, texting with one of them somehow. Three on a bike is nothing here. It is a great deal to you.",
  "{n} goes in the middle and immediately starts a conversation with the piwin over his shoulder in Thai — where you're from, how much you paid her, whether he knows her cousin — and the two of them laugh at something that is very probably you.",
];
// Four on a bike — you, two girls, the piwin — is not the broke fallback, it
// is a thing that happens (Mario, 2026-09-03: "me and two girls on the same
// motosai"). Half the time a solvent man gets it anyway; broke, always.
const _MOTO_FOUR_UP = [
  "Four on a bike: {n} either side of the argument about who sits where, then both of them behind you, the one at the back holding the rail with her fingertips and the whole machine sagging on its springs. The piwin says nothing. He has seen five.",
  "The piwin looks at the three of you, looks at his bike, and jerks his head: on. {n} fold themselves behind you like a magic trick, four bodies on a hundred and twenty-five cc, and at the first pothole everybody screams and nobody falls off.",
  "No second bike — {n} are already on, one of them practically in your lap, and the bike moves off with the solemn dignity of something badly overloaded. A policeman at the corner watches the whole arrangement go past and decides he saw nothing.",
];
const _MOTO_SECOND_BIKE = [
  "Two girls and a farang is one bike too many even here: the stand sends a second, and {n} go ahead of you on it, looking back and shrieking at every corner.",
  "The piwin counts heads and waves a mate over — three is Thai, four is a taxi. {n} take the second bike and race you, and win.",
];
function _minutesWord(n) {
  const w = { 6: "Six minutes", 12: "Twelve minutes", 18: "Eighteen minutes", 24: "Twenty-four minutes", 30: "Half an hour" };
  return w[n] || (n + " minutes");
}
function _doTaoRai() {
  // in a bar it is the price list nobody hands you (Colin, round 37)
  if (_inBar() && !G.pendingEnc) {
    const r = _room();
    const bits = [`beer ฿${_beerPrice()}`, `lady drink ฿${_ladyPrice()}`, "water ฿20"];
    if (r.barType && r.barType !== "pub") bits.push(`the bell ฿${_bellPrice(G.room)}`);
    _say("“เท่าไหร่?” (tao rai — how much?) " + (_tillKeeper(G.room) ? NPCS[_tillKeeper(G.room)].name + " answers without looking up: " : "The answer comes from behind the till: ") +
      bits.join(" · ") + ". Ask before the glass lands; the price never changes, only whether you knew it.", "dim");
    return;
  }
  // at a motosai stand it is a question with a number in the answer (Darren, round 37)
  if (_room().motosai && !G.pendingEnc && !_convoActive()) {
    const late = G.nightTurn >= LAST_BUS_TURN;
    const fares = Object.entries(MOTOSAI_DESTS).filter(([, d]) => d.room !== G.room)
      .map(([k, d]) => `${k} ฿${_motoFare(d)}`);   // the charged fare, gouge and all — quoted is charged
    _say("“เท่าไหร่?” (tao rai — how much?) The piwin rattles it off without looking up" +
      (late ? ", small-hours rate" : "") + ": " + fares.join(" · ") + ". (MOTOSAI TO <place>.)", "dim");
    return;
  }
  _say("“เท่าไหร่?” (tao rai — how much?) The only question that matters on this street. Ask it " +
    "before you take the drink, the gift, the favour, the shortcut — because nothing here is free; " +
    "you just haven't been shown the price yet. Ask it, pay it, close the account, walk on clean.", "dim");
}

// Natural-language courtesies a polite first-timer will type in full. Voiced,
// flavour-only; routed only as the very last resort (see the switch default).
// A partner-aware branch first: with someone in front of you, "thank you" /
// "did you eat" / a compliment go to HER, warmly, not to the void.
function _politePhrase(t) {
  const partner = typeof _convoActive === "function" && _convoActive();
  const to = partner ? _convoName(partner) : null;
  // a bare NO / NOTHING with nothing on the table — voiced, not "didn't parse"
  if (/^(no|nope|nah|nothing|never ?mind|nvm)$/.test(t) && !G.convoQ) {
    _say(to ? `${to} shrugs. Suit yourself.` : "Noted. Nobody had asked, but noted.", "dim");
    return true;
  }
  if (/\b(thank you|thanks|thank u|khob khun|cheers mate)\b/.test(t)) {
    _say(to ? `"Mai pen rai," ${to} says — no worries, the most Thai reply there is — and means it.`
      : "Manners cost nothing and buy plenty on this soi. Somebody nearby dips a wai back on reflex.");
    return true;
  }
  if (/\b(i love you|marry me|be my girlfriend|will you marry)\b/.test(t)) {
    _say(to ? `${to} laughs, not unkindly, and pats your hand. "You drink two beer and love everybody, tilac. Talk to me tomorrow, we see." The soi has heard it ten thousand times and kept every one.`
      : "You say it to the night. The night, which has been proposed to by better men than you and outlived them all, keeps walking.");
    return true;
  }
  if (/\b(did you eat|have you eaten|kin khao|you eat yet|eaten yet)\b/.test(t)) {
    _say(to ? `"Kin laew," ${to} says — ate already — the way everyone here says hello. "You? You too thin, farang." It is the warmest thing anyone will ask you all night.`
      : "\"Kin khao reu yang?\" — have you eaten? — is how this country says it cares. There's a food cart within thirty feet; there always is. (EAT)");
    return true;
  }
  if (/(lovely|beautiful|pretty|gorgeous|nice) (smile|eyes|dress)|you (are |look )?(so )?(lovely|beautiful|pretty|gorgeous)/.test(t)) {
    if (to) { _doSocial("flirt"); return true; }
    _say("A fine sentiment with nobody in front of you to receive it. Save it for the rail. (FLIRT WITH <someone>.)");
    return true;
  }
  if (/\b(walk you home|walk you back|see you home|take you home)\b/.test(t)) {
    _say(to ? `${to}'s eyes do a quick, practised sum — sweet, but this isn't how it works here, and she likes you too much to pretend. "Barfine, tilac. Ask the mama. Then anywhere you like." (BARFINE ${(_convoName(partner)||"").toUpperCase()})`
      : "A gentleman's instinct, and the wrong town for it unasked. If you mean it, it has a name here: BARFINE — squared with the mamasan, not on the pavement.");
    return true;
  }
  if (/^(hi|hey|hiya|good evening|good morning|evening|morning)\b/.test(t)) {
    _say(to ? `"${/morning/.test(t) ? "Arun sawat" : "Sawat dee"} kha," ${to} answers, hand rising to a wai.`
      : "\"HELLO WELCOME!\" a doorway fires back before you've finished — pure muscle memory. The soi is nothing if not friendly.");
    return true;
  }
  return false;
}

const _MISC_VERBS = {
  touch: "You reach out and touch it. Warm, real, faintly sticky — this whole town is faintly sticky. You learn nothing you couldn't see.",
  taste: "You are NOT tasting that. Some Infocom instincts do not travel to Pattaya; trust the one telling you to stop.",
  tell: "Telling isn't the verb here — this town runs on ASKING. ASK <someone> ABOUT <it>, and mind who's in earshot.",
  verbose: "It's already all here, tilac — the soi hides nothing and explains less. (LOOK for the room, EXAMINE for the thing.)",
  restore: "The night restores itself after every command — there's no load screen on a life. To take back your last move, use UNDO.",
  move: "You can't shift it, and you don't need to. Try a direction (N/S/E/W), or GO somewhere worth going.",
  close: "Leave it. Nothing here wants closing — this is a town that runs with the doors open and the shutters up until dawn.",
  jump: "You jump. The pavement, a lifelong connoisseur of falling farangs, scores it a four.",
  climb: "The only climb worth doing here is Pratumnak Hill, and there's a road to the top with a view waiting on it.",
  throw: "You weigh it and mime the arc — and every piwin on the corner looks up at once, like meerkats. You put it down.",
  push: "You push. Pattaya, vast and humid, declines to move.",
  pull: "You pull. Pattaya holds. It has had stronger men than you, tilac.",
  knock: "Nobody knocks in this town. Doors are either open or they were never for you.",
  shout: "You shout at the night. “HELLO WELCOME!” answers a bar, instantly, out of pure muscle memory.",
};

const _HELP = `The point of it all: สนุก (“sanuk” — fun) is the score; สบายสบาย (“sabai sabai” — easy-easy, the good life) is the summit.
THE WHOLE CARD (bare HELP is the short one):
  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)
  N/S/E/W · IN/OUT · ENTER <place>
  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>
  WAI [person] · SAY <thai phrase> [TO <person>]
  RIDE BUS TO <place> · RIDE THE LOOP (the whole circuit, for the breeze) · MOTOSAI TO <place> · PAY <amount>
  BUY <thing> · SELL BOTTLES · READ <thing> · READ SIGN
  WATCH TV (bars & your hotel room) · READ PAPER (on your phone) — the day's real headlines
  OWL / COLUMN — the Nite Owl newsletter in your inbox (a hard copy still at the Queen Vic)
  WATCH POLICE · WATCH SUNSET (Blue Dog & Stinky Pinky, early evening — the junction show)
  WATCH SOI · BALCONY (your balcony above, the Queen Vic window below, or the quiet middle of the soi — watch the parade, don't join it)
  WATCH DRAG (The Peacock Cabaret, Supertown/Jomtien — tip the queens)
  WEATHER · SCORES (real football) · LOTTERY (the real GLO draw)
  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in the beer bars)
  FLIRT/KISS <lady> — flirt again and it warms on its own · BUY DRINK FOR <lady> · BUY BEER · BUY MAN DRINK (for the bar manager)
  RING BELL (฿300 in a beer bar, dearer in the fancy ones) · TALK TO PATRON · BARFINE <lady>
  BUY CONDOM (฿40 a pack, any 7-Eleven — a barfine uses one; go without at your peril)
  Host bar (The Adonis Club, Supertown): BUY DRINK FOR <host> · HIRE <host> (premium prices; all welcome)
  MASSAGE (foot rub to happy-ending, by the shop) · SPECIAL (the extra) · SOAPY (the fishbowl)
  MEET <lady> — an off-shift number, once one's been written you (late nights, no guarantees)
  Live music (Fri/Sat, Rock Factory every night):
  DANCE · SING · REQUEST <song> · TIP BAND <amount> · BUY ROUND FOR BAND · TALK TO BAND
  EAT <food> · DRINK <thing> · BUY WATER / FOOD (street carts & 7-Elevens) · SLEEP (at the hotel)
  OPEN FRIDGE · TAKE WATER (your hotel room — two free bottles a day)
  CHECKOUT (your room, before 19:00) — move hotels: Sabai Palms ฿400 · Queen Vic ฿700 · Areca Lodge ฿900 · Metropole ฿1300
  DIAGNOSE (how bad is it) · GET TESTED (free clinic — clears a barfine souvenir)
  AGAIN or G (repeat last command)
  TRAVEL <bar|hotel> (fast travel anywhere you've been — walking pace, bare TRAVEL lists)
  TIME · MAP · WAIT UNTIL <hour> · TIP <lady> <amount> · PHOTO · CHEERS · TAO RAI (ask the price)
  QUESTS · ACCEPT <quest> · ABANDON <quest> · HINT (the soi's nudge — Act One, after your first reset)
  PHONE / EXAMINE PHONE (home screen: battery, messages, weather, headlines)
  CONTACT <lady> (swap numbers) · CONTACTS (your phonebook) · MESSAGE <lady> · CHECK MESSAGES
  WHO / BLACKBOOK (your ladies, ranked by how they feel about you) · WHO AM I (who you chose to be)
  STANDING (the soi's read on you) · PHOTO <someone> (a portrait for your phone) · GALLERY (the faces you've collected)
  SEND <amount> TO <lady> (banking app)
  ASK <who> ABOUT <topic> AGAIN (you get the gist on a repeat — “again” asks for the whole story back)
  BORROW <amount> · REPAY [amount] (Nira's loan at Neon Paradise — 20%, three days, don't be late)
  DEBT (every ledger with your name on it: Nira, the hotel book, the old man's note)
  Your own bar (once you own one): WORK / MIND (stand behind your own rail tonight) · BOOKS / TAKINGS
    DRAW [amount] (take your own money out of your own till — nobody else will do it for you)
  PET CATS (Jomtien beach) · FEED DOG (a friendship you cannot undo) · PET DOG · NAME DOG <name>
  LIGHT ON / LIGHT OFF · CHARGE PHONE
  SCORE (happiness & progress) · DEBT (what you owe, and to whom)
  UNDO · RESTART   (the night autosaves itself; UNSHELVE takes back a night you stepped away from)
  BUY PIWIN A BEER · ASK PIWIN ABOUT <person>   (the men at the stands see everything)
  On a phone: the (INFO) chip opens QUESTS, HINT, TIME, WHO and the rest, and every
    "…" chip fans out into a menu — this list needs no typing to use
  Highlighted words in the story are tappable: tap for the quick menu, RIGHT-CLICK (or
    press and hold) for the full one — a person's ask-topics, and the actions a tap shouldn't fire
  QUIT / END / LOGOUT (sign off; your night is saved) · RESET (wipe the save — asks first)`;

// HELP is layered the way parser IF settled on (ABOUT / HELP / HINT, and the
// verb list one step down): the bare verb is a FIRST PAGE for the night you are
// actually in — ten lines, the four verbs that get you home, the taps, HINT —
// and HELP MORE (or VERBS) is the whole card. It was one flat sixty-line card
// that listed BARFINE, BUY CONDOM and SOAPY on turn three of the opening
// (Bronwyn, round 39: "a menu in a language I don't speak").
const _HELP_HEAD = "The point of it all: สนุก (“sanuk” — fun) is the score; สบายสบาย (“sabai sabai” — easy-easy, the good life) is the summit.";
const _HELP_TAPS = "Highlighted words in the story are tappable: tap for the quick menu, press and hold (or right-click) for the full one.";
function _helpFirstPage() {
  const soi6 = G.mode === "soi6";
  const opening = !_flag("act1Done");
  const L = [_HELP_HEAD, ""];
  if (opening) {
    L.push("Tonight: get the wallet back, get home. What you need, and nothing you don't:");
    L.push("  LOOK · EXAMINE <thing> · INVENTORY (I) — what's here, what you still have");
    L.push("  TALK TO <person> · ASK <person> ABOUT <topic> — this town runs on asking");
    L.push("  WAI <person> — manners open doors money can't");
    L.push("  N / S / E / W · IN / OUT · ENTER <place> — moving; MAP for the town");
    L.push(soi6 ? "  BUY WATER · EAT <food> — the 7-Eleven and the carts"
                : "  RIDE BUS TO <place> then PAY 15 · MOTOSAI TO <place> · CALL TAN — getting across town");
    if (!soi6) L.push("  SELL BOTTLES · BUY WATER · EAT <food> — money and meters, the cheap way");
    L.push(G.act1Tries > 0 ? "  HINT — the soi's nudge toward the next step" : "  HINT — a nudge, once the soi knows your face");
  } else {
    L.push("Getting around:  LOOK · EXAMINE <thing> · N / S / E / W · ENTER <place> · TRAVEL <bar> · MAP · TIME");
    L.push("People:          TALK TO <person> · ASK <person> ABOUT <topic> · WAI · CONTACT <lady> — this town runs on asking");
    L.push("The bar:         BUY BEER · BUY DRINK FOR <lady> · FLIRT <lady> · RING BELL · BARFINE <lady> · TAO RAI (ask the price)");
    L.push(soi6 ? "Money & phone:   WITHDRAW <amount> · CHECK BALANCE · PHONE · MESSAGE <lady> · CHECK MESSAGES"
                : "Money & phone:   WITHDRAW <amount> · CHECK BALANCE · PHONE · MESSAGE <lady> · CHECK MESSAGES · CHARGE PHONE");
    L.push(soi6 ? "The week:        QUESTS · HINT · SCORE · SHARE · WHO (your ladies) · SLEEP (end the night)"
                : "The week:        QUESTS · HINT · SCORE · WHO (your ladies) · OWL (the newsletter) · SLEEP (at your hotel)");
    L.push("Body:            EAT <food> · BUY WATER · DIAGNOSE (how bad is it)");
  }
  L.push("");
  L.push(_HELP_TAPS);
  L.push("HELP MORE (or VERBS) lists everything the game answers to.");
  return L.join("\n");
}
function _doHelp(arg) {
  if (/^(more|all|full|verbs?|list|everything)$/.test(String(arg || "").trim().toLowerCase())) {
    _say(G.mode === "soi6" ? _HELP_SOI6 : _HELP, "dim");
    return;
  }
  _say(_helpFirstPage(), "dim");
}

// Soi 6 Challenge is a confined mode — one street, one week, no baht bus off it.
// The full-game HELP advertises a dozen venues and verbs that don't exist here
// (the Adonis host bar, the Peacock cabaret, Rock Factory, Jomtien's cats, Nira's
// loan, the massage shops, RIDE BUS / MOTOSAI / CHECKOUT), so the launch mode
// gets its own list — only what's reachable inside SOI6_ROOMS, or a new player's
// first HELP walks them straight into a wall. Keep in sync with the full HELP
// above for verbs the two share.
const _HELP_SOI6 = `The point of it all: สนุก (“sanuk” — fun) is the score; สบายสบาย (“sabai sabai” — easy-easy, the good life) is the summit.
THE WHOLE CARD (bare HELP is the short one):
  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)
  N/S/E/W · IN/OUT · ENTER <place> · TRAVEL <bar> (fast-hop to any bar you've seen)
  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>
  WAI [person] · SAY <thai phrase> [TO <person>]
  WATCH TV · READ PAPER — the day's real headlines · OWL — the Nite Owl newsletter · WEATHER · SCORES · LOTTERY
  WATCH SUNSET (Blue Dog & Stinky Pinky, early evening — the junction show)
  WATCH SOI · BALCONY (your balcony above, the Queen Vic window below, or the quiet middle of the soi — watch, don't join)
  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in the beer bars)
  FLIRT/KISS <lady> — flirt again and it warms on its own · BUY DRINK FOR <lady> · BUY BEER · BUY MAN DRINK
  RING BELL (฿300 in a beer bar, dearer in the fancy ones) · TALK TO PATRON · BARFINE <lady>
  BUY CONDOM (฿40 a pack, the 7-Eleven — a barfine uses one; go without at your peril)
  DIAGNOSE (how bad is it) · GET TESTED (free clinic — clears a barfine souvenir)
  QUESTS · ACCEPT <quest> · ABANDON <quest>   (the soi has its own jobs going)
  EAT <food> · DRINK <thing> · BUY WATER / FOOD (street carts & the 7-Eleven)
  WITHDRAW <amount> · CHECK BALANCE (the street ATM — ฿300 a pull, ฿20,000 a day)
  SLEEP (your room, ends the night) · OPEN FRIDGE · TAKE WATER (two free bottles a day)
  PHONE / EXAMINE PHONE (battery, messages, weather, headlines)
  CONTACT <lady> (swap numbers) · CONTACTS · MESSAGE <lady> · CHECK MESSAGES
  WHO / BLACKBOOK (your ladies, ranked by how they feel about you) · WHO AM I (who you chose to be)
  SEND <amount> TO <lady> (banking app)
  FEED DOG (a friendship you cannot undo) · PET DOG · NAME DOG <name>
  LIGHT ON / LIGHT OFF · CHARGE PHONE
  TIME · MAP · WAIT UNTIL <hour> · TIP <lady> <amount> · PHOTO · CHEERS · TAO RAI (ask the price)
  AGAIN or G (repeat last command)
  SCORE (happiness & progress) · SHARE (your week card — one emoji a night, copy & compare)
  UNDO · RESTART   (the night autosaves itself)
  PLAY AGAIN (once the week's up — another seven days on the soi)
  On a phone: the (INFO) chip opens QUESTS, HINT, TIME, WHO and the rest, and every
    "…" chip fans out into a menu — this list needs no typing to use
  Highlighted words in the story are tappable: tap for the quick menu, RIGHT-CLICK (or
    press and hold) for the full one — a person's ask-topics, and the actions a tap shouldn't fire
  QUIT / END / LOGOUT (sign off; your night is saved) · RESET (wipe the save — asks first)`;

// ── Autocomplete ─────────────────────────────────────────────────────────────
// engineComplete(input) → candidates for the input's final word, drawn from
// what makes sense right now (NPCs in the room, inventory, exits, contacts,
// quests on offer). Pure and DOM-free so it vm-tests like everything else:
// term.js renders and cycles, this decides — the terminal must not know
// rules, not even vocabulary. Easter-egg verbs are deliberately absent.

const _COMPLETE_VERBS = [
  "reply", "unsubscribe",
  "buy piwin a beer",
  "wear",
  "look", "examine", "take", "drop", "inventory", "go", "enter", "talk to",
  "ask", "give", "buy", "sell bottles", "pay", "wai", "say", "ride bus to", "ride the loop",
  "motosai to", "travel", "light", "charge phone", "read", "use", "open", "play",
  // spank/fondle deliberately absent — same "easter-egg verb" treatment as the
  // Zork easter eggs above: still fully functional if typed, never suggested
  // or advertised (Mario's call, round 32). FLIRT auto-escalates toward KISS
  // on repetition on its own now; spank/fondle stay a manual, undocumented
  // find for a player who goes looking.
  "flirt", "kiss", "ring bell", "barfine", "massage", "special", "soapy", "meet", "eat", "drink",
  "sleep", "tv", "column", "owl", "watch", "watch soi", "balcony", "weather", "scores", "lottery", "map", "time", "tip", "wave", "phone",
  "photo", "gallery", "photos", "info", "call", "share", "follow", "cash", "shower", "withdraw", "cheers", "tao rai", "borrow", "repay", "hire", "pet", "feed", "rename", "dance", "sing", "swim",
  "smell", "listen", "diagnose", "get tested", "clinic", "apologize", "quests", "accept", "abandon", "contact",
  "contacts", "who", "who am i", "identity", "blackbook", "message", "check messages", "send", "score", "standing", "wait", "again",
  "request", "hint", "books", "draw", "work", "help", "verbs", "save", "load", "undo", "restart", "quit", "reset", "end", "logout", "exits",
];

// ── Context chips: the fourth surface ────────────────────────────────────────
// The quick-command bar, matched to the moment — a pending modal → a live
// mini-game → the room in front of you. Returns [{cmd,label}]; a cmd ending in a
// space prefills and waits for an object (label carries a "…"), a bare cmd
// submits immediately. DOM-free and pure over G, so term.js renders whatever this
// returns each turn (the same rule the parser, wheel, and autocomplete consume).
function _chipSet() {
  const chips = [];
  // `kind` is presentation metadata a chip can carry — term.js styles a
  // "reply" chip (your own quoted words, answering HER pending question)
  // distinctly from an ordinary command/topic chip. Without it the two groups
  // rendered identically and back to back, e.g. "First time in this one" and
  // "Money"/"Plan" side by side with nothing marking one as an answer and the
  // other as a new question — a cold first-timer read them as one undivided
  // list (Priya's cold-onboarding playtest, round 32, 2026-08-30).
  const add = (cmd, label, kind) => chips.push({ cmd, label: label || cmd, kind });

  // 1) A pending modal owns the input — offer only its answers
  if (G.pendingChoice === "intro") {
    const step = _INTRO_STEPS[G.introStep || 0];
    if (step) step.table().forEach((e, i) => add(String(i + 1), _L(e.label)));
    return chips;
  }
  if (G.pendingChoice === "vacation_end") {
    if (G.mode === "soi6") { add("play again"); add("share", "share card"); return chips; }
    add("new vacation"); add("move to pattaya", "move to Pattaya"); return chips;
  }
  if (G.pendingChoice === "tanfavour") {
    add("yes"); add("no"); add("ask", "ask what it's for"); return chips;
  }
  if (G.pendingChoice === "bkkdinner") { add("go", "go to Bangkok"); add("decline", "decline"); return chips; }
  if (G.pendingChoice === "bkkbill") { add("let", "let it go"); add("grab", "reach for it"); return chips; }
  if (G.pendingChoice === "cham") { add("go", "go with her"); add("not tonight"); return chips; }
  if (G.pendingChoice === "chamgift") {
    if (_pers("whiteknight")) add("gift " + CHAM_GIFT, "gift ฿" + CHAM_GIFT);
    add("gift ", "gift…"); add("nothing"); return chips;
  }
  if (G.pendingChoice === "synjob") {
    const j = typeof _synJobById === "function" ? _synJobById(G.synJob) : null;
    add("yes"); add("no"); add("ask", j ? j.whoLabel : "ask about it"); return chips;
  }
  if (G.pendingChoice === "shift") {
    const c = typeof _shiftCallById === "function" ? _shiftCallById(G.shiftCall) : null;
    add("yes", c ? c.yesLabel : "yes"); add("no"); return chips;
  }
  if (G.pendingChoice === "affair") { add("stay", "stay — make it real"); add("step back"); return chips; }
  if (G.pendingChoice === "affaircrisis") {
    const c = AFFAIR_CRISES.find(x => x.id === G.affairCrisis);
    if (c) [["1", c.a], ["2", c.b], ["3", c.c]].forEach(([n, o]) => { if (o) add(n, o.label); });
    return chips;
  }
  if (G.pendingChoice === "sellbar") { add("yes", "yes — sell up"); add("no", "not yet"); return chips; }
  if (G.pendingChoice === "partner") {
    add("yes", G.partnerWho === "tan" ? "yes — Tan's 51%" : "yes — Candy's 51%"); add("no"); return chips;
  }
  if (G.pendingChoice === "checkout") {
    if (G.hotel !== "sabai") add("sabai", "Sabai ฿400");
    if (G.hotel !== "queenvic") add("queen vic", "Queen Vic ฿700");
    if (G.hotel !== "areca") add("areca", "Areca ฿900");
    if (G.hotel !== "metropole") add("metropole", "Metropole ฿1300");
    add("stay", "stay put");
    return chips;
  }
  // 2) A live mini-game answers to its own moves only
  if (G.game) {
    for (const c of _c4Choices()) add(c, "drop " + c);
    for (const m of _jpChoices()) add("flip " + m, "flip " + m);
    if (G.game.type === "jp" && !_jpChoices().length) add("flip");
    if (G.game.type === "pool" || G.game.type === "killer") { add("shot"); add("power"); add("safety"); }
    // The LEAGUE game is type "kp", and this test named every pool type except
    // that one — so a killer-pool night offered a tapping player nothing but
    // QUIT. She paid the ฿100 entry for a quest she could then only forfeit
    // (round 24, Pauline). _gameVerbs already knew about "kp", which is exactly
    // how a three-surfaces rule fails: two surfaces agree and the third is
    // silently missing. SHOT/POWER only — no safety in the league game.
    if (G.game.type === "kp") { add("shot"); add("power"); }
    if (G.game.type === "darts") { add("go big", "go big"); add("steady"); add("finish"); }
    if (G.game.type === "quiz") { add("1"); add("2"); add("3"); }
    add("quit"); return chips;
  }
  // 2.15) PINNED BY THE RAIN. The block says "GO <somewhere inside>, or wait it
  //       out" and WAIT was on no chip, in no menu, nowhere — so a tapping
  //       player's only move was LOOK, over and over. She tapped it eight times
  //       the first night before giving up and typing (round 24, Pauline). The
  //       rain is frequent, so this is the single most-needed chip in the game
  //       for somebody who does not type.
  if (G.rain > 0 && !G.game && !G.pendingChoice && !G.pendingEnc) {
    add("wait 3", "wait for it to pass");
  }
  // 2.2) The negotiation/fare gates own the input the same way (doCommand
  //      swallows everything else and reprompts), so the chip bar must offer
  //      their answers — otherwise a touch player faces a row of dead chips.
  //      (The soak's seed-12 wedge: a whole night spent inside the ST/LT
  //      modal tapping room chips.) pendingEnc is deliberately absent here:
  //      an encounter routes ANY command to its resolver as the snap
  //      reaction, so the room chips stay live there.
  if (G.pendingBf) {
    const waived = G.pendingBf.id && typeof _bondTier === "function" && _bondTier(G.pendingBf.id) >= 3;
    add("short time", waived ? "short time (no fine)" : `short time ฿${G.pendingBf.st}`);
    add("long time", waived ? "long time (no fine)" : `long time ฿${G.pendingBf.lt}`);
    add("take her out", waived ? "take her out (no fine)"
      : `take her out ฿${G.pendingBf.party != null ? G.pendingBf.party : G.pendingBf.lt}`);
    add("no", "no, thanks");
    return chips;
  }
  if (G.pendingEnc === "nightride") { add("ride on"); add("call it a night"); return chips; }
  if (G.pendingEnc && Array.isArray(G.encPrompt)) {
    // the answers an encounter printed in CAPS inside parens become its chips
    // (liability playtest 2026-08-22: the freelancer's "YES her · BOTH · NO" had none)
    const txt = G.encPrompt.map(l => l[0]).join(" ");
    const seen = new Set();
    for (const grp of txt.match(/\(([^)]*)\)/g) || []) {
      for (const part of grp.slice(1, -1).split(/·|\/|\bor\b/)) {
        const m = part.match(/\b([A-Z][A-Z0-9']{1,}(?: [A-Z][A-Z0-9']{1,})*)\b/); // the CAPS run, wherever it sits in the clause
        if (!m) continue;
        const word = m[1].trim().toLowerCase().replace(/\s+/g, " ");
        if (word.length < 2 || seen.has(word) || /^(enter|help lists|hint)$/.test(word)) continue;
        seen.add(word); add(word);
      }
    }
    if (chips.length) return chips;
  }
  if (G.pendingSoapy) {
    for (const t of _SOAPY_TIERS) add(String(t.num), `${t.num} · ฿${t.price}`);
    add("no", "no, thanks");
    return chips;
  }
  // THE FARE CHIP SAID ฿15 AND SENT BARE "PAY", which the driver rejects: "A
  // number would help." The one tappable answer to the fare prompt was refused
  // by the game — in the mechanic the game is NAMED after — and a phone player
  // with arthritis had to reach for the keyboard every ride (round 24, Pauline).
  // The command has to carry the number the label promises.
  if (G.pendingFare) { add(`pay ${G.pendingFare.price}`, `pay ฿${G.pendingFare.price}`); return chips; }

  // 2.5) A live conversation turns the chip bar into the talk palette: the
  //      partner's currently-open topics, the social moves that fit them, and a
  //      way out. Only the unlocked topics show (see _convoTopics), so the bar
  //      doubles as progressive reveal. Typing still does everything else — this
  //      is the touch surface, not a cage; LEAVE restores the room chips.
  const partner = _convoActive();
  if (partner) {
    // A question on the table owns the bar: your own-voice replies first, so a
    // touch player has something to SAY rather than only ways to change the
    // subject (topics still follow — dodging stays a legitimate move).
    if (G.convoQ && G.convoQ.id === partner) {
      for (const t of _askReplies(G.convoQ.key)) add(t, `“${t}”`, "reply");
    }
    // Beat-specific action-choices the partner just offered come first (the
    // "player's side" of the exchange); they crowd out most of the topic list.
    const acts = _convoChoices();
    for (const c of acts.slice(0, 3)) add(c.label.toLowerCase(), c.label, "reply");
    // A BARE TOPIC AS THE CHIP'S COMMAND IS AMBIGUOUS. doCommand's verb switch
    // runs long before the conversation layer gets to resolve a bare word, so any
    // topic that is also a global verb fired the verb instead: tapping Auntie
    // Nok's "wallet" in Act One printed your pocket balance instead of asking the
    // woman in front of you about the missing wallet — the entire quest — and
    // "bus" answered with the generic no-blue-trucks line (round 17). Silent, and
    // the topic chips are a thumb player's ONLY way to ask about anything (the
    // wheel carries verbs). So the chip types what a player would have to type;
    // the LABEL still reads as the bare topic, so the bar looks unchanged.
    const _who = _convoName(partner).toLowerCase();
    for (const t of _convoTopics(partner).slice(0, acts.length ? 2 : 4))
      add(`ask ${_who} about ${t}`, _topicLabel(t));
    add("compliment", "compliment");
    add("joke", "joke");
    if (_npcState(partner).trust >= 3) add("tease", "tease"); // banter unlocks once you're close
    const _first = _convoName(partner).split(" ")[0].toLowerCase();
    if (NPCS[partner] && NPC_ROLES[partner] === "hostess") add("flirt", "flirt");
    // every working role takes a lady drink, and a patron/manager takes a beer —
    // the chip bar hid the actual loop behind a wheel a thumb may never find
    // (thumbs-only playtest 2026-08-22: ~12 turns with a mamasan and no drink chip)
    if (NPCS[partner] && NPC_ROLES[partner]) add("buy drink for " + _first, "buy drink");
    else if (_inBar()) add("buy drink for " + _first, "stand a beer");
    add("bye", "say goodbye"); // "leave" read as walking out of the bar (playtest #9)
    return chips;
  }

  // 3) The room in front of you
  const r = _room();
  if (_isDarkHere()) add("light");
  add("look");
  if (G.room === _hotelRoomId() && _flag("act1Done")) add("sleep", "sleep — end the night");
  // The readout verbs live only in HELP, which is itself untappable — a thumb
  // player could not reach QUESTS/HINT/TIME/WHO/GALLERY at all (thumbs-only
  // playtest 2026-08-22). One chip, fanned out like the ATM.
  if (_flag("act1Done") || G.stage === "act1") add("__info ", "info…");

  if (_inBar()) {
    const girls = _npcsHere().filter(id => NPC_ROLES[id] === "hostess" || NPC_ROLES[id] === "mamasan");
    if (r.hostBar) { add("buy drink for ", "buy drink…"); add("hire ", "hire…"); }
    else if (girls.length) { add("flirt ", "flirt…"); add("buy drink for ", "buy drink…"); add("barfine ", "barfine…"); }
    add("buy beer");
    if (_playOptions().length) add("play");
    for (const pid of _regularsHere().slice(0, 2)) {
      const lbl = _npcLabel(pid);
      add("talk to " + lbl.toLowerCase(), lbl.length > 24 ? lbl.slice(0, 22) + "…" : lbl);
    }
  } else if (_npcsHere().length) { // one cast — the regulars are in _npcsHere
    add("talk to ", "talk…");
  }
  if (G.room === "north_beach" && !(G.encDone && G.encDone.freelancer) && !G.pendingEnc)
    add("talk to the ladies", "the ladies");

  // One chip that opens the rack (the "buy " prefill fans out in autocomplete,
  // ATM-style) instead of three fixed purchases crowding the bar (playtest #14).
  if (r.seven) add("buy ", "7-Eleven…");
  if (FOOD_STALLS[G.room]) add("buy food");

  // The ENGINE offers every exit — dropping the compass-duplicated cardinals is
  // term.js's job (it filters n/s/e/w/in only while the compass fab is visible),
  // so a served or 2D frontend that draws no compass keeps its tap route, and
  // indoor rooms (no compass) keep theirs. Asserted by tests/e2e/compass.spec.
  // OUT/UP/DOWN wear the venue they lead to ("Queen Vic", not a bare DOWN —
  // playtest #3).
  for (const k of ["n", "s", "e", "w", "in", "out", "up", "down"]) if (r.exits && r.exits[k]) {
    const dest = ROOMS[r.exits[k]];
    const v = ["out", "up", "down"].includes(k) && dest && (dest.bar || (dest.barType && dest.name));
    add(k, v ? String(v).replace(/\s*\(.*\)$/, "") : k.toUpperCase());
  }
  if (G.room === "qv_room") add("balcony"); // the room's own verb (playtest #2/#4)
  for (const id of (r.venues || [])) {
    const label = (ROOMS[id].bar || ROOMS[id].name).replace(/\s*\(.*\)$/, "");
    add("enter " + label.toLowerCase(), label);
  }
  if (r.motosai) add("motosai to ", "motosai…");
  if (r.busStop) add("ride bus", "bus");
  if (r.atm) { add("withdraw 1000", "฿1k"); add("withdraw 5000", "฿5k"); add("withdraw 10000", "฿10k"); add("check balance", "balance"); }

  add("i", "inv"); add("map"); add("help");
  return chips;
}

function _cInv() {
  return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === "inventory");
}
function _cItemWord(id) { return ITEMS[id].name.split(" ").pop().toLowerCase(); }
function _cNpcsHere() {
  // suggest by label — a character's look until you've met them, their name after —
  // so autocomplete never leaks an unmet name (typed name still resolves via _findNpc).
  // one cast: _npcsHere carries the flagged regulars, a second spread doubled them
  return _npcsHere().map(id => _npcLabel(id).toLowerCase());
}

// ── amounts, from the engine ────────────────────────────────────────────────
// A thumb could commit to a shift and accept a partner's arrangement but could
// not move a baht that wasn't a fixed price on a chip: TIP/SEND/BORROW/REPAY/
// DRAW all prefilled a bare verb and offered nothing for the amount, and TIP was
// worse than nothing — it sat in the flirt/kiss/barfine group, which returns
// names WITHOUT checking ctx, so after picking a person the menu offered the
// same people again and a tap-through submitted "tip candy candy" (mobile
// playtest, round 17; measured again 2026-08-25). The ATM worked only because
// term.js hard-codes _ATM_CMDS — a hand-written list in the frontend, which is
// the bounded-by-a-list pattern this project has been removing everywhere else.
//
// So the amounts live HERE, where the rules are, and every surface inherits them:
// typed autocomplete, the chip fan-out, and the wheel. Never offer what the
// player cannot afford, and put the meaningful figure first — the balance for a
// repay, the till for a draw, the thresholds that actually change behaviour for
// a tip (฿100 bumps her, ฿300 doubles it: see _doTip).
function _cAmounts(verb) {
  const have = G.money || 0;
  const pick = xs => [...new Set(xs)]
    .filter(n => Number.isFinite(n) && n > 0 && n <= have)
    .sort((a, b) => a - b).map(String);
  switch (verb) {
    case "tip":      return pick([100, 300, 500, 1000]);
    case "send": case "transfer": case "wire": return pick([500, 1000, 5000, 10000]);
    case "draw": case "cashup": {
      const till = (_barOwned() && G.bar && G.bar.cash > 0) ? G.bar.cash : 0;
      if (!till) return [];
      return [...new Set([till, Math.round(till / 2), 5000, 1000])]
        .filter(n => n > 0 && n <= till).sort((a, b) => b - a).map(String);
    }
    case "repay": {
      if (!G.loan) return [];
      const owed = G.loan.owed;
      return [...new Set([Math.min(owed, have), Math.round(owed / 2), 1000])]
        .filter(n => n > 0 && n <= have).sort((a, b) => b - a).map(String);
    }
    case "borrow": {
      if (G.loan) return [];                       // one loan at a time
      return ["5000", "10000", "20000"];           // her ceiling; affordability doesn't apply
    }
    case "withdraw": case "withdrawal": case "withdrawl":
      return ["1000", "5000", "10000", "20000"];   // her cap is the bank's, not your pocket's
    default: return [];
  }
}

function _completePool(verb, ctx) {
  const girls = () => _npcsHere().filter(id => NPC_ROLES[id])
    .map(id => NPCS[id].name.toLowerCase());
  const contacts = () => Object.keys(G.phone.contacts)
    .filter(id => G.phone.contacts[id]).map(id => NPCS[id].name.toLowerCase());
  switch (verb) {
    case "talk": case "chat": case "wai": return _cNpcsHere();
    case "photo": case "selfie": case "photograph": case "snap":
      return ctx.length >= 2 ? [] : _cNpcsHere();
    case "flirt": case "kiss": case "spank": case "fondle":
    case "barfine": case "bf": return girls();
    // TIP is not one of those: it takes a person AND THEN an amount
    case "tip": return ctx.length >= 2 ? _cAmounts("tip") : girls();
    case "follow": return ctx.length >= 2 ? [] : _cNpcsHere();
    case "cash": return _nontHere() ? _cAmounts("send") : [];
    // the amount verbs that take no target — offer the figures straight away
    case "pay":
      // The fare keeps first refusal — PAY is one tap on a bus, and that is the
      // mechanic the game is named after.
      if (G.pendingFare) return [String(G.pendingFare.price)];
      // Only an owner who actually owes sees these — the fare's own "pay 15" is
      // chipped by the fare gate, and offering "pay rent" to a tourist is noise.
      if (typeof _barOwned === "function" && _barOwned() && G.bar &&
          ((G.bar.rentOwed || 0) > 0 || (G.bar.arrears || 0) > 0)) {
        const o = [];
        if ((G.bar.rentOwed || 0) > 0) o.push("rent");
        if ((G.bar.arrears || 0) > 0) o.push("the note");
        return o;
      }
      return [];
    case "borrow": case "repay": case "draw": case "cashup":
    case "withdraw": case "withdrawal": case "withdrawl":
      return ctx.length >= 2 ? [] : _cAmounts(verb);
    case "ask": {
      // Topic suggestions are gone: conversations run on TALK + the in-conversation
      // chip bar now, not ASK-about autocomplete. Typed ASK still works; we just
      // don't prompt topics. Name completion for `ask <npc>` stays.
      if (ctx.length >= 2) return [];
      return _cNpcsHere();
    }
    case "look": case "examine": case "x": case "inspect":
      return [..._cNpcsHere(), ..._cInv().map(_cItemWord),
        ...Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === G.room).map(_cItemWord)];
    case "take": case "get": case "grab":
      return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === G.room).map(_cItemWord);
    case "drop": // mid-c4 the columns; otherwise your pockets
      return _c4Choices().length ? _c4Choices() : _cInv().map(_cItemWord);
    case "flip": // mid-jackpot the legal moves ("3 4" and "7")
      return _jpChoices();
    case "read": case "use": return _cInv().map(_cItemWord);
    case "meet": case "visit": return G.offShift ? [G.offShift.name.toLowerCase()] : [];
    case "pay": // the driver names his price — offer it, so the fare is one tap
      return G.pendingFare ? [String(G.pendingFare.price)] : [];
    case "give":
      return ctx.length >= 2 ? _cNpcsHere() : _cInv().map(_cItemWord);
    case "buy": case "order": {
      // "buy [lady] drink for <name>" — once the drink's named, complete WHO it's
      // for with the ladies (or hosts) in the room, not the bar menu again.
      // ("man drink" is for the manager, so no name.) BRA is deliberately left out
      // of the chips — an undocumented find, like the pastie game.
      const rest = ctx.slice(1);
      if (rest.some(w => /^(drink|lady)$/.test(w)) && !rest.includes("man")) {
        return _room().hostBar ? _cNpcsHere() : girls();
      }
      // Only suggest what THIS room actually sells — toastie/condom at a 7-Eleven
      // room, food at a food stall, chargers where there's a shop/seven — else a
      // Soi 6 bar's "buy " chips include items it flatly refuses ("Not for sale here").
      const barItems = ["beer", "water", "lady drink for"];
      if (_room().seven) barItems.push("toastie");
      if (typeof FOOD_STALLS !== "undefined" && FOOD_STALLS[G.room]) barItems.push("food");
      if ((_room().shop && _room().shop.charger) || _room().seven) barItems.push("charger");
      if (_bandHere()) barItems.push("round for band"); // only where a band's actually playing
      if (_room().seven) barItems.push("condom"); // 7-Eleven staple
      if (_managerHere()) barItems.splice(1, 0, "man drink"); // early, so it survives the 8-result cap
      // "mot dinner", early for the same reason: Mot stands in an alley that sells
      // nothing, so without this the BUY chips there are a list of things the room
      // will refuse — while two characters have told the player to buy exactly one
      // thing. Only while it's undone.
      if (_npcsHere().includes("mot") && !_flag("motFed")) barItems.unshift("mot dinner");
      // At the Vic, the card IS the chip list — and the roast leads it on a
      // Sunday, because that is the thing worth knowing before nine.
      if (G.room === "queen_vic") {
        const card = _qvMenu().map(d => d.aliases[0]);
        return [...card, ...barItems.filter(i => !/food|toastie/.test(i))];
      }
      const sItems = _salengItems();
      if (sItems.length) {
        // a parked cart leads with its items; once one's named, offer a lady to
        // gift to — but the bar's own goods stay reachable (the cart lingers now)
        const named = sItems.find(i => ctx.slice(1).join(" ").includes(i.split(" ")[0]));
        return named ? girls() : [...sItems, ...sItems.map(i => i + " for"), ...barItems];
      }
      return barItems;
    }
    case "go": case "walk": case "head": case "enter":
      return [...Object.keys(_room().exits),
        // adjacent bars by name, so "enter can…" completes even if never visited
        // — venues[] first (the migrated case), exits as the legacy fallback
        ...[...(_room().venues || []), ...Object.values(_room().exits)]
          .map(to => ROOMS[to] && ROOMS[to].bar).filter(Boolean).map(b => b.toLowerCase()),
        ..._travelDests().map(id => _barName(id).toLowerCase())];
    case "travel": case "goto":
      return _travelDests().map(id => _barName(id).toLowerCase());
    case "leave": case "exit":
      // In a conversation LEAVE ends it (same as BYE); in a venue it walks you
      // out (playtest #10/#11). Anywhere else, the plausible-verb rule answers.
      if (typeof _convoActive === "function" && _convoActive()) { doCommand("bye"); break; }
      if (_room().exits && _room().exits.out) { _doGo("out"); break; }
      _say("Leave to where? Pick a direction — or OUT of a venue.");
      break;
    case "ride": case "catch": case "bus": {
      // _busLinesFor, not st.includes(G.room): hail-anywhere means a room can be
      // ON a route without being in its stop list — from such a room the old
      // filter returned [] and the (RIDE BUS TO <place>) prefill offered nothing
      // (mobile playtest 2026-08-17).
      const lines = _busLinesFor(G.room);
      if (!lines.length) return [];
      return [...new Set(lines.flatMap(l => BUS_LINES[l]))]
        .filter(s => s !== G.room).map(s => ROOMS[s].name.toLowerCase());
    }
    case "motosai": case "moto": case "taxi": return Object.keys(MOTOSAI_DESTS);
    case "accept":
      return Object.keys(QUESTS).filter(q =>
        G.quests[q] === "offered" || _questAvailable(q));
    case "abandon":
      return Object.keys(QUESTS).filter(q => G.quests[q] === "active");
    case "message": case "text": case "msg": case "call": case "dial":
    case "send": case "transfer": case "wire":
      return ctx.length >= 2 ? _cAmounts("send") : contacts();
    case "contact": return girls();
    case "play": case "challenge": return _playOptions();
    case "light": case "turn": return ["on", "off"];
    case "watch":
      return G.room === "blue_dog" ? ["police", "sunset", "tv"]
        : G.room === "peacock_cabaret" ? ["drag", "show", "cabaret"] : ["tv"];
    case "hire": return _room().hostBar ? ["arm", "win"] : [];
    case "check": return ["messages"];
    case "throw": case "toss": case "chuck": case "fling":
      // darts only; the pastie/nipple-cover ceiling game is an undocumented find,
      // not a chip suggestion (still works if you type it — see _doThrowCover).
      return _room().darts ? ["darts"] : [];
    case "say": case "speak":
      // a matched phrase already sitting there → offer who to aim it at
      return ctx.slice(1).some(w => matchThaiPhrase(w))
        ? _cNpcsHere() : ["sawatdee", "khop khun", "thao rai", "mai ao", "aroi", "sanuk", "sorry"];
    case "ring": return ["bell"];
    case "charge": return ["phone"];
    case "sell": return _flag("affairOffered") && !_flag("barSold") ? ["up", "bottles"] : ["bottles"];
    case "wait": return ["until midnight", "until 9pm", "10"];
    default: return [];
  }
}

function engineComplete(input) {
  if (!G) return [];
  const raw = String(input || "").replace(/^\s+/, "").toLowerCase();
  if (!raw) return [];
  const endsSpace = /\s$/.test(raw);
  const words = raw.split(/\s+/).filter(Boolean);
  const last = endsSpace ? "" : words[words.length - 1];
  const ctx = (endsSpace ? words : words.slice(0, -1))
    .filter(w => !["the", "a", "an", "to", "at", "for", "with", "about", "my"].includes(w));
  let pool;
  if (G.pendingChoice === "vacation_end") pool = G.mode === "soi6" ? ["play again"] : ["new vacation", "move to pattaya"];
  else if (G.pendingChoice === "tanfavour") pool = ["yes", "no", "ask"];
  else if (G.pendingChoice === "bkkdinner") pool = ["go", "decline"];
  else if (G.pendingChoice === "bkkbill") pool = ["let", "grab"];
  else if (G.pendingChoice === "cham") pool = ["go", "not tonight"];
  else if (G.pendingChoice === "chamgift") pool = ["gift ", "nothing"];
  else if (G.pendingChoice === "synjob") pool = ["yes", "no", "ask"];
  else if (G.pendingChoice === "shift") pool = ["yes", "no"];
  else if (G.pendingChoice === "partner") pool = ["yes", "no"];
  else if (G.pendingChoice === "affair") pool = ["stay", "step back"];
  else if (G.pendingChoice === "affaircrisis") {
    const c = AFFAIR_CRISES.find(x => x.id === G.affairCrisis);
    pool = c ? [["1", c.a], ["2", c.b], ["3", c.c]].filter(([, o]) => o).map(([n]) => n) : ["1", "2"];
  }
  else if (G.pendingChoice === "sellbar") pool = ["yes", "no"];
  else if (G.pendingChoice === "checkout") {
    pool = [...Object.keys(_HOTELS).filter(k => k !== G.hotel)
      .map(k => _HOTELS[k].name.toLowerCase()), "stay"];
  } else if (G.pendingBf) pool = ["short time", "long time", "take her out", "no"];
  else if (G.pendingSoapy) pool = [..._SOAPY_TIERS.map(t => String(t.num)), "star", "super star", "model", "no"];
  else if (raw === "__info " || raw === "__info") {
    pool = ["quests", "hint", "time", "who", "contacts", "gallery", "standing", "diagnose", "score", "map", "help"];
    if (G.mode === "soi6") pool.push("share");
    if (G.stage === "expat") pool.push("books");
    // DEBT and DRAW are readouts about YOUR money, and they were the two verbs a
    // thumb could not reach by any route at all — no chip, no menu entry, no CAPS
    // hint in prose, and DEBT isn't even in HELP. A thumbs-only owner sat at his
    // own bar with ฿0 in pocket and ฿5,291 in his own till, unable to pay a ฿15
    // fare (round 17). Both are offered only where they say something: DEBT when
    // you owe somebody, DRAW when there is money in your own drawer to take.
    if (G.loan || G.hotelDebt > 0 ||
      (typeof _barOwned === "function" && _barOwned() && G.bar && (G.bar.owed > 0 || G.bar.arrears > 0)))
      pool.push("debt");
    if (typeof _barOwned === "function" && _barOwned() && G.room === "stinky_bar" && G.bar && G.bar.cash > 0)
      pool.push("draw");
    return pool; // a menu, not a completion: no prefix filtering
  }
  else if (G.game && !ctx.length) pool = _gameVerbs();
  else if (ctx.length) pool = _completePool(ctx[0], ctx);
  // REPORT only makes sense at the station (surfaced there, first), or anywhere
  // you're still owed money by the tonic shop; COMPLAIN while a barfine
  // grievance is on the books.
  else {
    pool = (G.room === "police_station" || G.tonicOwed > 0 || G.curseOwed > 0)
      ? ["report", ..._COMPLETE_VERBS] : _COMPLETE_VERBS;
    if (G.bfIncident) pool = ["complain", ...pool];
    // POSTER only where there is one — the same conditional treatment REPORT
    // gets, so the list never offers a verb that would answer "no poster here".
    if (_hasPoster()) pool = ["poster", ...pool];
    // ROUND THE BACK only on a street with a back door open to you tonight.
    // Strictly conditional, like REPORT: offering it anywhere else would leak
    // the existence of a door that is supposed to be knowledge, not signage.
    if (typeof _lockInDoorHere === "function" && _lockInDoorHere())
      pool = ["round the back", ...pool];
  }
  const seen = new Set();
  const out = [];
  for (const c of pool) {
    const k = String(c).toLowerCase();
    if (!k || seen.has(k) || !k.startsWith(last) || k === last) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 8) break;
  }
  return out;
}

// ── Parser ─────────────────────────────────────────────────────────────────

// The little Thai the parser reads (Thai-speaker playtest 2026-08-22): verbs and
// nouns a Thai player types first. Greedy longest-match over a string with no
// spaces; a line that maps entirely becomes the English command, anything else
// Thai gets a voiced "the soi reads a little" instead of "didn't understand".
const _THAI_CMD = [
  ["ขอบคุณ", "thank you"], ["สวัสดี", "hello"], ["เท่าไหร่", "how much"], ["ไม่เอา", "no"], ["ขอโทษ", "sorry"],
  ["ซื้อ", "buy"], ["เบียร์", "beer"], ["น้ำเปล่า", "water"], ["น้ำ", "water"], ["ข้าว", "food"], ["กิน", "eat"],
  ["ไปไหน", "exits"], ["ไป", "go"], ["เหนือ", "north"], ["ใต้", "south"], ["ตะวันออก", "east"], ["ตะวันตก", "west"],
  ["ออก", "out"], ["เข้า", "in"], ["ขึ้น", "up"], ["ดูสิ", "look"], ["ดู", "look"],
  ["พูด", "talk"], ["กับ", "to"], ["นอน", "sleep"], ["ช่วยด้วย", "help"], ["ช่วย", "help"],
  ["เงิน", "money"], ["โทร", "call"], ["เวลา", "time"], ["กระเป๋า", "inventory"],
  ["รถ", "bus"], ["บาท", "baht"], ["ชื่ออะไร", "who"],
];
function _thaiToCmd(s) {
  if (!/[\u0E00-\u0E7F]/.test(s)) return null;
  let rest = s, out = [], i = 0;
  while (rest.length) {
    if (/^\s/.test(rest)) { rest = rest.slice(1); continue; }
    if (!/^[\u0E00-\u0E7F]/.test(rest)) { const m = rest.match(/^[^\u0E00-\u0E7F\s]+/); out.push(m[0]); rest = rest.slice(m[0].length); continue; }
    const hit = _THAI_CMD.find(([th]) => rest.startsWith(th));
    if (!hit) return false; // some Thai the game doesn't read
    out.push(hit[1]); rest = rest.slice(hit[0].length);
    if (++i > 12) return false;
  }
  return out.join(" ");
}
function _norm(s) {
  return s.trim().replace(/\s+/g, " ")
    .replace(/[๐-๙]+/g, m => String(typeof parseThaiDigits === "function" ? parseThaiDigits(m) : m)) // Thai numerals read as numbers
    .replace(/[“”"']/g, "")
    .replace(/^(please |can you |go )/i, m => m.toLowerCase() === "go " ? "go " : "");
}

// The answer words of the SOFT encounters (see the pendingEnc gate): anything
// else that is a real command passes through with the pitch declined.
// Anchored, and SPECIFIC: an answer is the bare word (or the encounter's own
// noun — "buy the watch"), never a command that merely contains one. "buy drink
// for manow" under the peddler used to match /buy/ and be eaten (code review
// 2026-08-22); "go north" matched the noodle girl's "go". The observation verbs
// (look/help/…) are exempted earlier in the gate, so they never reach this.
const _ENC_SOFT = {
  peddler:    /^(?:haggle|bargain|cheap(?:er)?|discount|too much|lower|tao ?rai|how much|(?:buy (?:the |a )?)?(?:watch|rolex|glass(?:es)?|shades|sunglasses|vit(?:amin)?s?|pills?)|yes|no|nah|not interested|wave|pass)\b/,
  noodle:     /^(?:yes|yeah|ok|okay|sure|come(?: on)?|fine|why not|her|deal|no|nah|pass|wave|walk(?: on)?)\b/,
  freelancer: /^(?:both|two|friend|ning|threesome|them|yes|ok|okay|sure|company|come|deal|her|why not|no|nah|pass|wave|walk(?: on)?|thanks)\b/,
  coconutbar: /^(?:both|two|friend|muk|threesome|them|yes|yeah|ok|okay|sure|company|come|deal|her|why not|how much|price|no|nah|pass|walk(?: on)?)\b/,
  booking:    /^(?:yes|ok|okay|sure|book|come|deal|why not|send her|yeah|no|nah|sleep|turn in|pass|not tonight|stay|send)\b/,
  maze:       /^(?:help(?: him)?|find|yes|sure|come|together|follow|show|point|search|money|baht|pay|no|nah|walk(?: on)?|leave(?: him)?)\b/,
  jogger:     /^(?:join|run|yes|sure|no|nah|pass|wave|keep|walk(?: on)?|listen)\b/,
  influencer: /^(?:pose|photo|yes|sure|no|nah|pass|wave|walk(?: on)?|help|hold)\b/,
  djslip:     /^(?:sign|yes|sure|decline|no|nah|pass|refuse|ok|okay)\b/,
  freegift:   /^(?:take|yes|accept|thanks|refuse|no|nah|pass|wave|keep)\b/,
  katoey:     /^(?:flirt|kiss|snog|fondle|grope|spank|charm|wink|lean(?: in)?|no|nah|push|hands?|back off|wave|step)\b/,
  // The non-transactional set (bkk/jp weekenders, britles, punterwife): read
  // her right and you get a genuine free moment, but the pitch was never a
  // sale, so an unrelated genuine command (e.g. MEET her, chasing an entirely
  // different woman's number) must not be silently eaten as a "no" to this
  // one (NPC-completionist playtest, 2026-08-23 — MEET the masseuse misfired
  // onto a bkktourist encounter that had appeared in the meantime).
  bkktourist: /^(?:hi|hello|hey|sawat|wai|chat|talk|nice|friend|wait|who|from|smile|drink|coffee|money|baht|barfine|how much|price|pay|upstairs|hotel|short time|long time|come with|yes|no|nah|pass|wave|walk(?: on)?)\b/,
  jptourist:  /^(?:flirt|drink|buy|hi|hello|konnichiwa|konbanwa|cheers|join|both|girl|dancer|open|game|cool|yes|sure|nice|money|baht|barfine|how much|price|pay|deal|please|hai|why not|her|let|no|nah|pass)\b/,
  britles:    /^(?:talk(?: to)?(?: her)?|chat|alright|evening|grope|grab|touch|fondle|kiss|snog|cop a feel|hand on|money|baht|barfine|how much|price|pay|short time|long time|come with|shag|hotel|hi|hello|cheers|drink|buy|nice|respect|cool|wingman|help|which|recommend|good|game|sound|no|nah|pass|wave)\b/,
  punterwife: /^(?:grope|grab|touch|fondle|kiss|snog|cop a feel|hand on|spank|money|baht|barfine|how much|price|pay|short time|long time|come with|hi|hello|nice|respect|cheers|congrat|married|wife|husband|talk|chat|cool|lovely|good|no|nah|pass|wave)\b/,
};
// A real top-level command word (not a bare answer): used only to decide whether
// a soft encounter should let the line through.
function _isRealCommand(v) {
  return /^(go|n|s|e|w|ne|nw|se|sw|in|out|up|down|enter|travel|goto|ride|motosai|bus|buy|drink|eat|talk|ask|tell|tip|give|quests|journal|watch|light|check|message|send|look|l|examine|x|wait|sleep|map|time|hint|who|blackbook|contacts|phone|photo|play|rematch|sell|feed|pet|wai|dance|sing|order|read|inventory|i|inv|diagnose|score|call|follow|shower|withdraw|atm|balance|borrow|repay|work|books|draw|complain|report|column|owl|paper|tv|scores|lottery|weather|standing|rep|gallery|share|charge|barfine|flirt|kiss|spank|fondle|contact|number|meet|name|rename|accept|abandon|drop|take|get|open|close|use|search|smell|listen|pray|swim|throw|stand|ring|bell|help|checkout|toggle|undo|restart|reset|again|g|hug|good|stay|heel|whistle|come|bet|wager|beg)$/.test(v);
}
let _lastCmd = ""; // for AGAIN/G — deliberately not serialized; repeats die with the session
let _prevCmd = ""; // the one before it (the SLEEP-on-waking guard: two SLEEPs in a row means it)

// ── Modal prompts + the resume redraw ──────────────────────────────────────
// doCommand routes every input through a chain of modal states, each of which
// silently swallows commands until answered: the airline choice, the hotel
// checkout desk, a live bar game, a street encounter, an unpaid fare. Each has
// a one-line prompt; these helpers are the single source of truth so the live
// prompt, the "that wasn't a valid answer" reprompt, and the resume redraw all
// read identically. See _renderResume.
function _vacationEndPrompt() {
  if (G.mode === "soi6") { _say("(PLAY AGAIN — another week on Soi 6 · SHARE — your week card.)", "dim"); return; }
  // Both options in full, every time. A man coming back to his phone ten minutes
  // later has to be able to see what he is choosing between — MOVE TO PATTAYA is
  // permanent, and the terse redraw never said so.
  _say(`VACATION ${G.vacation}: happiness ${G.happy} — ${_happyLevel(G.happy)}` +
    (G.bestHappy > G.happy ? ` (best trip so far: ${G.bestHappy})` : " (your best trip yet)"), "win");
  _say("(NEW VACATION — fly back next month. No lost wallet this time. Probably.)", "dim");
  _say("(MOVE TO PATTAYA — stop pretending you're going home. Make the move; live the sandbox.)", "dim");
}
function _checkoutPrompt() {
  const others = Object.keys(_HOTELS).filter(k => k !== G.hotel);
  // With their nightly rates: the live list is priced, and a resume that drops
  // the prices leaves three hotel names and no way to tell them apart (round 17).
  _say("The clerk waits. (" +
    others.map(k => `${_HOTELS[k].name.toUpperCase()} — ฿${_HOTELS[k].rate}/night`).join(" · ") +
    " · or STAY.)", "dim");
}
// The driver's patience, in escalating flavors. A module-local counter (like
// _lastCmd: presentation nicety, not game state) rotates them per nag; every
// line carries the price and the (PAY <amount>) tap hint — that's the contract.
let _fareNags = 0;
function _farePrompt() {
  const baht = thaiBaht(G.pendingFare.price);
  // A chartered truck has no bench of passengers — "you are renting the
  // truck" three lines above "the whole bench of passengers has turned to
  // watch" (Malcolm, round 36). The charter waits alone.
  const lines = G.pendingFare.charter ? [
    `The driver is still waiting: “${baht}”. It is his truck and his evening, and he has both to spare. (PAY <amount> · or WALK)`,
    `He turns the engine off, which is worse than leaving it on. “${baht}, boss.” The empty truck bed says the rest. (PAY <amount> · or WALK)`,
    `“${baht}.” He lights a cigarette and looks at the road he is not driving down. (PAY <amount> · or WALK)`,
  ] : [
    `The driver is still waiting: “${baht}”. (PAY <amount>)`,
    `The driver taps the rail, twice. “${baht}, my friend.” The whole bench of ` +
      "passengers has turned to watch how this goes. (PAY <amount>)",
    `“${baht}.” He says it slower this time, the way you'd talk to the ` +
      "heat-struck. (PAY <amount>)",
    `The engine idles. The driver studies the horizon, then you, then the ` +
      `horizon again. “${baht}.” Nobody has ever not paid. Nobody is starting ` +
      "tonight. (PAY <amount>)",
  ];
  _say(lines[_fareNags++ % lines.length], "thai");
}

// After a restore (continue / undo, in main.js), redraw whatever modal prompt is
// currently gating input — otherwise the load shows only the room text while the
// hidden state eats the player's next command. ONE dispatcher over every gate in
// doCommand, in the same priority order; add a new modal state to both or the
// restore goes blind again (the class of bug that hit c4, jackpot, and saleng).
function _renderResume() {
  if (!G) return;
  // The "phone buzzed" nudge is a one-shot at arrival, so a reload with unread
  // texts loses it — re-surface the count (it otherwise only shows under SCORE).
  if (_unreadCount()) {
    _say(`📱 ${_unreadCount()} unread message${_unreadCount() > 1 ? "s" : ""} waiting (CHECK MESSAGES).`, "win");
  }
  if (G.pendingChoice === "intro") { _introPrompt(); return; }
  if (G.pendingChoice === "vacation_end") { _vacationEndPrompt(); return; }
  if (G.pendingChoice === "checkout") { _checkoutPrompt(); return; }
  if (G.pendingChoice === "tanfavour") { _tanFavourPrompt(); return; }
  if (G.pendingChoice === "bkkdinner") { _bkkDinnerPrompt(); return; }
  if (G.pendingChoice === "bkkbill") { _say("The bill sits in its black folder, his card on top. (GRAB · LET)", "dim"); return; }
  if (G.pendingChoice === "cham") { _chamPrompt(); return; }
  if (G.pendingChoice === "chamgift") { _chamGiftPrompt(); return; }
  // a partner's question still on the table: the cue, so a keyboard player knows "1" is an answer
  if (G.convoQ && typeof _convoActive === "function" && _convoActive() === G.convoQ.id) {
    // re-ask it: the cue alone is useless if the question is up the scrollback
    if (G.convoQ.q) _say(G.convoQ.q);
    G.convoQ.shown = false; _convoPrompt(G.convoQ.id);
  }
  if (G.pendingChoice === "synjob") { _synPrompt(); return; }
  if (G.pendingChoice === "shift") { _shiftPrompt(); return; }
  if (G.pendingChoice === "partner") { _partnerPrompt(); return; }
  if (G.pendingChoice === "affair") { _affairPrompt(); return; }
  if (G.pendingChoice === "affaircrisis") { _affairCrisisPrompt(); return; }
  if (G.pendingChoice === "sellbar") { _sellBarPrompt(); return; }
  if (G.game) { _renderGame(); return; }
  if (G.pendingEnc) { _renderEncounter(); return; }
  if (G.pendingBf) { _bfPrompt(); return; }
  if (G.pendingSoapy) { _soapyPrompt(); return; }
  if (G.pendingFare) { _farePrompt(); return; }
}

// ── The German-phrase Easter egg ─────────────────────────────────────────────
// An English-speaking punter trying out schoolbook German at one of the three
// German-speaking ladies (Mercedes/Jenny/Chompoo) gets a witty brush-off, IN
// character, telling him to stick to English. Typed-only flavour; EN players only
// (a de-player IS German — he just talks to her, no gag). One-off per attempt.
const _GERMAN_TRY = new RegExp("\\b(" + [
  "hallo", "guten\\s+(tag|morgen|abend)", "wie\\s+geht('?s|\\s+es\\s+dir)?",
  "ich\\s+(liebe|mag|heiße|heisse|bin|möchte|moechte|will|komme|spreche)",
  "sprichst\\s+du", "sprechen\\s+sie", "kannst\\s+du", "auf\\s+wiedersehen",
  "tschü(ss|ß)", "danke(\\s+schön|\\s+schoen)?", "bitte(\\s+schön|\\s+schoen)?",
  "prost", "entschuldigung", "wunderbar", "sehr\\s+(schön|schoen|gut)",
  "mein\\s+schatz", "schatz", "liebling", "schätzchen", "nein", "jawohl",
  "natürlich", "natuerlich", "ich\\s+heiße", "wie\\s+heißt\\s+du", "möchtest\\s+du",
].join("|") + ")\\b", "i");
const _GERMAN_LADIES = ["mercedes", "jenny", "chompoo"];
function _germanLadyHere() {
  const here = _npcsHere();
  return _GERMAN_LADIES.find(id => here.includes(id)) || null;
}
const _GERMAN_QUIP = {
  // Mercedes — dry, Taitch-English, takes the scissors from the child
  mercedes: [
    n => "«Bitte. Genug.» She lifts one flat hand before you can finish. \"Two word from " +
      "the airplane magazine and suddenly we are cousin. No, tilac. Your German hurt me a " +
      "little. English — you do it much less bad.\"",
    n => "Mercedes lets you get all the way to the end, then does not applaud. \"Sehr... " +
      "brave,\" she says, the way you'd say it about furniture built without the picture. " +
      "\"English, na. For both of us.\"",
    n => "\"Nein.\" Kind, final, the tone you'd use taking scissors off a child. \"You keep " +
      "the German for reading the menu. We talk English, tilac — I like you too much for this.\"",
  ],
  // Jenny — warm, delighted, phrasebook-Taitch, merciful
  jenny: [
    n => "Jenny presses the back of her hand to her mouth, giggling. \"Aiyoo, your German! 😅 " +
      "So cute, so wrong. Klaus try Thai ONE time — one — I still laugh at him. Stick English " +
      "na, sweetheart.\"",
    n => "\"Oh! You try for me!\" Delighted, then merciful. \"But no. Was like three word in " +
      "a blender, tilac. English better. I keep the German for Klaus, hah.\"",
    n => "A warm, helpless laugh. \"Stop, stop — my heart! 😆 That word, I don't even know " +
      "what you did to it. English, na. You are handsome, don't ruin it.\"",
  ],
  // Chompoo — fluent, arch, grades the grammar and finds it wanting
  chompoo: [
    n => "She lets you finish, then one corner of her mouth lifts. \"Ach, Schätzchen. That " +
      "was a valiant little crime against the dative case.\" She pats your hand. \"Stick to " +
      "English — you are charming in it, and merely tragic in mine.\"",
    n => "\"Mm. Duolingo owl, four days, quit on a Tuesday?\" Not unkind — a diagnosis. " +
      "\"Adorable effort. Now say it in English, before the grammar police deport us both, Schatz.\"",
    n => "One eyebrow climbs, slowly. \"You conjugated that like a man defusing a bomb he does " +
      "not believe in.\" A slow, delighted smile. \"English, Liebling. Leave the German to the professional.\"",
  ],
};

// Verbs that cost no turn: pure readouts of state you already have. See the
// comment at the bottom of doCommand for why this matters more than it looks.
const _FREE_VERBS = new Set(["score", "time", "clock", "diagnose", "health", "verbs",
  "inventory", "inv", "i", "map", "help", "quests", "journal", "hint", "share",
  "who", "blackbook", "standing", "rep", "gallery", "photos", "album", "books",
  "takings", "identity"]);

let _rawAnswer = null; // the raw-cased line, for _convoAnswer's quote-back memory
function doCommand(input) {
  _rawAnswer = String(input == null ? "" : input);
  if (!G) newGame();
  // CTF stage 2 gate (docs/ctf.md): an obvious security probe — read off the
  // TRUE raw input, before _norm strips the quotes and braces that make it one
  // — arms the wrong-number text and then falls through to the ordinary
  // brush-off. The cover IS the answer.
  if (typeof _isProbe === "function" && typeof input === "string" && _isProbe(input)) _probeSeen();
  let raw = _norm(input);
  // The chip bar's `info…` fanout prefills a SENTINEL ("__info ") so engineComplete
  // can answer with a menu of the readout verbs instead of a prefix completion —
  // one chip slot for eleven verbs. term.js then submits "__info score", and until
  // 2026-08-24 nothing stripped the sentinel, so every item in that menu answered
  // "I didn't understand that". It had never worked (one commit in `git log -S`),
  // which left QUESTS/SCORE/STANDING/TIME/WHO/CONTACTS/GALLERY/DIAGNOSE/HINT/BOOKS
  // with no tappable route at all on a phone — the surface HELP calls the phone
  // surface (thumbs-only persona, round 17). Submitted bare, it means "I want the
  // readouts", so answer with HELP rather than nothing.
  if (/^__info\b/i.test(raw)) raw = raw.replace(/^__info\b\s*/i, "") || "help";
  if (!raw) return;
  const lower = raw.toLowerCase();
  const words = lower.split(" ");
  const [v, ...rest] = words;
  // "up" was in this filler list until 2026-07-22 (caught by e2e-mega's BFS
  // walk failing at Queen Vic's balcony AND the Thappraya strip's dongtan_beach
  // exit — both reached only via GO UP): stripped as a generic preposition, it
  // silently ate itself whenever it was the WHOLE argument, so "go up" became
  // "go " and _doGo got an empty string instead of the direction. No verb
  // actually needs "up" stripped (TAKE/PICK/GET/GRAB are already synonyms
  // without a "pick up" form) — never add it back without checking that.
  const arg = rest.filter(w => !["the", "a", "an", "to", "at", "my"].includes(w)).join(" ");
  const _room0 = G.room; // for the post-command action breadcrumb (movement inference)

  // Hidden testing code (gated by CHEATS_ENABLED in engine-core.js). Works in
  // any state, costs no turn, and is never surfaced — a typed secret only.
  if (CHEATS_ENABLED && lower === "twoweekmillionaire") {
    G.money += 2000000;
    _say(`💰 Two-week millionaire: ฿2,000,000 for testing. (฿${G.money} in pocket.)`, "win");
    return;
  }

  // Box 15 answered — the Nite Owl's personals cipher (docs/ctf.md). Same
  // unsurfaced treatment as the code above (no autocomplete, no wheel, no HELP,
  // no decoration) and the same shape: any state, no turn.
  //
  // Deliberately NOT behind CHEATS_ENABLED. That switch grants advantages and is
  // meant to ship false; this grants a line of prose and a trophy, and gating it
  // there would quietly retire the puzzle the moment the game is released.
  if (/^(i )?counted the hoots[.!]?$/.test(lower)) { _owlBox15Answer(); return; }
  // CTF stage 2's close: hash-checked, the phrase is NOT in the source (docs/ctf.md)
  if (typeof _isRabbitKnock === "function" && _isRabbitKnock(lower)) { _whiteRabbitAnswer(lower); return; }

  // the taxi ride owns input until you've said who you are
  if (G.pendingChoice === "intro") { _introAnswer(lower); return; }

  // the week is over: the airline needs an answer before anything else
  if (G.pendingChoice === "vacation_end") {
    if (G.mode === "soi6") {
      if (/^restart/.test(lower)) { G.player = null; startSoi6Mode(); return; } // RESTART re-picks identity (matches the verb everywhere else)
      if (/^share/.test(lower)) { _doShare(); return; } // the week card stays reachable through the gate
      if (/again|play|more|^yes|soi/.test(lower)) { startSoi6Mode(); return; }  // PLAY AGAIN keeps who you are
      _vacationEndPrompt(); return;
    }
    if (/^restart/.test(lower)) { newGame(); engineIntro(); return; }
    if (/^share/.test(lower)) { _doShare(); _vacationEndPrompt(); return; }
    if (/vacation|holiday|again|fly back|new/.test(lower)) { _newVacation(); return; }
    if (/move|expat|stay|pattaya|remain/.test(lower)) { _goExpat(); return; }
    _vacationEndPrompt();
    return;
  }

  // the 51% fork: hear the pitch, then commit on purpose
  if (G.pendingChoice === "partner") {
    if (/^(y|yes|ok|okay|sure|do it|agree|deal|him|her|candy|tan)/.test(lower)) { _partnerYes(); return; }
    if (/^(n|no|not|think|wait|later|hold|both)/.test(lower)) { _partnerNo(); return; }
    _say("It's the biggest yes-or-no of the whole stage; the town will wait while " +
      "you decide. (YES \u00b7 NO)", "dim");
    _partnerPrompt();
    return;
  }
  // the shift call: one a night, while you are standing your own rail
  if (G.pendingChoice === "shift") {
    if (/^(y|yes|ok|okay|sure|go on|aye|do it|let|have|get|put|write)/.test(lower)) { _shiftYes(); return; }
    if (/^(n|no|nope|leave|not|refuse|decline|bert)/.test(lower)) { _shiftNo(); return; }
    _say("It is still standing there waiting on you, which is most of what " +
      "owning a bar turns out to be.", "dim");
    _shiftPrompt();
    return;
  }
  // the staff affair: she asked the question nobody asks out loud
  if (G.pendingChoice === "affair") {
    if (/^(stay|yes|make|real|begin|her|okay|ok)/.test(lower)) { _affairYes(); return; }
    if (/^(step|back|no|not|nope|can't|cannot|don)/.test(lower)) { _affairNo(); return; }
    _say("She is still sitting on the customer side of your own bar, waiting on the " +
      "only answer that counts.", "dim");
    _affairPrompt();
    return;
  }
  // …and its crises, numbered because none of the answers is a plain yes
  if (G.pendingChoice === "affaircrisis") {
    const _cc = AFFAIR_CRISES.find(x => x.id === G.affairCrisis);
    if (_cc) {
      const _keys = [["1", "a"], ["2", "b"], ["3", "c"]].filter(([, k]) => _cc[k]);
      for (const [num, k] of _keys) {
        const o = _cc[k];
        const words = o.label.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter(Boolean);
        if (lower === num || lower.startsWith(words[0]) ||
            words.some(w => w.length > 3 && lower.includes(w))) {
          _affairCrisisAnswer(k); return;
        }
      }
    }
    _say("It isn't the kind of question that goes away for being ignored.", "dim");
    _affairCrisisPrompt();
    return;
  }
  // selling up — the door she opened, shutting behind you on a yes
  if (G.pendingChoice === "sellbar") {
    if (/^(y|yes|sell|do it|sign)/.test(lower)) { _sellBarYes(); return; }
    if (/^(n|no|not|nope|stay|keep)/.test(lower)) { _sellBarNo(); return; }
    _sellBarPrompt();
    return;
  }

  // procurement: stated, not asked
  if (G.pendingChoice === "synjob") {
    if (/^(ask|who|what|why|explain|tell)/.test(lower)) { _synWho(); return; }
    if (/^(y|yes|ok|okay|sure|fine|deal|agree|hire)/.test(lower)) { _synYes(); return; }
    if (/^(n|no|refuse|decline|nope|never)/.test(lower)) { _synNo(); return; }
    _say("Tan waits, entirely comfortable. It was not really a question.", "dim");
    _synPrompt();
    return;
  }

  // The grey Alphard under the porch light — Sao's dinner (the reverse-savior arc)
  if (G.pendingChoice === "bkkdinner") {
    if (/^(go|yes|y|ok|okay|sure|come|get in|bangkok)/.test(lower)) { _bkkGo(); return; }
    if (/^(decline|no|n|stay|sorry|not tonight|cancel)/.test(lower)) { _bkkDecline(); return; }
    _say("The grey Alphard idles under the porch light; Sao's driver checks the time. " +
      "Nobody is in a hurry but you.", "dim");
    _bkkDinnerPrompt();
    return;
  }
  // Cream gathering her bag at the Metro Beer Garden (the chameleon economy)
  if (G.pendingChoice === "cham") {
    if (/^(go|yes|y|ok|okay|sure|come|with her|let'?s go|hotel)/.test(lower)) { _chamGo(); return; }
    if (/^(not tonight|no|n|stay|sorry|decline|another time|cancel)/.test(lower)) { _chamDecline(); return; }
    _say("She has her bag on her shoulder and is waiting, not quite looking at you.", "dim");
    _chamPrompt();
    return;
  }
  // the morning after: her bus is at ten to eight, and she has asked for nothing
  if (G.pendingChoice === "chamgift") {
    const m = lower.match(/^(?:gift|give|tip|send|pay)?\s*(?:her\s*)?(?:฿|b)?(\d[\d,]*)/);
    if (m) { _chamGift(parseInt(m[1].replace(/,/g, ""), 10) || 0); return; }
    if (/^(nothing|no|none|zero|keep|goodbye|bye|let her go|don'?t)/.test(lower)) { _chamGift(0); return; }
    _say("She is by the door with the little bag, waiting a second longer than leaving takes.", "dim");
    _chamGiftPrompt();
    return;
  }
  if (G.pendingChoice === "bkkbill") {
    if (/^(grab|reach|pay|take|wallet|insist|let me)/.test(lower)) { _bkkBill(true); return; }
    if (/^(let|leave|thank|no|allow|fine|ok|okay)/.test(lower)) { _bkkBill(false); return; }
    _say("The folder sits between his card and your hand. (GRAB · LET)", "dim");
    return;
  }

  // Tan is stood at your rail with a folded slip on the bar
  if (G.pendingChoice === "tanfavour") {
    if (/^(ask|what|why|who|explain|tell)/.test(lower)) { _tanFavourAsk(); return; }
    if (/^(y|yes|ok|okay|sure|fine|deal|take|agree)/.test(lower)) { _tanFavourYes(); return; }
    if (/^(n|no|refuse|decline|sorry|nope|never)/.test(lower)) { _tanFavourNo(); return; }
    _say("Tan waits. The slip is still on the bar, and he has all night.", "dim");
    _tanFavourPrompt();
    return;
  }

  // mid-checkout: the desk is waiting on a hotel name
  if (G.pendingChoice === "checkout") {
    if (/stay|cancel|no|keep|never ?mind/.test(lower)) {
      G.pendingChoice = null;
      _say("You re-pocket the key card. The clerk re-files the folio and the " +
        "smile. Home is home.");
      return;
    }
    const pick = /sabai|palm|naklua|412/.test(lower) ? "sabai" :
      /queen|vic|balcony/.test(lower) ? "queenvic" :
      /areca|lodge|diana/.test(lower) ? "areca" :
      /metro|lk/.test(lower) ? "metropole" : null;
    if (!pick || pick === G.hotel) {
      _checkoutPrompt();
      return;
    }
    G.pendingChoice = null;
    G.hotel = pick;
    G.room = _hotelRoomId();
    _say(_HOTEL_ARRIVALS[pick], "win");
    _describeRoom(true);
    return;
  }

  // a live bar game captures every command until it ends (QUIT concedes)
  if (G.game) {
    if (lower === "q" || /^(quit|resign|concede|forfeit|leave)/.test(lower)) { _gameQuit(); _tick(); return; }
    // checking the clock, the board, or your pockets mid-game is free — it was
    // swallowed as "not a move" AND charged a turn (gambler playtest 2026-08-22)
    if (/^(time|clock)$/.test(lower)) { _doTime(); return; }
    if (/^(i|inv|inventory)$/.test(lower)) { _doInventory(); return; }
    if (/^(look|l|board)$/.test(lower)) { if (typeof _renderGame === "function") _renderGame(); return; }
    if (_gameInput(lower) !== false) _tick(); // "not a move" is free (completionist playtest: eight swallowed commands cost the last bus)
    return;
  }

  // a live encounter demands a snap reaction: the next command IS the reaction.
  // (The saleng is deliberately NOT an encounter — it's a passive room fixture,
  // see _salengTick — so it never lands here and never eats a command.)
  if (G.pendingEnc && v !== "restart") {
    // Pure OBSERVATION verbs re-show the moment instead of being spent as your
    // reaction: LOOK once accepted a tout's offer, which read as the game
    // deciding for you (desktop playtest, 2026-08-17 — 4 hits). Navigation and
    // everything else still counts as your snap answer (walking off IS one).
    // …except when the encounter's own hint offers HELP as the answer (the Tree
    // Town maze: "(HELP him look)") — then HELP is the reaction, not a manual.
    const _encHint = (typeof ENCOUNTERS !== "undefined" && ENCOUNTERS[G.pendingEnc] && ENCOUNTERS[G.pendingEnc].hint) || "";
    if (/^(look|l|examine|x|inventory|i|inv|time|diagnose|score|help|quests|journal)$/.test(v) && !arg &&
        !(v === "help" && /\bHELP\b/.test(_encHint))) {
      if (typeof _renderEncounter === "function") _renderEncounter();
      else _say("(The moment is still waiting on you.)", "dim");
      return;
    }
    const enc = G.pendingEnc;
    G.pendingEnc = null;
    // Soft pitches (a peddler, a noodle girl, a freelancer, the booking app, the
    // lost tourist) don't get to SPEND an unrelated command: a real verb that isn't
    // an answer resolves the pitch as a decline AND runs (27-night playtest: five
    // nights of QUESTS / BUY DRINK / TALK eaten as "no"). Hard encounters (police,
    // the tonic shop, the curse ritual, the barfine games) keep the snap rule.
    const softAnswer = _ENC_SOFT[enc];
    // a named exit ("alley") is walking off, which IS an answer — and the walk
    // must happen, not just the decline (Hamish, round 38)
    if (softAnswer && !softAnswer.test(lower) && (_isRealCommand(v) || (_room().exits && _room().exits[v]))) {
      // the note FIRST: with the decline prose printed before it, a man read the
      // peddler's head-shake as the answer to his BARFINE (Lionel, round 36)
      _say("(That wasn't an answer; the pitch lapses and you carry on.)", "dim");
      _ENC[enc]("no");
      doCommand(raw);
      return;
    }
    // a soft pitch (the rose seller) may decline to spend an unrelated command:
    // it lapses, and the command the player actually typed runs (playtest 2026-08-22:
    // "tip rung 100" became a wave-off and the tip never happened)
    if (_ENC[enc](lower) === "passthrough") { doCommand(raw); return; }
    _tick();
    _checkAct1();
    return;
  }

  // the barfine negotiation: the mamasan is waiting on terms. ST / LT / NO —
  // and waving money through without terms (PAY/YES/OK) is the newbie's open
  // contract, resolved by whoever's holding the ledger (see _bfResolve).
  if (G.pendingBf && v !== "restart") {
    if (/\b(robbery|expensive|too much|cheaper|discount|steep|joking|no way)\b/.test(lower)) {
      _say("The mamasan hears the tone without needing the words, and smiles like " +
        "a woman who has heard it in forty languages. \u201cMama number is mama " +
        "number, tilac.\u201d", "dim");
      _bfPrompt();
      return;
    }
    // the party barfine — bfparty's honest mirror: take her (or them) OUT
    if (/^(take|party)/.test(lower) || /\b(her|them) out\b/.test(lower)) { _bfResolve("party"); _tick(); return; }
    if (/^(st\b|short)/.test(lower)) { _bfResolve("st"); _tick(); return; }
    if (/^(lt\b|long|overnight|all night)/.test(lower)) { _bfResolve("lt"); _tick(); return; }
    if (/^(no\b|cancel|never|forget|back out|walk)/.test(lower)) {
      G.pendingBf = null;
      _say("You ease back off the ledge. The mamasan closes the ledger without " +
        "comment — no is a complete sentence here, and nobody holds it against " +
        "you. The girl is already laughing at something else.");
      _tick();
      return;
    }
    // ANCHORED to the start of the answer: an unanchored match let LOOK (contains
    // "ok"), any word ending "…ok", "fine" inside "barfine", etc. silently sign the
    // paid open contract and roll the scam table. The answer must BE one of these.
    if (/^(pay|yes|ok(ay)?|sure|fine|deal|whatever|up to you)\b/.test(lower)) {
      _bfResolve("open"); _tick(); return;
    }
    _bfPrompt(); // the negotiation eats everything else
    return;
  }

  // the soapy fishbowl: Toom is waiting on a number. A pick or NO resolves it
  // (and ticks); anything else reprompts without spending a turn (see _soapyResolve).
  if (G.pendingSoapy && v !== "restart") {
    if (_soapyResolve(lower)) _tick();
    return;
  }

  // pending fare gates everything except paying, looking, help
  if (G.pendingFare && (v === "look" || v === "l") && !arg) {
    // Two fares, two fictions. The ORDINARY fare is paid as you hop off — the
    // prose already landed you, so LOOK names the destination kerb (playtest5:
    // "don't re-print the stop you left"). The CHARTER is pre-ride — quoting
    // it at Soi Buakhao used to print "You are on the kerb at Beach Road
    // South" before a single wheel had turned (Frank, round 34) — so it names
    // the kerb underfoot.
    const _fareTo = ROOMS[G.pendingFare.dest];
    _say(_fmt("You are on the kerb at {where}, and the {who} is still leaning out of " +
      "the window waiting to be paid. Nothing about the evening continues until that " +
      "does.", { where: (G.pendingFare.charter ? _room().name : _fareTo && _fareTo.name) || "your stop",
        who: G.pendingFare.kind === "bus" ? "driver" : "piwin" }));
    _farePrompt();
    return;
  }
  // The charter's own prompt says "or WALK" — and WALK parsed to nothing, so
  // refusal was impossible and the promise was false (Frank, round 34). Only
  // the charter declines: pre-ride, nothing consumed. The bench fare below
  // stays undeclinable — you already rode; nobody has ever not paid.
  if (G.pendingFare && G.pendingFare.charter &&
      (["walk", "no", "nah", "decline", "refuse", "cancel"].includes(v) ||
       ((v === "never" || v === "forget") && /mind|it/.test(arg || "")))) {
    G.pendingFare = null;
    _say("A shrug that has seen every farang decision ever made. \"Up to you, boss.\" The " +
      "truck grumbles off up the road, and the night hands you back your own two feet.", "dim");
    return;
  }
  if (G.pendingFare && !["pay", "look", "l", "help", "i", "inventory", "say"].includes(v)) {
    _farePrompt();
    return;
  }

  // AGAIN / G — repeat the last free-form command (Infocom house rule).
  // Modal inputs above never land here, so a mid-game "g" stays a game move.
  if ((v === "again" || v === "g") && !arg) {
    if (!_lastCmd) { _say("Again what? You haven't done anything yet. Very Pattaya.", "dim"); return; }
    doCommand(_lastCmd);
    return;
  }
  _prevCmd = _lastCmd; _lastCmd = raw;

  // Standing at the keypad, a bare number IS a command — nobody types "enter"
  // at a safe. Every modal gate (intro picks, quiz answers, game moves, canned
  // replies) has already run and returned by here, so a bare digit reaching
  // this point can only mean the room's one numeric affordance.
  // Somchith's counter: GET/BOOK/RENT/TAKE/BUY (A) ROOM, KEY, SHORT TIME, PAY
  // SOMCHITH — every phrasing a man with a girl on his arm tried (Lionel, round 36)
  if (G.room === "short_time_motel" &&
      /^(?:(?:get|book|rent|take|buy|pay for|hire)\s+(?:a |the |an )?(?:room|key|air-?con room|fan room)|(?:a |the )?room|short ?time|pay\s+(?:somchith|the (?:man|counter|old man))(?:\s+\d+)?)$/.test(lower.trim())) {
    _motelRoom(); _tick(); return;
  }
  // Parting with a TAKE-HER-OUT companion before the night decides it for you:
  // GOODBYE / GOODNIGHT [name], SEND <her> HOME (the banking app answered that
  // one). Voiced when there is nobody to part with.
  if (/^(?:goodbye|good ?night|bye|see you)(?:\s+(?:to\s+)?[a-z' ]+)?$/.test(lower.trim()) ||
      /^send\s+(?:her|them|[a-z']+)\s+home$/.test(lower.trim())) {
    if (G.party && G.party.ids && G.party.ids.length) { _partyGoodbye(); _tick(); return; }
    if (/^send/.test(lower.trim())) { _say("Nobody on your arm to send anywhere. (SEND <amount> TO <name> is the banking app.)", "dim"); return; }
  }
  if (G.room === "oy_office" && !_flag("hasWallet") && /^[\d๐-๙]{1,4}$/.test(lower.trim())) {
    const n = /^\d+$/.test(lower.trim()) ? parseInt(lower.trim(), 10) : parseThaiDigits(lower.trim());
    if (n !== null && !Number.isNaN(n)) { _doSafe(n); _tick(); return; }
  }

  // Easter egg: an English-speaking punter trying German at one of the three
  // German-speaking ladies gets a witty, in-character "stick to English." A de
  // player IS German, so it never fires for him. Costs a normal turn.
  if ((!G.player || G.player.lang !== "de") && _GERMAN_TRY.test(lower)) {
    const gl = _germanLadyHere();
    if (gl) { _say(_pickVary(_GERMAN_QUIP[gl], "germanquip_" + gl)(NPCS[gl].name)); _tick(); return; }
  }

  // A live conversation's action-choice, matched EXACTLY by its label or number
  // (a chip tap submits the label), beats verb parsing — otherwise a choice like
  // "Hear him out" is eaten by the LISTEN verb before the conversation layer sees
  // it. Loose/partial typed matches still fall through to _convoResolve.
  if (_convoActive() && _convoPickChoice(lower.replace(/[,.!?]+$/, "").trim(), true)) {
    _tick(); return;
  }

  // Bigotry in the queer venues short-circuits everything else: ejection, and
  // maybe the classic fight. Checked whatever verb it's dressed as.
  if (_queerVenue() && _queerHostility(lower)) { _tick(); return; }

  if ((_DIRS[v] !== undefined || (_room().exits && _room().exits[v])) &&
      words.length === 1) {
    // bare direction — including this room's own exit keys (pub, hotel, …)
    if (_doGo(v) === false) return;            // a refused direction costs no turn
    _flushTrace(_room0); _tick(); _checkAct1(); return;
  }

  // A CHOICE THE GAME JUST PRINTED OUTRANKS A GLOBAL VERB. Mid-conversation the
  // options are rendered as tappable CAPS commands — (SWEAR YOURE NO WHITE DISH
  // MAN · PRESS HER FOR NAMES) — and a player who types one back got the SWEAR
  // verb (cursing at the street in a mamasan's face) or, for anything unmatched,
  // TRAVEL. The matcher was fine; it simply sat behind the verb switch and never
  // ran (completionist playtest, Soi 6, 2026-08-29). EXACT matches only, so a
  // loose word can still lose to a real verb and fall through to _convoResolve
  // at the bottom as before — this is the same "a printed option must do what it
  // says" rule the topic chips got in round 19.
  if (_convoActive() && _convoPickChoice(lower, true)) {
    _flushTrace(_room0); _tick(); _checkAct1(); return;
  }

  switch (v) {
    case "go": case "walk": case "head": {
      const gw = arg.replace(/^to (the )?/, "");
      // a direction alias OR one of this room's own exit keys (pub, hotel, …)
      if (!gw || _DIRS[gw] !== undefined || (_room().exits && _room().exits[gw])) _doGo(gw);
      // "go candy bar" — a place, not a direction. Route through _doEnter so a bar
      // fronting THIS block enters on the first try (its venues/exits are checked by
      // name), exactly like ENTER; _doEnter falls through to TRAVEL when not adjacent.
      else _doEnter(gw);
      break;
    }
    case "travel": case "goto": _doTravel(arg); break;
    case "midnight": _doWait("until midnight"); break; // the help hint, tapped
    case "enter": _doEnter(arg); break;
    case "look": case "l":
      // strip the preposition: "look for bottles" / "look at candy" both examine
      // the noun ("for bottles" used to reach the scenery matcher verbatim and
      // draw the between-drinks joke — desktop playtest 2026-08-17)
      if (arg && !/^(around|about|round|here)$/.test(arg)) _doExamine(arg.replace(/^(?:for|at)\s+(?:the\s+)?/, ""));
      else _describeRoom(true, true); // bare LOOK (and "look around") re-orients: the full desc, never the revisit line
      break;
    // A bare POSTER, because the room prints a tappable (POSTER) hint and a hint
    // that doesn't parse is exactly the undelivered promise the lint hunts for.
    case "poster": case "flyer":
      // Fall through to EXAMINE rather than denying flatly: a room can have a
      // poster that isn't a go-go's promo girl (the sun-bleached film poster at
      // the LK Metro mouth is a `reads` entry), and "No poster in here" would be
      // a lie told in a room that visibly has one.
      if (_hasPoster()) _doPoster();
      else _doExamine("poster");
      break;
    case "examine": case "x": case "inspect": case "search": _doExamine(arg); break;
    case "check":
      if (/^out/.test(arg)) _doCheckout();
      else if (/bal|account|atm|fund/.test(arg)) _doBalance();
      else if (/message|text|inbox/.test(arg)) _readMessages();
      else if (/phone|mobile/.test(arg)) _doPhoneScreen();
      else if (/fridge|refrigerator|mini.?bar/.test(arg)) _doFridge();
      else _doExamine(arg);
      break;
    case "phone": case "mobile": _doPhoneScreen(); break;
    case "messages": case "msgs": case "inbox": _readMessages(); break;
    case "message": case "text": case "msg": _doMessage(arg); break;
    case "contacts": case "phonebook": _doContacts(); break;
    case "who": // "who am i" → your identity; bare WHO → the black book
      if (/\bam i\b|\bi am\b/.test(arg)) { _doWhoAmI(); break; }
      _doBlackbook(); break;
    case "blackbook": case "little black book": case "ladies": _doBlackbook(); break;
    case "identity": case "me": case "self": _doWhoAmI(); break;
    case "contact": case "number":
      if (!arg) _doContacts(); // bare CONTACT reads as "show my contacts"
      else _doContact(arg.replace(/^(with |for )/, ""));
      break;
    case "send": case "transfer": case "wire": _doSendMoney(arg); break;
    case "work": case "mind": case "shift": _doWork(); break;
    case "books": case "takings": case "accounts": _doBooks(); break;
    case "draw": case "cashup": _doDraw(arg); break;
    case "quests": case "quest": case "adventures": case "journal": _doQuests(); break;
    case "accept": _doAccept(arg); break;
    case "abandon": _doAbandon(arg); break;
    case "take": case "get": case "grab": case "pick":
      if (v === "grab" && !arg) { _say(_GRAB_LINE, "dim"); break; }   // bare GRAB is the app, not the verb (Darren, round 37)
      if (/^(photo|selfie|picture|pic)\b/.test(arg)) _doPhoto(arg.replace(/^(photo|selfie|picture|pic)\s*/, ""));
      else if (arg === "bus" || arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (arg.startsWith("motosai") || arg.startsWith("bike")) _doMotosai(arg.replace(/^\S+\s*/, ""));
      else if (/^(tested|checked|test|checkup|screen)\b/.test(arg)) _doClinic();
      else _doTake(arg.replace(/^up /, ""));
      break;
    case "clinic": case "tested": case "screening": _doClinic(); break;
    case "drop": _doDrop(arg); break;
    case "inv": case "inventory": _doInventory(); break;
    case "what": case "im": case "i'm": case "have":
      if (_naturalHelp(lower)) break;
      if (_politePhrase(lower) || _convoResolve(lower)) break;
      _say(_pickVary(_HUH, "huh"), "dim"); _noteMiss("parse"); return;
    case "i":
      if (!arg) { _doInventory(); break; }
      // "i love you", "i want a beer" — not an inventory request; let the
      // polite-phrase / conversation layers have it (Alan playtest 2026-08-17)
      if (_politePhrase(lower) || _convoResolve(lower)) break;
      _say(_pickVary(_HUH, "huh"), "dim"); _noteMiss("parse"); return;
    // Meta, not play: handing the character to the other game and taking one
    // back are outside the fiction, and charging a turn of the night for them
    // is charging the player for using the door between two games (persistence
    // playtest 2026-08-23).
    case "handover": case "baton": _doHandover(); return;
    case "resume": _doResume(); return;
    case "wear": case "put on": _doWear(arg); break;
    case "read": _doRead(arg); break;
    case "talk": case "chat": {
      if (/\bband\b|\bmusicians?\b|\bguitar|\bbass|\bdrummer|\bvocalist|\bsinger/.test(arg) && _bandHere()) {
        _doBandTalk();
      } else {
        _doTalk(arg.replace(/^with /, ""), null);
      }
      break;
    }
    case "ask": {
      const m = arg.match(/^(.+?) about (.+)$/);
      if (m) { _doTalk(m[1], m[2]); break; }
      // "ask <who> <topic>" with no connective — the shape the autocomplete/wheel
      // builds when you pick a target and THEN a topic (each tap appends a word,
      // no "about" between). Split off the first word as the target when it names
      // someone here; otherwise treat the whole thing as a name (talk / not-here).
      const sp = arg.indexOf(" ");
      const who = sp > 0 ? arg.slice(0, sp) : "";
      if (who && (_findNpc(who))) _doTalk(who, arg.slice(sp + 1));
      else _doTalk(arg, null);
      break;
    }
    case "request": { // song request = ask dj or live band
      if (_findNpc("dj")) _doTalk("dj", arg);
      else if (_bandHere()) _doBandRequest(arg);
      else _say("No DJ or band here to take requests.");
      break;
    }
    case "give": case "hand": case "deliver": {
      // "to" is stripped by the filler filter, so the shape is "<item> <person>".
      // Recipients can be TWO words (Auntie Nok, Madam Oy), so a last-word-only
      // split mangled the item ("give receipt to auntie nok" -> item "receipt
      // auntie") and reported a false "not carrying" (fiddler playtest 2026-08-22).
      // Match the recipient GREEDILY from the end: the longest trailing run that
      // resolves to an NPC/patron wins; the rest is the item.
      const gw = arg.split(" ").filter(Boolean);
      if (gw.length < 2) { _say("Give what to whom? (GIVE <thing> TO <person>)"); break; }
      let split = gw.length - 1; // fallback: last word is the recipient
      for (let k = Math.min(3, gw.length - 1); k >= 1; k--) {
        const cand = gw.slice(gw.length - k).join(" ");
        if (_findNpc(cand) ||
            /^(dog|sai|krok)$/.test(cand)) { split = gw.length - k; break; }
      }
      _doGive(gw.slice(0, split).join(" ").trim(), gw.slice(split).join(" ").trim());
      break;
    }
    case "sell":
      // SELL UP / SELL BAR = the affair's door (engine-systems); everything else
      // stays Nok's bottle trade, including bare SELL on the beach
      if (/^(up|bar|the bar|the stinky|stinky)$/.test((arg || "").trim())) _doSellBar();
      else _doSellBottles(arg);
      break;
    case "buy": case "order": _doBuy(arg); break;
    case "pay": _doPay(arg); break;
    case "wai": _doWai(arg); break;
    case "say": case "speak": {
      // SAY <phrase> [TO <person>] — "to" is stripped from `arg`, so split the
      // raw rest to keep the target. Directed sorry still routes to the apology.
      const said = rest.join(" ");
      const m = said.match(/^(.*?)\s+to\s+(.+)$/);
      const phraseText = (m ? m[1] : said).trim();
      const targetW = m ? m[2].replace(/^(the|a|an)\s+/, "").trim() : "";
      if (/^(sorry|khor ?thot|kho ?thot|ขอโทษ)/.test(phraseText)) _doApologize();
      else if (/^(goodbye|bye|cheerio|see you|later|good ?night)\b/.test(phraseText) && _convoActive()) _convoEnd(); // the "say goodbye" chip
      else _doSay(phraseText, targetW);
      break;
    }
    case "apologize": case "apologise": case "apology": case "sorry":
      _doApologize(); break;
    case "leave": case "exit":
      // In a conversation LEAVE ends it (same as BYE); in a venue it walks you
      // out (playtest #10/#11). Anywhere else, the plausible-verb rule answers.
      if (typeof _convoActive === "function" && _convoActive()) { doCommand("bye"); break; }
      if (_room().exits && _room().exits.out) { _doGo("out"); break; }
      _say("Leave to where? Pick a direction — or OUT of a venue.");
      break;
    case "ride": case "catch":
      if (arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (/\bloop\b/.test(arg)) _doRideBus("loop"); // RIDE THE LOOP — the joyride
      else if (arg.startsWith("motosai") || arg.startsWith("moto") || arg.startsWith("bike"))
        _doMotosai(arg.replace(/^\S+\s*/, ""));
      else _say("Ride what — the bus or a motosai?");
      break;
    case "bus": _doRideBus(arg); break;
    case "motosai": case "moto": case "taxi":
      if (_doMotosai(arg) === false) return;   // no stand here — nothing happened
      break;
    case "light": case "flashlight": case "torch":
      if (/off/.test(arg)) _doLight(false);
      else if (/on/.test(arg)) _doLight(true);
      else _doLight(!G.lightOn); // bare LIGHT toggles
      break;
    case "turn":
      if (arg.includes("light") || arg.includes("torch") || arg.includes("flashlight"))
        _doLight(arg.includes("on"));
      else _say("Turn what?");
      break;
    case "charge": case "plug": _doCharge(); break;
    case "use":
      if (arg.includes("phone") || arg.includes("light")) _doLight(true);
      else if (arg.includes("charger")) _doCharge();
      else _say("Be more specific.");
      break;
    case "open":
      if (arg.includes("safe") && _isHotelRoom(G.room)) _doSafe();   // your own room safe (it answers in _doSafe)
      else if (arg.includes("safe")) _say("The keypad wants three digits: ENTER <digits> — Thai numerals work too.");
      else if (/fridge|refrigerator|mini.?bar/.test(arg)) _doFridge();
      else _say("It doesn't open that way.");
      break;
    case "press": case "type": case "code": _doEnter(arg); break;
    case "play": case "challenge": _doPlay(arg); break;
    // the gambler's vocabulary (2026-08-22): REMATCH / DOUBLE replay the last game
    // here; BET / WAGER <n> [ON <game>] is PLAY with a stake; stray shot-words
    // with no game on the table get a pointer instead of the conversation layer
    case "swear": case "curse": case "insult": case "abuse": case "shout": case "yell": {
      const at = arg ? _findNpc(arg) : null;
      _say(at
        ? `You say it. ${NPCS[at].name} hears the tone, not the words, and the room goes the particular ` +
          "kind of quiet that costs money. Pattaya does not do shouting — it does consequences, later, quietly."
        : "You let fly at the night in general. A piwin glances over, unimpressed; a hostess laughs, " +
          "not at the joke. This town has heard better, louder, and from men who tipped more.", "alert");
      if (at) _addHeat(1);
      break;
    }
    case "info": case "readouts": case "status": {
      // the readout index — a phone's route to the verbs that live only in HELP
      // (thumbs-only playtest 2026-08-22). Every entry is a parenthesised CAPS
      // hint, so each one taps; the info… chip fans out the same list.
      _say("What you can check, any time:", "dim");
      _say("  (QUESTS) what's on the books · (HINT) the next step · (TIME) the clock and tonight's prices", "dim");
      _say("  (WHO) your black book · (CONTACTS) the phone · (GALLERY) your photos · (STANDING) how the soi reads you", "dim");
      _say("  (DIAGNOSE) the body · (SCORE) สนุก · (MAP) the lay of the land · (INVENTORY) your pockets" +
        (G.stage === "expat" ? " · (BOOKS) the bar's night" : "") +
        (G.mode === "soi6" ? " · (SHARE) your week card" : ""), "dim");
      break;
    }
    case "money": case "cash": case "wallet": case "pocket":
      if (v === "cash" && arg) { _nontCash(arg); break; }   // CASH <amount> is Nont's verb; bare CASH stays the pocket readout
      _say(_fmt("฿{m} in your pocket" + (_flag("act1Done") ? ", ฿{b} in the account" : "") + ".",
        { m: _num(G.money), b: _num(G.bank || 0) }), "dim");
      if (_flag("act1Done")) _say("(WITHDRAW at any ATM · CHECK BALANCE · the daily cap is real.)", "dim");
      break;
    case "bribe": case "backhander": case "grease": {
      // the one verb a rich man certainly types, and it didn't parse
      const t = arg ? (_findNpc(arg)) : null;
      _say(t
        ? `You start to make the offer, and ${NPCS[t].name} lets you get about half of it out. ` +
          "Money moves in this town constantly and never like that — it goes through a mamasan, a fine, a " +
          "round for the house, a favour returned later. Handed over naked as a bribe, it insults everyone " +
          "in earshot, including you."
        : "Not like that. Money does move things here — through a fine, a round, a mamasan, a favour owed " +
          "later — but a farang holding out cash and saying the quiet part is a farang with a story about " +
          "him already circulating. (TIP · BUY DRINK · RING BELL are how it's actually done.)", "alert");
      break;
    }
    case "beg": case "panhandle": case "cadge": {
      // the broke man's most-typed verb (broke playtest 2026-08-22): voiced, and
      // pointed at the real ways back — never a handout
      _say(_pickVary([
        "You try it — the hand half out, the face arranged. The soi looks straight through you: a farang " +
          "begging is a thing it has decided not to see. A piwin says, not unkindly, “Sell bottle, boss. Auntie at Jomtien Soi 7, five baht.”",
        "Nobody gives. This town runs on the other direction of money, and a farang with his hand out " +
          "breaks a rule too deep to name. A hostess pats your arm: “You have ATM, na. You have bank. We don't.”",
        "You ask, and get the look Pattaya keeps for that: pity with no purchase in it. The ways back are the ones you know — " +
          "the ATM, glass to Auntie Nok, or the lady at Neon Paradise who lends at a price.",
      ], "beg"), "dim");
      break;
    }
    case "rematch": case "double": {
      const lg = G.lastGame;
      if (!lg) { _say("Nothing to rematch yet — PLAY something first. (PLAY CONNECT 4 · PLAY JACKPOT · PLAY POOL)", "dim"); break; }
      if (lg.room !== G.room) { _say(`The last game was ${_barName(lg.room) ? "at " + _barName(lg.room) : "elsewhere"} — this bar has its own board. (PLAY …)`, "dim"); break; }
      const stake = v === "double" ? Math.max(lg.stake * 2, 10) : lg.stake;
      const word = { c4: "connect 4", jp: "jackpot", pool: "pool", kp: "killer", darts: "darts", quiz: "quiz" }[lg.type] || "connect 4";
      if (lg.type === "quiz") { _say("The quiz doesn't do rematches — one round per bar per night.", "dim"); break; }
      _say(v === "double" ? `(Double or nothing: ฿${stake} on the next one.)` : "(Same again.)", "dim");
      _doPlay(word + " " + stake); break;
    }
    case "bet": case "wager": case "stake": case "gamble": {
      const n = (arg.match(/\d+/) || [])[0];
      const game = (arg.match(/\b(connect ?4|connect four|jackpot|dice|pool|killer|darts)\b/) || [])[1];
      if (game) { _doPlay(game + (n ? " " + n : "")); break; }
      if (n && G.lastGame && G.lastGame.room === G.room) { doCommand("rematch"); break; }
      _say("Bet on what? The bars take a stake at the board, not the bar. (PLAY CONNECT 4 <stake> · PLAY JACKPOT <bet> · PLAY POOL · PLAY DARTS)", "dim");
      break;
    }
    case "shot": case "power": case "safety": case "flip":
      if (!G.game) { _say("No game on the table — PLAY first.", "dim"); break; }
      _gameInput(lower); break;
    case "flirt": _doSocial("flirt", arg); break;
    case "compliment": case "praise": _doTalkAct("compliment", arg); break;
    case "joke": case "quip": case "banter": _doTalkAct("joke", arg); break;
    case "tease": case "rib": _doTalkAct("tease", arg); break;
    case "kiss": case "snog": case "smooch": _doSocial("kiss", arg); break;
    case "spank": _doSocial("spank", arg); break;
    case "fondle": case "grope": _doSocial("fondle", arg); break;
    case "ring": case "bell": _doBell(); break;
    case "barfine": case "bf": _doBarfine(arg.replace(/^with /, "")); break;
    case "meet": case "visit": _doMeetOffShift(arg); break;
    case "massage": case "nuad": case "nuat": _doMassage(arg); break;
    case "special": case "happyending": _doMassage("special"); break;
    case "soapy": case "fishbowl": _doSoapy(); break;
    case "eat": _doEat(arg); break;
    case "checkout": case "check-out": _doCheckout(); break;
    case "sleep": case "bed": case "crash":
      if (!_flag("act1Done")) _say("Sleep where? The beach already had you once tonight. Get the wallet, get the room.");
      // a SLEEP tapped right after waking burns the whole night with no warning
      // (mobile playtest 2026-08-22) — once per evening, the bed asks if you mean it
      else if (G.room === _hotelRoomId() && G.nightTurn < 10 && G.sleepWarnDay !== G.day &&
               G.wakeTurn != null && G.turns - G.wakeTurn <= 1) {
        // The _prevCmd test that used to sit here ("don't warn if he just typed
        // sleep") was both redundant and harmful: sleepWarnDay already lets a
        // genuine confirmation through, and the SLEEP THAT ENDED THE PREVIOUS
        // NIGHT counted as the previous command — so the new night's sleep was
        // read as confirming a warning nobody had given, and a double-tap ate a
        // whole night. A persona lost a seventh of a seven-night daily to one
        // keystroke, and night one TRAINS the double-tap, because the first
        // SLEEP is swallowed by the app-girl modal (round 24, Jojo).
        G.sleepWarnDay = G.day;
        _say(`It's ${_clockStr()} — the neon's barely warm. Sleep now and the whole night goes with it. ` +
          "(SLEEP again if you mean it, or go OUT.)", "dim");
        return;
      }
      else if (G.room === _hotelRoomId()) { _endNight("sleep"); return; }
      // one flight below your own bed (the pub under the Queen Vic, a lobby):
      // turning in should just walk you up, not scold you for being close.
      else if (_room().exits && _room().exits.up === _hotelRoomId()) {
        _say("You climb the stairs to your room and fall into bed.");
        G.room = _hotelRoomId();
        _endNight("sleep"); return;
      }
      else _say(`Your bed's up in your room at the ${_HOTELS[G.hotel].name} — get there and SLEEP.`);
      break;
    case "tv": _doTv(); break;
    case "column": case "owl": case "niteowl": _doColumn(); break;
    case "weather": case "forecast": _doWeather(); break;
    case "scores": case "football": case "footy": case "match": _doScores(); break;
    case "lottery": case "lotto": _doLottery(); break;
    case "drink": case "sip": _doDrink(arg); break;
    // bare beer nouns are taps waiting to happen — KISS's menu advertises
    // ('BIG BEER'), and a tapped noun must never dead-end in "didn't understand"
    case "beer": case "chang": case "leo": case "singha": _doBuy("beer"); break;
    case "big": case "large":
      if (/beer|chang|leo|singha/.test(arg)) { _doBuy("beer"); break; }
      _say("Big what? The night is full of options."); break;
    case "diagnose": case "health": _doDiagnose(); break;
    // DEMAND WALLET at Madam Oy fell through to the conversation layer, which
    // treated the whole line as an ASK and echoed "· You asked Madam Oy about
    // demand wallet" — a parser leak where a voiced refusal belongs (Declan,
    // round 35, whose whole persona was refusing to ask nicely). Nobody in
    // this town answers to a demand; the line says so instead of pretending
    // the verb was a question.
    case "demand": case "insist": case "order":
      if (v === "order" && !/\b(wallet|money|him|her|them|answer)\b/.test(arg)) {
        _doBuy(arg); break;                      // ORDER A BEER is a purchase
      }
      _say(_pickVary([
        "You put it as a demand. The room takes a small, collective step back from the " +
          "idea, and whoever you aimed it at simply waits for you to try a different verb. " +
          "This town has never once answered to one.",
        "Demanding, in this town, is a thing that happens to farang — it is not a thing " +
          "they do. The silence that follows is polite, and total, and lasts until you " +
          "find another way to ask.",
        "You make it an order. Nobody here takes orders from a man with no wallet, and " +
          "very few from a man with one. The moment passes; the night resumes without you.",
      ], "demand"), "dim");
      break;
    case "kill": case "attack": case "hit": case "punch": case "fight": case "strangle":
      _doViolence(arg); break;
    case "xyzzy": case "plugh": case "pray": _doMagic(v); break;
    case "hello": case "hi": case "howdy": _doHello(arg); break;
    case "smell": case "sniff": _doSmell(); break;
    case "listen": case "hear": _doListen(); break;
    case "bolt": case "uber": case "grabcar": case "grabtaxi":
      _say(_GRAB_LINE, "dim");
      break;
    case "swim": _doSwim(); break;
    case "dance": _doDance(); break;
    case "sing": _doSing(); break;
    case "sit": case "sit down": {
      // The soi invites it constantly ("Sit. Talk to Candy.") — it must never
      // dead-end in didn't-parse (both playtests, 2026-08-17). Flavor only.
      if (_inBar()) _say(_pickVary(_SIT_LINES.bar, "sitbar"));
      else if (/beach/i.test(_room().name)) _say(_pickVary(_SIT_LINES.beach, "sitbeach"));
      else _say(_pickVary(_SIT_LINES.street, "sitstreet"));
      break;
    }
    case "toilet": case "loo": case "wc": case "restroom": case "bathroom":
    case "pee": case "piss": case "urinate": {
      // A beer-bar sim for gentlemen of a certain age: this WILL be typed.
      if (_inBar()) _say(_pickVary(_TOILET_LINES.bar, "wc"));
      else if (_room().seven) _say("The 7-Eleven's is staff-only and the staff know every trick in the book. There'll be a bar along presently — buy a beer, use the gents; that's the social contract.");
      else _say(_pickVary(_TOILET_LINES.street, "wc"));
      break;
    }
    case "where": {
      // "where is rainbow girls", typed mid-hunt, deserves better than didn't-parse.
      if (/^(am i|is this|are we)\b/.test(arg || "")) { _describeRoom(true, true); break; }   // "where am I" is LOOK (Bronwyn, round 39)
      const q = (arg || "").replace(/^(?:is|are)\s+(?:the\s+)?/, "").trim();
      if (!q) { _say("Wherever you are, that's where you are. (MAP for the town, TRAVEL for the places you know.)"); break; }
      const known = _travelDests().find(id => {
        const r2 = ROOMS[id];
        return (r2.bar && _pnm(r2.bar).includes(_pnm(q))) || _pnm(r2.name).includes(_pnm(q));
      });
      if (known) { _say(`${_barName(known)} — you know the way. (TRAVEL ${(_barName(known) || "").toUpperCase()})`); break; }
      _say("You'd have to ask around — the bar ladies know where everything is, and half of why. (ASK <someone> ABOUT <place>, or MAP.)");
      break;
    }
    case "show": {
      // "Show me you were even here last night" — SHOW must not be eaten as an
      // ASK topic (desktop playtest, 2026-08-17). The receipt IS the proof beat;
      // anything else routes through GIVE, whose refusals are voiced. Parse the
      // same shape GIVE does ("to" is already stripped by the filler filter:
      // "<item words> <person>") — the first version passed the WHOLE string as
      // _doGive's itemWord and crashed on npcWord.toLowerCase() (veteran
      // playtest, 2026-08-17: the session's only pageerror).
      if (/receipt/.test(arg || "") && G.itemLoc.receipt === "inventory") { _doRead("receipt"); break; }
      const sw = (arg || "").split(" ").filter(Boolean);
      if (sw.length >= 2) _doGive(sw.slice(0, -1).join(" ").trim(), sw[sw.length - 1]);
      else if (sw.length === 1) _doGive(sw[0], "");
      else _say("Show what, to whom? (SHOW <thing> TO <someone>)");
      break;
    }
    case "throw": case "toss": case "chuck": case "fling":
      // THROW DARTS at a board starts the 501 game; THROW COVER / PASTIE [AT <name>]
      // is the ceiling game; anything else keeps the old flavor refusal.
      if (/\bdarts?\b/.test(arg)) { if (_room().darts) _doPlay("darts"); else _say("No dartboard here to throw at."); }
      else if (/\b(cover|pastie|pasty|nipple|sticker)s?\b/.test(arg))
        _doThrowCover(arg.replace(/\b(nipple|cover|pastie|pasty|sticker)s?\b/g, "").replace(/^\s*at\s+/, "").trim());
      else _say(_MISC_VERBS["throw"]);
      break;
    case "jump": case "climb": case "push": case "pull":
    case "knock": case "shout": case "yell":
      // "Nobody knocks in this town" is a good line and stays the rule — but a
      // man standing outside the ONE door that would open for him, knocking on
      // it, is the exception the rule exists to make land. He tried exactly
      // this at exactly that door (Gerry, round 34). It gets him the same
      // answer the front always gives: not here, round the back.
      if (v === "knock" && _lockInDoorHere()) {
        _say("You knock — nearly an eccentric act in this town, and on this door " +
          "tonight, very nearly the right one. It opens four inches. \"Ssst. Not the " +
          "front.\" A flick of the eyes down the side of the building, and it shuts.", "dim");
        _say("(ROUND THE BACK.)", "dim");
        break;
      }
      _say(_MISC_VERBS[v === "yell" ? "shout" : v]); break;
    // ROUND THE BACK — the alley door of a Darkside lock-in that knows you.
    // Deliberately its own small verb rather than an exit: the alley isn't a
    // place, it's a piece of knowledge, and only a man who has been inside
    // once has it. Three surfaces: this case, the CAPS hints the front door
    // and the street print, and _COMPLETE_VERBS.
    case "round": case "back": case "backdoor": case "alley":
      if (/\bback\b|\balley\b|\bside\b|\bdoor\b/.test(arg) || v !== "round") {
        const bar = _lockInDoorHere();
        if (!bar) {
          _say("You have a look down the side of the building. Bins, a coil of hose, an " +
            "aircon unit dripping on the concrete, and a locked steel door that has " +
            "never once opened for anybody who had to look for it.", "dim");
          break;
        }
        _say("Down the side, past the bins and the dripping aircon, there's a steel door " +
          "with no handle on the outside and a bare bulb over it. You barely touch it " +
          "before it goes, which means somebody was already listening for you.", "win");
        _say("\"Aaah. YOU.\" It shuts behind you on the same flat sound you first heard " +
          "from the inside, and the music is already going and the aircon is already too " +
          "cold. Nobody asks you for anything at the door — that was settled the last " +
          "time. The Darkside is closed. This is the other thing, and tonight you did " +
          "not have to buy your way into it.", "win");
        _lockInBegin(bar);
        // the welcome pays once per bar per night — the beat is arriving, not
        // the door (see the OUT handler for what this closes)
        const _welcomed = (G.soc.backDoorTonight = G.soc.backDoorTonight || {});
        if (!_welcomed[bar]) { _welcomed[bar] = true; _addHappy(2); }
        _arriveAt(bar);
        break;
      }
      _say(_pickVary(_HUH, "huh"), "dim"); _noteMiss("parse"); _traceCancel();
      return;
    case "touch": case "feel": case "taste": case "lick": case "tell":
    case "verbose": case "brief": case "restore": case "load": case "move":
    case "close": case "shut": {
      // a live conversation CHOICE wins over the museum-verb refusal — Kesinee's
      // own "(TELL HER BERT SENT YOU)" chip was being answered by the TELL
      // lecture, wedging the White Dish chain (critic playtest, 2026-08-22)
      const _cb = lower.replace(/[,.!?]+$/, "").trim();
      if (typeof _convoPickChoice === "function" && _convoActive() && _convoPickChoice(_cb)) break;
      _say(_MISC_VERBS[{ feel: "touch", lick: "taste", brief: "verbose", load: "restore", shut: "close" }[v] || v]);
      break;
    }
    case "balcony": case "rail":
      if (G.room === "qv_room") _doWatchSoi();
      else _say("No balcony here. Yours is the one over the Queen Vic — head UP to your room and WATCH SOI from the rail.");
      break;
    case "watch":
      if (G.room === "qv_room" && (!arg || /soi|street|balcony|show|chaos|girls|parade/.test(arg)))
        _doWatchSoi();
      else if (G.room === "queen_vic" && (!arg || /soi|street|window|glass|outside|show|chaos|girls|parade/.test(arg)))
        _doWatchPubSoi();
      // …and the street between them: "Beach Road (foot of Soi 6)" says in its
      // own prose that you can catch the sunset from either corner and watch the
      // checkpoint just south of the junction, and both verbs refused it on the
      // spot while working from inside either bar (Malcolm, round 36).
      else if ((G.room === "blue_dog" || G.room === "stinky_bar" || G.room === "beach_rd_n") && (!arg || /police|road|show|shakedown|bike|checkpoint|sunset|bay|sea|view|sun/.test(arg)))
        _doWatchJunction(arg);
      else if ((G.room === "soi6_mid" || G.room === "sunset_rail" || G.room === "bay_watch" || G.room === "sandy_toes") && (!arg || /soi|street|parade|people|show|girls|circus|watch/.test(arg)))
        _doWatchParade();
      else if (G.room === "peacock_cabaret" && (!arg || /drag|show|cabaret|revue|queen|stage|dance|petch|mala/.test(arg)))
        _doWatchDrag();
      else if (G.room === "buddha_hill" && (!arg || /bay|view|sunset|sea|sun|buddha|city|coast|below|hill|water/.test(arg)))
        _doWatchBuddha();
      // the promenade said "no sea view from here" to a man stood between the
      // road and the sand (Lionel, round 36) — any beach or the walk beside it
      else if ((ROOMS[G.room].water || G.room === "promenade" || (/beach/.test(G.room) && !/beach_rd|_rd\b/.test(G.room) && !ROOMS[G.room].bar)) &&
          (!arg || /sunset|bay|sea|view|sun\b|water|waves?|horizon|boats?/.test(arg)))
        _say(_pickVary(_WATCH_SEA, "watchsea"));
      else if (!arg || /tv|news|television/.test(arg)) _doTv();
      else if (/police|checkpoint|shakedown/.test(arg))
        _say("No checkpoint from here — that's the junction outside the Blue Dog or the Stinky Pinky, on Beach Road. (WATCH POLICE, once you're there.)");
      else if (/sunset|bay|sea|view|sun\b/.test(arg))
        _say("No sea view from here. The bay opens up at the Blue Dog/Stinky Pinky junction, or from Buddha Hill. (WATCH SUNSET.)");
      else if (/drag|cabaret|revue|queen|petch|mala/.test(arg))
        _say("No stage here — the drag revue is at the Peacock Cabaret. (WATCH DRAG, once you're there.)");
      else if (/soi|street|parade|chaos|girls\b/.test(arg))
        _say("No street show to watch from here — try your balcony at the Queen Vic, the pub below it, or one of Soi 6's rails. (WATCH SOI.)");
      // an unrecognized target got the same flat joke everywhere in the game
      // (verb-auditor playtest 2026-08-22: HELP advertises four room-specific
      // WATCH modes, and every wrong-room attempt fell to one placeholder line
      // instead of pointing at the right venue, the way BALCONY does).
      else _say("You watch. It watches back. Pattaya. (Specific views need the right spot — WATCH POLICE, WATCH SUNSET, WATCH SOI, WATCH DRAG, or bare WATCH TV.)");
      break;
    case "wait": case "z": _doWait(arg); break;
    case "time": case "clock": _doTime(); break;
    case "tip": _doTip(arg); break;
    case "wave": _doWave(arg); break;
    case "map": _doMap(); break;
    case "exits": case "out?": _doExits(); break;
    case "photo": case "selfie": case "photograph": case "snap": _doPhoto(arg); break;
    case "gallery": case "photos": case "album": _doGallery(); break;
    case "menu":
      // At the Vic the card is generated, not authored: prices come from the
      // constants and the list is _qvMenu() itself, so READ MENU can never
      // advertise a dish the till refuses (the afford-audit defect class).
      if (G.room === "queen_vic") { _qvCard(); break; }
      _doRead("menu"); break; // the laminated card, by its own name
    case "stop": case "unsubscribe": _doJokeStop(); break;
    case "reply": _doJokeReply(); break;
    case "call": case "dial": _doCall(arg); break;
    case "share": _doShare(); break;
    case "follow": _doFollow(arg); break;
    // The keypad answers to the two things a player actually types at a safe.
    // ENTER <digits> was the only route, so SAFE 719 — and a bare 719 — fell
    // into "I didn't understand that" at the climax of the opening quest.
    case "safe": case "keypad": case "code": case "pin": {
      const n = /^\d+$/.test(arg) ? parseInt(arg, 10) : parseThaiDigits(arg.replace(/\s/g, ""));
      if (n === null || Number.isNaN(n)) { _say("Three digits, on the keypad. (ENTER <digits>)"); break; }
      _doSafe(n); break;
    }
    case "shower": case "wash": _doShower(); break;
    case "smoke": case "cigarette": case "ciggy": _doSmoke(); break;
    case "withdraw": case "withdrawal": case "withdrawl": _doWithdraw(arg); break;
    case "atm": _doAtmVerb(); break;
    case "balance": _doBalance(); break;
    case "report": case "file": _doReport(arg); break;
    case "complain": _doComplain(); break;
    case "cheers": case "toast": case "chon": _doCheers(); break;
    case "tao": case "taorai": _doTaoRai(); break;
    // A standing loan has to be readable. With ฿402,500 outstanding and the
    // cousins collecting every dawn, typing LOAN answered "Nobody here is
    // lending" — the borrow path never consulted G.loan, SCORE carries no debt
    // line, and there was no DEBT verb, so a player who missed one dawn message
    // had no way to learn what he owed (debt playtest 2026-08-24).
    case "debt": case "debts": case "owe": case "owed": case "balance owed":
      _doDebt(); return;
    case "loan":
      if (G.loan) { _doDebt(); return; }
      _doBorrow(arg); break;
    case "borrow": _doBorrow(arg); break;
    case "repay": case "payback": _doRepay(arg); break;
    case "hire": case "off": _doHire(arg); break;
    case "pet": case "stroke": _doPet(arg); break;
    // SHAKE HAND fell through to the bare parse-miss (Marcus, round 34 — a
    // proud man offering the one respectful gesture he owns). The wai note is
    // cultural fact, not a lecture: hands are for closing deals, wais for
    // everything else, and nobody here is offended either way.
    case "shake": case "handshake":
      if (/\bhead\b/.test(arg)) { _say("You shake your head. The town, collectively, has seen worse objections."); break; }
      _say("You offer a hand. It gets taken, warmly enough — though around here a " +
        "handshake is what you close a deal with; everything else runs on the wai and " +
        "the nod. Nobody minds. They file you under farang and pour on.", "dim");
      break;
    case "hug": case "cuddle": case "scratch": case "ruffle": case "fuss":
      if (G.dog && (!arg || _isDogWord(arg) || /\bdog\b|\bhim\b/.test(arg))) { _doPet("dog"); break; }
      if (!arg) { _say("Hug who? The soi is affectionate but not that affectionate."); break; }
      _doSocial("kiss", arg); break;
    case "good": // GOOD BOY / GOOD DOG — else "good evening" and friends go to the courtesy layer
      if (G.dog && /\b(boy|dog|lad|girl)\b/.test(arg)) { _dogPraise(v); break; }
      if (_politePhrase(lower) || _convoResolve(lower)) break;
      _say(_pickVary(_HUH, "huh"), "dim"); _noteMiss("parse"); return;
    case "stay": case "heel": case "whistle": case "come":
      if (G.dog) { _dogPraise(v); break; }
      _say(v === "whistle" ? "You whistle. A soi dog on the far kerb looks up, files you under 'no', and lies back down."
        : "There's nobody here who takes that kind of instruction from you.", "dim");
      break;
    case "feed": _doFeedDog(arg); break;
    // NAME is the dog verb, but it is also a live TOPIC on a man whose whole
    // secret is his name — and a playtester following Pete's own "(ASK PETE
    // ABOUT THE NAME)" typed the bare word and was told he hasn't got a dog.
    // A verb outranks a bare topic by design (see the topic-routing note), so
    // this yields only when the verb has nothing to do: no dog, no argument,
    // and the partner you are mid-conversation with has that very topic.
    case "name": case "rename":
      if (!arg && !G.dog && _convoTopicHere("name")) { _doTalkBody("", "name"); break; }
      _doNameDog(arg); break;
    case "haggle": case "bargain":
      _say("Nobody's quoting you a price right now. Save it for the man with the " +
        "display board of watches.");
      break;
    case "score": _doScore(); break;
    case "rep": case "reputation": case "standing": _doRep(); break;
    // The natural guess for a player who has just been told he is inside
    // somebody's web of favours — and it dead-ended in "that didn't parse",
    // against the house rule that a plausible verb always gets a voiced answer
    // (insider playtest 2026-08-23). Faction standing has no readout by design
    // (it is felt, not scored); say so, and point at the two that do.
    case "factions": case "faction": case "alignment": case "syndicate":
      _say("Nobody keeps a scoreboard on that, and the people who would never " +
        "tell you the number. What you can read is your STANDING on the soi, and " +
        "— if you have a bar of your own — what the arrangement is costing you " +
        "on the supply line, which is in the BOOKS.");
      break;
    case "hint": case "hints": _doHint(); break;
    case "help": case "?": case "verbs": _doHelp(v === "verbs" ? "more" : arg); break;
    case "quit": case "end": case "logout": _doQuit(); break;
    case "reset":
    case "restart": {
      // RESTART = start over from character creation, IN THE CURRENT MODE. Was
      // beach-only (newGame resets mode to null), which wrongly dropped a Soi 6
      // challenge player onto the beach/Act One. Clearing identity re-runs the taxi
      // intro; keep the Act One record + hint unlock on the full-game path.
      if (G.mode === "soi6") { // re-pick + fresh Soi 6 week — the DAILY stays the daily (replayer playtest 2026-08-22)
        const daily = G.dailySeed ? { seed: G.dailySeed, dailyId: G.dailyId } : undefined;
        G.player = null; startSoi6Mode(daily); return;
      }
      const b = G.act1Best || 0, t = G.act1Tries || 0; newGame(); G.act1Best = b; G.act1Tries = t; engineIntro(); return;
    }
    default:
      // bare Thai phrase typed directly (polite particles allowed)
      if (matchThaiPhrase(lower) || matchThaiPhrase(_stripPolite(lower))) { _doSay(_stripPolite(lower) || lower); break; }
      // "sawatdee fon" — a greeting with a trailing NAME, typed without the SAY
      // verb or "TO": the whole string never matches a phrase, so this fell
      // through to the conversation layer and misfired on whoever was last
      // talked to, not the person actually named — Fon's own Thai-greeting
      // gate was unreachable this way (NPC-completionist playtest 2026-08-22).
      {
        const _w = lower.trim().split(/\s+/);
        if (_w.length >= 2) {
          const _last = _w[_w.length - 1].replace(/[.,!?]+$/, "");
          const _who = _findNpc(_last);
          if (_who) {
            const _phrase = _w.slice(0, -1).join(" ");
            if (matchThaiPhrase(_phrase) || matchThaiPhrase(_stripPolite(_phrase))) {
              _doSay(_stripPolite(_phrase) || _phrase, _last);
              break;
            }
          }
        }
      }
      // a Thai line the parser can read becomes the English command; other Thai is voiced, not "didn't understand"
      if (/[\u0E00-\u0E7F]/.test(lower)) {
        const en = _thaiToCmd(lower);
        if (en) { _say(`(เข้าใจ — ${en})`, "dim"); doCommand(en); return; }
        _say("(The soi reads a little Thai — ซื้อ, ไป, ดู, น้ำ, เบียร์, เท่าไหร่, สวัสดี, ขอบคุณ — but not that one yet. " +
          "Try it in English, or tap a Thai word for the card.)", "dim");
        return;
      }
      // conversation layer: a bare name opens a chat; while one's live, a bare
      // topic or "bye" resolves against the partner. Reached only after every
      // real verb/direction missed, so it never shadows them (see _convoResolve).
      // Natural-language politeness FIRST (before the conversation layer's
      // greedy topic fallback claims it as an ask): this game's audience types
      // full sentences, and a courtesy to the partner should get the warm reply,
      // not her topicless node (Alan playtest, 2026-08-17). The patterns are
      // specific enough not to shadow a real topic.
      // a stop typed straight off the drop-list the bus just printed (mobile
      // playtest 2026-08-22: "second road (soi diana)" → didn't parse)
      if (G.busAskTurn != null && G.turns - G.busAskTurn <= 2 && typeof _busLinesFor === "function" &&
          _busLinesFor(G.room).length) {
        const stops = [...new Set(_busLinesFor(G.room).flatMap(l => BUS_LINES[l]))];
        const bn = x => x.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
        const toks = bn(lower).split(" ").filter(Boolean);
        if (toks.length && stops.some(s => toks.every(tk => bn(ROOMS[s].name).includes(tk)))) {
          doCommand("ride bus to " + lower);
          return;
        }
      }
      if (_politePhrase(lower)) break;
      if (_convoResolve(lower)) break;
      _say(_pickVary(_HUH, "huh"), "dim"); _noteMiss("parse");
      // …and drop any breadcrumb still pending. This path returns WITHOUT
      // _flushTrace, so a trace stranded by an earlier early-return survived
      // here and printed against some unrelated later command — Frank's
      // "· You gave Lek a single red rose" appeared on a LIGHT ON in his hotel
      // room the following night (round 34). A failed command leaves no
      // breadcrumb, and it must not carry somebody else's either.
      _traceCancel();
      return; // no tick for parse errors
  }
  _flushTrace(_room0);
  // READING YOUR OWN SCOREBOARD IS FREE. Every readout used to burn a turn, and
  // for a DAILY that is a foul rather than a nuisance: the dice are seeded and
  // shared, but the CLOCK is not, so two people playing "the same daily" who
  // checked their score a different number of times were not in the same world
  // — a persona proved it, same seed and same commands, one fewer SCORE, and a
  // ฿1,050 barfine offer became a refusal (round 24, Jojo). Printing your own
  // SHARE card cost you a turn of the night it was scoring.
  //
  // The line is: readouts of YOUR OWN STATE are free; observing the WORLD is
  // not. LOOK, EXAMINE, WEATHER and LISTEN still cost a turn — you are doing
  // something in a room — but the scoreboard, the clock, your pockets, the map
  // and the help are not things the night can charge you for.
  if (!_FREE_VERBS.has(v)) _tick();
  _questTick();
  _checkAct1();
}

// ── FOLLOW ──────────────────────────────────────────────────────────────────
// A plausible verb that used to fall through to "I didn't understand that" —
// against the house rule (a voiced refusal beats a parse failure). Nobody in
// this town leads a farang anywhere except Tan, who invites you to eat, so
// FOLLOW is his verb and everyone else gets a refusal in character.
const _FOLLOW_NOBODY = [
  "Follow who? Half this soi would love you to try, and none of them are going anywhere you'd like.",
  "You fall in behind nobody in particular and arrive nowhere in particular. The soi absorbs the attempt.",
  "Following people around Soi 6 is a hobby with a very short career. Pick a name, or stay where you are.",
];
const _FOLLOW_NO = [
  n => `${n} is working, not leading a tour. Whatever you're hoping happens next happens at this bar or not at all.`,
  n => `You make to follow ${n} and get a look that stops it dead — friendly, final, entirely practised.`,
  n => `${n} isn't going anywhere you're invited. On this soi, the person you follow is the person who asked you.`,
];

function _doFollow(arg) {
  const w = (arg || "").replace(/^(to |after )/, "").trim();
  const id = _resolveActor(w, _addressable());
  if (!id) { _say(_pickVary(_FOLLOW_NOBODY, "follownob")); return; }
  _noteActor(id);
  if (id === "tan") { _tanFood(); return; }
  if (id === "mot" && !_flag("motFed")) { _motDinner(); return; }  // "I know a cart."
  _say(_pickVary(_FOLLOW_NO, "followno")(_convoName(id)));
}

// Tan's standing invitation, honoured. His good-table deflection ends "you eat
// yet? You never eat. Come, I know a place." — so the place exists: a cart round
// the corner, no room change (soi6 mode is one street, and the beat belongs at
// the soi mouth anyway). He waves your money away, same as the ride: the fare is
// conversational. Once a night, so a free meal can't solve the hunger meter for
// a week, and never during Act One — the wallet comes first, as he keeps saying.
const _TAN_FOOD = [
  "He walks you thirty metres and around a corner you'd never have taken, to a cart with four plastic stools and a queue of exactly nobody who looks like you. Two plates of khao man gai arrive without an order being placed. \"They know what I eat,\" Tan says. \"Now they know what you eat. Congratulations, you have a place.\"",
  "The cart is behind the soi, under a bulb and a tarp, run by a woman who calls Tan something that is not his name and doesn't look at you at all. Noodles, pork, a broth that tastes like somebody's grandmother meant it. He eats fast and neatly and lets you get on with the business of being astonished.",
  "Around the corner, a folding table and a griddle. Tan orders in a burst of Isan too fast to follow, and what lands is moo ping, sticky rice, and a bag of som tam that could stop a clock. \"Eat the sticky rice with your hands,\" he says. \"You are not a tourist tonight. Tonight you are a man having dinner.\"",
];
const _TAN_FOOD_TALK = [
  "Between mouthfuls he reads the street back to you — that bar changed owners in March, that girl's brother drives for his cousin, that farang has been walking the same hundred metres for eleven years and calls it a life. None of it is gossip, exactly. It is more like a man showing you the wiring.",
  "He does not ask you a single question, which you notice about ten minutes in — and by then you have told him three things you had not planned to. He nods at each one, unsurprised, filing nothing, apparently. Apparently.",
  "He talks about the food. Only the food: where the good pork is, which cart to trust after 2 a.m., why this broth and not that one. It is the most relaxing conversation you have had in this country, and you understand — dimly, gratefully — that it is a gift he is choosing to give you.",
  "Somewhere in the second plate he says, mildly, that a man who eats properly makes better decisions at three in the morning than a man who doesn't. Then he lets it sit there, in case you need it, which you might.",
];
function _tanFood() {
  if (!_flag("act1Done")) {
    _say("\"Ha — no.\" Tan doesn't move off the car. \"You want dinner from me while your " +
      "wallet is out there having a better night than you are? Find it. THEN I feed you, " +
      "and you will enjoy it more.\"");
    return;
  }
  if (G.soc.tanFedDay === G.day) {
    _say("\"Twice in one night?\" Tan laughs at you, entirely without mercy. \"My friend, " +
      "I like you, but I am not your mother. Tomorrow.\"");
    return;
  }
  G.soc.tanFedDay = G.day;
  _say(_pickVary(_TAN_FOOD, "tanfood"), "win");
  _say(_pickVary(_TAN_FOOD_TALK, "tanfoodtalk"));
  if (G.dog) _say(_dogN("Sai Krok is served last and best — a bowl of broth and the good " +
    "trimmings, set down by the cart woman without a word to either of you."), "dim");
  G.hunger = Math.max(0, G.hunger - 55);
  G.thirst = Math.max(0, G.thirst - 20);
  _addHappy(2);                       // company, not conquest — never touches the treadmill
  if (_passTime(5)) return;           // the meal eats a chunk of the night
  _say("You reach for your pocket and Tan is already standing, already paying, already " +
    "waving it off. \"Next time,\" he says, and you both know there is no next time for " +
    "this either — only the same kindness, offered again, at the same non-price.", "dim");
}

// ── The daily challenge + the share card ────────────────────────────────────
// Seed-of-the-day (design backlog §3.2): the frontend hashes today's date and
// passes {seed, dailyId} into startSoi6Mode, so everyone who plays "today's
// soi" starts from the same dice stream and the same stable-hash week (draws,
// sponsors, quiz nights are (vacation, day) hashes — identical for all). The
// engine never reads a clock (shared-world rule 1): the date arrives as a
// string. _dailySeed is a pure FNV-1a fold onto the LCG's range.
function _dailySeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return 1 + (h % 2147483645);
}

// One emoji per night's ending — outcome class only, never content (no girl,
// no quest, no venue), so a posted card teases without spoiling.
const _NIGHT_EMOJI = {
  sleep: "🛏", barfine: "💋", dawn: "🌅", allnighter: "🌇", blackout: "🍺", collapse: "😵",
  hurt: "🚑", accident: "🛵", roadhit: "🚛", robbed: "💸", bfscam: "🐍",
};

// The Wordle-shaped result card. Returns lines (the SHARE verb prints them;
// the frontend joins them for the clipboard). Un-played nights pad with "·"
// so a mid-week share reads as a week in progress.
function _shareCard() {
  const log = G.nightLog || [];
  const nights = log.map(r => _NIGHT_EMOJI[r] || "▫").join("") +
    "·".repeat(Math.max(0, 7 - log.length));
  const label = G.dailyId ? `daily ${G.dailyId}` : "free week";
  const done = G.pendingChoice === "vacation_end" || log.length >= 7;
  // The social line: the card scored a week in meters only, which framed the
  // whole mode as a resource sim (design note 2026-08-26 — "a survival
  // score-chaser"). Names, bonds and stories are the game's actual depth axis
  // (the treadmill doctrine), so the record surface says so. Counts only —
  // outcome-class, never content, same rule as the night glyphs.
  // The ledger count is ALWAYS rendered, including at zero. It pays no สนุก by
  // doctrine (being told the truth is not a prize) — which means the score never
  // points at the best-written thing in the game, and an optimizer will never
  // find it: a 439-point exploit week finished with one NPC spoken to and no
  // reveals. His own fix, and it's the right one — don't pay for it, PUT IT ON
  // THE GRID: "we'll chase anything you put on the card" (Vikram, 2026-08-27).
  // A conspicuous 📖 0 beside a big score is a gap a competitive player wants to
  // close, and closing it means sitting still long enough to be told something.
  const names = Object.keys(G.known || {}).filter(id => NPCS[id]).length;
  const bonds = Object.keys((G.soc && G.soc.drinks) || {}).filter(id => _bondTier(id) >= 2).length;
  const social = names ? `👥 ${names} name${names === 1 ? "" : "s"}` +
    (bonds ? ` · ♥ ${bonds} regular${bonds === 1 ? "" : "s"}` : "") +
    ` · 📖 ${G.ledgerSeen || 0} told true` : null;
  return [
    G.mode === "soi6" ? `🚌 THE LAST BAHT BUS — Soi 6 (${label})` : `🚌 THE LAST BAHT BUS — the full week`,
    `🌙 ${nights}`,
    ...(social ? [social] : []),
    // AN ANCHOR, because a bare number is not a score anyone can read. "Wordle's
    // 3/6 works because everyone knows the range. สนุก 134 tells you and me
    // nothing — is that good? I had no idea until the game said so at the very
    // end" (round 24, Jojo, who does the daily puzzle on the tram). So the card
    // carries your own previous best, which is the only comparison a daily
    // player actually competes against, and it is already tracked.
    //
    // The pocket figure went with it: "฿9,085 in pocket is not a brag, it's
    // leftover cash and it clutters the line." She is right — the score is
    // สนุก; money is what you spent it on.
    `สนุก ${G.happy}${G.happy >= 100 ? " ★ สบายสบาย" : ""}` +
      (G.bestHappy > G.happy ? ` (best ${G.bestHappy})` : G.bestHappy && G.happy >= G.bestHappy ? " — new best" : "") +
      (done ? " · week complete" : ` · night ${Math.min(G.day, 7)}/7`),
    "soisanuk.github.io/last-baht-bus",
  ];
}

function _doShare() {
  // The full game logs every night the same way the challenge does — refusing
  // to show it left the week with no record surface at all outside soi6 mode
  // (closer playtest F6, 2026-08-26).
  if (G.mode !== "soi6" && !(_flag("act1Done") && (G.nightLog || []).length)) {
    _say("Nothing on the card yet — the week hasn't had a night worth a glyph.");
    return;
  }
  for (const l of _shareCard()) _say(l, "win");
  _say(G.mode === "soi6" ? "(Post it wherever the lads compare weeks.)"
    : "(The week so far, one glyph a night.)", "dim");
}

// ── Boot text ──────────────────────────────────────────────────────────────

// Start (or restart) the Soi 6 challenge: a fresh week confined to the soi,
// based at the Queen Vic Inn, ฿100k in the bank and ฿1k in pocket. The start
// menu calls this; PLAY AGAIN at week's end calls it too. `opts` ({seed,
// dailyId}) makes the week the seeded daily — PLAY AGAIN and RESTART call
// with no opts, so a repeat week is always a fresh roll (the daily is once).
function startSoi6Mode(opts) {
  const identity = G && G.player;  // keep who you are across the fresh-week reset
  const bestHappy = (G && G.bestHappy) || 0; // …and the best-week record PLAY AGAIN shows
  newGame();
  // PLAY AGAIN keeps identity AND the best-week high-water mark; a RESTART (which
  // clears G.player first) falls through here with no identity and resets both.
  if (identity && identity.origin) { G.player = identity; G.bestHappy = bestHappy; }
  if (opts && opts.seed) { G.rng = opts.seed; G.dailySeed = opts.seed; G.dailyId = opts.dailyId || null; }
  _soi6Setup();
  // Same character creation as the full game: on a first-ever start (no identity
  // yet) Tan drives you in and you say who you are; a later week keeps your
  // character (RESTART re-opens the picks if you want a different origin).
  if (!G.player.origin) { _taxiIntro("soi6"); return; }
  _soi6Opening();
}

function _soi6Setup() {
  G.mode = "soi6";
  G.stage = "vacation";   // reuse the 7-day-week machinery
  G.room = "qv_room";
  G.hotel = "queenvic";
  G.day = 1;              // Soi 6 starts fresh on day one — no lost first day
  G.money = SOI6_POCKET;
  G.bank = SOI6_BANK;
  G.battery = 100;        // a solvent tourist charged up before going out — not the Act-One 13%
  G.visited = {}; // fresh — the opening describe shows qv_room's full desc, then marks it visited
  _setFlag("hasWallet");  // you kept your card this time
  _setFlag("act1Done");   // no lost-wallet story in this mode
}

// The Soi 6 week's framing — always reached just after the taxi drops you (which
// already printed the title), so no title line here.
function _soi6Opening() {
  _say("Soi 6 · a Pattaya misadventure · Soi Sanuk universe", "dim");
  _say("═══════════════════════════════════", "dim");
  _say("One week in Pattaya, and you've picked your street and planted your flag: SOI 6 — the loudest " +
    "hundred metres in Thailand — with the Queen Vic Inn right in the thick of it. You're " +
    "not leaving the soi this trip; the rest of the city keeps for next time.");
  _say(_fmt("฿{bank} for the week sits in the bank. ฿{pocket} is in your pocket — the rest " +
    "comes out of the ATM on the street (฿{fee} a pull, ฿{cap} a day) when you need it.",
    { bank: _num(SOI6_BANK), pocket: _num(SOI6_POCKET),
      fee: ATM_FEE, cap: _num(ATM_DAILY_CAP) }));
  // the goal word carries its own pronunciation the first time — a cold player's
  // win condition was "written in a script I can't read" (Tyler, 2026-08-26)
  _say("Goal: สบายสบาย — say it “sabai sabai”: easy-easy, the good life. Get happy. Max out the week. ★", "win");
  // …and say what actually pays it, or the mode reads as a meter-management
  // sim: the treadmill jades the churn while people never stop paying (the
  // depth-beats-breadth doctrine, stated to the player for once — design note
  // 2026-08-26)
  // Every clause here has to be TRUE OF THE METER, not just of the fiction —
  // this mode ships a score to a share card, and an optimizer audits strategy
  // advice (Vikram, 2026-08-27: "a name learned" is worth exactly 0 points, so
  // the old wording was the game lying to its own player in an old hand's voice).
  // What survives is what measures: the bonded girl doesn't jade, and churn does.
  _say("(A word from the old hands: the meter loves PEOPLE. Going back to the " +
    "same girl tomorrow keeps paying, while a different girl every hour stops " +
    "paying by midnight — the town charges you for churn, and it never charges " +
    "her for knowing you. Buy fewer rounds. Come back more.)", "dim");
  if (G.dailyId) {
    _say(`Today's soi — the ${G.dailyId} daily: same week, same dice, everyone ` +
      "who plays it today. (SHARE prints your week card, any time.)", "dim");
  }
  _say("");
  _describeRoom(true);
  // Only DOWN is a live exit from the room — keep OUT out of the tap-hint (it's a
  // step you take FROM the pub, not the room; a tappable OUT here just dead-ends).
  _say("(HELP lists commands. Your night is DOWN the stairs — the pub first, then out into the soi.)", "dim");
}

function engineIntro() {
  if (!G) newGame();
  // First ever start: work out who you are on the ride in, THEN wake up on the
  // beach. Once picked (identity persists across Act One resets), skip the taxi.
  if (!G.player || !G.player.origin) { _taxiIntro("beach"); return; }
  _beachOpening(true);
}

// The day-two beach opening — the do-or-die Act One. Split out of engineIntro so
// the taxi intro can hand off to it (no title the second time) and resets can
// replay it straight (with title).
function _beachOpening(withTitle) {
  if (withTitle) {
    _say("THE LAST BAHT BUS", "win");
    _say("a Pattaya misadventure · Soi Sanuk universe", "dim");
    _say("═══════════════════════════════════", "dim");
  }
  _say("Day two of your week in Pattaya, and it starts like this: face-down on " +
    "Jomtien beach, sunset bleeding into the sea, your head pounding like a bass " +
    "bin outside Neon Paradise A-Go-Go. Day one went well, is the thing. Too well.");
  _say(_fmt("Your wallet is GONE. Your phone reads 13% battery. Your hotel is in Naklua — " +
    "the whole town away. The baht bus is ฿{f} a head.", { f: BUS_FARE }));
  _say("You have ฿0.");
  _say("It's going to be one of those nights.", "alert");
  // The interface primer used to be a meta-tip printed AT the player — "(New
  // here? Turn out your pockets — INVENTORY, then EXAMINE...)" — narration
  // ABOUT the game rather than anything happening IN it, delivered as one more
  // paragraph in an already-unbroken wall (Priya's cold-onboarding playtest,
  // round 32, 2026-08-30: she read the whole opening as one text dump with no
  // interaction until the very last line, and never discovered tap/CAPS words
  // on her own). First attempt only: Auntie Nok — who is actually AT
  // jomtien_beach for the first hour of every night (18:00-18:59; see
  // _npcRoom), feeding the cats she calls her early-warning system — finds
  // the player instead of the tip explaining things. Driven as a REAL
  // conversation (_doTalkBody, not scripted text), so the chip bar populates
  // with her actual topics and the tap interface teaches itself. The clock is
  // deterministic here (a fresh newGame() always resets nightTurn to 0), so
  // this always lands in her window, matching the room's own "sunset
  // bleeding into the sea" a few lines below.
  if (!G.act1Tries && !_flag("act1Done")) {
    _say("Feet in the sand, unhurried, and the rattle of a little bowl. Auntie Nok, out for the " +
      "evening feed before the light goes, stops dead at the sight of you — a farang-shaped " +
      "lump exactly where Big One usually sits.", "dim");
    _doTalkBody("nok");
  }
  if (G.act1Best > 0)
    _say(`(Best run home so far: ${G.act1Best}/${_ACT1_MILESTONES.length} of the way ` +
      "back to 412. Do better — dawn is the deadline, and dawn does not wait.)", "dim");
  if (G.act1Tries > 0)
    _say("The soi remembers your face now. If the night goes quiet, ask it: (HINT)", "dim");
  _say("");
  _describeRoom(true);
  _say("(HELP lists everything, any time.)", "dim");
}

// ── The taxi-ride intro ──────────────────────────────────────────────────────
// Tan the driver-fixer runs a three-question "who are you?" beat on the way in
// from the airport (a pendingChoice modal: origin → personality → orientation),
// then drops you on Soi 6 and the day-two beach opening follows. Picks land in
// G.player and persist across resets (set once — see _act1Fail / RESTART).
// The language step is OUT while German is a frozen proof of concept (see
// docs/i18n-de-gaps.md): offering a choice that delivers 11% coverage is worse
// than not offering it. The machinery — LANGUAGES, G.player.lang, _L, the
// catalog — is all still here and untouched; this is one table entry away from
// coming back the day the translation is real.
const _INTRO_STEPS = [
  { field: "origin", table: () => ORIGINS,
    q: "\"So — what's the story back home?\" A glance in the mirror. \"Everybody on this drive is leaving something behind. What's yours?\"" },
  { field: "personality", table: () => PERSONALITIES,
    q: "\"Okay. Two hours to fill.\" He drums the wheel. \"When a room turns to look at you — and out here, my friend, it will — what do they get?\"" },
  { field: "orientation", table: () => ORIENTATIONS,
    q: "\"Last one — saves us both time later, na.\" An easy shrug. \"What are you in the market for?\"" },
];

function _taxiIntro(after) {
  G.introAfter = after || "beach";  // which scenario opens once you've said who you are
  // Enter the modal BEFORE printing any prose, so the frontend suppresses
  // tap-decoration on the whole intro (Tan the driver, "Golf" the origin, etc. —
  // they'd otherwise tap into "talk to tan"/"talk to golf" the numbered modal rejects).
  G.pendingChoice = "intro";
  G.introStep = 0;
  _say("THE LAST BAHT BUS", "win");
  _say("a Pattaya misadventure · Soi Sanuk universe", "dim");
  _say("═══════════════════════════════════", "dim");
  _say("The grey sedan out of Suvarnabhumi smells of pine air-freshener and someone " +
    "else's last beer. Ninety minutes of motorway to Pattaya, and the driver — a " +
    "compact Thai guy about thirty-five, a faded Cleveland State hoodie, English " +
    "better than the arrivals-hall signage — has already decided the two of you are " +
    "going to be friends.");
  _say("\"Tan,\" he says, tapping his chest, not turning round. \"Six years in Ohio " +
    "for a film degree. Now I drive, and I fix — turns out the English was the only " +
    "part of the degree that pays.\" He finds your eye in the mirror. \"Two hours, na. " +
    "Might as well know who I'm dropping off.\"");
  _introPrompt();
}

function _introPrompt() {
  const step = _INTRO_STEPS[G.introStep || 0];
  if (!step) return;
  _say(step.q); // _say translates fixed strings; the option list is interpolated, so _L each pick
  _say(step.table().map((e, i) => `${i + 1}) ${_L(e.pick)}`).join("\n"), "dim");
  _say("(Pick a number.)", "dim");
}

function _introMatch(input, table) {
  const s = (input || "").trim().toLowerCase().replace(/[.,!?]+$/, "");
  const n = parseInt(s, 10);
  if (n >= 1 && n <= table.length) return table[n - 1];
  return table.find(e => e.id === s || e.label.toLowerCase() === s) ||
    (s.length >= 4 ? table.find(e => e.label.toLowerCase().includes(s) || e.id.includes(s)) : null) ||
    null;
}

function _introAnswer(input) {
  const stepIdx = G.introStep || 0;
  const step = _INTRO_STEPS[stepIdx];
  const pick = _introMatch(input, step.table());
  if (!pick) { _say("\"Hah — a number, my friend. Long drive.\"", "dim"); _introPrompt(); return; }
  G.player[step.field] = pick.id;
  // …and remember the ANSWER YOU GAVE, not just where it routes. Two
  // orientation entries share id "straight" (the deflection files under the
  // factory setting), so a label lookup by id always returned the FIRST
  // entry's — WHO AM I told a man who said "the beaches" that he was here for
  // "the ladies", which is the game contradicting the player to his face for
  // no mechanical reason (round 32, 2026-09-01). Routing is unchanged; only
  // the readout gets to be honest. A new field needs no backfill: an old save
  // without it falls back to the by-id lookup exactly as before.
  (G.player.said = G.player.said || {})["_label_" + step.field] = pick.label;
  _say(pick.tan);
  if (stepIdx < _INTRO_STEPS.length - 1) { G.introStep = stepIdx + 1; _introPrompt(); return; }
  // done — Tan drops you on Soi 6; the chosen scenario opens
  G.pendingChoice = null; G.introStep = null;
  (G.known = G.known || {}).tan = true; // you rode in with him — he's no stranger (a findable NPC at the soi mouth)
  G.phone.contacts.tan = true; // the card IS his number — your first local contact, and the promise is real (see _tanCall)
  // Where he actually drops you depends on where you are staying, which is not
  // the same place in the two modes. This line used to say Soi 6 for both, so
  // the full game was set down on the wrong side of town, told its hotel was in
  // Naklua, and then woke up on a beach in Jomtien — three locations, no thread.
  // The one habit an outsider needs before anything else (accessibility pass,
  // 2026-09-03): a soi runs on asking, and a first-timer types LOOK. Tan says
  // it once, on the ride, before Nok says it again on the sand.
  _say("\"One thing, my friend, before you get out.\" Tan finds your eyes in the mirror. " +
    "\"This town — you ASK. Nobody here reads a sign. A bar, a girl's name, where the bus " +
    "goes, who has what — you ask the man on the corner, the girl on the stool, me. Look " +
    "all you like. Asking is how it moves.\"");
  if (G.introAfter === "soi6") {
    _say("\"Okay. I got you.\" Tan swings off Second Road and the neon of Soi 6 " +
      "swallows the windscreen. He drops you at the mouth of the soi, presses a cold " +
      "water you didn't ask for into your hand, and taps the card already in your " +
      "pocket. \"First night is on you, my friend. Do me one favour—\" the grin again " +
      "\"—try to keep your wallet.\"");
  } else {
    _say("\"Okay. I got you.\" The motorway gives way to Sukhumvit, Sukhumvit to " +
      "Naklua, and the noise falls off the town like a coat. Tan pulls up at the Sabai " +
      "Palms, hands your bag to a boy who has appeared from nowhere, and taps the card " +
      "already in your pocket. \"First night is on you, my friend. Do me one favour—\" " +
      "the grin \"—try to keep your wallet.\"");
    _say("");
    _say("You do not keep your wallet.", "alert");
    _say("What you keep of the next nine hours is this: a shower, a shirt, a baht bus " +
      "south with strangers who became friends, somewhere with a bell, somewhere with a " +
      "pool table, a receipt you do not remember asking for, and a very long stretch of " +
      "sand that seemed like a good idea at the time.", "room");
  }
  _say("(The card has a number. Your phone has the number. CALL TAN — any hour, he " +
    "says, and he means it.)", "dim");
  _say("");
  const after = G.introAfter; G.introAfter = null;
  if (after === "soi6") _soi6Opening();
  else _beachOpening(false);
}

function _doWhoAmI() {
  if (!G.player || !G.player.origin) {
    _say("You haven't worked out who you are yet — the night's still young.");
    return;
  }
  // prefer the label of the answer actually GIVEN (see _introAnswer); fall back
  // to the by-id lookup for saves made before that was recorded
  const said = (G.player.said || {});
  const find = (t, id, field) => said["_label_" + field] ||
    (t.find(e => e.id === id) || {}).label || "?";
  _say(`You are: ${find(ORIGINS, G.player.origin, "origin")} · ` +
    `${find(PERSONALITIES, G.player.personality, "personality")} · ` +
    `${find(ORIENTATIONS, G.player.orientation, "orientation")}.`, "win");
  if (_flag("act1Done")) _say(`On the soi, you're ${_REP_LABELS[_repTier()]}. (STANDING for more.)`, "dim");
  // the one line in the game that has to be earned from outside the game
  if (_flag("owlBox15")) _say("You are also the person who answered Box 15.", "win");
  if (_flag("ctfRabbit")) _say("And the one who followed the white rabbit — off a dead number, down a live record.", "win");
}

// REP / STANDING / REPUTATION — where the soi has you. A single town-wide read,
// built slowly from generosity and a straight story, dented fast by scenes,
// jiltings, and getting bounced. Distinct from any one girl's regard.
function _doRep() {
  if (!_flag("act1Done")) {
    _say("Too early to have a name out here — you're still finding your feet, and the " +
      "soi hasn't clocked you yet.", "dim");
    return;
  }
  const tier = _repTier();
  _say(`The soi has you down as: ${_REP_LABELS[tier]}.`, tier < 0 ? "alert" : tier > 0 ? "win" : "dim");
  const hint = tier <= -1
    ? "A round for the bar, a straight answer, a job seen through — a name mends slower than it breaks, but it mends."
    : tier >= 2
      ? "Doors open a crack before you knock. Keep it — one bad scene and the soi remembers that instead."
      : tier === 1
        ? "The mamas nod you in. Keep standing your rounds and telling it straight and it only grows."
        : "Stand a round, tip a lady, keep your story straight — or don't, and find out how small the soi is.";
  _say(hint, "dim");
}

// MOT'S DINNER, honoured. Madam Oy hands back the wallet and says "Buy Mot's
// dinner — he eats because tourists are careless, and that is not entirely his
// fault." Mot, found, is genuinely moved that she said it and names the dish and
// the price: "Khao man gai, forty baht. I know a cart." Two characters promising
// one scene, and until now seven different phrasings all fell through to "Not
// for sale here" — the most deliberate-feeling dead end in the game (round 22,
// Priya). An invitation is a promise; a price and a dish and a cart is three.
//
// Once ever, because it isn't a mechanic, it's the end of Act One's small print:
// the kid who sold your wallet gets fed by you, on the word of the woman who
// bought it. He pays for himself after this — that's the point of him.
const _MOT_DINNER_LINES = [
  "The cart is four minutes away and down a soi you would have walked past forever: a griddle, a rice cooker, a woman who has been poaching chickens since before Walking Street had a name. Mot orders for both of you without asking, which is its own kind of manners.",
  "He takes you at a trot to a corner where a hand-painted chicken is peeling off a steel shutter, and orders in the flat quick Thai of somebody who eats here most days. Two plates. The rice is yellow with fat and the ginger sauce arrives in a jar with no lid.",
  "The cart has no sign and three stools. Mot puts you on the good one, which you only notice later, and holds up two fingers to a woman who was already reaching for the plates.",
];
const _MOT_DINNER_TALK = [
  "He eats like somebody who has learned not to leave any, and talks with his mouth full about the shoes he is saving for — actual football boots, with the studs, not the flat ones. Eleven hundred baht. He has six hundred and forty. He tells you the exact number without embarrassment, the way you'd tell somebody the time.",
  "Halfway down the plate he says his mother is in Sa Kaeo and he sends what he can, and then changes the subject so fast and so cheerfully that you understand it is not a subject. He wants to know if you have been to a real football match. A big one. With the singing.",
  "He asks what a wallet like that costs new, and when you tell him he laughs so hard he has to put the spoon down. \"For LEATHER,\" he says. \"For a bit of a COW.\" He is still going about it when the plates are cleared.",
];
function _motDinner() {
  if (!_npcsHere().includes("mot")) {
    _say("Mot isn't here to feed. He works Walking Street, mostly the alley behind it.");
    return;
  }
  if (_flag("motFed")) {
    _say("\"No, no.\" Mot waves both hands. \"One time only. You buy again, then I am your " +
      "little brother and I must be POLITE to you.\" He pulls a face at the horror of it.");
    return;
  }
  if (G.money < MOT_DINNER) {
    _say(`Khao man gai is ฿${MOT_DINNER} and you haven't got it. Mot checks your face, checks ` +
      "his pocket, and you can see him deciding whether to offer — so you get in first and say " +
      "another time.");
    return;
  }
  G.money -= MOT_DINNER;
  _setFlag("motFed");
  _say(_pickVary(_MOT_DINNER_LINES, "motdinner"), "win");
  _say(_pickVary(_MOT_DINNER_TALK, "motdinnertalk"));
  if (G.dog) _say(_dogN("Sai Krok gets the chicken skin, which Mot removes from his own plate " +
    "first, without comment, as though this were simply the order of things."), "dim");
  G.hunger = Math.max(0, G.hunger - 45);
  G.thirst = Math.max(0, G.thirst - 15);
  _addHappy(2);                        // a kindness, never a conquest — no treadmill
  _repGain();                          // the soi notices who feeds the kid
  _say(`(฿${MOT_DINNER}. Madam Oy's instruction, carried out.)`, "dim");
  // Mot works a pitch-dark alley, and the dark-streak counter would otherwise
  // keep running through a meal the player demonstrably spent at a lit cart with
  // company — so the scene ended with a soi dog lunging out of the black at a man
  // who had just sat down to chicken and rice. You were not alone in the dark;
  // the counter should not say you were.
  // He works a pitch-dark alley and the meal is four minutes round the corner at
  // a lit cart, so for its duration you are not standing in the dark — same flag
  // the short-time hour uses, for the same reason.
  G.offstage = true;
  _passTime(3);
  G.offstage = false;
}
