// The Last Baht Bus — game engine, part 2/5: random street encounters.
// Loads after engine-core (see its header for the split's load-order contract).

// ── Random street encounters ───────────────────────────────────────────────
// Rolled after arriving somewhere (walk, bus, motosai) in a lit street room.
// Scene data lives in ENCOUNTERS (world.js); outcomes live here. Interactive
// encounters set G.pendingEnc and the player's next command is their snap
// reaction — doCommand routes it to the matching _ENC resolver.

const ENC_COOLDOWN = 12; // min turns between encounters
const ENC_CHANCE = 0.3;  // roll per eligible arrival

// Print an interactive encounter's prompt AND stash it on G, so restoring a
// save (or UNDO) mid-encounter can redraw it. Without this the load shows only
// the room text, and the encounter's exit line fires blind on the next move —
// the saleng/battery-man/hair-oil-man exit text with no cart in sight. Every
// prompt that leaves G.pendingEnc set routes through here; each arg is a
// [text, cls] line. TTS (if any) is spoken by the caller, not replayed.
function _encPrompt(...lines) {
  if (G) G.encPrompt = lines;
  for (const [t, cls] of lines) _say(t, cls);
}

// Redraw the pending encounter's prompt from the stashed lines — called after
// _describeRoom on continue/undo, the encounter twin of _renderGame.
function _renderEncounter() {
  if (!G || !G.pendingEnc || !Array.isArray(G.encPrompt)) return;
  for (const [t, cls] of G.encPrompt) _say(t, cls);
}

// ── The ซาเล้ง (mobile bar cart) ───────────────────────────────────────────
// A saleng is primarily FOR THE GIRLS: it parks at the bar and the hostesses
// (and other punters) swarm it. It is NOT a modal encounter — the player is
// free to ignore it, buy from it repeatedly, or come back to it before it moves
// on. Presence is tracked on G (salengCart/salengRoom/salengUntil), never via
// pendingEnc. The regions salengs work, and the per-cart copy, live in tables so
// the pitch, the room re-announce, the buy hint, and the item list share a source.
const _SALENG_REGIONS = new Set([
  "Beach Road", "Soi Buakhao", "Tree Town", "LK Metro", "Walking Street", "Soi 6", "Myth Night",
]);
const _SALENG_CARTS = {
  food: {
    items: ["moo ping", "noodles"],
    hint: "(BUY MOO PING ฿40 · BUY NOODLES ฿40 · BUY <item> FOR <lady>)",
    intro: 'A ซาเล้ง (saleng) putters to a stop outside — a converted three-wheeler with ' +
      'a gas burner going and charcoal pork smoke drifting in ahead of it. "Moo ping! Noodle!"',
    notice: "A ซาเล้ง putters up outside, burner going and pork smoke ahead of it; the girls drift to the window.",
    here: "The food saleng idles at the kerb outside, its burner ticking over.",
  },
  shoes: {
    items: ["sandals", "heels"],
    hint: "(BUY SANDALS ฿150 · BUY HEELS ฿250 · BUY <item> FOR <lady>)",
    intro: "A ซาเล้ง rolls up outside — its frame hung with ladies' footwear: sequinned " +
      'sandals, platform heels, one pair of flip-flops that are clearly lost. "Shoes, shoes! Very cheap!"',
    notice: "A ซาเล้ง hung with sequinned sandals and platform heels rolls up outside; the girls are on it before it stops.",
    here: "The shoe saleng waits outside, its frame a-glitter with sandals and heels.",
  },
  lingerie: {
    items: ["lingerie"],
    hint: "(BUY LINGERIE ฿150 · BUY LINGERIE FOR <lady>)",
    intro: "A ซาเล้ง idles outside with a washing-line of lingerie across its frame — " +
      'bras, slips, colours the sun doesn\'t see. "For girlfriend! Beautiful!"',
    notice: "A ซาเล้ง strung with lingerie idles up outside, and every girl in the place turns her head at once.",
    here: "The lingerie saleng idles outside, its washing-line of lace swaying in the fan-wash.",
  },
  snacks: {
    items: ["som tam", "fruit"],
    hint: "(BUY SOM TAM ฿50 · BUY FRUIT ฿30 · BUY <item> FOR <lady>)",
    intro: "A ซาเล้ง drifts to a stop — a som tam station and drinks cooler bolted to the " +
      'back. Lime, dried shrimp, and fish sauce arrive ahead of the pitch: "Som tam! Very fresh!"',
    notice: "A som-tam ซาเล้ง drifts to a stop outside, pestle already going, and the girls call their orders over your head.",
    here: "The som-tam saleng is parked outside, pestle thudding in its stone mortar.",
  },
};
// Flavour of the girls playing with the cart ({g} = a hostess/mama present).
const _SALENG_VIGNETTES = {
  food: [
    "{g} leans out the window and haggles the driver down two baht on principle, then buys skewers for half the rail.",
    "{g} feeds a strip of moo ping to the girl beside her, who delivers the verdict — more chilli — with her mouth full.",
    "The driver hands {g} a bag of noodles she didn't quite pay for; she promises to settle 'next time', and everyone knows what that means.",
  ],
  shoes: [
    "{g} kicks off her heels right there and tries the gold platforms, walking a catwalk length of sticky floor to a chorus of opinions.",
    "Two of the girls are arguing sizes over the sandals; {g} settles it by buying both pairs and sorting it out later.",
    "{g} holds a pair of sequinned flats up to the neon, unconvinced, then buys them anyway.",
  ],
  snacks: [
    "{g} orders her som tam 'phet phet phet' and dares the new girl to match her, the pestle thudding in agreement.",
    "{g} passes a bag of cut mango down the bar, keeping the sweetest slice for herself as commission.",
    "The whole rail is suddenly eating som tam out of one shared bag, and {g} is somehow in charge of it.",
  ],
  _default: ["{g} drifts over to the saleng, buys something small, and drifts back richer in gossip."],
};
// Lingerie is its own scene — the whole bar turns it into a show for the punters.
const _SALENG_LINGERIE_SCENE = [
  "The girls swarm the lingerie line in a giggling scrum, holding lace up against each other and turning to pose at the rail — the customers are the mirror they're using. One drapes a slip across your shoulder, delighted, before her friend snatches it back.",
  "Two of them have turned the saleng into a fashion show, striking increasingly theatrical poses at the punters with each new slip. Nobody at the bar is pretending to watch the football any more.",
  "A bra is held up, then held up against you for scale, to shrieks of laughter; the girls model the better pieces down the bar with the straight-faced confidence of women who know exactly what the room is worth.",
];

