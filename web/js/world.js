// The Last Baht Bus — world data: rooms, items, NPCs, gossip chain.
// Pure data, no DOM (unit-tested via node:vm). The engine (engine.js) walks
// these tables; puzzle-specific behaviour lives in the engine's handlers.
//
// Canon: Soi Sanuk / Pattaya nightlife universe. PG-13 wink throughout.

// ── Constants ──────────────────────────────────────────────────────────────

const BUS_FARE   = 15;   // baht bus, any hop on a line
const MOTOSAI_TOWN = 50; // motosai hop inside town
const MOTOSAI_FAR  = 100;// motosai to/from the Darkside
const LADY_DRINK = 150;  // canon
const BEER_PRICE = 80;   // your own big Chang, bar price
const BELL_PRICE = 300;  // ring it and the round is on you
const CHARGER_PRICE = 59;
const SAFE_PIN = 719;    // ๗๑๙ — stage number 71 + lucky 9

// ── Rooms ──────────────────────────────────────────────────────────────────
// exits: direction → roomId. "in"/"out" for bars. dark: needs phone light.
// busStop: name of the bus line serving it. motosai: stand present.

const ROOMS = {

  // ─── Jomtien ───
  jomtien_beach: {
    name: "Jomtien Beach",
    region: "Jomtien",
    desc: "Soft sand, folded-up loungers, and the last smear of sunset dying over the sea. " +
      "A row of beached longtails to the south. The beach road glows to the east. " +
      "Your face was in this sand until about a minute ago.",
    exits: { n: "dongtan_beach", e: "jomtien_beach_rd" },
  },
  dongtan_beach: {
    name: "Dongtan Beach",
    region: "Jomtien",
    dark: true,
    desc: "The quieter stretch north of Jomtien proper. By day it's rainbow flags and " +
      "beach chairs; right now it's shapes and shadows and the hiss of surf.",
    exits: { s: "jomtien_beach", e: "jomtien_beach_rd" },
  },
  jomtien_beach_rd: {
    name: "Jomtien Beach Road",
    region: "Jomtien",
    desc: "Streetlights, seafood smoke, and baht buses rattling past. Soi Rompho's " +
      "neon flickers to the east, a 7-Eleven hums to the south, and the bus stop " +
      "is just north. Pratumnak Hill rises darkly to the far north.",
    exits: { w: "jomtien_beach", e: "soi_rompho", s: "jomtien_7eleven", n: "jomtien_bus_stop" },
  },
  soi_rompho: {
    name: "Soi Rompho",
    region: "Jomtien",
    desc: "The market soi: grilled chicken, plastic stools, and a row of open-front beer " +
      "bars where ladies of a certain vintage call out to gentlemen of a similar one. " +
      "Everyone here has seen everything twice.",
    exits: { w: "jomtien_beach_rd" },
  },
  jomtien_7eleven: {
    name: "7-Eleven (Jomtien)",
    region: "Jomtien",
    desc: "The cold blast of air-con and the doorbell jingle of civilisation. Shelves " +
      "of toasties, Mama noodles, and phone accessories. There's a power outlet by the window.",
    outlet: true,
    shop: { charger: CHARGER_PRICE },
    exits: { n: "jomtien_beach_rd" },
  },
  jomtien_bus_stop: {
    name: "Baht Bus Stop (Jomtien)",
    region: "Jomtien",
    desc: "A cluster of people waiting where the blue songthaews swing around. A sun-bleached " +
      "sign lists the loop into Pattaya. A lone motosai driver naps on his bike nearby.",
    busStop: "jomtien",
    motosai: true,
    exits: { s: "jomtien_beach_rd", n: "pratumnak_rd" },
  },

  // ─── Pratumnak Hill ───
  pratumnak_rd: {
    name: "Pratumnak Hill Road",
    region: "Pratumnak",
    dark: true,
    desc: "The hill road between Jomtien and Pattaya proper — condos behind walls, " +
      "sleeping soi dogs, and long stretches where the streetlights have given up. " +
      "The Buddha Hill viewpoint is up a path to the west.",
    exits: { s: "jomtien_bus_stop", n: "ws_gate", w: "buddha_hill" },
  },
  buddha_hill: {
    name: "Buddha Hill Viewpoint",
    region: "Pratumnak",
    dark: true,
    desc: "The big golden Buddha watches the bay with infinite patience. Below, the whole " +
      "curve of Pattaya glitters — Walking Street burning neon-pink at the south end. " +
      "Someone has left an offering of marigolds and a small bottle of red Fanta.",
    exits: { e: "pratumnak_rd" },
  },

  // ─── Beach Road spine ───
  beach_rd_s: {
    name: "Beach Road South",
    region: "Beach Road",
    desc: "The south end of Beach Road, where the palms wear fairy lights and the baht " +
      "buses bunch up like beads. The Walking Street arch blazes to the south. A motosai " +
      "stand idles on the corner, drivers watching the street like sleepy hawks.",
    busStop: "beachrd",
    motosai: true,
    exits: { s: "ws_gate", n: "beach_rd_c", e: "buakhao_s" },
  },
  beach_rd_c: {
    name: "Beach Road Central",
    region: "Beach Road",
    desc: "Mid-Beach-Road: tour groups, tailor touts, and the sea breathing in the dark " +
      "beyond the promenade. Soi Buakhao is a few blocks inland to the east.",
    busStop: "beachrd",
    exits: { s: "beach_rd_s", n: "beach_rd_n", w: "promenade", e: "buakhao_n" },
  },
  promenade: {
    name: "Beach Promenade",
    region: "Beach Road",
    desc: "The paved walk between road and sand. Couples, joggers who've made bad choices, " +
      "and ladies standing in the lamplight with nowhere in particular to be. The " +
      "bins are full of collectable glass, if a man were desperate.",
    exits: { e: "beach_rd_c" },
  },
  beach_rd_n: {
    name: "Beach Road North",
    region: "Beach Road",
    desc: "The north end, near the Dolphin roundabout. Soi 6 runs inland to the east — " +
      "short, loud, and lit like a runway. Naklua lies further north, past the roundabout.",
    busStop: "beachrd",
    exits: { s: "beach_rd_c", e: "soi6_street", n: "naklua_rd" },
  },

  // ─── Walking Street ───
  ws_gate: {
    name: "Walking Street Gate",
    region: "Walking Street",
    desc: "The famous arch, buzzing and flickering: WALKING STREET PATTAYA. Music from a " +
      "dozen doorways collides overhead. The strip runs south; Beach Road and the hill " +
      "road meet here.",
    exits: { s: "ws_south", n: "beach_rd_s", w: "pratumnak_rd" },
  },
  ws_south: {
    name: "Walking Street (South)",
    region: "Walking Street",
    desc: "Neon canyon. Touts with laminated menus of happiness. NEON PARADISE A-GO-GO " +
      "strobes on the west side; CLUB MIRAGE shimmers opposite, appropriately hard to focus on. " +
      "A dark side-alley slinks off between them.",
    exits: { n: "ws_gate", s: "ws_north", w: "neon_paradise", e: "club_mirage", in: "neon_paradise", out: "ws_gate", alley: "ws_alley" },
  },
  ws_alley: {
    name: "Walking Street Side-Alley",
    region: "Walking Street",
    dark: true,
    desc: "Kitchen steam, stacked kegs, a motorbike with no plates. The kind of alley " +
      "where wallets change hands in both directions.",
    exits: { out: "ws_south", e: "ws_south" },
  },
  ws_north: {
    name: "Walking Street (North End)",
    region: "Walking Street",
    desc: "The strip's deep end. CRYSTAL PALACE A-GO-GO drips fake chandeliers over the " +
      "door, PARADISE NIGHTS CLUB thumps beside it, and the MIDNIGHT SUN BAR glows a " +
      "gentler yellow for the sit-and-talk crowd.",
    exits: { n: "ws_south", w: "crystal_palace", e: "paradise_nights", s: "midnight_sun" },
  },
  neon_paradise: {
    name: "Neon Paradise A-Go-Go",
    region: "Walking Street",
    bar: "Neon Paradise A-Go-Go", barType: "gogo",
    desc: "Chrome poles, mirror walls, and a sound system you feel in your fillings. " +
      "Dancers rotate with the unhurried confidence of professionals. Security by the " +
      "door: two large gentlemen who have never once been surprised.",
    exits: { out: "ws_south" },
  },
  club_mirage: {
    name: "Club Mirage",
    region: "Walking Street",
    bar: "Club Mirage", barType: "gogo",
    desc: "Dry ice and violet lasers. Everything in here looks better than it is, " +
      "which is the business model.",
    exits: { out: "ws_south" },
  },
  crystal_palace: {
    name: "Crystal Palace A-Go-Go",
    region: "Walking Street",
    bar: "Crystal Palace A-Go-Go", barType: "gogo",
    desc: "Rhinestones on everything that holds still. The DJ booth rules a wall of subs; " +
      "the cashier's cage glitters like a shrine.",
    exits: { out: "ws_north" },
  },
  paradise_nights: {
    name: "Paradise Nights Club",
    region: "Walking Street",
    bar: "Paradise Nights Club", barType: "club",
    desc: "A proper club: queue rope, wristbands, and drinks that cost like the airport. " +
      "The dance floor heaves.",
    exits: { out: "ws_north" },
  },
  midnight_sun: {
    name: "Midnight Sun Bar",
    region: "Walking Street",
    bar: "Midnight Sun Bar", barType: "beer", pool: true,
    desc: "An open-front beer bar with actual conversation levels. Connect 4 boards and " +
      "sticky Jenga blocks on every table, and a pool table under a low lamp at the " +
      "back. The yellow neon sun above the till has one ray that won't stop twitching.",
    exits: { out: "ws_north" },
  },

  // ─── Soi Buakhao ───
  buakhao_n: {
    name: "Soi Buakhao (North)",
    region: "Soi Buakhao",
    desc: "The expat artery: pharmacies, laundry, bars, repeat. Somewhere a coverband is " +
      "doing that to 'Hotel California'. The market sprawl is south; LUCKY TIGER BAR " +
      "roars quietly on the corner.",
    exits: { w: "beach_rd_c", s: "buakhao_market", e: "lucky_tiger", in: "lucky_tiger" },
  },
  buakhao_market: {
    name: "Buakhao Market",
    region: "Soi Buakhao",
    desc: "Tarps, fans, fruit pyramids, and a man forever restacking ice crates behind a " +
      "som tam cart. The smell of papaya salad could pull you here from two sois away. " +
      "CINDY BAR's rose-pink sign glows just south; SILK ROSE and JASMINE GARDEN share " +
      "the block east.",
    exits: { n: "buakhao_n", s: "buakhao_s", w: "cindy_bar", e: "silk_rose", in: "cindy_bar" },
  },
  buakhao_s: {
    name: "Soi Buakhao (South)",
    region: "Soi Buakhao",
    desc: "The south end, where Tree Town's fairy-lit maze of mini-bars spills onto the " +
      "pavement. The LK Metro arch is east — a soi that eats tourists and spits out " +
      "poorer, happier ones. A motosai stand waits by the corner, engines ticking.",
    motosai: true,
    exits: { n: "buakhao_market", w: "beach_rd_s", e: "lk_entrance", s: "jasmine_garden", in: "jasmine_garden" },
  },
  cindy_bar: {
    name: "Cindy Bar",
    region: "Soi Buakhao",
    bar: "Cindy Bar", barType: "beer",
    outlet: true,
    desc: "A rose-pink corner bar, spotless, with a bell over the till and a wall of " +
      "photos going back decades — same bar, same smile, different haircuts. Cindy runs " +
      "the room like a harbourmaster. There's a power outlet under the counter, " +
      "for customers she likes.",
    exits: { out: "buakhao_market" },
  },
  lucky_tiger: {
    name: "Lucky Tiger Bar",
    region: "Soi Buakhao",
    bar: "Lucky Tiger Bar", barType: "beer",
    desc: "Tiger stripes on the bar top, a golden waving cat with dead batteries, and a " +
      "pool table with a lean you could ski off. Loud, friendly, dangerous to wallets " +
      "in the normal, voluntary way.",
    exits: { out: "buakhao_n" },
  },
  silk_rose: {
    name: "Silk Rose Bar",
    region: "Soi Buakhao",
    bar: "Silk Rose Bar", barType: "beer",
    desc: "Quieter. Silk flowers in Singha bottles, a cashier doing sudoku, and two " +
      "regulars who have been mid-argument about football since 2019.",
    exits: { out: "buakhao_market" },
  },
  jasmine_garden: {
    name: "Jasmine Garden Bar",
    region: "Soi Buakhao",
    bar: "Jasmine Garden Bar", barType: "beer",
    desc: "Plants everywhere — real ones, thriving, which tells you someone here shows " +
      "up in daylight too. Jasmine garlands over the spirit house out front.",
    exits: { out: "buakhao_s" },
  },

  // ─── LK Metro ───
  lk_entrance: {
    name: "LK Metro (Entrance Arch)",
    region: "LK Metro",
    desc: "The neon arch of LK METRO, gateway to a pocket maze of go-gos and beer bars. " +
      "Painted directions in Thai point into the tangle. Shared security lounges by the " +
      "arch on plastic stools — bounce out of one bar here and you've bounced out of all of them.",
    sign: "maze_entrance",
    exits: { w: "buakhao_s", in: "lk_maze_1", e: "lk_maze_1" },
  },
  lk_maze_1: {
    name: "LK Metro (Inner Lane)",
    region: "LK Metro",
    desc: "Bars stacked shoulder to shoulder, neon bleeding into neon. GOLD RUSH LOUNGE " +
      "glitters to the north. Painted Thai arrows on the wall offer guidance to those " +
      "who can read them.",
    sign: "maze_1",
    exits: { w: "lk_entrance", n: "gold_rush", e: "lk_maze_2", s: "lk_maze_3", in: "gold_rush" },
  },
  lk_maze_2: {
    name: "LK Metro (Cross Lane)",
    region: "LK Metro",
    desc: "A crossing of lanes that all look identical. STARLIGHT BAR's blue sign fizzes " +
      "on the corner. More Thai arrows, more decisions.",
    sign: "maze_2",
    exits: { w: "lk_maze_1", n: "starlight_bar", e: "lk_maze_4", s: "lk_maze_3", in: "starlight_bar" },
  },
  lk_maze_3: {
    name: "LK Metro (Back Lane)",
    region: "LK Metro",
    dark: true,
    desc: "The maze's unlit armpit: kitchen doors, a mop graveyard, and rats with " +
      "routines. Without light, every exit feels like the same wrong one.",
    sign: "maze_3",
    exits: { n: "lk_maze_1", w: "lk_maze_2", e: "lk_maze_4" },
  },
  lk_maze_4: {
    name: "LK Metro (Deep Corner)",
    region: "LK Metro",
    dark: true,
    desc: "The deepest corner of the maze, where the neon gives out entirely. One big " +
      "sign burns at the end of the lane: RAINBOW GIRLS BAR, every letter a different colour.",
    sign: "maze_4",
    exits: { w: "lk_maze_2", n: "lk_maze_3", e: "rainbow_girls", in: "rainbow_girls" },
  },
  gold_rush: {
    name: "Gold Rush Lounge",
    region: "LK Metro",
    bar: "Gold Rush Lounge", barType: "beer",
    desc: "Gold tinsel, gold bar stools, gold-painted everything, none of it gold. A " +
      "nervous sweetness to the place, like it's trying hard on its first week too.",
    exits: { out: "lk_maze_1" },
  },
  starlight_bar: {
    name: "Starlight Bar",
    region: "LK Metro",
    bar: "Starlight Bar", barType: "beer",
    desc: "Blue LEDs pricked into the ceiling like a planetarium with a drinks licence. " +
      "The pours are honest and the banter is not.",
    exits: { out: "lk_maze_2" },
  },
  rainbow_girls: {
    name: "Rainbow Girls Bar",
    region: "LK Metro",
    bar: "Rainbow Girls Bar", barType: "gogo",
    desc: "Madam Oy's flagship: the best-run go-go in the maze. A DJ booth with actual " +
      "taste, a cashier's cage strung with fairy lights, and a door marked ห้ามเข้า " +
      "behind the bar — guarded by security who look extremely employed. " +
      "Somewhere behind that door is an office, and in that office is a safe.",
    sign: "office_door",
    exits: { out: "lk_maze_4", office: "oy_office" },
  },
  oy_office: {
    name: "Madam Oy's Office",
    region: "LK Metro",
    desc: "Ledgers squared to the desk edge, a shrine shelf with fresh marigolds, framed " +
      "photos: a farm gate in Isaan, a young dancer with a number pinned to her hip, " +
      "three condo lobbies. Bolted to the floor: a steel safe with a Thai-numeral keypad.",
    exits: { out: "rainbow_girls" },
  },

  // ─── Soi 6 ───
  soi6_street: {
    name: "Soi 6",
    region: "Soi 6",
    desc: "Short, bright, and absolutely certain what it's for. Girls call from every " +
      "doorway with the enthusiasm of a home crowd. PINK LOTUS LOUNGE, GOLDEN DRAGON " +
      "BAR, and SUNSET DREAMS LOUNGE compete for your attention at volume.",
    exits: { w: "beach_rd_n", n: "pink_lotus", e: "golden_dragon", s: "sunset_dreams", in: "pink_lotus" },
  },
  pink_lotus: {
    name: "Pink Lotus Lounge",
    region: "Soi 6",
    bar: "Pink Lotus Lounge", barType: "soi6",
    desc: "Pink everything, giggles on tap, and a staircase behind the bar that nobody " +
      "pretends is for storage. You are greeted like a returning war hero.",
    exits: { out: "soi6_street" },
  },
  golden_dragon: {
    name: "Golden Dragon Bar",
    region: "Soi 6",
    bar: "Golden Dragon Bar", barType: "soi6",
    desc: "A gold dragon coils over the bar, scales made of bottle caps. The jukebox is " +
      "stuck on 2009 and no one is complaining.",
    exits: { out: "soi6_street" },
  },
  sunset_dreams: {
    name: "Sunset Dreams Lounge",
    region: "Soi 6",
    bar: "Sunset Dreams Lounge", barType: "soi6",
    desc: "Softer lighting, softer voices, a mural of a beach sunset better looking than " +
      "the real one tonight. The gentlest landing on the soi.",
    exits: { out: "soi6_street" },
  },

  // ─── The Darkside ───
  sukhumvit_crossing: {
    name: "Sukhumvit Crossing",
    region: "Darkside",
    desc: "Eight lanes of Sukhumvit Road roaring between you and the Darkside — the east " +
      "side, where expats go when they stop being tourists. On foot this is a coin flip " +
      "with a truck. The motosai drivers do it forty times a night.",
    motosai: true,
    exits: { e: "khao_talo" },
  },
  khao_talo: {
    name: "Soi Khao Talo",
    region: "Darkside",
    desc: "A long, plain soi of beer bars with no neon budget and no need for one. The " +
      "ladies here are older, the customers older still, and every bar knows every " +
      "customer's pour. It's seedier than town and more honest about it. One bar's " +
      "doorway glows warmer than the rest.",
    exits: { w: "sukhumvit_crossing", n: "lake_mabprachan", in: "khao_talo_bar", e: "khao_talo_bar" },
  },
  khao_talo_bar: {
    name: "Daeng's Place (Khao Talo)",
    region: "Darkside",
    barType: "beer", pool: true,
    outlet: true,
    desc: "A beer bar with a ceiling fan, a shrine over the till, and photos of Walking " +
      "Street's glory days behind the bar — including one of a dancer mid-spin that " +
      "you'd swear is the woman now pouring your drink. There's an outlet by the cooler.",
    exits: { out: "khao_talo" },
  },
  lake_mabprachan: {
    name: "Lake Mabprachan",
    region: "Darkside",
    desc: "Still water, lakeside restaurants, retired expats walking retired soi dogs. " +
      "Families eat grilled fish under string lights. It's so peaceful your ears ring. " +
      "Nobody here has been pickpocketed since the nineties.",
    exits: { s: "khao_talo" },
  },

  // ─── Naklua ───
  naklua_rd: {
    name: "Naklua Road",
    region: "Naklua",
    desc: "North of the Dolphin roundabout the volume drops by half: seafood restaurants, " +
      "temples, long-stay hotels. Your hotel's soi is up ahead, dark as a power cut.",
    busStop: "beachrd",
    exits: { s: "beach_rd_n", n: "hotel_soi" },
  },
  hotel_soi: {
    name: "Hotel Soi (Naklua)",
    region: "Naklua",
    dark: true,
    desc: "Your soi. No streetlights — the municipality has been 'fixing' them since " +
      "March. Somewhere down there is a bed with your name on it.",
    exits: { s: "naklua_rd", n: "hotel_room" },
  },
  hotel_room: {
    name: "Your Hotel Room",
    region: "Naklua",
    desc: "Room 412. The air-con stutters awake. The bed is exactly as terrible as you " +
      "remember and right now it looks like paradise.",
    exits: {},
  },
};