function _salengPick(arr) { return arr[Math.floor(_rand() * arr.length)]; }

// Is a cart currently parked and un-expired? (alive anywhere) / here in this room?
function _salengAlive() { return !!(G && G.salengCart && G.turns < G.salengUntil); }
function _salengHere() { return _salengAlive() && G.salengRoom === G.room; }

// The buyable items on the cart parked in THIS room — the single list the flyout
// wheel and autocomplete both read (three-surface rule). Empty when none is here.
function _salengItems() {
  return _salengHere() ? _SALENG_CARTS[G.salengCart].items.slice() : [];
}

// Does this input name something the parked cart sells? Returns the
// {item, price, hunger, thirst} it maps to, or null. Keyed on the cart type so
// _doBuy's routing and the purchase itself can't drift.
function _salengMatchItem(input) {
  if (!G || !G.salengCart) return null;
  const s = String(input).toLowerCase();
  switch (G.salengCart) {
    case "food":
      if (/moo.?ping|pork|skewer|bbq|grilled/.test(s)) return { item: "moo ping", price: 40, hunger: 25, thirst: 0 };
      if (/noodle|ba.?mee|bowl|ramen/.test(s))         return { item: "noodles", price: 40, hunger: 35, thirst: -8 };
      return null;
    case "shoes":
      if (/sandal|flat/.test(s))        return { item: "sandals", price: 150, hunger: 0, thirst: 0 };
      if (/heel|platform|high/.test(s)) return { item: "heels", price: 250, hunger: 0, thirst: 0 };
      return null;
    case "lingerie":
      if (/lingerie|bra|underwear|lace|slip|undies/.test(s)) return { item: "lingerie", price: 150, hunger: 0, thirst: 0 };
      return null;
    default: // snacks
      if (/som.?tam|papaya|salad/.test(s)) return { item: "som tam", price: 50, hunger: 20, thirst: 5 };
      if (/fruit|mango|banana|fresh/.test(s)) return { item: "fruit", price: 30, hunger: 10, thirst: 0 };
      return null;
  }
}

// Called once per _tick: retire an expired cart, let the girls play with a live
// one (~20%), or roll a new cart up to the bar the player is in.
function _salengTick() {
  if (!G) return;
  if (G.salengCart && G.turns >= G.salengUntil) { // its time is up — it moves on
    const here = G.salengRoom === G.room;
    G.salengCart = null; G.salengRoom = null; G.salengUntil = 0;
    if (here) _say("The saleng packs up its trestles and putters on down the soi, the girls waving after it.", "dim");
    return; // never spawn a replacement the same tick it leaves
  }
  if (_salengHere()) { if (_rand() < 0.20) _salengVignette(); return; }
  if (!G.game && !G.pendingEnc && !G.salengCart && _inBar() && _room().barType !== "pub" &&
      _SALENG_REGIONS.has(_room().region) && G.turns - G.lastSaleng >= 15 && _rand() < 0.10) {
    _salengSpawn();
  }
}

function _salengSpawn() {
  const types = Object.keys(_SALENG_CARTS);
  const cart = types[Math.floor(_rand() * types.length)];
  G.salengCart = cart;
  G.salengRoom = G.room;
  G.lastSaleng = G.turns;
  G.salengUntil = G.turns + 6 + Math.floor(_rand() * 7); // lingers 6–12 turns
  const firstEver = !G.salengSeen[cart];
  G.salengSeen[cart] = true;
  _salengAnnounce(cart, firstEver);
}

// First cart of a type gets the full pitch inviting the player to have a look;
// every cart after that is just a low-key notice that it's there to buy from.
function _salengAnnounce(cart, firstEver) {
  const c = _SALENG_CARTS[cart];
  if (firstEver) {
    const girls = _npcsHere().filter(id => NPC_ROLES[id] === "hostess");
    const gName = girls.length ? NPCS[girls[0]].name : "One of the girls";
    _say(`${c.intro} ${gName} is already at the window.`, "alert");
    _say(`${c.hint} — or just let the girls enjoy it.`, "dim");
  } else {
    _say(c.notice, "alert");
    _say(c.hint, "dim");
  }
}

function _salengVignette() {
  const girls = _npcsHere().filter(id => NPC_ROLES[id] === "hostess" || NPC_ROLES[id] === "mamasan");
  if (!girls.length) return; // nobody to play with it — stay quiet
  if (G.salengCart === "lingerie") { _say(_salengPick(_SALENG_LINGERIE_SCENE), "dim"); return; }
  const gName = NPCS[girls[Math.floor(_rand() * girls.length)]].name;
  const pool = _SALENG_VIGNETTES[G.salengCart] || _SALENG_VIGNETTES._default;
  _say(_salengPick(pool).replace(/\{g\}/g, gName), "dim");
}

function _maybeEncounter() {
  if (!G || G.over || G.pendingFare || G.pendingEnc) return;
  if (_isDarkHere() || _room().bar) return; // the dark belongs to the soi dogs
  // public drunkenness attracts the boys in brown (repeatable, unlike the rest)
  if (G.soc.drunk >= 5 && G.turns - G.lastPolice >= 30 && _rand() < 0.2) {
    G.lastPolice = G.turns;
    G.pendingEnc = "police";
    _encPrompt(
      ["A whistle, short and bored. A boy in brown detaches from the shade of a " +
        "power pole and takes up station directly in your weaving path, thumbs in " +
        "his belt. “You drink too much, my friend.” A statement, not a question. " +
        "“Have fine. Five hundred baht.”", "alert"],
      ["(He has all night. You, visibly, do not.)", "dim"]);
    return;
  }
  if (G.turns - G.lastEnc < ENC_COOLDOWN) return;
  const eligible = Object.keys(ENCOUNTERS).filter(id =>
    !G.encDone[id] && ENCOUNTERS[id].rooms.includes(G.room) &&
    (id !== "powerbank" || G.battery <= 30));
  const chance = ENC_CHANCE * (_bandNearby() ? 1.5 : 1);
  if (!eligible.length || _rand() > chance) return;
  _startEnc(eligible[Math.floor(_rand() * eligible.length)]);
}

function _startEnc(id) {
  const e = ENCOUNTERS[id];
  G.encDone[id] = true;
  G.lastEnc = G.turns;
  if (e.interactive) {
    G.pendingEnc = id;
    const lines = [[e.intro, "alert"]];
    if (e.th) lines.push([`“${e.th}” (${e.rom})`, "thai"]);
    if (e.hint) lines.push([e.hint, "dim"]);
    _encPrompt(...lines);
    if (e.th) _engineSpeak(e.th);
  } else {
    _say(e.intro, "alert");
    if (e.th) { _say(`“${e.th}” (${e.rom})`, "thai"); _engineSpeak(e.th); }
    _ENC[id]("");
  }
}