// ── Signs (id → Thai lines; the engine renders + optionally translates) ────

const SIGNS = {
  maze_entrance: { th: "ทางเข้า →", hint: "an arrow pointing into the maze" },
  maze_1: { th: "ร้านทอง: ตรงไป · สตาร์ไลท์: ขวา", hint: "two painted arrows with Thai labels" },
  maze_2: { th: "เรนโบว์: ขวา · ทางออก: ซ้าย", hint: "two more arrows — one may matter a lot" },
  maze_3: { th: "ห้องน้ำ", hint: "a lone word over a grim doorway" },
  maze_4: { th: "เรนโบว์: ตรงไป", hint: "one final arrow, pointing at the rainbow sign" },
  office_door: { th: "ห้ามเข้า", hint: "red letters on the door behind the bar" },
};

// ── Items ──────────────────────────────────────────────────────────────────
// location: roomId, "inventory" (start), or null (not in play yet).

const ITEMS = {
  phone: {
    name: "phone", aliases: ["mobile", "flashlight", "torch", "light"],
    portable: true, location: "inventory",
    desc: "Your phone. Battery anxiety made object. The flashlight works — for now.",
  },
  receipt: {
    name: "7-Eleven receipt", aliases: ["receipt", "paper"],
    portable: true, location: "inventory",
    desc: "A crumpled 7-Eleven receipt from your pocket. The print is in Thai.",
    readTh: "เซเว่นอีเลฟเว่น สาขาซอยบัวขาว 03:12\nมาม่า ×2 ... ๑๒ บาท\nชาเขียว ... ๒๐ บาท",
    readEn: "7-Eleven, SOI BUAKHAO branch, 03:12 — Mama noodles ×2, green tea. " +
      "So that's where you were at three in the morning.",
  },
  noodles: {
    name: "packet of Mama noodles", aliases: ["mama", "noodles", "packet"],
    portable: true, location: "inventory",
    desc: "Half a packet of Mama noodles, chicken flavour. Dry. Technically food. " +
      "A soi dog would commit crimes for this.",
  },
  bottle1: {
    name: "empty Chang bottle", aliases: ["bottle", "chang bottle", "glass"],
    portable: true, location: "jomtien_beach",
    desc: "An empty Chang big bottle. Deposit value: ฿5 to the right buyer.", bottle: true,
  },
  bottle2: {
    name: "empty Leo bottle", aliases: ["bottle", "leo bottle", "glass"],
    portable: true, location: "dongtan_beach",
    desc: "An empty Leo bottle, sand in the neck. Worth ฿5 in deposit.", bottle: true,
  },
  bottle3: {
    name: "empty Singha bottle", aliases: ["bottle", "singha bottle", "glass"],
    portable: true, location: "jomtien_beach_rd",
    desc: "An empty Singha bottle standing politely by a bin. ฿5 of glass.", bottle: true,
  },
  charger: {
    name: "phone charger", aliases: ["charger", "cable"],
    portable: true, location: null, // bought at 7-Eleven
    desc: "A ฿59 USB charger of heroic optimism. Pair with an outlet to resurrect your phone.",
  },
  helmet: {
    name: "spare helmet", aliases: ["helmet"],
    portable: true, location: null, // given by Bank
    desc: "Bank's spare helmet — hot pink, with a Rainbow Girls Bar sticker on the side. " +
      "He wants it delivered to Pim at the Starlight Bar.",
  },
  som_tam: {
    name: "som tam (extra spicy)", aliases: ["som tam", "somtam", "papaya salad", "salad", "food"],
    portable: true, location: null, // given by Cindy
    desc: "A takeaway box of som tam poo plara, spicy enough to be classed as a weapon. " +
      "Cindy's peace offering for Ploy, the cashier at Rainbow Girls.",
  },
  moo_ping: {
    name: "moo ping skewer", aliases: ["moo ping", "mooping", "skewer", "pork", "food"],
    portable: true, location: null, // pressed on you by a sentimental bargirl
    desc: "A grilled pork skewer, still warm, glistening with the good marinade. " +
      "Technically dinner. A soi dog would trade its entire territory for this.",
  },
  hair_tonic: {
    name: "bottle of hair tonic", aliases: ["tonic", "hair tonic", "bottle of tonic"],
    portable: true, location: null, // sold to you, in the loosest sense of "sold"
    desc: "HIMALAYAN HERBAL HAIR TONIC — 100% GROW BACK GUARANTEE. Smells of cooking " +
      "oil and ambition. The ฿99 you paid for it is in another province by now.",
  },
  poster: {
    name: "faded poster", aliases: ["poster", "photo", "picture"],
    portable: false, location: "gold_rush",
    desc: "A faded Walking Street poster from another decade: 'CRYSTAL PALACE PRESENTS " +
      "— MISS OY — DANCER No. 71'. The young woman in the photo has a look you " +
      "recognise from somewhere much more recent.",
  },
  marigolds: {
    name: "marigold offering", aliases: ["marigolds", "flowers", "offering", "garland"],
    portable: false, location: "buddha_hill",
    desc: "Somebody's offering. Absolutely not yours to take. The red Fanta too.",
  },
  safe: {
    name: "steel safe", aliases: ["safe", "keypad"],
    portable: false, location: "oy_office",
    desc: "A floor-bolted steel safe. The keypad's buttons are Thai numerals: " +
      "๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙. It wants three digits.",
  },
  wallet: {
    name: "your wallet", aliases: ["wallet"],
    portable: true, location: null, // inside the safe
    desc: "Your wallet! Cards, hotel key card, and — miraculously — most of the cash. " +
      "Tucked inside: a note in careful English: 'Farang — you buy Mot's dinner tonight. " +
      "Be more careful. — Oy'.",
  },
};

// ── NPCs ───────────────────────────────────────────────────────────────────
// dialogue: ordered list; the engine picks the FIRST entry whose `req` flags
// are all set (and `notFlags` unset). `sets` flags fire on delivery.
// topic: matches "ask X about <topic>"; entries without topic answer "talk to X".
// th/rom: a spoken Thai line rendered before the English (TTS if available).

const NPCS = {

  nok: {
    name: "Auntie Nok", th: "น้อยหน่า", emoji: "🥭",
    room: "jomtien_beach_rd",
    desc: "A drinks-cart vendor with a cooler of everything and opinions to match. " +
      "A hand-lettered sign on the cart offers ฿5 per returned bottle.",
    dialogue: [
      { req: ["gotBusFare"], text: "\"Bus stop that way, na. Tell driver where you go, pay when you get off. FIFTEEN baht now — everything expensive since the war, jing jing.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh, you awake! You sleep on beach like soi dog, hahaha. You want water? No money? Aiyee.\" She taps the sign on her cart. \"Bring bottle, I give five baht. Beach full of bottle. Farang leave everything.\"" },
      { topic: "wallet", text: "\"Wallet gone? Beach at night, tilac. You lucky they leave your shoes. Go town, ask the bar ladies — nothing happen in Pattaya they don't know.\"" },
      { topic: "bus", text: "\"Baht bus fifteen baht now. Used to be ten! Iran war, petrol crazy. Everybody complain, everybody still ride.\"" },
    ],
  },

  bank: {
    name: "Bank", th: "แบงค์", emoji: "🏍️",
    room: "beach_rd_s",
    desc: "A motosai driver in an orange vest, boots up on his handlebars, watching the " +
      "street with professional calm. The other drivers at the stand defer to him.",
    dialogue: [
      { req: ["helmetDelivered"], th: "โอเคเลย", rom: "okay loei",
        text: "\"My man! Pim say thank you. You need ride anywhere — special price. And listen: you have problem with anyone on this street, you stand next to Bank, okay?\"" },
      { req: ["knowMot"], notFlags: ["helmetDelivered", "hasHelmet"],
        text: "\"Mot? Little rat. He run, we watch. Hey — do me a favour, na? My girlfriend Pim, Starlight Bar, LK Metro. Take her my spare helmet, she forget again. I no can leave stand.\" He holds out a hot-pink helmet.", sets: ["hasHelmet"], gives: "helmet" },
      { th: "ไปไหนครับ", rom: "pai nai khrap",
        text: "\"Where you go, boss? Motosai fifty baht in town, hundred to Darkside. Faster than bus, more fun than walking, safer than both — nobody touch you on Bank's bike.\"" },
      { topic: "pim", text: "\"Pim my girlfriend. Starlight Bar. Smartest girl in LK Metro — five years there, know everybody's everything.\" He grins. \"Don't tell her I said 'girlfriend', she say we 'talking'.\"" },
      { topic: "darkside", text: "\"Darkside? Lake, family, old farang with fat dog. And Khao Talo — old-school soi. Hundred baht I take you. Bus charter more.\"" },
    ],
  },

  cindy: {
    name: "Cindy", th: "ซินดี้", emoji: "🌹",
    room: "cindy_bar",
    desc: "The mamasan of Cindy Bar — sharp as a razor, warm as a Chang on a hot night, " +
      "and on the soi longer than most expats have had passports. She clocked you the " +
      "second you walked in.",
    dialogue: [
      { req: ["somTamAccepted"], notFlags: ["somTamDelivered"],
        text: "\"Som tam not deliver itself, tilac. Rainbow Girls Bar, LK Metro, deep corner — give it to PLOY at the cashier cage. Wai first. She melt.\"" },
      { req: ["knowWasHere"], notFlags: ["knowMot"], th: "จำได้สิ", rom: "jam dai si",
        text: "\"Of course I remember you! Three a.m., singing, buying Mama noodles next door. You leave with big group toward LK Metro — and Mot follow you out. Little pickpocket, work the drunk ones.\" She narrows her eyes. \"Ask Lek at Lucky Tiger. She see Mot this morning. OR—\" she smiles sweetly \"—buy me lady drink and I tell you everything faster.\"",
        sets: ["knowMot"] },
      { th: "สวัสดีค่ะที่รัก", rom: "sawatdee kha tilac",
        text: "\"Welcome to Cindy Bar! First time? No — wait.\" She studies you. \"You look like a man with a story and no wallet to put it in. Sit. Talk to Cindy.\"" },
      { topic: "wallet", req: ["knowOyHasIt"],
        text: "\"Oy has it? Then it's safe — safer than in your pocket, clearly. But Oy… ai, she make you work for it. Take her som tam from the market cart — extra spicy, tell them 'Cindy's order'. Give it to Ploy her cashier, and doors open.\" She waves at the cart across the soi.", sets: ["somTamAccepted"], gives: "som_tam" },
      { topic: "wallet", notFlags: ["knowWasHere"],
        text: "\"Lost wallet? Mmm. And what makes you think Cindy knows something?\" She polishes a glass, watching you. \"Show me you were even here last night and maybe my memory improve.\" (Perhaps something in your pockets proves it.)" },
      { topic: "oy", text: "\"Madam Oy. We come up together — Crystal Palace, different lifetime. She hard like teak now but she was farm girl from Isaan same as me. Wai her properly and she remember she has a heart. Somewhere.\"" },
      { topic: "mot", req: ["knowMot"], text: "\"Mot sell everything he lift to one buyer — always the same. Ask around LK Metro who that is.\" She mimes zipping her lip and pointing at the till: lady drink territory." },
    ],
  },

  lek: {
    name: "Lek", th: "เล็ก", emoji: "💃",
    room: "lucky_tiger",
    desc: "Petite, bright smile, glittery earrings catching the bar lights. She's beating " +
      "two customers at pool simultaneously.",
    dialogue: [
      { req: ["knowMot"], notFlags: ["knowOyHasIt"], th: "อุ๊ยจริงหรอ", rom: "ui jing ro",
        text: "\"Mot?! That little— okay okay. This morning he come here all big smile, buy whisky-cola, PAY CASH. Say he 'do business' with Madam Oy at Rainbow Girls. Business!\" She snorts. \"Your wallet in Oy's safe by lunchtime, guarantee.\"",
        sets: ["knowOyHasIt"] },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello handsome! You play pool? No? Good — you look like you lose enough already tonight.\" The earrings flash as she laughs." },
      { topic: "oy", text: "\"Madam Oy? Big boss of LK Metro. Undefeated at Connect 4 since two thousand nine. Do NOT play her.\"" },
    ],
  },

  noi: {
    name: "Noi", th: "น้อย", emoji: "🌸",
    room: "neon_paradise",
    desc: "Tall, long dark hair, a knowing look that suggests she's already guessed why " +
      "you're here and finds it funny.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Paradise.\" A beat. \"The bar, na — the other kind you find yourself.\" The knowing look intensifies." },
      { topic: "wallet", text: "\"Walking Street eats wallets, tilac. But real professionals work the beach and the bus stops. Town gossip flows through Soi Buakhao — the beer bars, not here. Here is only volume.\"" },
    ],
  },

  ping: {
    name: "Ping", th: "ปิง", emoji: "✨",
    room: "paradise_nights",
    desc: "Cheerful, sparkly top throwing glitter across the wall, never stops smiling " +
      "even when shouting drink orders over the bass.",
    dialogue: [
      { th: "สนุกไหม", rom: "sanuk mai",
        text: "\"Having fun?! This club so loud I answer questions nobody ask yet!\" She beams and slides you a glass of iced water on the house. \"You look like you need free one.\"" },
    ],
  },

  aom: {
    name: "Aom", th: "อ้อม", emoji: "🌙",
    room: "club_mirage",
    desc: "Mysterious, sharp eyes, a slow smile that arrives about four seconds after " +
      "whatever caused it. She materialised beside you rather than walked.",
    dialogue: [
      { th: "หวัดดี", rom: "watdee",
        text: "\"...You lost something.\" Not a question. The slow smile begins its journey. \"Everything lost in Pattaya is in somebody's pocket. The trick is learning whose.\"" },
      { topic: "mot", req: ["knowMot"], text: "\"Mot works the alley beside this bar when Walking Street is thick. Small hands, fast feet.\" The smile completes. \"Slow brain, though.\"" },
    ],
  },

  joy: {
    name: "Joy", th: "จอย", emoji: "💕",
    room: "pink_lotus",
    desc: "Bubbly, laughing at everything you say before you finish saying it — the " +
      "undisputed morale champion of Pink Lotus Lounge.",
    dialogue: [
      { th: "มาแล้วเหรอ", rom: "maa laeo roe",
        text: "\"You come back!! Wait— no, you new. Same same!\" She collapses in giggles. \"Sit down sit down! You buy me lady drink? Upstairs very nice—\" she catches your expression \"—okay okay, water for you, story for me, hahaha!\"" },
      { topic: "wallet", text: "\"No wallet?!\" Gales of laughter. \"Tilac, on THIS soi that is a very serious medical condition. Go Soi Buakhao — the mamasans there fix everything. Especially Cindy. Everybody's problems go to Cindy.\"" },
    ],
  },

  fon: {
    name: "Fon", th: "ฝน", emoji: "🌺",
    room: "jasmine_garden",
    desc: "Shy, half-hiding behind the plants she obviously waters herself. She brightens " +
      "the instant anyone tries even one word of Thai.",
    dialogue: [
      { req: ["greetedFon"], th: "พูดไทยเก่ง", rom: "phuut thai keng",
        text: "\"Your Thai so good!\" (It was one word.) She emerges from the ferns entirely. \"The jasmine is for the spirit house. You want to know anything about this soi, ask me — quietly.\"" },
      { text: "She gives you a small wave from behind a monstera and goes back to pretending to check her phone. Perhaps a proper Thai greeting would help." },
      { topic: "oy", req: ["greetedFon"],
        text: "\"Madam Oy come to the market every morning, seven o'clock, buy marigolds for her shrine. Alone. No security.\" Fon blushes at her own boldness. \"She more soft than she look.\"" },
    ],
  },

  gift: {
    name: "Gift", th: "กิ๊ฟ", emoji: "💎",
    room: "crystal_palace",
    desc: "Confident, perfect makeup, running the floor of Crystal Palace with the crisp " +
      "authority of a duty-free manager.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Crystal Palace, welcome. Drinks menu, no touching, and whatever you heard about the fishbowl, it's a myth.\" A wink calibrated to the milligram." },
      { topic: "oy", text: "\"Madam Oy danced HERE, you know. Before my time — number seventy-something, they say she was the best on the street. Now she owns half of LK Metro and all of its secrets.\"" },
    ],
  },

  kwan: {
    name: "Kwan", th: "กวาง", emoji: "🦋",
    room: "sunset_dreams",
    desc: "Gentle, soft-voiced, folding paper napkins into birds while the soi roars outside.",
    dialogue: [
      { th: "เหนื่อยไหม", rom: "nueai mai",
        text: "\"You look tired,\" she says, and somehow it's the kindest thing anyone's said to you all night. She sets a paper crane by your hand. \"For luck. The soi makes everyone lucky once.\"" },
    ],
  },

  nong: {
    name: "Nong", th: "น้อง", emoji: "🌸",
    room: "gold_rush",
    desc: "Sweet, visibly new — first week on the soi — checking her phone between " +
      "customers and startling whenever the door opens.",
    dialogue: [
      { topic: "oy", th: "อย่าบอกนะ", rom: "yaa bok na",
        text: "\"Mamasan Oy? She— she scary. But fair! She pay for my mother's hospital, you know. Don't tell her I said.\" She glances at the faded poster on the wall. \"That her, when she dance. Number seventy-one. She keep the number for everything — locker, motorbike plate, everything.\"",
        sets: ["pinPart71"] },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"W-welcome to Gold Rush! First week— I mean, MY first week. The gold is paint. I'm not supposed to say that. Please don't tell.\"" },
    ],
  },

  pim: {
    name: "Pim", th: "พิม", emoji: "💋",
    room: "starlight_bar",
    desc: "Five years behind this bar and never once paid for her own drink. She looks " +
      "you over like a customs officer with a sense of humour.",
    dialogue: [
      { req: ["hasHelmet"], notFlags: ["helmetDelivered"], th: "อ้าว", rom: "aow",
        text: "\"My helmet! That man—\" she softens for exactly one frame \"—okay, Bank is sweet. Sometimes.\" She spins the helmet onto the back shelf. \"You did him a favour, so: one answer free. Choose the question well, darling.\"",
        sets: ["helmetDelivered"] },
      { topic: "oy", req: ["helmetDelivered"], notFlags: ["pinPart9"],
        text: "\"Madam Oy runs everything you can see from this stool. Lucky number? เก้า — nine. Nine candles at her shrine, ninth of the month she pays wages, table nine reserved forever.\" Pim taps the bar. \"Whatever lock she owns, there's a nine in it. That was your free answer, darling.\"",
        sets: ["pinPart9"] },
      { topic: "oy", notFlags: ["helmetDelivered"],
        text: "\"Madam Oy? Mmm. Information about the Mamasan is premium shelf, darling.\" She taps the lady-drink menu meaningfully: ฿150." },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Well well. You have the look of a man on a quest.\" She rests her chin on her hand. \"Starlight Bar: honest pours, dishonest company. What do you want to know and what's it worth?\"" },
    ],
  },

  ploy: {
    name: "Ploy", th: "พลอย", emoji: "💐",
    room: "rainbow_girls",
    desc: "The cashier, in a cage of fairy lights, counting money with impossible speed. " +
      "Former dancer's posture; engagement ring worn on a chain. Her boyfriend doesn't " +
      "love her working here, so the cage suits everyone.",
    dialogue: [
      { req: ["somTamDelivered"], notFlags: ["officeOpen"], th: "เผ็ดกำลังดี", rom: "phet kamlang dii",
        text: "\"Cindy's som tam! You SAINT.\" She inhales the box through the cage bars. \"Okay, listen. Office door locks itself when the music is loud — Mamasan's rule. When DJ Beer plays HER song, security walk the floor and the door... forgets to lock.\" She nods microscopically toward the DJ booth. \"Request 'Sabai Sabai'. Then be quick and be invisible.\"",
        sets: ["knowDoorTrick"] },
      { req: ["waiedPloy"], notFlags: ["somTamDelivered"],
        text: "\"So polite! Farang who wai — Mamasan would like you.\" She glances at the ห้ามเข้า door. \"Whatever you're here for, sweetheart, I can't help from inside the cage. Unless...\" she sniffs the air theatrically \"...you happened to know somebody who owes me som tam.\"" },
      { text: "She counts a brick of hundreds without looking up. \"Drinks at the bar, sweetheart. Cage is for money and me.\"" },
      { topic: "oy", text: "\"Mamasan is the best boss on this soi and the scariest, and those are the same fact.\" The counting never stops." },
    ],
  },

  dj_beer: {
    name: "DJ Beer", th: "ดีเจเบียร์", emoji: "🎧",
    room: "rainbow_girls",
    desc: "The DJ, headphones half-on, nodding to something only partially related to " +
      "what's playing. His booth is a fortress of stickers and Red Bull cans.",
    dialogue: [
      { req: ["knowDoorTrick"], notFlags: ["sabaiPlaying"], topic: "sabai sabai",
        th: "จัดให้", rom: "jat hai",
        text: "\"Sabai Sabai? Mamasan's song, bro. She come out for this one, EVERY time — security too, they all sing.\" He grins and cues it up. The opening bars roll out warm as a sunset, and sure enough the room turns toward the floor like plants toward light.",
        sets: ["sabaiPlaying"] },
      { text: "He lifts one headphone. \"Request? No Wonderwall. House rule. Wonderwall is a lady drink fine.\"" },
    ],
  },

  security: {
    name: "security", th: "รปภ.", emoji: "🦍",
    room: "rainbow_girls",
    desc: "Three large men arranged around the room like load-bearing furniture. One " +
      "watches the door marked ห้ามเข้า specifically. They are polite, immovable, and " +
      "backed by every piwin within three sois.",
    dialogue: [
      { req: ["sabaiPlaying"], text: "They're on the dance floor. All three. Arms around each other's shoulders, singing 'Sabai Sabai' with their eyes closed. The office door stands unwatched." },
      { text: "The nearest one smiles like a bank vault. \"Sawatdee khrap. Bar is that way, boss.\" The ห้ามเข้า door might as well be on the moon." },
    ],
  },

  oy: {
    name: "Madam Oy", th: "ออย", emoji: "👑",
    room: "rainbow_girls",
    desc: "The Mamasan. Undefeated since 2009. She surveys her flagship from the end of " +
      "the bar with the stillness of someone who owns the building, two more like it, " +
      "and three condos. You have the sudden feeling your posture is being graded.",
    dialogue: [
      { req: ["waiedOy", "knowOyHasIt"], notFlags: ["oyGaveWallet"], topic: "wallet",
        th: "มารยาทดีนี่", rom: "maayaat dii nii",
        text: "\"Good manners.\" She looks at you a long moment — the farm gate in Isaan, the dancer with the number on her hip, all of it somewhere behind those eyes. \"Mot brought me a wallet. I bought it so it would not go in the sea, and to see what kind of man come looking.\" She produces it from behind the bar like a magician bored of the trick. \"A polite one. Ha. Take it. Buy Mot's dinner — he eats because tourists are careless, and that is not entirely his fault.\"",
        sets: ["oyGaveWallet", "hasWallet"], gives: "wallet" },
      { req: ["knowOyHasIt"], topic: "wallet",
        text: "\"A wallet?\" The temperature drops two degrees. \"Many wallets in Pattaya, khun farang. Mine are in a safe.\" She turns away — but slowly, like a door left ajar. (Manners might open it. A proper wai.)" },
      { th: "เชิญค่ะ", rom: "choen kha",
        text: "\"Welcome to Rainbow Girls.\" Four words, and somehow you feel both invited and inventoried. \"Drink, or business?\"" },
      { topic: "isaan", req: ["waiedOy"],
        text: "Something crosses her face too quick to name. \"Roi Et province. Rice, buffalo, one road.\" A pause. \"Everyone on this soi is from somewhere like it. Remember that when you count your change, na.\"" },
    ],
  },

  daeng: {
    name: "Daeng", th: "แดง", emoji: "🌶️",
    room: "khao_talo_bar",
    desc: "The owner — mid-forties, laugh lines over old glitter, pouring with a bar " +
      "towel over one shoulder. The dancer in the Walking Street photos behind her, " +
      "unmistakably. She was number 72.",
    dialogue: [
      { req: ["knowOyHasIt"], th: "โอ้โห นานแล้ว", rom: "oho, naan laeo",
        text: "\"Oy has your wallet? HA!\" She slaps the bar. \"I danced next to that woman for six years — she was 71, I was 72, Crystal Palace, best legs on the street, both of us.\" She leans in, delighted. \"Listen, jing jing: her number is everything to her. Seventy-one. And she put lucky nine on the end of every code she ever made since the farm. You didn't hear it from Daeng.\"",
        sets: ["pinPart71", "pinPart9"] },
      { th: "เข้ามาสิ", rom: "khao maa si",
        text: "\"Come in, come in! Farang on Khao Talo — you lost, or you smart?\" She's already opening a Chang. \"Sit. Out here the beer is cold and the stories are old. Best combination.\"" },
      { topic: "oy", text: "\"Oy and me come up together, Walking Street, when you still count the year in one-nine.\" She taps the photo behind her. \"She got the empire. I got the quiet life and the better knees. We both won.\"" },
      { topic: "darkside", text: "\"The Darkside good to us old girls. Rent cheap, customers loyal, nobody in a hurry. The lake is for the married ones — go see, it's like Pattaya with the volume off.\"" },
    ],
  },

  gary: {
    name: "Lake Gary", th: "แกรี่", emoji: "🎣",
    room: "lake_mabprachan",
    desc: "A sun-cured expat of indeterminate decade walking an elderly golden retriever. " +
      "He has the serene look of a man whose 7-Eleven receipts are all groceries now.",
    dialogue: [
      { th: "สบายดีไหม", rom: "sabai dii mai",
        text: "\"Evenin'. Twenty-two years here, eight in town, fourteen at the lake — town's for sprinting, lake's for living.\" The retriever confirms with a sigh. \"You look like you're mid-sprint, son. It gets better. Married her, didn't I — met her at the Midnight Sun in '04.\"" },
      { topic: "wallet", text: "\"Lost the wallet? Classic first act.\" He chuckles. \"The ladies of this town run the best information network east of Bangkok. Be polite, buy a few drinks, wai like you mean it — it'll find you before you find it.\"" },
    ],
  },

  mot: {
    name: "Mot", th: "มด", emoji: "🐜",
    room: "ws_alley",
    desc: "A skinny kid in a fake Barça shirt, materialising from behind the kegs only " +
      "after word got around that you're not the swinging type. Quick eyes, quicker feet.",
    dialogue: [
      { req: ["hasWallet"], th: "ขอโทษครับพี่", rom: "kho thot khrap phi",
        text: "\"Sorry, phi. Business only, nothing personal.\" He shrugs with his whole body. \"Madam Oy pay fair and never ask where things come from. You get it back? ...She TOLD you to buy my dinner?! \" He looks genuinely moved. \"Khao man gai, forty baht. I know a cart.\"" },
      { req: ["knowOyHasIt"], text: "A shape flickers behind the kegs and is gone. Fast feet. You get the strong impression Mot knows exactly who you are and prefers ballistic distance." },
      { text: "Rats, steam, dark. Nobody here. Nobody staying here, anyway." },
    ],
  },
};