// The purchase itself — buying from the parked cart (self or FOR <lady>).
// The cart LINGERS after a buy (you can buy again); departure is purely on
// its timer in _salengTick, so nothing here clears salengCart.
function _salengBuy(input) {
    // parse optional "for [name]" suffix
    const forM = input.replace(/\bno\b|\bignore\b|\bleave\b|\bgo away\b/, "")
      .match(/\bfor\s+(\w+)\s*$/i);
    const forId = forM ? _findNpc(forM[1]) : null;
    const forHer = forId && NPC_ROLES[forId];
    // determine item, price, and nutrition (shared with _doBuy routing)
    const m = _salengMatchItem(input);
    const item = m ? m.item : null;
    const price = m ? m.price : 0;
    const hunger = m ? m.hunger : 0;
    const thirst = m ? m.thirst : 0;
    if (!item) return; // _doBuy only routes real cart items here
    if (G.money < price) {
      _say(`฿${price} for the ${item} — you have ฿${G.money}. The driver clocks it ` +
        "without embarrassing you and putters on.");
      return;
    }
    G.money -= price;
    if (forHer) {
      const name = NPCS[forId].name;
      G.soc.drinks[forId] = (G.soc.drinks[forId] || 0) + 1;
      const REACTIONS = {
        "moo ping": `${name} takes the skewers with both hands and wais before she's even ` +
          `bitten in. "Aoy, so sweet!" She eats standing up and immediately tries to feed you one.`,
        "noodles": `${name} cradles the bowl like it solved something. ` +
          `"Same same my mum cook." She means it. That lands.`,
        "sandals": `${name} sits on the nearest stool and swaps shoes without ceremony — ` +
          `old pair straight into her bag, new ones on. She walks a circle. The bar votes: better.`,
        "heels": `${name} holds the heels against her outfit, against the neon, against ` +
          `some internal standard only she knows. Then she puts them on. The bar applauds. ` +
          `She accepts this as her due.`,
        "lingerie": `${name} disappears for ninety seconds and returns having apparently ` +
          `settled a question nobody asked. She pulls you by the wrist to show the other girls. ` +
          `"Same same Victoria Secret, na?" You agree. You would agree with anything right now.`,
        "som tam": `${name} attacks the som tam with an opinion. "Not enough chilli." She ` +
          `adds chilli from a bottle produced from somewhere on her person and doesn't offer ` +
          `to show you where.`,
        "fruit": `${name} peels the mango with a knife from her bag — fast, professional — ` +
          `and gives you the first slice. The bar gets the rest.`,
      };
      _say(`฿${price} for the ${item}. ` +
        (REACTIONS[item] || `${name} takes it with a wai. "Khob khun kha~"`) +
        ` (฿${G.money} left.)`, "win");
      _addHappy(1);
      _maybeSelfBarfine(forId);
    } else {
      if (hunger) G.hunger = Math.max(0, G.hunger - hunger);
      if (thirst) G.thirst = Math.max(0, G.thirst - thirst);
      // shoes and lingerie go to inventory for gifting later
      const INV_ITEMS = {
        "sandals": "saleng_sandals", "heels": "saleng_heels", "lingerie": "saleng_lingerie",
      };
      if (INV_ITEMS[item]) {
        const iid = INV_ITEMS[item];
        if (G.itemLoc[iid] === "inventory") {
          G.money += price; // refund — already have one
          _say(`You already have one. The driver shrugs and keeps the change for your ` +
            `indecision. Just kidding — ฿${price} back.`);
          return;
        }
        G.itemLoc[iid] = "inventory";
        const INV_TEXT = {
          "sandals": `฿${price} for the sandals, tucked under your arm. Not your size, ` +
            `not your shoes. GIVE SANDALS TO <lady> when you've found the right person. (฿${G.money} left.)`,
          "heels": `฿${price} for the heels, carried in the bag. You have absolutely no ` +
            `use for these. GIVE HEELS TO <lady>. (฿${G.money} left.)`,
          "lingerie": `฿${price}. The lingerie goes in the bag; the bag goes under your arm; ` +
            `the whole bar approves of the logic. GIVE LINGERIE TO <lady>. (฿${G.money} left.)`,
        };
        _say(INV_TEXT[item]);
      } else {
        const SELF = {
          "moo ping": `Three skewers of moo ping, ฿${price}, eaten at the bar. Charcoal does ` +
            `something to pork that a kitchen can't quite manage. (฿${G.money} left.)`,
          "noodles": `A bowl of ba mee from the window, ฿${price}. You eat it at the bar ` +
            `because inside is better than the kerb. (฿${G.money} left.)`,
          "som tam": `฿${price} for a box of som tam — lime, dried shrimp, the good kind ` +
            `of dangerous. (฿${G.money} left.)`,
          "fruit": `฿${price} for a bag of cut fruit. You eat it at the bar feeling virtuous ` +
            `relative to your surroundings. (฿${G.money} left.)`,
        };
        _say(SELF[item] || `฿${price} for the ${item}. (฿${G.money} left.)`);
        _addHappy(1);
      }
    }
}