// ── Bus lines (ordered stops; ride costs BUS_FARE per trip) ────────────────

const BUS_LINES = {
  jomtien: ["jomtien_bus_stop", "beach_rd_s"],
  beachrd: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "naklua_rd"],
};

// ── Motosai destinations (from any stand) ──────────────────────────────────

const MOTOSAI_DESTS = {
  "walking street": { room: "ws_gate", price: MOTOSAI_TOWN },
  "beach road":     { room: "beach_rd_c", price: MOTOSAI_TOWN },
  "soi buakhao":    { room: "buakhao_market", price: MOTOSAI_TOWN },
  "lk metro":       { room: "buakhao_s", price: MOTOSAI_TOWN },
  "soi 6":          { room: "soi6_street", price: MOTOSAI_TOWN },
  "jomtien":        { room: "jomtien_bus_stop", price: MOTOSAI_TOWN },
  "naklua":         { room: "naklua_rd", price: MOTOSAI_TOWN },
  "darkside":       { room: "khao_talo", price: MOTOSAI_FAR },
  "khao talo":      { room: "khao_talo", price: MOTOSAI_FAR },
  "lake":           { room: "lake_mabprachan", price: MOTOSAI_FAR },
};

// ── Random street encounters ───────────────────────────────────────────────
// Data only — resolution logic lives in engine.js (_ENC). Each fires at most
// once per game, only in lit street rooms, on a seeded per-game RNG.
// `interactive: true` → the intro sets G.pendingEnc and the player's NEXT
// command is their snap reaction; otherwise the encounter resolves instantly.

const TONIC_PRICE = 99;

const ENCOUNTERS = {
  katoey: {
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade", "ws_south", "ws_north"],
    interactive: true,
    th: "หล่อจังเลย", rom: "lor jang loei",
    intro: "Out of the neon, a tall and devastating vision in a sequinned dress is " +
      "suddenly pressed against you — “Hellooo hansum man~” — one hand tracing your " +
      "chest with terrific friendliness. Something else entirely is happening down " +
      "near your pocket.",
    hint: "(Quick — do something.)",
  },
  bargirl: {
    rooms: ["buakhao_n", "buakhao_market", "buakhao_s", "lk_entrance", "soi6_street", "ws_south"],
    interactive: false,
    th: "โถ น่าสงสาร", rom: "thoh, naa songsaan",
    intro: "A bargirl weaves out of the nearest doorway, somewhere past her fourth " +
      "lady drink of the shift, and stops dead at the sight of you.",
  },
  brit: {
    rooms: ["ws_gate", "ws_south", "ws_north", "soi6_street", "beach_rd_c"],
    interactive: true,
    intro: "A sunburnt mountain in a Chang vest is abruptly in your face, swaying " +
      "like a condemned building. “YOU. You’re the muppet who spilled my pint in " +
      "the Sailor’s Arms, aren’t ya?” He is enormous, very drunk, and about sixty " +
      "per cent sure.",
    hint: "(Choose your next words carefully.)",
  },
  powerbank: {
    rooms: ["jomtien_bus_stop", "beach_rd_s", "buakhao_s", "sukhumvit_crossing"],
    interactive: true,
    th: "แบตหมดเหรอ", rom: "baet mot rer?",
    intro: "The piwin at the stand nods at the phone clutched in your hand like a " +
      "dying pet. He produces a scuffed power bank from under the seat of his bike " +
      "and holds it up, eyebrows raised: want some?",
    hint: "(YES would be the traditional answer.)",
  },
  tonic: {
    rooms: ["jomtien_beach_rd", "beach_rd_c", "beach_rd_n", "promenade", "ws_gate"],
    interactive: true,
    intro: "A dapper man with a briefcase falls into step beside you. “My friend! " +
      "You have very lucky face. But—” he winces, eyes flicking to your hairline " +
      "“—I am seeing one problem.” The briefcase opens: rows of little brown " +
      "bottles. “Himalayan herbal tonic. Hair grow back one hundred per cent, " +
      "guarantee. For you, special: ninety-nine baht only.”",
    hint: "(He is not going to stop walking beside you until you answer.)",
  },
};