const _ENC = {
  selfbf(input) {
    const name = NPCS[G.selfBfId] ? NPCS[G.selfBfId].name : "She";
    G.selfBfId = null;
    if (/yes|yeah|sure|ok|of course|why not|please/.test(input)) {
      _say(`${name} settles her own fee with the till — a professional formality, ` +
        "handled in three seconds — and steers you out under the neon by the arm. " +
        "Being chosen, it turns out, is a different currency entirely.", "win");
      _addHappy(3);
      _endNight("barfine");
    } else {
      _say(`${name} takes it well — a small laugh, a smaller shrug — but something ` +
        "in the room closes like a till drawer. The other girls look at you the " +
        "way one looks at a man who returned a winning lottery ticket.");
      _addHappy(-1);
    }
  },

  police(input) {
    const exits = Object.values(_room().exits);
    const barRoom = exits.find(to => ROOMS[to].barType && G.soc.mamaTreat[to]);
    if (barRoom && _rand() < 0.7) {
      const mama = Object.keys(NPCS).find(nid =>
        NPC_ROLES[nid] === "mamasan" && _npcRoom(nid) === barRoom);
      const mamaName = mama ? NPCS[mama].name : "The mamasan";
      _say(`A door bangs. ${mamaName} crosses the ` +
        "soi at ramming speed, already talking — fast, low Thai, one hand on the " +
        "officer's arm like an aunt collecting a nephew. Whatever is said ends " +
        "with a laugh, a wai in your direction, and the boy in brown evaporating " +
        "into the traffic. “You walk me back inside now,” she says, “and you " +
        "walk STRAIGHT.”", "win");
      _addHappy(2);
      return;
    }
    if (/wai|sorry|khrap|krub|apolog|sawatdee/.test(input)) {
      const f = Math.min(300, G.money);
      G.money -= f;
      _say("You wai first and apologise second, in Thai, both hands steady-ish. " +
        "The officer's arithmetic visibly adjusts for manners. " +
        (f ? `฿${f} changes hands inside a handshake old as the force itself. ` : "") +
        `“Drink water, my friend. Go home slow.” (฿${G.money} left.)`, "alert");
      _addHappy(-1);
    } else if (/pay|fine|give|baht|ok|yes|here/.test(input)) {
      const f = Math.min(500, G.money);
      G.money -= f;
      _say((f ? `฿${f} disappears into a shirt pocket with a receipt that will never ` +
        "exist. " : "He turns out your pockets, finds lint, and looks personally " +
        "offended. ") +
        "“Fine paid. No problem now. Sawatdee khrap.” The brown uniform strolls on, " +
        `scanning the crowd for the next swaying farang. (฿${G.money} left.)`, "alert");
      _addHappy(-2);
    } else {
      const f = Math.min(1000, G.money);
      G.money -= f;
      _say("You argue. His smile does not move, but a second uniform materialises " +
        "at your elbow, and the fine develops a friend. " +
        (f ? `฿${f} lighter, ` : "Pockets already empty, you are ") +
        "you are released into the night with a pat on the shoulder that means " +
        `it could always be worse. (฿${G.money} left.)`, "alert");
      _addHappy(-4);
    }
  },

  katoey(input) {
    if (/flirt|kiss|snog|fondle|grope|spank|charm|wink|lean in/.test(input)) {
      _say("You lean into it and flirt right back — to her enormous, cackling " +
        "delight. Both hands return instantly to visible airspace. “Oooooh, " +
        "hansum man SANUK!” She plants a lipstick mark on your cheek, pronounces " +
        "you number one, and strolls off having stolen nothing but the moment. " +
        "Respect, it turns out, is also currency on Beach Road.");
      _addHappy(2);
      return;
    }
    if (/pocket|wallet|push|shove|step|back|away|off|no|stop|hand|guard|hold|run/.test(input)) {
      _say("You clamp a hand over your pocket and step out of reach. She rolls her " +
        "eyes, entirely unembarrassed — “Cannot blame for trying, na~” — and struts " +
        "off down the road in search of drunker prey. Your baht survive.");
    } else if (G.money === 0) {
      G.money += 5;
      _say("Expert fingers sweep your pockets and find… lint. She steps back, looks " +
        "you up and down, and something like genuine pity crosses the perfect face. " +
        "A ฿5 coin is pressed into your palm. “For lucky, you poor thing.” She " +
        "leaves. You are now ฿5 richer and considerably poorer in spirit.");
    } else {
      const lost = Math.min(G.money, 40);
      G.money -= lost;
      _say("By the time you finish formulating a reply she is gone — melted into " +
        `the crowd, along with ฿${lost} from your pocket. The oldest two-handed ` +
        "trick on Beach Road, performed by a true professional. " +
        `(฿${G.money} left.)`, "alert");
      _addHappy(-2);
    }
  },

  bargirl() {
    G.money += 20;
    if (G.itemLoc.moo_ping === null) G.itemLoc.moo_ping = "inventory";
    _say("Before you can say a word she presses a ฿20 note and a moo ping skewer " +
      "into your hands, pats your cheek with tremendous sincerity, and says you " +
      "look EXACTLY like her mom's ex-boyfriend, who was a good man, jing jing, " +
      "and also always have bad night. Her friends drag her back inside, waving " +
      `apologies. (฿${G.money} — and dinner.)`);
    _say("(You now have the moo ping skewer.)", "dim");
    _addHappy(2);
  },

  brit(input) {
    if (/sorry|apolog|calm|mate|friend|wai|easy|misunderstand|mistake|my bad|buy you/.test(input)) {
      G.money += 50;
      _say("“…Nah. Nah, you’re alright, you’re alright.” The rage evaporates as " +
        "fast as it arrived, replaced by the crushing sentimentality of the very " +
        "drunk. “Sorry mate. Been a mad one.” He presses ฿50 into your hand — " +
        "“get yourself a beer, yeah?” — hugs you briefly but completely, and " +
        `lurches off toward the neon. (฿${G.money}.)`);
      _addHappy(1);
    } else if (/fight|punch|hit|swing|shove|push|square|come on|idiot|wanker|muppet yourself/.test(input)) {
      const lost = Math.min(G.money, 30);
      G.money -= lost;
      _say("A mistake. There is a brief, undignified tangle — and then two piwins " +
        "materialise out of nowhere, peel him off you with practised ease, and " +
        "walk him away like a wardrobe. In the shuffle you’ve shed " +
        (lost ? `฿${lost} in coins` : "nothing but your composure") +
        ". A piwin looks back at you: “No fighting, boss. Bad for everybody.”" +
        (lost ? ` (฿${G.money} left.)` : ""), "alert");
      _addHappy(-2);
      G.hurt++;
      if (G.hurt >= 3) _endNight("hurt");
    } else {
      _say("You blink at him with perfect, bottomless neutrality. Somewhere behind " +
        "the sunburn the thread is lost. “…Wrong bloke. Sorry pal.” He apologises " +
        "to you, then to a lamppost, and reels away into the night.");
    }
  },

  powerbank(input) {
    if (/yes|yeah|sure|ok|thank|khop|krub|krap|please|borrow|charge|why not/.test(input)) {
      G.battery = Math.min(100, G.battery + 30);
      _say("He plugs you in and you shoot the breeze — football, petrol prices, " +
        "whose girlfriend works where — while the number climbs. Twenty minutes " +
        `of Pattaya small talk later your phone reads ${G.battery}%. He waves ` +
        "away your thanks: “Next time, you take motosai, na?”");
      _addHappy(1);
    } else {
      _say("He shrugs and pockets the power bank — your funeral, boss — and goes " +
        "back to watching the street with professional calm.");
    }
  },

  freelancer(input) {
    const both = /both|two|friend|ning|threesome|them/.test(input);
    const yes = both || /yes|ok|sure|company|come|deal|her|why not/.test(input);
    if (!yes) {
      _say("You smile, wai lightly, and keep walking. “Mai pen rai~” — no offence " +
        "taken, none given. Behind you, she and Ning resume their professional " +
        "appraisal of the passing trade.");
      return;
    }
    if (!_flag("act1Done")) {
      _say("She reads the sand on your shirt and the ฿-nothing in your posture in " +
        "one glance, and laughs — kindly, but thoroughly. “Maybe tomorrow, hansum.” " +
        "Even Ning looks sympathetic.");
      return;
    }
    // Freelance: cheaper than a barfine (no bar, no mamasan taking a cut), but
    // no bar means no ledger and nobody to complain to. Most are fine — some
    // vanish with your wallet while you sleep. Roll her kind now (a friend along
    // makes it a touch safer; two of them are known to each other).
    const price = both ? 1400 : 700;
    if (G.money < price) {
      _say(`The number is ฿${price}. Your pocket says ฿${G.money}. She pats your ` +
        "cheek — “ATM broken? Sad story” — and turns back to the rail.");
      return;
    }
    G.money -= price;
    if (both) _setFlag("hadThreesome");
    const safe = _rand() < (both ? 0.78 : 0.6);
    if (!safe) { _endNight("robbed"); return; }
    if (both) {
      _say(`฿${price}, and Ning stops pretending not to listen. What follows — the ` +
        "motosai ride three-up (illegal, hilarious), the night bazaar snacks, the " +
        "hotel corridor shushing, and the rest of it — will be retold by you, " +
        "badly, for the rest of your life, to anyone who asks and several who " +
        "don't. (฿" + G.money + " left, every one of them irrelevant.)", "win");
      _addHappy(7);
    } else {
      const flavor = _rand() < 0.5 ?
        "Before you go she thumbs a message to a friend — “she know where I am, " +
        "na” — freelance but not foolish. " :
        "Turns out she cashiers at a 7-Eleven in Naklua by day and does this for " +
        "the school fees; you get the whole life story on the walk over. ";
      _say(`฿${price} settles it — no ledger, no mamasan, the commission all hers. ` +
        flavor + "She takes your arm; the promenade approves.", "win");
    }
    _endNight("barfine");
  },

  // Not everyone in a bar is for sale. Treat the Bangkok weekender like the
  // trade and she's insulted; treat her like a person and you get a genuine,
  // free moment (the "didn't pay" satisfaction the expats brag about).
  bkktourist(input) {
    if (/money|baht|barfine|how much|price|\bpay\b|upstairs|hotel|short time|long time|come with/.test(input)) {
      _say("Her face closes like a shop shutter. “I am NOT working, khun.” She says " +
        "something short and sharp in Thai to no one in particular, steps back, and " +
        "pointedly returns to her phone. A working girl who watched the whole thing " +
        "is laughing at you from a doorway.", "alert");
      _addHappy(-1);
      return;
    }
    if (/hi|hello|sawat|wai|chat|talk|nice|friend|wait|who|from|smile|drink|coffee/.test(input)) {
      _say("You keep it light — a wai, a where-you-from, no agenda. She thaws: Bangkok, " +
        "down for the weekend with a girlfriend who is, as ever, late. You trade the " +
        "small nothings of two people not trying to sell each other anything. Then a " +
        "voice shrieks her name — the friend, at last — and she's gone with a real " +
        "smile and a “bye khaaa~”. You spent nothing and somehow feel richer.", "win");
      _addHappy(2);
      return;
    }
    _say("You give her a nod and let her be. Her friend arrives moments later in a " +
      "cloud of perfume and apology, and the two fold into the crowd. Not everything " +
      "on this street is a transaction; some of it is just Saturday.");
  },

  // The bi-curious Japanese traveller: read her right (no pitch, no wallet) and
  // she proposes bringing a dancer along. Two-step — the offer re-arms pendingEnc.
  jptourist(input) {
    if (_flag("jpDeal")) {
      G.flags.jpDeal = false;
      if (!/yes|ok|sure|both|girl|dancer|her|deal|please|hai|why not|game|let/.test(input)) {
        _say("“Mm. Another time, cutie.” She turns back to the rail, entirely " +
          "unbothered, already recruiting a plan B with her eyes.");
        return;
      }
      const fee = 1000; // she pays her own way; the dancer's barfine is on you
      if (G.money < fee) {
        _say(`She glances at your wallet. “I don't pay the bar for her — that part is ` +
          `you, and that part is ฿${fee}.” Your pocket says ฿${G.money}. “Cash first, ` +
          "romance second,” she shrugs, and the moment closes.");
        return;
      }
      G.money -= fee;
      _setFlag("hadThreesome");
      _say("You settle the dancer's barfine; the Japanese lady settles everything " +
        "else with a look. What follows is a blur of a taxi, a rooftop bar she " +
        "somehow already knows, and a night that quietly rearranges your sense of " +
        `your own luck. (-฿${fee}. ฿${G.money} left, and every baht irrelevant.)`, "win");
      _addHappy(8);
      _endNight("barfine");
      return;
    }
    if (/money|baht|barfine|how much|price|\bpay\b/.test(input)) {
      _say("She laughs, delighted and cold. “You think I am working? Kawaii. No — I " +
        "choose, I don't pay, and neither do you… for me.” She's already looking past " +
        "you at the dancers. You have been filed under 'amateur'.", "alert");
      _addHappy(-1);
      return;
    }
    if (/flirt|drink|buy|hi|hello|konnichiwa|konbanwa|cheers|join|both|girl|dancer|open|game|cool|yes|sure|nice/.test(input)) {
      G.pendingEnc = "jptourist";
      _setFlag("jpDeal");
      _encPrompt(
        ["You match her wavelength — no pitch, just game — and she decides she " +
          "likes you. She tilts her head at a dancer working the pole like it owes her " +
          "money. “That one. I like her. You like her.” The smile widens. “Maybe… we " +
          "like her together?”", "win"],
        ["(YES — and you cover the dancer's barfine. NO — no hard feelings.)", "dim"]);
      return;
    }
    _say("You hesitate a half-second too long. “Too slow, cutie.” She glides off " +
      "toward the bar with the ease of a woman who has never once bought her own " +
      "drink or her own company.");
  },

  // British lesbian at the go-go rail: not for you and not for sale, but a great
  // ally if you're decent. Hands-on gets a confrontation; good vibes = wingman.
  britles(input) {
    if (/grope|grab|touch|fondle|kiss|snog|cop a feel|hand on/.test(input)) {
      _say("Your hand gets about halfway before her pint hand redirects it, hard, and " +
        "her voice cuts across the music: “OI. Do you mind?” Two dancers and a mamasan " +
        "are suddenly at her shoulder — she's more popular in here than you'll ever be " +
        "— and you are stared at until you leave of your own accord.", "alert");
      _addHappy(-2);
      return;
    }
    if (/money|baht|barfine|how much|price|\bpay\b|short time|long time|come with|shag|hotel/.test(input)) {
      _say("She laughs into her pint. “Mate. I'm not working, AND I'm not into blokes. " +
        "That's two strikes and you've not even bought me a drink.” It's said kindly. " +
        "It is also final.");
      _addHappy(-1);
      return;
    }
    if (/hi|hello|cheers|drink|buy|nice|respect|cool|wingman|help|which|recommend|good|game|sound/.test(input)) {
      G.wingmanUntil = G.turns + WINGMAN_TURNS;
      _say("“Tell you what — you seem alright.” She clinks her glass to nothing. “See " +
        "one you fancy? I'll put a word in. These girls trust me a damn sight more than " +
        "they'll ever trust you, no offence.” For a little while, you've got the best " +
        "wingman on Walking Street.", "win");
      _addHappy(2);
      return;
    }
    _say("You nod, she nods, and you both go back to appreciating the view — hers " +
      "professional, yours amateur. No harm, no foul.");
  },

  // The punter's Filipina wife: warm and connected, but she is a WIFE. Grope her
  // and the husband (and the piwins) educate you; be decent and she wings for you.
  punterwife(input) {
    if (/grope|grab|touch|fondle|kiss|snog|cop a feel|hand on|spank/.test(input)) {
      const lost = Math.min(G.money, 300);
      G.money -= lost;
      G.hurt = Math.min(3, G.hurt + 1);
      _say("You put a hand where a hand should never go. Her husband is not slow and " +
        "the piwins are slower only than him. It is brief, it is one-sided, and it is " +
        "educational. You are on the pavement before the apology forms" +
        (lost ? `, ฿${lost} lighter and a rib unhappier` : ", a rib unhappier") +
        ". “Not in my town, sunshine.”", "alert");
      _addHappy(-4);
      return;
    }
    if (/money|baht|barfine|how much|price|\bpay\b|short time|long time|come with/.test(input)) {
      _say("She blinks, then laughs — a real one. “Oh, honey. No. I'm the one wearing " +
        "the ring.” She waggles it at you, more amused than offended. Her husband " +
        "hasn't noticed; lucky you.");
      _addHappy(-1);
      return;
    }
    if (/hi|hello|nice|respect|cheers|congrat|married|wife|husband|talk|chat|cool|lovely|good/.test(input)) {
      G.wingmanUntil = G.turns + WINGMAN_TURNS;
      _say("“Aw, you're sweet.” She looks you over, decides you're harmless, and leans " +
        "in conspiratorially. “Come — let me find you a good one. I know which of these " +
        "girls is trouble and which is treasure. Twenty years I watch this soi.” For a " +
        "while, you're under a wife's expert protection.", "win");
      _addHappy(2);
      return;
    }
    _say("You give her a polite nod and leave her to her people-watching. She dips her " +
      "head, gracious, and goes back to enjoying everyone else's mistakes.");
  },

  pingpong(input) {
    if (!/yes|go|show|watch|see|up|why not|ok|sure/.test(input)) {
      _say("You wave him off. He keeps pace for half a block, price falling with " +
        "every step — six hundred, five hundred, FOUR hundred my friend — before " +
        "peeling away toward a stag party in matching singlets. They're doomed.");
      return;
    }
    if (G.money < 600) {
      _say("He walks you two steps up the stairs before the doorman's practiced eye " +
        "prices your pockets at under the minimum. You are returned to street level " +
        "with impressive economy.");
      return;
    }
    G.money -= 600;
    _setFlag("sawPingPong");
    _say("Up the stairs, ฿600 lighter before your eyes adjust. What follows is " +
      "briefly astonishing, mostly dispiriting, and involves exactly the projectile " +
      "sport advertised. Then the lights come up, your 'one drink' turns out to " +
      "have been three at ฿250 each — the bill is a laminated ambush, the doormen " +
      "are suddenly numerous, and you pay what it takes to leave.", "alert");
    const gouge = Math.min(400, G.money);
    G.money -= gouge;
    _say(`(฿${600 + gouge} total for the famous scam of Walking Street. Every farang ` +
      `pays the tuition exactly once. ฿${G.money} left.)`, "dim");
    _addHappy(-3);
  },

  peddler(input) {
    const deal = _flag("peddlerDeal");
    const px = { watch: deal ? 200 : 300, shades: deal ? 100 : 150, vits: deal ? 120 : 200 };
    if (/haggle|bargain|cheap|discount|too much|lower/.test(input)) {
      G.pendingEnc = "peddler"; // still at your elbow — next command is still the reaction
      if (deal) {
        _say("He clutches his chest — the international sign for “you are killing " +
          "me and my family”. The floor has been reached. " +
          `(WATCH ฿${px.watch} · SUNGLASSES ฿${px.shades} · VITAMINS ฿${px.vits} · or NO.)`);
        return;
      }
      G.flags.peddlerDeal = true;
      _say("You name a lower number in the local fashion — pained, apologetic, as " +
        "though the price wounded you both. A beat. Then the smile of a man " +
        "meeting a worthy opponent: “Okayyy. For you, special.” " +
        "(WATCH ฿200 · SUNGLASSES ฿100 · VITAMINS ฿120 · or NO.)");
      _addHappy(1);
      return;
    }
    delete G.flags.peddlerDeal;
    if (/watch|rolex/.test(input)) {
      if (G.money < px.watch) { _say(`฿${px.watch} for the 'Rolex'. He inspects your ฿` + G.money + " and moves along, unoffended."); return; }
      G.money -= px.watch;
      G.itemLoc.fake_rolex = "inventory";
      _say(`฿${px.watch}, and the 'Rolex' is yours — fitted on your wrist with jeweller's ` +
        `ceremony and a squeeze of the forearm. (฿${G.money} left.)`);
      _say("(You now have the genuine Rolex (allegedly).)", "dim");
      _addHappy(1);
    } else if (/glass|shade|sun/.test(input)) {
      if (G.money < px.shades) { _say(`฿${px.shades} for the RayBens, and you haven't got it. He tips an invisible hat.`); return; }
      G.money -= px.shades;
      G.itemLoc.shades = "inventory";
      _say(`฿${px.shades}. The RayBens go on immediately, indoors, at night. Perfect. (฿${G.money} left.)`);
      _say("(You now have the designer sunglasses.)", "dim");
      _addHappy(1);
    } else if (/vitamin|pill|med|blue/.test(input)) {
      if (G.money < px.vits) { _say(`฿${px.vits} for the 'vitamins'. Your pockets decline on your behalf.`); return; }
      G.money -= px.vits;
      G.itemLoc.vitamin_v = "inventory";
      _say(`฿${px.vits} changes hands with the discretion of a state secret, which fools ` +
        `no one — the whole bar saw, and the whole bar is delighted. (฿${G.money} left.)`);
      _say("(You now have the packet of 'vitamins'. The hostesses will NEVER let this go.)", "dim");
      _addHappy(1);
    } else {
      _say("A slow head-shake. He re-shoulders the display board — watches swinging " +
        "like wind chimes — and moves down the bar to a man who has already made " +
        "eye contact, the fatal error.");
    }
  },

  tonic(input) {
    if (/yes|buy|ok|sure|deal|take it|fine/.test(input)) {
      if (G.money < TONIC_PRICE) {
        _say(`You turn out your pockets: ฿${G.money}. He closes the briefcase with ` +
          "the quiet disappointment of a man who has badly misjudged his mark, " +
          "and evaporates.");
      } else {
        G.money -= TONIC_PRICE;
        G.itemLoc.hair_tonic = "inventory";
        _say(`Somehow — you will replay this moment for years — you hand over ฿${TONIC_PRICE} ` +
          "and receive one brown bottle. He shakes your hand with both of his, " +
          "wishes your family long life, and is gone before the receipt (there is " +
          `no receipt) hits the ground. (฿${G.money} left.)`);
        _say("(You now have the bottle of hair tonic.)", "dim");
        _addHappy(-1);
      }
    } else {
      _say("You keep walking. He keeps pace for exactly eleven more compliments, " +
        "then peels away toward a sunburnt couple with the smoothness of a man " +
        "who has done this ten thousand times tonight.");
    }
  },
};