// ── Canon checklist (used by tests) ────────────────────────────────────────

const CANON_BARS = [
  "Lucky Tiger Bar", "Pink Lotus Lounge", "Neon Paradise A-Go-Go",
  "Golden Dragon Bar", "Sunset Dreams Lounge", "Starlight Bar",
  "Rainbow Girls Bar", "Paradise Nights Club", "Gold Rush Lounge",
  "Silk Rose Bar", "Club Mirage", "Jasmine Garden Bar",
  "Crystal Palace A-Go-Go", "Midnight Sun Bar", "Cindy Bar",
];

const CANON_HOSTESSES = [
  "lek", "noi", "ping", "aom", "joy", "fon", "gift", "kwan",
  "cindy", "nong", "pim", "oy",
];

// ── Bar social roles ────────────────────────────────────────────────────────
// A lady's role shapes what she tolerates: hostesses work the room, cashiers
// keep the books not the customers, and you do NOT lay a hand on the mamasan.
// (Ringing the bell a couple of times has been known to soften the rules.)

const NPC_ROLES = {
  lek: "hostess", noi: "hostess", ping: "hostess", aom: "hostess",
  joy: "hostess", fon: "hostess", gift: "hostess", kwan: "hostess",
  nong: "hostess", pim: "hostess",
  ploy: "cashier",
  cindy: "mamasan", oy: "mamasan", daeng: "mamasan",
};
