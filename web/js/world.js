// The Last Baht Bus — world data: rooms, items, NPCs, gossip chain.
// Pure data, no DOM (unit-tested via node:vm). The engine (engine-*.js) walks
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
const BRA_PRICE = 200;   // the mamasan's drawer novelty; makes fondling "interesting"
const BAND_ROUND = 400;  // buying the band a round (≈ bell to the mama; girls prefer the real bell)
const WINGMAN_TURNS = 15;// how long a friendly wing-woman's good word lasts
const CHARGER_PRICE = 59;
const SAFE_CASH = 3000;  // the emergency stash in the hotel room safe
const EXPAT_SAVINGS = 20000; // wired over when you make the move
// Barfines (canon: go-gos and Soi 6 are the expensive end)
const BF_BEER = 400, BF_GOGO = 1000, BF_SOI6 = 700, BF_GENTS = 900;
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
      "of toasties, Mama noodles, and {{phone}} accessories. There's a power outlet by the window.",
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
    exits: { s: "jomtien_bus_stop", n: "ws_gate", w: "buddha_hill", e: "second_rd_s" },
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
    exits: { s: "ws_gate", n: "beach_rd_c", e: "second_rd_s", w: "short_time_motel" },
  },

  short_time_motel: {
    name: "Short-Time Motel",
    region: "Beach Road",
    desc: "A dark alley off Beach Road that smells of lemongrass floor cleaner and " +
      "old air conditioning. The motel has no sign you could read from the street — " +
      "its reputation travels by word of mouth and the direction of high heels. " +
      "A small reception counter lit by one fluorescent tube. A ring of numbered " +
      "keys on a nail. Two plastic stools. An older Thai man sits behind the " +
      "counter, a thermos of coffee at his elbow, watching the alley with the " +
      "patient stillness of someone who has long stopped being surprised by anything.",
    exits: { out: "beach_rd_s" },
  },
  beach_rd_c: {
    name: "Beach Road Central",
    region: "Beach Road",
    seven: true,
    desc: "Mid-Beach-Road: tour groups, tailor touts, and the sea breathing in the dark " +
      "beyond the promenade. The glass cliff of CENTRAL mall rises a block inland, and " +
      "just south of it TEQUILA QUEEN's ancient neon señorita kicks her leg, as she " +
      "has since before you were born.",
    busStop: "beachrd",
    exits: { s: "beach_rd_s", n: "beach_rd_n", w: "promenade", e: "central_mall", in: "tequila_queen" },
  },
  tequila_queen: {
    name: "Tequila Queen A-Go-Go",
    region: "Beach Road",
    bar: "Tequila Queen A-Go-Go", barType: "gogo",
    desc: "The oldest go-go in Pattaya, and proudly unrestored: red velvet gone bald in " +
      "patches, a mirror ball missing a continent of tiles, and dancers with seniority " +
      "no mamasan would dare question. What the ladies concede in years they repay in " +
      "showmanship, and the regulars wouldn't trade one of them for the whole of " +
      "Walking Street. Mem runs the floor like a national institution, because it is one.",
    exits: { out: "beach_rd_c" },
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
      "short, loud, and lit like a runway. Naklua lies further north, past the roundabout. " +
      "STINKY BAR's sign — a cartoon skunk hoisting a Chang — buzzes over an open " +
      "front full of laughter and the crack of pool balls. Across the traffic on the " +
      "beach side (west), BLUE DOG's plastic chairs face the bay like theatre seats.",
    busStop: "beachrd",
    exits: { s: "beach_rd_c", e: "soi6_street", n: "naklua_rd", in: "stinky_bar", w: "blue_dog" },
  },
  blue_dog: {
    name: "Blue Dog",
    region: "Beach Road",
    bar: "Blue Dog", barType: "beer",
    desc: "An open-air beer bar on the beach side of the road — no walls, no door, " +
      "just a tin roof, a long rail, and an unobstructed view across the bay that " +
      "the fancier places would kill for. The plastic chairs all face outward, " +
      "toward the water and the road, because at the Blue Dog the view IS the " +
      "entertainment: the sunset first, and then whatever Beach Road decides to " +
      "do about it. The bathroom is a sandy walk past three other bars' back " +
      "doors — the whole beachside row shares the one, an arrangement older " +
      "than anyone still willing to explain it.",
    exits: { out: "beach_rd_n" },
  },
  stinky_bar: {
    name: "Stinky Bar",
    region: "Beach Road",
    bar: "Stinky Bar", barType: "beer", pool: true, liveMusic: true,
    desc: "An American-run beer bar that smells, in defiance of its name, of lime and " +
      "cue chalk. League trophies crowd the back bar; the table is brushed like a " +
      "putting green. Bert holds court from the owner's stool with a bottomless " +
      "Budweiser and opinions on everyone's break. Next door, the Blue Dog's rail " +
      "roars at a sunset — close enough to share a bathroom with, which, in fact, " +
      "the whole row does.",
    exits: { out: "beach_rd_n" },
  },
  central_mall: {
    name: "Central Mall (Beach Road front)",
    region: "Beach Road",
    outlet: true,
    desc: "The air-conditioned mothership: seven storeys of glass, brand names, and " +
      "farang families who have no idea what this town does after dinner. Free " +
      "outlets by the food court, arctic air, and security guards who wai. Beach " +
      "Road glitters west; Second Road runs behind the mall to the east; the " +
      "police station squats to the north like a paperweight.",
    exits: { w: "beach_rd_c", e: "second_rd_c", n: "police_station" },
  },
  police_station: {
    name: "Pattaya Central Police Station",
    region: "Beach Road",
    desc: "Brown uniforms, whiteboards of unpaid fines, and a desk sergeant with the " +
      "unhurried patience of a man who has seen every possible farang. A wall of " +
      "confiscated selfie sticks. Sitting between the mall and the Beach Road bars, " +
      "it catches whatever the tide washes up. Best visited voluntarily.",
    exits: { s: "central_mall", n: "beach_rd_n" },
  },

  // ─── Second Road ───
  second_rd_s: {
    name: "Second Road (South)",
    region: "Second Road",
    desc: "The working road running parallel between Beach Road and Soi Buakhao — less " +
      "neon, more motorbikes, the town with its makeup half off. It climbs south " +
      "onto the north shoulder of Pratumnak Hill, toward Jomtien beyond.",
    exits: { w: "beach_rd_s", e: "buakhao_s", n: "second_rd_c", s: "pratumnak_rd" },
  },
  second_rd_c: {
    name: "Second Road (Central)",
    region: "Second Road",
    desc: "Mid-Second-Road: baht buses in convoy, pharmacies, and the constant churn " +
      "between the mall's back doors to the west and the fairy-lit mouth of MYTH " +
      "NIGHT market to the east.",
    exits: { s: "second_rd_s", n: "second_rd_n", w: "central_mall", e: "myth_night" },
  },
  second_rd_n: {
    name: "Second Road (North)",
    region: "Second Road",
    desc: "The north stretch, where Second Road angles toward the Dolphin roundabout. " +
      "Central Pattaya Road — Pattaya Klang — crosses just ahead, cutting the whole " +
      "town into north and south.",
    exits: { s: "second_rd_c", n: "pattaya_klang" },
  },
  pattaya_klang: {
    name: "Central Pattaya Road (Pattaya Klang)",
    region: "Second Road",
    desc: "The big east-west artery, bisecting Beach Road, Second Road, and Soi Buakhao " +
      "in one straight shot from the sea to Sukhumvit. Baht buses, banks, gold shops, " +
      "and a river of traffic that never quite jams and never quite flows.",
    exits: { w: "beach_rd_n", s: "second_rd_n", e: "buakhao_n" },
  },

  // ─── Myth Night ───
  myth_night: {
    name: "Myth Night Market",
    region: "Myth Night",
    liveMusic: true,
    desc: "The newest bar complex in town: shipping-container bars, festoon lights, and " +
      "live-music stages wedged between Soi Buakhao and Second Road, directly across " +
      "from Central's glow. Young crowd, shared security in grey polos, craft beer at " +
      "double Chang prices. CANDY BAR 2's rose-pink sign is unmistakably the same " +
      "pink as the original.",
    exits: { w: "second_rd_c", e: "buakhao_n", in: "candy_bar_2" },
  },
  candy_bar_2: {
    name: "Candy Bar 2",
    region: "Myth Night",
    bar: "Candy Bar 2", barType: "beer",
    outlet: true, liveMusic: true,
    desc: "Candy's second front: the same rose-pink, the same spotless glasses, the " +
      "same bell over a newer till — the empire expands. Bee runs the floor with a " +
      "trainee's energy and the boss's exact smile. A framed photo of the original " +
      "bar hangs behind the bottles, signed 'สู้ๆ — Candy'.",
    exits: { out: "myth_night" },
  },

  // ─── Walking Street ───
  ws_gate: {
    name: "Walking Street Gate",
    region: "Walking Street",
    seven: true,
    desc: "The arch is still there — WALKING STREET PATTAYA, buzzing and flickering, famous " +
      "enough that people photograph it before they've seen what's behind it. The strip runs " +
      "south. It used to be louder. The gap between what this street was and what it is now " +
      "is not visible from the gate, but you'll feel it by the time you reach the other end.",
    exits: { s: "ws_south", n: "beach_rd_s", w: "pratumnak_rd" },
  },
  ws_south: {
    name: "Walking Street (South)",
    region: "Walking Street",
    desc: "Neon canyon, but the neon mix has changed. Bollywood bass competes with Thai pop " +
      "from somewhere inside Little India's encroachment from the east — restaurant signs in " +
      "Hindi above what used to be go-go bars, the smell of curry drifting across the touts. " +
      "NEON PARADISE A-GO-GO still strobes on the west side. CLUB MIRAGE shimmers opposite. " +
      "The touts with the laminated menus are still here. A dark side-alley slinks off " +
      "between them.",
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
    desc: "The deep end of the strip, where the go-gos that survived COVID hold their ground " +
      "through stubbornness and reputation. CRYSTAL PALACE A-GO-GO at the west, PARADISE " +
      "NIGHTS CLUB beside it. MIDNIGHT SUN BAR glows a quieter yellow at the south end — " +
      "beer bar, conversation levels, the kind of place you end up after you've stopped " +
      "trying. Late enough, the whole strip fills with barfined ladies and their friends " +
      "en route to the clubs.",
    exits: { n: "ws_south", w: "crystal_palace", e: "paradise_nights", s: "midnight_sun" },
  },
  neon_paradise: {
    name: "Neon Paradise A-Go-Go",
    region: "Walking Street",
    bar: "Neon Paradise A-Go-Go", barType: "gogo",
    desc: "Chrome poles, mirror walls, a sound system you feel in your fillings. The dancers " +
      "rotate with the unhurried confidence of professionals — fewer of them than there used " +
      "to be, and the room notices, but the ones here are good. Security by the door: two " +
      "large gentlemen who have never once been surprised and are not about to start.",
    exits: { out: "ws_south" },
  },
  club_mirage: {
    name: "Club Mirage",
    region: "Walking Street",
    bar: "Club Mirage", barType: "gogo",
    desc: "Dry ice at ankle height, violet lasers cutting through it in thin lines. Everything " +
      "in here looks better than it is — that was always the business model, and the model is " +
      "holding. The crowd is a mix: tourists who found their way in, freelancers working the " +
      "floor, bar girls two hours past their shift drinking on someone else's tab. Aom " +
      "materialises beside your stool. You didn't see her cross the floor.",
    exits: { out: "ws_south" },
  },
  crystal_palace: {
    name: "Crystal Palace A-Go-Go",
    region: "Walking Street",
    bar: "Crystal Palace A-Go-Go", barType: "gogo",
    desc: "Rhinestones on everything that holds still. The DJ booth rules a wall of subs; " +
      "the cashier's cage glitters like a shrine. On the back wall, a faded poster of " +
      "numbered dancers from a different decade — No. 71 circled in red marker, much later, " +
      "by someone who knew what they were looking at. Crystal Palace is older than most of " +
      "the girls in it, and carries itself accordingly.",
    exits: { out: "ws_north" },
  },
  paradise_nights: {
    name: "Paradise Nights Club",
    region: "Walking Street",
    bar: "Paradise Nights Club", barType: "club",
    desc: "Velvet rope, wristbands, drinks that cost like a departure lounge. The floor " +
      "heaves — tourists, freelancers working the margins, bar girls two hours past their " +
      "shift in trainers and someone else's jacket. Ping is everywhere at once. The bass " +
      "physically shortens the room.",
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
    seven: true,
    desc: "The expat artery: pharmacies, laundry, bars, repeat. ROCK FACTORY's two-storey " +
      "stage looms on the corner — currently doing what every band in Thailand does to " +
      "'Hotel California' and somehow getting away with it. LUCKY TIGER BAR is just east. " +
      "The market sprawl is south. A small handwritten LK METRO arrow on a wall points " +
      "down an alley — easy to miss, worth finding.",
    exits: { w: "myth_night", n: "pattaya_klang", s: "buakhao_market", e: "lucky_tiger",
             in: "rock_factory", alley: "lk_entrance", hotel: "metropole_room" },
  },
  buakhao_market: {
    name: "Buakhao Market",
    region: "Soi Buakhao",
    desc: "Tarps, fans, fruit pyramids, and a man forever restacking ice crates behind a " +
      "som tam cart. The smell of papaya salad could pull you here from two sois away. " +
      "CANDY BAR's rose-pink sign glows just south; SILK ROSE and JASMINE GARDEN share " +
      "the block east.",
    exits: { n: "buakhao_n", s: "buakhao_s", w: "candy_bar", e: "silk_rose", in: "candy_bar" },
  },
  buakhao_s: {
    name: "Soi Buakhao (South)",
    region: "Soi Buakhao",
    desc: "The south end, where Tree Town's fairy-lit maze of mini-bars spills onto the " +
      "pavement. The Tree Town arch is east — a complex that eats tourists and spits out " +
      "poorer, happier ones. A motosai stand waits by the corner, engines ticking.",
    motosai: true,
    exits: { n: "buakhao_market", w: "second_rd_s", e: "tt_entrance", s: "jasmine_garden", in: "jasmine_garden" },
  },
  candy_bar: {
    name: "Candy Bar",
    region: "Soi Buakhao",
    bar: "Candy Bar", barType: "beer",
    outlet: true,
    desc: "A rose-pink corner bar, spotless, with a bell over the till and a wall of " +
      "photos going back decades — same bar, same smile, different haircuts. Run like a " +
      "harbourmaster's deck, nothing out of place. There's a power outlet under the counter, " +
      "for customers the boss likes.",
    exits: { out: "buakhao_market" },
  },
  lucky_tiger: {
    name: "Lucky Tiger Bar",
    region: "Soi Buakhao",
    bar: "Lucky Tiger Bar", barType: "beer", liveMusic: true,
    desc: "Tiger stripes on the bar top, a golden waving cat with dead batteries, and a " +
      "pool table with a lean you could ski off. Loud, friendly, dangerous to wallets " +
      "in the normal, voluntary way.",
    exits: { out: "buakhao_n" },
  },
  rock_factory: {
    name: "Rock Factory",
    region: "Soi Buakhao",
    bar: "Rock Factory", barType: "beer",
    liveMusic: true, musicEveryNight: true,
    desc: "A two-storey live-music bar that earns its name: the sound hits you at the gate — " +
      "guitar, bass, and drums in genuine conversation, not just backing-track volume. The " +
      "stage is at the back, elevated two steps, a Filipino four-piece in matching black " +
      "polos working through the classic-rock songbook with the conviction of people who " +
      "have never once been wrong. A tip box balances on the monitor wedge. The crowd is " +
      "looser than a go-go and livelier than an average beer bar — one or two faces here " +
      "weren't waiting for a mamasan's nod before they showed up.",
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

  // ─── Tree Town ───
  tt_entrance: {
    name: "Tree Town (Entrance Arch)",
    region: "Tree Town",
    seven: true,
    desc: "The neon arch of TREE TOWN, gateway to a pocket maze of go-gos and beer bars. " +
      "Painted directions in Thai point into the tangle. Shared security lounges by the " +
      "arch on plastic stools — bounce out of one bar here and you've bounced out of all of them.",
    sign: "maze_entrance",
    exits: { w: "buakhao_s", in: "tt_lane_1", e: "tt_lane_1" },
  },
  tt_lane_1: {
    name: "Tree Town (Inner Lane)",
    region: "Tree Town",
    desc: "Bars stacked shoulder to shoulder, neon bleeding into neon. GOLD RUSH LOUNGE " +
      "glitters to the north. Painted Thai arrows on the wall offer guidance to those " +
      "who can read them.",
    sign: "maze_1",
    exits: { w: "tt_entrance", n: "gold_rush", e: "tt_lane_2", s: "tt_back", in: "gold_rush" },
  },
  tt_lane_2: {
    name: "Tree Town (Cross Lane)",
    region: "Tree Town",
    desc: "A junction where the lanes cross and the signage starts to feel personal — like " +
      "it was designed to confuse. STARLIGHT BAR's blue sign fizzes at the north corner. " +
      "Thai arrows point in three directions, contradicting each other with quiet confidence.",
    sign: "maze_2",
    exits: { w: "tt_lane_1", n: "starlight_bar", e: "tt_deep", s: "tt_back", in: "starlight_bar" },
  },
  tt_back: {
    name: "Tree Town (Back Lane)",
    region: "Tree Town",
    dark: true,
    desc: "The maze's unlit armpit: kitchen doors, a mop graveyard, and rats with " +
      "routines. Without light, every exit feels like the same wrong one.",
    sign: "maze_3",
    exits: { n: "tt_lane_1", w: "tt_lane_2", e: "tt_deep" },
  },
  tt_deep: {
    name: "Tree Town (Deep Corner)",
    region: "Tree Town",
    dark: true,
    desc: "The deepest corner of the maze, where the neon gives out entirely. One big " +
      "sign burns at the end of the lane: RAINBOW GIRLS BAR, every letter a different colour.",
    sign: "maze_4",
    exits: { w: "tt_lane_2", n: "tt_back", e: "rainbow_girls", in: "rainbow_girls" },
  },
  gold_rush: {
    name: "Gold Rush Lounge",
    region: "Tree Town",
    bar: "Gold Rush Lounge", barType: "beer",
    desc: "Gold tinsel, gold bar stools, gold-painted everything, none of it gold. A " +
      "nervous sweetness to the place, like it's trying hard on its first week too.",
    exits: { out: "tt_lane_1" },
  },
  starlight_bar: {
    name: "Starlight Bar",
    region: "Tree Town",
    bar: "Starlight Bar", barType: "beer",
    desc: "Blue LEDs pricked into the ceiling like a planetarium with a drinks licence. " +
      "The pours are honest and the banter is not. Pim is behind the bar, looking at you " +
      "the way she looks at everything — like she already knows the punchline.",
    exits: { out: "tt_lane_2" },
  },
  rainbow_girls: {
    name: "Rainbow Girls Bar",
    region: "Tree Town",
    bar: "Rainbow Girls Bar", barType: "gogo",
    desc: "Madam Oy's flagship: the best-run go-go in the maze. A DJ booth with actual " +
      "taste, a cashier's cage strung with fairy lights, and a door marked ห้ามเข้า " +
      "behind the bar — guarded by security who look extremely employed. " +
      "Somewhere behind that door is an office, and in that office is a safe.",
    sign: "office_door",
    exits: { out: "tt_deep", office: "oy_office" },
  },
  oy_office: {
    name: "Madam Oy's Office",
    region: "Tree Town",
    desc: "Ledgers squared to the desk edge, a shrine shelf with fresh marigolds, framed " +
      "photos: a farm gate in Isaan, a young dancer with a number pinned to her hip, " +
      "three condo lobbies. Bolted to the floor: a steel safe with a Thai-numeral keypad.",
    exits: { out: "rainbow_girls" },
  },

  // ─── Soi 6 ───
  soi6_street: {
    name: "Soi 6",
    region: "Soi 6",
    seven: true,
    desc: "The soi hits you before you round the corner — four bars at volume, each trying " +
      "to drown the next, the whole street a wall of competing bass lines and shouted Thai " +
      "pop. Open-air bars on both sides, hostesses spilling out front in sequins and very " +
      "little else. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" You are grabbed by the wrist. " +
      "You are grabbed by the other wrist. Someone significantly shorter than you attempts " +
      "to climb onto your back. PINK LOTUS LOUNGE (north), GOLDEN DRAGON BAR (east), and " +
      "SUNSET DREAMS LOUNGE (south) are the main combatants. The QUEEN VIC INN (pub) " +
      "halfway down is the one place that isn't shouting.",
    exits: { w: "beach_rd_n", n: "pink_lotus", e: "golden_dragon", s: "sunset_dreams",
             in: "pink_lotus", pub: "queen_vic" },
  },
  pink_lotus: {
    name: "Pink Lotus Lounge",
    region: "Soi 6",
    bar: "Pink Lotus Lounge", barType: "soi6",
    desc: "The front is open to the street; half the bar is technically the pavement. Neon " +
      "tubes frame the sign in three colours simultaneously. Inside, the pink is structural " +
      "— walls, barstools, the girls' outfits, arguably the air itself. Joy is already " +
      "talking before you sit down. The staircase at the back leads somewhere the menu " +
      "doesn't mention.",
    exits: { out: "soi6_street" },
  },
  golden_dragon: {
    name: "Golden Dragon Bar",
    region: "Soi 6",
    bar: "Golden Dragon Bar", barType: "soi6",
    desc: "Open-fronted, louder than you expected from outside, which is saying something. " +
      "The gold dragon above the bar was hand-painted by someone's cousin and has been " +
      "there longer than most of the staff. Vintage Thai pop on the speakers — not the " +
      "jukebox, it died in 2019, but the playlist is a faithful tribute. Nobody has " +
      "updated it and nobody has complained.",
    exits: { out: "soi6_street" },
  },
  sunset_dreams: {
    name: "Sunset Dreams Lounge",
    region: "Soi 6",
    bar: "Sunset Dreams Lounge", barType: "soi6",
    desc: "The only bar on the soi with actual walls and a door — the noise outside drops " +
      "to a manageable roar the moment you're in. Darker than the others, slower. A ceiling " +
      "fan that needs oiling. Kwan is at the end of the bar folding napkins into cranes, " +
      "adding to a row of them lined up along the rail like a tiny origami militia.",
    exits: { out: "soi6_street" },
  },
  queen_vic: {
    name: "Queen Vic Inn",
    region: "Soi 6",
    bar: "Queen Vic Inn", barType: "pub",
    desc: "Actual air conditioning. Actual wood panelling. A dartboard. The Queen Vic Inn " +
      "sits halfway down Soi 6 with the righteous calm of a man who has seen it all and " +
      "ordered another pint. Through the window, the soi performs. On the balcony above, " +
      "Terry is in a recliner watching it with a beer, and has probably been there for " +
      "some time. A staircase behind the bar leads UP to the guest rooms.",
    exits: { out: "soi6_street", up: "qv_room" },
  },
  metropole_room: {
    name: "Your Room — LK Metropole",
    region: "Soi Buakhao",
    outlet: true,
    desc: "A proper tower room at the LK Metropole: blackout curtains, aircon set " +
      "to walk-in fridge, a shower with municipal water pressure. From the window, " +
      "the LK Metro alley glows directly below like a lit fuse. The lift goes down " +
      "to the lobby on Soi Buakhao — and the fire stairs, the bellboy mentions " +
      "with a wink, come out in the alley itself.",
    exits: { out: "buakhao_n", alley: "lk_entrance" },
  },
  qv_room: {
    name: "Your Room — Queen Vic Inn",
    region: "Soi 6",
    outlet: true,
    desc: "The balcony room over the Queen Vic: wood floors, a ceiling fan with " +
      "strong opinions, and the balcony itself — a recliner, a small table, and " +
      "the whole of Soi 6 performing below like a fish tank somebody dropped a " +
      "radio into. Terry's recliner is two balconies over; he raises his beer " +
      "without looking. Sleep happens here somehow. Nobody knows how.",
    exits: { down: "queen_vic", out: "queen_vic" },
  },

  // ─── LK Metro ───
  lk_entrance: {
    name: "LK Metro (Entrance)",
    region: "LK Metro",
    desc: "The alley mouth off Soi Buakhao — easy to walk past if you don't know it's there. " +
      "A handwritten sign on the wall says LK METRO with an arrow, named for the hotel " +
      "invisible from here. Ten metres in, the alley bends and opens up and suddenly you're " +
      "somewhere. The no-entry sign for four-wheelers is doing its job: the only vehicles " +
      "threading through are motorbikes, and the only people on them are very purposeful " +
      "about where they're going.",
    exits: { out: "buakhao_n", e: "lk_main" },
  },
  lk_main: {
    name: "LK Metro (Main Alley)",
    region: "LK Metro",
    desc: "The first leg of the L: bars packed shoulder to shoulder, neon on both sides, " +
      "sound bleeding from KINKY Go-Go to the north and SLUTTY Go-Go to the south until " +
      "they're indistinguishable. Good energy — dense, close, the kind of loud that's a " +
      "decision rather than an accident. A motorbike idles past carrying a girl in full " +
      "sequins at a speed that's technically legal. The alley bends east at the far end.",
    exits: { w: "lk_entrance", n: "kinky", s: "slutty", e: "lk_bend", in: "kinky" },
  },
  lk_bend: {
    name: "LK Metro (Corner)",
    region: "LK Metro",
    desc: "The corner where the alley turns south. LAS VEGAS GO-GO burns at the end of " +
      "the second leg — the signage outspends everything else in sight. The crowd thins " +
      "slightly here: the regulars who know the place, the girls finishing a shift on the " +
      "back of a motorbike, a few tourists who followed the sound far enough to find it. " +
      "Less overwhelming than Walking Street; more like something you discovered.",
    exits: { w: "lk_main", s: "las_vegas", in: "las_vegas" },
  },
  kinky: {
    name: "KINKY Go-Go",
    region: "LK Metro",
    bar: "KINKY Go-Go", barType: "gogo",
    desc: "KINKY in hot pink and black, chrome poles catching the light in a room that's " +
      "working with what it's got. Good what-it's-got. The dancers are on their game and " +
      "they know it; the crowd is almost entirely men who've been here before, which is its " +
      "own kind of recommendation.",
    exits: { out: "lk_main" },
  },
  slutty: {
    name: "Slutty Go-Go",
    region: "LK Metro",
    bar: "Slutty Go-Go", barType: "gogo",
    desc: "The name is the entire marketing budget and it works. SLUTTY is smaller than it " +
      "looks from the door, warmer, fuller — a proper standing crowd most nights. The stage " +
      "is close enough to the bar that the dividing line is mainly theoretical.",
    exits: { out: "lk_main" },
  },
  las_vegas: {
    name: "Las Vegas Go-Go",
    region: "LK Metro",
    bar: "Las Vegas Go-Go", barType: "gogo",
    desc: "The signage budget of a casino, the floor plan of a go-go: LAS VEGAS in letters " +
      "you can probably read from Soi Buakhao. Inside it earns it — the lights are right, " +
      "the DJ is good, and the room has the particular buzz of a place that's been doing " +
      "well since COVID redistributed the western traffic from Walking Street.",
    exits: { out: "lk_bend" },
  },

  // ─── The Darkside ───
  sukhumvit_crossing: {
    name: "Sukhumvit Crossing",
    region: "Darkside",
    desc: "Eight lanes of Sukhumvit Road roaring between you and the Darkside — the east " +
      "side, where expats go when they stop being tourists. On foot this is a coin flip " +
      "with a truck. The motosai drivers do it forty times a night.",
    motosai: true,
    exits: { e: "khao_talo_strip" },
  },
  khao_talo: {
    name: "Soi Khao Talo",
    region: "Darkside",
    seven: true,
    desc: "A long, plain soi of beer bars with no neon budget and no need for one. The " +
      "ladies here are older, the customers older still, and every bar knows every " +
      "customer's pour. It's seedier than town and more honest about it. One bar's " +
      "doorway glows warmer than the rest, and from the south side MAMA YAI'S " +
      "sends out charcoal smoke and the smell of som tam being argued about.",
    exits: { w: "khao_talo_strip", n: "lake_mabprachan", in: "khao_talo_bar", e: "khao_talo_bar", s: "mama_yai" },
  },
  khao_talo_bar: {
    name: "Daeng's Place (Khao Talo)",
    // Registered like every other bar so the name taps as a venue (and doesn't
    // shed a stray "Daeng" tap onto the mamasan when the name appears in prose).
    bar: "Daeng's Place",
    region: "Darkside",
    barType: "beer", pool: true, lockIn: true,
    outlet: true,
    desc: "A beer bar with a ceiling fan, a shrine over the till, and photos of Walking " +
      "Street's glory days behind the bar — including one of a dancer mid-spin that " +
      "you'd swear is the woman now pouring your drink. There's an outlet by the cooler.",
    exits: { out: "khao_talo" },
  },
  khao_talo_strip: {
    name: "Soi Khao Talo (the strip)",
    region: "Darkside",
    desc: "The working stretch of the soi: a dozen open-front bars shoulder to " +
      "shoulder under one long tin roof, fairy lights doing the job neon does in " +
      "town at a tenth of the wattage. Ladies call the odds from bamboo rails, a " +
      "pool table clacks somewhere, and every third stool holds an expat who has " +
      "been on it since the flood. THE WATER BUFFALO and FIREFLY BAR glow " +
      "closest; the soi runs on east toward Daeng's end. At the dark end, a padded " +
      "door with no sign worth reading — THE NIGHT HERON, if you know to ask — and " +
      "beside it a dead Irish pub, THE SHAMROCK on its sun-bleached sign, shutters " +
      "down for good.",
    exits: { w: "sukhumvit_crossing", e: "khao_talo", in: "water_buffalo",
      n: "water_buffalo", s: "firefly_bar", dark: "night_heron" },
  },
  water_buffalo: {
    name: "The Water Buffalo",
    bar: "The Water Buffalo",
    region: "Darkside",
    barType: "beer", pool: true,
    desc: "A Darkside sports bar built like its namesake: wide, unhurried, and " +
      "impossible to move once settled. Three screens run three different " +
      "football matches; the pool table is the soi's court of appeal. The beer " +
      "is ten baht cheaper than town and the regulars will tell you that number " +
      "before they tell you their names.",
    exits: { out: "khao_talo_strip" },
  },
  firefly_bar: {
    name: "Firefly Bar",
    bar: "Firefly Bar",
    region: "Darkside",
    barType: "beer",
    desc: "A small bar strung with more fairy lights than structure — from the " +
      "soi it pulses like its namesake. The ladies here commute from the " +
      "villages past the lake, and the whole place runs on the kind of easy, " +
      "shoes-off familiarity that town bars imitate and never quite land.",
    exits: { out: "khao_talo_strip" },
  },
  night_heron: {
    name: "The Night Heron",
    bar: "The Night Heron",
    region: "Darkside",
    barType: "beer",
    lockIn: true,
    desc: "An enclosed, air-conditioned box at the dark end of the strip: painted-out " +
      "windows, a padded door, a sign small enough to deny. Before midnight it pours " +
      "like any beer bar, only colder and quieter — but the regulars keep checking " +
      "the clock, which should tell you something, and the ladies watch your " +
      "spending with the warm professional attention of women who know exactly " +
      "what the bolt on that door is for.",
    exits: { out: "khao_talo_strip" },
  },
  mama_yai: {
    name: "Mama Yai's",
    bar: "Mama Yai's",
    region: "Darkside",
    barType: "beer",
    outlet: true,
    desc: "Half bar, half kitchen, all Mama Yai: a Darkside institution where the " +
      "som tam arrives unasked and correct, the beer arrives cold, and the " +
      "arguing about both is complimentary. Expats who got tired of town rents " +
      "eat here nightly; the wall of photos knows everyone's second wife. " +
      "There's an outlet by the till, for customers who finish their plate.",
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
    seven: true,
    desc: "North of the Dolphin roundabout the volume drops by half: seafood restaurants, " +
      "temples, long-stay hotels. Up ahead, the SABAI PALMS HOTEL sign glows over its " +
      "soi — half the letters out, so it reads 'SA AI PA MS', which the long-stay " +
      "guests consider part of the charm. The soi itself is dark as a power cut.",
    busStop: "beachrd",
    exits: { s: "beach_rd_n", n: "hotel_soi", w: "orchid_club" },
  },
  hotel_soi: {
    name: "Sabai Palms Soi (Naklua)",
    region: "Naklua",
    dark: true,
    desc: "The Sabai Palms' soi. No streetlights — the municipality has been 'fixing' " +
      "them since March. Two actual palms flank the lobby entrance somewhere down " +
      "there, and past them, a bed with your name on it.",
    exits: { s: "naklua_rd", n: "hotel_room" },
  },

  orchid_club: {
    name: "The Orchid Club",
    bar: "The Orchid Club",
    region: "Naklua",
    barType: "gents", outlet: true,
    desc: "A repurposed villa behind a high wall and an unmarked door — no neon, no " +
      "barker, just a brass bell and one orchid in the porch. Inside it is cold " +
      "enough to hang meat, lit low and gold, with deep leather couches whose " +
      "curtains draw around them, and ladies in not very much already crossing the " +
      "floor toward you. It opens at noon, for the men who need somewhere to be " +
      "that isn't home; by dark the same faces hold the same seats. Tourists never " +
      "find it. That is the entire point.",
    exits: { out: "naklua_rd" },
  },
  hotel_room: {
    name: "Your Room — Sabai Palms Hotel",
    region: "Naklua",
    desc: "Room 412 of the Sabai Palms Hotel (โรงแรมสบายปาล์ม) — a name the place has " +
      "spent decades cheerfully failing to live up to. The air-con stutters awake. " +
      "The bed is exactly as terrible as you remember. A hot shower, a change of " +
      "shirt — and below the window, the city hums on, wide open.",
    outlet: true, // your own room charges your own phone
    exits: { out: "hotel_soi", s: "hotel_soi" },
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
    portable: true, location: null, // given by Candy
    desc: "A takeaway box of som tam poo plara, spicy enough to be classed as a weapon. " +
      "Candy's peace offering for Ploy, the cashier at Rainbow Girls.",
  },
  sang_som: {
    name: "bottle of Sang Som", aliases: ["sang som", "sangsom", "rum", "bottle of rum"],
    portable: true, location: null, // Candy hands it over for the sister-bar run
    desc: "A boxed bottle of Sang Som with a rose-pink ribbon and a card in Candy's " +
      "handwriting: 'เปิดร้านใหม่ สู้ๆ นะ' — for the opening shelf at Candy Bar 2.",
  },
  fake_rolex: {
    name: "genuine Rolex (allegedly)", aliases: ["rolex", "watch", "fake rolex"],
    portable: true, location: null,
    desc: "A 'Rolex' of tremendous confidence and negligible mass. The second hand " +
      "moves in a way Rolex engineers would describe as 'jazz'. It has already " +
      "started a conversation at every bar you've worn it to.",
  },
  shades: {
    name: "designer sunglasses", aliases: ["sunglasses", "shades", "glasses"],
    portable: true, location: null,
    desc: "RayBens. The B is doing a lot of work. Worn at night, indoors, they say " +
      "either 'international man of mystery' or 'hungover' — both true.",
  },
  vitamin_v: {
    name: "packet of 'vitamins'", aliases: ["vitamins", "vitamin", "pills", "meds"],
    portable: true, location: null,
    desc: "A foil strip of blue diamonds from the peddler's deepest pocket, labelled " +
      "in four languages, none convincingly. Sold with a wink you didn't ask for.",
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
  saleng_sandals: {
    name: "saleng sandals", aliases: ["sandals", "shoes", "flats", "saleng sandals"],
    portable: true, location: null,
    desc: "Sequinned sandals from a saleng cart, carried in a thin plastic bag. " +
      "Sized for a Thai woman's foot. They are not for you — but you know who they are for.",
  },
  saleng_heels: {
    name: "saleng heels", aliases: ["heels", "platform heels", "shoes", "saleng heels"],
    portable: true, location: null,
    desc: "Platform heels from the saleng cart, still in the carry bag. " +
      "Someone is going to look very good in these. You are not that someone.",
  },
  saleng_lingerie: {
    name: "saleng lingerie", aliases: ["lingerie", "bra", "underwear", "lace", "slip", "saleng lingerie"],
    portable: true, location: null,
    desc: "A bag of lingerie from the saleng cart — lace, silk-adjacent, " +
      "the kind of purchase that requires a recipient to make sense.",
  },
};

// ── NPCs ───────────────────────────────────────────────────────────────────
// dialogue: ordered list; the engine picks the FIRST entry whose `req` flags
// are all set (and `notFlags` unset). `sets` flags fire on delivery.
// topic: matches "ask X about <topic>"; entries without topic answer "talk to X".
// th/rom: a spoken Thai line rendered before the English (TTS if available).
// short: the terse gist. First time you hear an entry you get the full `text`;
//   every time after, the engine swaps in `short` (and skips the Thai greeting)
//   so re-talking gives the point, not the whole spiel again. Optional — an
//   entry without one just repeats in full.

const NPCS = {

  nok: {
    name: "Auntie Nok", th: "น้อยหน่า", emoji: "🥭",
    room: "jomtien_beach_rd",
    desc: "A drinks-cart vendor with a cooler of everything and opinions to match. " +
      "A hand-lettered sign on the cart offers ฿5 per returned bottle.",
    dialogue: [
      { req: ["gotBusFare"], text: "\"Bus stop that way, na. Tell driver where you go, pay when you get off. FIFTEEN baht now — everything expensive since the war, jing jing.\"",
        short: "\"Bus stop that way. Tell driver, pay when you get off. Fifteen baht.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh, you awake! You sleep on beach like soi dog, hahaha. You want water? No money? Aiyee.\" She taps the sign on her cart. \"Bring bottle, I give five baht. Beach full of bottle. Farang leave everything.\"",
        short: "\"Bring bottle, I give five baht.\"" },
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
        text: "\"My man! Pim say thank you. You need ride anywhere — special price. And listen: you have problem with anyone on this street, you stand next to Bank, okay?\"",
        short: "\"Need a ride, boss? Special price for you. Trouble on the street — stand by Bank.\"" },
      { req: ["knowMot"], notFlags: ["helmetDelivered", "hasHelmet"],
        text: "\"Mot? Little rat. He run, we watch. Hey — do me a favour, na? My girlfriend Pim, Starlight Bar, LK Metro. Take her my spare helmet, she forget again. I no can leave stand.\" He holds out a hot-pink helmet.", sets: ["hasHelmet"], gives: "helmet",
        short: "\"Take my pink helmet to Pim — Starlight Bar, LK Metro.\"" },
      { th: "ไปไหนครับ", rom: "pai nai khrap",
        text: "\"Where you go, boss? Motosai fifty baht in town, hundred to Darkside. Faster than bus, more fun than walking, safer than both — nobody touch you on Bank's bike.\"",
        short: "\"Where you go, boss? Fifty baht in town, hundred to Darkside.\"" },
      { topic: "pim", text: "\"Pim my girlfriend. Starlight Bar. Smartest girl in LK Metro — five years there, know everybody's everything.\" He grins. \"Don't tell her I said 'girlfriend', she say we 'talking'.\"" },
      { topic: "darkside", text: "\"Darkside? Lake, family, old farang with fat dog. And Khao Talo — old-school soi. Hundred baht I take you. Bus charter more.\"" },
    ],
  },

  candy: {
    name: "Candy", th: "แคนดี้", emoji: "🌹",
    room: "candy_bar",
    // She owns both Candy Bars and works them on alternate nights (even days at
    // the original, odd days at Candy Bar 2). _npcRoom resolves tonight's room;
    // `room` above stays as her home/default for anything that wants a fixed peg.
    bars: ["candy_bar", "candy_bar_2"],
    desc: "The mamasan of Candy Bar — sharp as a razor, warm as a Chang on a hot night, " +
      "and on the soi longer than most expats have had passports. She clocked you the " +
      "second you walked in.",
    dialogue: [
      { req: ["somTamAccepted"], notFlags: ["somTamDelivered"],
        text: "\"Som tam not deliver itself, tilac. Rainbow Girls Bar, LK Metro, deep corner — give it to PLOY at the cashier cage. Wai first. She melt.\"" },
      { req: ["knowWasHere"], notFlags: ["knowMot"], th: "จำได้สิ", rom: "jam dai si",
        text: "\"Of course I remember you! Three a.m., singing, buying Mama noodles next door. You leave with big group toward LK Metro — and Mot follow you out. Little pickpocket, work the drunk ones.\" She narrows her eyes. \"Ask Lek at Lucky Tiger. She see Mot this morning. OR—\" she smiles sweetly \"—buy me lady drink and I tell you everything faster.\"",
        sets: ["knowMot"],
        short: "\"Mot followed you toward LK Metro. Ask Lek at Lucky Tiger — she saw him this morning.\"" },
      { th: "สวัสดีค่ะที่รัก", rom: "sawatdee kha tilac",
        text: "\"Welcome to Candy Bar! First time? No — wait.\" She studies you. \"You look like a man with a story and no wallet to put it in. Sit. Talk to Candy.\"",
        short: "\"Sit down, tilac. Talk to Candy — everybody's problems come to Candy.\"" },
      { topic: "wallet", req: ["knowOyHasIt"],
        text: "\"Oy has it? Then it's safe — safer than in your pocket, clearly. But Oy… ai, she make you work for it. Take her som tam from the market cart — extra spicy, tell them 'Candy's order'. Give it to Ploy her cashier, and doors open.\" She waves at the cart across the soi.", sets: ["somTamAccepted"], gives: "som_tam",
        short: "\"Oy has your wallet. Take her extra-spicy som tam — 'Candy's order' — and give it to Ploy, her cashier.\"" },
      { topic: "wallet", notFlags: ["knowWasHere"],
        text: "\"Lost wallet? Mmm. And what makes you think Candy knows something?\" She polishes a glass, watching you. \"Show me you were even here last night and maybe my memory improve.\" (Perhaps something in your pockets proves it.)" },
      { topic: "oy", text: "\"Madam Oy. We come up together — Crystal Palace, different lifetime. She hard like teak now but she was farm girl from Isaan same as me. Wai her properly and she remember she has a heart. Somewhere.\"" },
      { topic: "mot", req: ["knowMot"], text: "\"Mot sell everything he lift to one buyer — always the same. Ask around LK Metro who that is.\" She mimes zipping her lip and pointing at the till: lady drink territory." },
      { topic: "philosophy", text: "\"Phi-lo-so-phy.\" She says each syllable the way " +
        "you'd say a price that is too high. \"I have a type, you know — the man who " +
        "sit with my girl for one hour, buy her zero drinks, and try to have the " +
        "therapy session. 'What is your childhood dream?' 'Do you feel trapped?'\" " +
        "She sets a glass down firmly. \"My girl is not your therapist, tilac. She " +
        "is here, she is present, and she would like a lady drink and a conversation " +
        "about something that is happening right now.\" A beat. \"The five-year-plan " +
        "man never tip anyway.\"" },
      { topic: "crisis", text: "She sets the glass down and thinks about this seriously, " +
        "which is not how she handles most questions. \"You know what is strange? When " +
        "a girl has a good sponsor — money coming every month, no problem — she try to " +
        "open a business and it always fail. Every time. Clothes stall, noodle cart, " +
        "beauty shop — fail.\" She counts on one finger. \"But same girl, sponsor gone, " +
        "nothing left — suddenly she can do anything. Clam from the beach. Sausage on " +
        "a plastic table. FB Live at two in the morning.\" She opens her hands. \"I " +
        "don't know why it work this way. But it only work when there is no net to " +
        "fall in.\" A beat. \"That's how I open this bar. I had nothing. That's the " +
        "only reason it work.\"" },
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
        sets: ["knowOyHasIt"],
        short: "\"Mot sold your wallet to Madam Oy at Rainbow Girls. In her safe by now, guarantee.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello handsome! You play pool? No? Good — you look like you lose enough already tonight.\" The earrings flash as she laughs.",
        short: "\"Hello handsome! You play pool, or you just hiding from your night?\"" },
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
        text: "\"Welcome to Paradise.\" A beat. \"The bar, na — the other kind you find yourself.\" The knowing look intensifies.",
        short: "\"Real gossip is on Soi Buakhao, tilac. Here is only volume.\"" },
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
        text: "\"Having fun?! This club so loud I answer questions nobody ask yet!\" She beams and slides you a glass of iced water on the house. \"You look like you need free one.\"",
        short: "\"Too loud to talk! Here — free water. On the house.\"" },
      { topic: "wallet",
        text: "\"Wallet?!\" She processes this over the bass. \"Soi Buakhao! Beer bars! The mamasans there know everything — very powerful ladies!\" She is already shouting an order over your head. \"CANDY BAR!\" she adds, pointing vaguely north.",
        short: "\"Soi Buakhao! Candy Bar! Very powerful ladies!\"" },
    ],
  },

  aek: {
    name: "Aek", th: "เอก", emoji: "⚡",
    room: "midnight_sun",
    desc: "The cashier, planted behind the till like she grew there — cropped hair, " +
      "oversized bar polo, a silver ring through one nostril and a biro tucked behind " +
      "her ear. Tom through and through: she runs the money, calls the floor, and misses " +
      "nothing across the whole open front of the bar.",
    dialogue: [
      { th: "ว่าไง", rom: "wa ngai",
        text: "\"New face.\" She totals a tab without looking down, the nose ring catching " +
          "the neon. \"Aek. I hold the money and the gossip — same drawer. Boards are free, " +
          "pool's a hundred a rack, and if you upset one of my girls I hear about it before " +
          "you finish the sentence.\" A flat, friendly warning.",
        short: "\"Aek. I hold the money and the gossip — same drawer. Don't upset my girls.\"" },
      { topic: "girls", text: "\"Best-run floor on Walking Street, and I keep it that way from " +
        "right here.\" The biro taps the till. \"Noi, two doors down at Neon Paradise — that " +
        "one's mine. Six months. And yes, a tom can be jealous, so mind your manners when you " +
        "drink down there.\"" },
      { topic: "noi", text: "\"Noi's my girlfriend. Neon Paradise — tall, does the knowing " +
        "look.\" The hard face softens for exactly one baht's worth of time. \"She practise " +
        "that look on me first, every night. Buy HER a lady drink, not me — I don't drink on " +
        "the job, I count.\"" },
      { topic: "oy", text: "\"Madam Oy? Respect. Only mamasan on this street ever bothered to " +
        "learn a cashier's name.\" Aek shrugs. \"She trust toms with the drawer — say we don't " +
        "fall for the customers and rob the till. She's not wrong.\"" },
    ],
  },

  aom: {
    name: "Aom", th: "อ้อม", emoji: "🌙",
    room: "club_mirage",
    desc: "Mysterious, sharp eyes, a slow smile that arrives about four seconds after " +
      "whatever caused it. She materialised beside you rather than walked.",
    dialogue: [
      { th: "หวัดดี", rom: "watdee",
        text: "\"...You lost something.\" Not a question. The slow smile begins its journey. \"Everything lost in Pattaya is in somebody's pocket. The trick is learning whose.\"",
        short: "\"Everything lost in Pattaya is in somebody's pocket. Learn whose.\"" },
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
        text: "\"You come back!! Wait— no, you new. Same same!\" She collapses in giggles. \"Sit down sit down! You buy me lady drink? Upstairs very nice—\" she catches your expression \"—okay okay, water for you, story for me, hahaha!\"",
        short: "\"Sit sit! Water for you, story for me, hahaha!\"" },
      { topic: "wallet", text: "\"No wallet?!\" Gales of laughter. \"Tilac, on THIS soi that is a very serious medical condition. Go Soi Buakhao — the mamasans there fix everything. Especially Candy. Everybody's problems go to Candy.\"" },
      { topic: "money", text: "\"Money?\" She waves a hand like she's shooing a cat. \"Money come, money go. Same same. Last month I have — so much! I think wow, I am RICH.\" Two-second pause. \"Then iPhone. Then my cousin need school. Then Koh Chang with the girls. Then my mother — hahaha!\" She is laughing at herself entirely. \"Now I have four hundred baht and big smile. I earn more later. Up to me!\"" },
      { topic: "save", text: "She looks at you like you've said something in a language she recognises but has stopped speaking. \"Save... for what?\" Genuine puzzlement. \"When the thing happen I will find the money. Always I find it. Always!\" She seems more certain of this than she is of anything else. \"You have five hundred? I need for rice.\"" },
      { topic: "dream", text: "\"Dream?\" Full attention, very serious. \"Okay. Right now? My dream is—\" she points at the kitchen hatch \"—the spicy noodle. Tom yum. Because it is ten o'clock and I am hungry.\" She nods once, satisfied. \"That is my dream. What is YOUR dream?\" The follow-up is completely genuine." },
      { topic: "future", text: "\"Five year?\" She waves it away cheerfully. \"Five year is VERY far. Tonight is already hard enough! Tonight I need: noodle, maybe one more drink, and—\" she tilts her head \"—maybe you stay a little longer? That is my five-year plan.\" Another collapse of giggles. \"Okay okay, three minutes plan. Same same.\"" },
    ],
  },

  fon: {
    name: "Fon", th: "ฝน", emoji: "🌺",
    room: "jasmine_garden",
    desc: "Shy, half-hiding behind the plants she obviously waters herself. She brightens " +
      "the instant anyone tries even one word of Thai.",
    dialogue: [
      { req: ["greetedFon"], th: "พูดไทยเก่ง", rom: "phuut thai keng",
        text: "\"Your Thai so good!\" (It was one word.) She emerges from the ferns entirely. \"The jasmine is for the spirit house. You want to know anything about this soi, ask me — quietly.\"",
        short: "\"Ask me anything about this soi — quietly.\"" },
      { text: "She gives you a small wave from behind a monstera and goes back to pretending to check her phone. Perhaps a proper Thai greeting would help.",
        short: "She waves from behind the monstera. (A Thai greeting might draw her out.)" },
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
        text: "\"Crystal Palace, welcome. Drinks menu, no touching, and whatever you heard about the fishbowl, it's a myth.\" A wink calibrated to the milligram.",
        short: "\"Drinks menu, no touching. What can I get you?\"" },
      { topic: "oy", text: "\"Madam Oy danced HERE, you know. Before my time — number seventy-something, they say she was the best on the street. Now she owns half of LK Metro and all of its secrets.\"" },
      { topic: "door", text: "She glances toward the entrance — the heavy door, currently " +
        "shut, with nothing visible through it from the street. \"You know why that " +
        "door is closed?\" She doesn't wait. \"Because the moment you can see inside " +
        "for free, there's no reason to come in. The question has to stay open.\" She " +
        "tilts her head toward the Soi 6 direction. \"Down the road they put everything " +
        "on the street. All of it. For anyone walking past with a {{phone}}.\" A small " +
        "measured pause. \"They wonder why nobody's buying.\"" },
      { topic: "career", text: "She tilts her head very slightly. \"Career.\" The word " +
        "lands like she's reading it off a slide deck. \"I had one. Bangkok, six days " +
        "a week, mandatory overtime, seventeen thousand baht a month.\" She adjusts an " +
        "invisible hair. \"I have a degree, you know. International business. My " +
        "English is better than my boss's was. My Mandarin is better than his " +
        "assistant's.\" The wink is exact, controlled. \"I did the math. Everyone " +
        "does the math eventually. I just did it faster than most.\"" },
      { topic: "education", text: "\"What did I study?\" She seems mildly amused. " +
        "\"Economics. Which is exactly as useful here as everywhere else — you " +
        "understand what things are actually worth, and you stop pretending they are " +
        "worth what people say.\" She straightens a coaster. \"My father thinks I work " +
        "for a very successful Japanese company in Si Racha. He brags about it. " +
        "I let him.\"" },
    ],
  },

  kwan: {
    name: "Kwan", th: "กวาง", emoji: "🦋",
    room: "sunset_dreams",
    desc: "Gentle, soft-voiced, folding paper napkins into birds while the soi roars outside.",
    dialogue: [
      { th: "เหนื่อยไหม", rom: "nueai mai",
        text: "\"You look tired,\" she says, and somehow it's the kindest thing anyone's said to you all night. She sets a paper crane by your hand. \"For luck. The soi makes everyone lucky once.\"",
        short: "She sets another paper crane by your hand. \"For luck.\"" },
      { topic: "wallet",
        text: "She considers this, folding without looking down. \"Soi Buakhao,\" she says finally. \"The mamasans there know everything that moves through this town. Candy Bar — the mamasan there, she's the one.\" She adds the finished crane to the row." },
      { topic: "pajama", text: "She does not look up from the crane she is folding. " +
        "\"Every bar on this soi try to show more. More skin, more loud, more " +
        "neon.\" A pause. \"Kwan think: show less.\" The crane joins the row. " +
        "\"Last month Kwan make all the girls wear the pajama. Pink, with little " +
        "cloud pattern.\" Another pause. \"The owner say no. The owner is wrong.\" " +
        "She begins a new crane with complete serenity." },
    ],
  },

  terry: {
    name: "Terry", emoji: "🍺",
    room: "queen_vic",
    desc: "Bald, red-faced, Chang vest, fifteen years of Pattaya compressed into a permanent " +
      "corner-stool residency. He rents the same balcony room every high season. He was here " +
      "before White Dish. He will tell you about it. He tells it well.",
    dialogue: [
      { topic: "wallet",
        text: "\"Wallet gone? On Soi 6?\" He exhales through his nose. \"Right. Soi Buakhao — Candy Bar, ask for Candy herself. Sharp as they come. She'll know who moved it or she'll know who does.\" He returns to his beer with the authority of a man who has solved this problem before." },
      { topic: "white dish",
        text: "\"White Dish Group.\" He says it the way you say a diagnosis. \"Ryan Powers. Never here, always here — that's the joke. Before his lot got involved, this soi ran itself. Loud, chaotic, but honest chaos. Now?\" He gestures at the street through the window. \"QR codes. Branded menus. They've got six bars already. Word is they're after another one.\" He takes a long pull of Chang. \"Someone should do something about that.\"" },
      { topic: "powers",
        text: "\"Ryan Powers. British. Doesn't live here officially, doesn't leave either. Bars run clean on the surface — that's the thing. The books don't, but you'd need someone inside to prove it.\" He taps the bar once. \"{{Nice}} bloke, they say. The dangerous kind.\"" },
      { topic: "tiktok", text: "He gestures at the soi through the window without " +
        "looking. \"You see those lot? Ring light, selfie stick, little gimbal thing?\" " +
        "He doesn't wait for an answer. \"Walk the whole soi, grab every girl's hand, " +
        "tell 'em they're beautiful on camera, walk away without buying a drink. " +
        "Thousands of views. Zero baht.\" He finishes his Chang. \"Bar owner down the " +
        "road told me ninety-six percent of his foot traffic is that now. Content. " +
        "Just content.\" He signals the barman again. \"The girls stand out front in " +
        "nothing all night for some kid's YouTube channel. And they can't even say no " +
        "because then they look bad on camera.\"" },
      { text: "He nods at the empty stool beside him and signals the barman. \"Sit down. Watch the soi a minute. Best show in Pattaya and you don't have to tip the girls.\"",
        short: "He signals the barman. \"Sit. Best show in Pattaya, no tipping required.\"" },
    ],
  },

  malee: {
    name: "Malee", th: "มาลี", emoji: "⚡",
    room: "kinky",
    desc: "The cashier — cropped hair, black polo, a lanyard with what looks like seventeen " +
      "keys. She runs the KINKY till with the detached authority of someone who's counted " +
      "more money than you've seen and found it unremarkable.",
    dialogue: [
      { topic: "wallet",
        text: "\"Wallet gone?\" She doesn't look up from the till. \"Not here. We don't do " +
          "that — bad for business.\" A pause, one eyebrow. \"Soi Buakhao side. Ask the " +
          "mamasans at the beer bars. They keep track of everything that moves through this area.\"" },
      { text: "\"Bar's open. Stage is running. If you want to sit, sit. If you want " +
          "to stare at the door, outside is free.\" She says it with no particular malice.",
        short: "\"Bar's open, stage is running. In or out.\"" },
    ],
  },

  wan: {
    name: "Wan", th: "วัน", emoji: "💫",
    room: "slutty",
    desc: "The mamasan of Slutty: compact, efficient, wearing a headset that may or may " +
      "not be connected to anything. She's been on LK Metro since before it was worth " +
      "being on, and carries that seniority in every glance.",
    dialogue: [
      { topic: "lk metro",
        text: "\"Before COVID, nobody came here unless they knew.\" She surveys her bar with " +
          "quiet satisfaction. \"Now the Walking Street boys find us and they don't go back. " +
          "Same girls, better price, no tourists tripping over each other.\" She straightens " +
          "a barstool. \"We did not get worse. WS got slower.\"" },
      { text: "\"Welcome to Slutty.\" She says it the way you'd say 'good morning'. " +
          "\"Drinks at the bar. Lady drinks when you're ready. Don't touch the stage.\"",
        short: "\"Welcome. Drinks at the bar, lady drinks when ready, don't touch the stage.\"" },
    ],
  },

  jane: {
    name: "Jane", th: "เจน", emoji: "⭐",
    room: "las_vegas",
    desc: "A hostess at Las Vegas, sitting on the end of the bar with her legs crossed and " +
      "a cocktail she's been nursing since before you arrived. She has the relaxed energy " +
      "of someone who has already decided tonight will be fine.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Las Vegas!\" She gestures at the room like she's presenting it to you personally. " +
          "\"Better than the real one, na — no sad carpet, and the ladies are much more " +
          "beautiful than in Nevada.\" She tops up her cocktail without calling it a lady drink.",
        short: "\"Better than the real Las Vegas. No sad carpet.\"" },
      { topic: "wallet",
        text: "\"Wallet? In LK Metro?\" She seems genuinely amused. \"Nobody steal here — " +
          "bad energy for the regulars. You lose it somewhere else. Try Buakhao side, the " +
          "mamasan at Candy Bar know everything about everybody.\"" },
    ],
  },

  nong: {
    name: "Nong", th: "น้อง", emoji: "🌸",
    room: "gold_rush",
    c4: 2, // first week on the soi — the one Connect 4 table a human can beat

    desc: "Sweet, visibly new — first week on the soi — checking her phone between " +
      "customers and startling whenever the door opens.",
    dialogue: [
      { topic: "oy", th: "อย่าบอกนะ", rom: "yaa bok na",
        text: "\"Mamasan Oy? She— she scary. But fair! She pay for my mother's hospital, you know. Don't tell her I said.\" She glances at the faded poster on the wall. \"That her, when she dance. Number seventy-one. She keep the number for everything — locker, motorbike plate, everything.\"",
        sets: ["pinPart71"],
        short: "\"That's Oy at seventy-one — she keeps that number for everything. Locker, plate, every lock.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"W-welcome to Gold Rush! First week— I mean, MY first week. The gold is paint. I'm not supposed to say that. Please don't tell.\"",
        short: "\"W-welcome to Gold Rush! Please — don't tell anyone about the paint.\"" },
    ],
  },

  mercedes: {
    name: "Mercedes", th: "เมอร์เซเดส", emoji: "❄️",
    room: "gold_rush",
    desc: "A little older than the Gold Rush's other girls and a great deal less " +
      "nervous — she moves like someone who has already seen the worst a room can " +
      "do to a person. Her English is good, with a flat European edge the soi " +
      "doesn't usually carry.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to the Gold Rush.\" A small, real smile. \"The gold is " +
          "paint — Nong will tell you, she cannot help herself. Sit. I am Mercedes. " +
          "Yes, like the car. I had one in the driveway in Munich and never once " +
          "the keys. Now I keep the name and skip the car.\"",
        short: "\"Mercedes — like the car. Kept the name, skipped the car. Sit, tilac.\"" },
      { topic: "german", text: "\"Germany. Five years, Munich. Big house, a car, the " +
          "health insurance — everything the brochure promise.\" She turns a coaster " +
          "over. \"And I could not tell a joke. Could not argue, could not be a " +
          "person — only 'Guten Tag, Danke', like a child with two words. His mother " +
          "look at me: prostitute who steal my son. Never once she say it. Never once " +
          "she hide it.\"",
        short: "\"Munich: big house, no jokes. A mute child with a nice kitchen.\"" },
      { topic: "husband", text: "\"My visa was married to him — you understand? Not to " +
          "me. I leave, I am on a plane in one month. So I stay.\" A shrug with a whole " +
          "country in it. \"Three hundred euro pocket money, and I must account for it. " +
          "In Pattaya I made eighty thousand baht and sent half to my mother in Isaan. " +
          "There, I cannot send one baht. A Thai daughter who cannot take care of her " +
          "mother has lost everything. The house was warm. I was empty.\"",
        short: "\"Visa tied to him, 300 euro to account for, could not send my mother a baht. Warm house, empty me.\"" },
      { topic: "hans", text: "\"Hans was not cruel. That is the joke — no black eye, no " +
          "drama.\" She almost laughs. \"My uncle die. I ask him to book the flight for " +
          "the funeral. He open Excel. Excel! Turn the screen to me — 'too expensive " +
          "right now' — and then so gentle: 'You know you have nothing without me.'\" " +
          "She snaps the coaster flat. \"That night I pack. In Munich, zero friends. In " +
          "Pattaya, one hundred people waiting for me. Which one is rich?\"",
        short: "\"He opened a spreadsheet for my uncle's funeral. 'Nothing without me.' I packed that night.\"" },
      { topic: "free", text: "\"People see an old girl back on the stool and they think " +
          "— poor thing, could not keep him.\" The smile sharpens, not unkind. \"So let " +
          "me give you the reality, tilac. In Germany: big house, car, insurance — and I " +
          "ask permission to buy som tam, I beg to visit my own family. Here: a cheap " +
          "room and a Honda Click. But I am free. I send my mother money when I want. I " +
          "laugh loud with my friends. Which one is the real dream? I chose it. Nobody " +
          "chose for me.\"",
        short: "\"Big house and permission, or a Honda Click and freedom? I chose. That's the whole story.\"" },
      { topic: "money", text: "\"Money?\" She waves a hand at the neon. \"It come, it " +
          "go, like the rain. In Munich I learn the other way — everything counted, " +
          "everything saved — and it made me small. Here, when I have it I send it " +
          "home, I buy Nong her dinner; when it is zero, mai pen rai, I earn again. That " +
          "is not being poor. That is being free of the counting.\"",
        short: "\"Money is rain — comes, goes, I send it home. In Munich the counting made me small.\"" },
      { topic: "nong", text: "\"Nong?\" She glances at the trembling new girl with " +
          "something almost maternal. \"First week. Scared of the door, scared of " +
          "Mamasan, scared of the paint. I was her, fifteen years ago, a go-go on Soi " +
          "6.\" A softer smile. \"Somebody should tell her the worst thing that happen " +
          "is you go all the way to Munich and come back. Not so bad, in the end. I keep " +
          "an eye on her.\"",
        short: "\"Nong is me, fifteen years ago. I keep an eye on her.\"" },
    ],
  },

  yai: {
    name: "Mama Yai", th: "ใหญ่", emoji: "🍲",
    room: "mama_yai",
    desc: "The Yai in Mama Yai's — sixty-ish, an apron over a buffalo-print blouse, " +
      "a ladle in one hand and the whole soi's memory in the other. She feeds you " +
      "before she reads you, and by the time the som tam lands she has done both.",
    dialogue: [
      { th: "กินข้าวหรือยัง", rom: "gin khao rue yang",
        text: "\"Sit, sit. You eat already? No — I can see no.\" A plate of som tam " +
          "lands in front of you unasked, correct, and faintly threatening. \"Eat " +
          "first, talk after. Everybody who cry on the Darkside cry with my spoon in " +
          "their mouth. Cheaper than town — and the crying is free.\"",
        short: "\"Eat first, talk after. The crying's free.\"" },
      { topic: "darkside", text: "\"Why they come east? Rent.\" She laughs, big and " +
          "unashamed. \"Town eat a man alive — barfine, lady drink, room by the hour. " +
          "Out here: cheap beer, cheap room, and a wife who cook. Half these farang " +
          "got tired, got old, got smart. Same three thing, na.\"" },
      { topic: "photos", text: "\"That wall?\" She waves the ladle at forty years of " +
          "curling snapshots. \"Every farang, every lady, every wedding on this soi. " +
          "Some — same man, different wife. I never say which.\" A wink. \"Mama Yai " +
          "know everything and forget on purpose. Good for business.\"", sets: ["knowYaiWall"],
        short: "\"Every wedding on the soi's on that wall. I forget which on purpose.\"" },
      { topic: "heron", text: "\"The Heron? At the dark end, padded door, no sign.\" " +
          "She drops her voice a register and her eyes do the rest. \"Before midnight, " +
          "a beer bar like any — colder. After, they lock the door and it is not my " +
          "business and not yours until you knock. Older lady, older money, very " +
          "discreet. You want that, ask Kratae. You want som tam, you stay with Mama.\"" },
      { topic: "kratae", text: "\"Kratae my right hand. Dance in town ten year, come " +
          "here, never look back. Sharp — she keep the young one honest and the old " +
          "one paying. You be nice to her, or you answer to my spoon.\"" },
    ],
  },

  kratae: {
    name: "Kratae", th: "กระแต", emoji: "🐿️",
    room: "mama_yai",
    desc: "Late thirties and entirely unbothered by it — quick-eyed, a laugh like a " +
      "dropped tray, a beer already sliding toward you. Mama Yai's right hand: she " +
      "pours, she counts, she misses nothing, and she heard your story before you " +
      "sat down.",
    dialogue: [
      { th: "มาแล้วเหรอ", rom: "maa laeo rer",
        text: "\"You come all the way out here? Brave.\" She grins, sliding the beer " +
          "the last inch. \"Town too expensive for you — or you just smart? Same " +
          "answer, usually.\"",
        short: "\"Town too expensive, or you just smart? Same answer.\"" },
      { topic: "darkside", text: "\"I dance Walking Street ten year — Crystal Palace, " +
          "good money, young.\" She shrugs, easy, no wound in it. \"Out here nobody " +
          "pretend. No spotlight, no man think he my boyfriend after one drink. Older " +
          "lady, older farang, honest beer. I make more and I lie less. Better deal, na.\"" },
      { topic: "mama", text: "\"Mama Yai feed me when I have nothing — 2015, bad year, " +
          "long story.\" A quick flick of the eyes at the kitchen. \"Now I run her " +
          "floor. You eat her som tam yet? Eat it. Is not a question.\"" },
      { topic: "heron", req: ["knowYaiWall"], text: "\"Mama send you to me? Ha.\" She " +
          "wipes the bar, unhurried. \"The Heron is grown-up business — you knock " +
          "after midnight, you don't film, you don't ask the ladies their age. Behave " +
          "and it's the friendliest room on the Darkside. Don't, and Daeng's boys walk " +
          "you back to Sukhumvit on foot.\"" },
    ],
  },

  rose: {
    name: "Rose", th: "โรส", emoji: "🌷",
    room: "orchid_club",
    desc: "The madame of the Orchid Club — fifties, immaculate, a silk blouse and a " +
      "voice you have to lean in to hear. She runs the quietest, coldest, most " +
      "expensive room in Naklua, and she knows the name of every regular's wife.",
    dialogue: [
      { th: "เชิญค่ะ", rom: "choen kha",
        text: "\"Welcome to the Orchid. Come in from the heat.\" The door sighs shut " +
          "and the temperature drops ten degrees. \"You sit; the girls come to you " +
          "— that is how we do it here. Buy one a drink and she will make you forget " +
          "the traffic, the year, the wife. Discreet, always. My guests are " +
          "gentlemen.\" A cool smile. \"Mostly.\"",
        short: "\"Sit, buy a girl a drink, forget the year. We are discreet here.\"" },
      { topic: "club", text: "\"Old house, good bones. I take the villa when the last " +
          "farang owner… left in a hurry.\" A delicate pause. \"Aircon, curtain, no " +
          "window, no tourist. My men come at noon — golf finish, wife shopping, they " +
          "need somewhere to be. By dark, same chair, same men. Home away from home. " +
          "The home they wanted, na.\"" },
      { topic: "wife", text: "\"Every man here have a wife somewhere — Naklua, " +
          "Jomtien, Manchester.\" She examines a nail. \"I know all the name. I never " +
          "say them. That is the business, tilac — not the girls. The quiet. A man pay " +
          "more for quiet than for anything a girl can do.\"" },
      { topic: "girls", text: "\"My ladies are older, clever, and they do not chase — " +
          "you buy a drink, they sit close, and after that it is between you and the " +
          "curtain.\" She tilts her head. \"Behave like a gentleman and they are very " +
          "warm. Forget your manners and Rose will remember for a long time.\"" },
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
        sets: ["helmetDelivered"],
        short: "\"You did Bank a favour, so — one free answer. Choose well, darling.\"" },
      { topic: "oy", req: ["helmetDelivered"], notFlags: ["pinPart9"],
        text: "\"Madam Oy runs everything you can see from this stool. Lucky number? เก้า — nine. Nine candles at her shrine, ninth of the month she pays wages, table nine reserved forever.\" Pim taps the bar. \"Whatever lock she owns, there's a nine in it. That was your free answer, darling.\"",
        sets: ["pinPart9"],
        short: "\"Whatever lock Oy owns has a nine — เก้า — in it. That was your free answer.\"" },
      { topic: "oy", notFlags: ["helmetDelivered"],
        text: "\"Madam Oy? Mmm. Information about the Mamasan is premium shelf, darling.\" She taps the lady-drink menu meaningfully: ฿150." },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Well well. You have the look of a man on a quest.\" She rests her chin on her hand. \"Starlight Bar: honest pours, dishonest company. What do you want to know and what's it worth?\"",
        short: "\"What do you want to know, darling — and what's it worth?\"" },
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
        text: "\"Candy's som tam! You SAINT.\" She inhales the box through the cage bars. \"Okay, listen. Office door locks itself when the music is loud — Mamasan's rule. When DJ Beer plays HER song, security walk the floor and the door... forgets to lock.\" She nods microscopically toward the DJ booth. \"Request 'Sabai Sabai'. Then be quick and be invisible.\"",
        sets: ["knowDoorTrick"],
        short: "\"Request 'Sabai Sabai' from DJ Beer — when it plays, the office door forgets to lock. Be quick, be invisible.\"" },
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
        sets: ["sabaiPlaying"],
        short: "\"He cues 'Sabai Sabai' — the room turns toward the floor. Go now, be invisible.\"" },
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
        sets: ["oyGaveWallet", "hasWallet"], gives: "wallet",
        short: "Oy hands your wallet back. \"A polite one. Take it — and buy Mot's dinner.\"" },
      { req: ["knowOyHasIt"], topic: "wallet",
        text: "\"A wallet?\" The temperature drops two degrees. \"Many wallets in Pattaya, khun farang. Mine are in a safe.\" She turns away — but slowly, like a door left ajar. (Manners might open it. A proper wai.)" },
      { th: "เชิญค่ะ", rom: "choen kha",
        text: "\"Welcome to Rainbow Girls.\" Four words, and somehow you feel both invited and inventoried. \"Drink, or business?\"",
        short: "\"Drink, or business?\"" },
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
        sets: ["pinPart71", "pinPart9"],
        short: "\"Oy's number is seventy-one, with a lucky nine on the end of every code. You didn't hear it from Daeng.\"" },
      { th: "เข้ามาสิ", rom: "khao maa si",
        text: "\"Come in, come in! Farang on Khao Talo — you lost, or you smart?\" She's already opening a Chang. \"Sit. Out here the beer is cold and the stories are old. Best combination.\"",
        short: "\"Sit, farang. Cold beer, old stories. Best combination.\"" },
      { topic: "oy", text: "\"Oy and me come up together, Walking Street, when you still count the year in one-nine.\" She taps the photo behind her. \"She got the empire. I got the quiet life and the better knees. We both won.\"" },
      { topic: "darkside", text: "\"The Darkside good to us old girls. Rent cheap, customers loyal, nobody in a hurry. The lake is for the married ones — go see, it's like Pattaya with the volume off.\"" },
      { topic: "covid", text: "She doesn't go quiet the way you expect. She goes very practical instead. \"Six of us, one room — tiny. No work, no money, nothing.\" She counts on her fingers. \"Morning: we walk to the beach, fill a bucket with clam. Afternoon: sell the clam to local people. Take that money, buy rice, buy pork.\" She pauses. \"Next morning — we cook extra and give away free food. To people more poor than us. Then go back for more clam.\" A short laugh. \"On the way home: we pick herb, pick fruit from the tree by the road — nobody plant it, it's just there. And that night?\" She taps the bar. \"Feast. Real feast. Better than high season.\" She fills your glass. \"The farang sit and wait to be rescued. We just find the next thing.\"" },
      { topic: "money", text: "She laughs, but it is a different kind of laugh from the ones aimed at customers — older, shorter. \"Money I understand. Not like the farang understand. Farang save the water in a big pot, very careful. Thai girl — the water goes through. I have it today, is good. Gone tomorrow — mai bpen rai, I find more water.\" She taps the bar. \"The pot people worry all the time. The river people never worry. Which one you think sleep better?\"" },
    ],
  },

  somchith: {
    name: "Somchith", th: "สมชิต", emoji: "🔑",
    room: "short_time_motel",
    desc: "Sixty-something, a weathered face that holds a permanent quiet warmth, the " +
      "thermos of coffee always close. He keeps the keys, keeps the counter, keeps " +
      "everything running on this shift without any fuss. The girls coming through " +
      "treat him like a favourite uncle.",
    dialogue: [
      { th: "สบายดีไหมครับ", rom: "sabai dee mai khrap",
        text: "He nods a greeting — the measured nod of a man who has made peace with " +
        "the night and what it carries. \"You lost? Or you just curious?\" No " +
        "judgment in it. He pours from the thermos like he would for anyone. " +
        "\"Sit down if you want. Nobody hurry here.\"",
        short: "He nods and pours coffee. \"Nobody hurry here.\"" },
      { topic: "work", text: "\"My wife say I should retire. She is probably right.\" He " +
        "almost smiles. \"But I don't mind this place. These girls —\" he tilts his " +
        "head toward the stairs \"— they come down after, they take off the shoes, " +
        "they sit here and just... rest. Talk a little. Sometimes nothing. They need " +
        "somewhere that is quiet and not judging them.\" He refills his own cup. " +
        "\"I can be that place.\"" },
      { topic: "girls", text: "\"They call me Lung Somchith. Uncle Somchith. They bring me " +
        "krating daeng, kanom — snacks, you know. They complain about the shoes.\" " +
        "A small fond laugh. \"Same complaints every night. Too tight. Too high. " +
        "But still they wear them. Because they have to look a certain way.\" He " +
        "wraps both hands around his cup. \"I just make sure they can rest in " +
        "between.\"" },
      { topic: "trouble", text: "\"Big farang, last week. Very drunk, very loud. " +
        "Upstairs.\" He doesn't elaborate on what happened upstairs. \"He say he " +
        "will not pay. He say he will break the room.\" Somchith sips his coffee. " +
        "\"I am not a young man. But I stand between him and the girl and I tell " +
        "him: you pay what you agreed, then you leave.\" A pause. \"He paid. He " +
        "left.\" Another pause. \"Nobody call the police in this place. Police make " +
        "trouble for the girls. So we handle ourselves.\"" },
      { topic: "daughter", text: "He is quiet long enough that you think he won't " +
        "answer. Then: \"My daughter — she works Beach Road. She doesn't know I " +
        "work here.\" He looks at the ring of keys on the nail. \"Sometimes she " +
        "come through that door with a customer. Very beautiful. Eyes always so " +
        "tired.\" He wraps his hands tighter around the cup. \"When I see her " +
        "coming, I go in the back. The supply room. I wait there until the " +
        "footsteps go upstairs.\" He does not cry. He has already cried this. " +
        "\"I cannot stop her. I cannot pay for her life. But I can be here, in " +
        "the dark, so that if anything goes wrong —\" he doesn't finish. " +
        "He doesn't need to." },
      { topic: "pattaya", text: "He thinks about this as if it is the first time " +
        "anyone has asked, though it cannot be. \"In this city, no one is higher " +
        "or lower. Everyone is just surviving their own story.\" He sets the cup " +
        "down. \"The farang comes for escape from his life. The girl comes to " +
        "feed her family. And me?\" A quiet exhale. \"I am just an old man with " +
        "a ring of keys, hiding in a closet, to catch one look at my daughter " +
        "and know she is still alive.\"" },
    ],
  },

  bert: {
    name: "Bert", th: "เบิร์ต", emoji: "🎱",
    room: "stinky_bar",
    desc: "The owner: American, sixty-something, forearms like dock rope, a Budweiser " +
      "that never empties and never seems to get him drunk. Twenty-two years on " +
      "Beach Road, most of them spent within nine feet of that pool table.",
    dialogue: [
      { text: "\"Welcome to the Stinky, bud. Name's Bert. Table's true, beer's cold, " +
        "and the only rule is don't sit on the rail.\" He chalks a cue without " +
        "looking at it. \"You shoot? League night's every third night — killer " +
        "pool, hundred baht in, winner takes the table money.\"",
        short: "\"Table's true, beer's cold, don't sit on the rail. League night every third night — hundred baht in.\"" },
      { topic: "league", text: "\"Killer pool. Everybody's got three lives, pot or " +
        "you lose one, last man standing takes the pot. Every third night, right " +
        "here. Half the piwins in North Pattaya play. Bring your hundred baht and " +
        "your humility.\"" },
      { topic: "pool", text: "\"Table's a Brunswick, older than most of my customers. " +
        "I re-cloth her every year, level her every month, and love her more than " +
        "I loved either of my wives. She holds no grudges. Unlike either of my wives.\"" },
      { topic: "flying club", text: "He goes quiet a beat. \"Pattaya Flying Club. " +
        "That's the joke, bud — the guys who go off the condo balconies when the " +
        "money or the girl or the visa runs out. Every high season there's a few. " +
        "We laugh about it because the other option's worse.\" He taps the bar. " +
        "\"Anybody ever seems that far gone, you buy 'em a beer and you SIT with " +
        "'em, you hear?\"" },
      { topic: "white knight", text: "\"See that kid last month — flew in, fell in " +
        "love in forty minutes, tried to 'rescue' a girl from Tequila Queen who's " +
        "got two houses in Buriram and a husband she likes fine. White knights, we " +
        "call 'em. The machine eats 'em alive, bud. The ladies don't need saving — " +
        "they need customers with manners.\"" },
      { topic: "butterfly", text: "\"Butterfly? That's you, maybe — man who flits " +
        "flower to flower, different bar, different girl, every night. Girls'll " +
        "tease you for it, mamasans price you for it. Ain't a crime. Just don't " +
        "butterfly inside ONE bar, that's how a man loses a drink to the back of " +
        "the head.\"" },
      { topic: "ryan powers", req: ["knowOyHasIt"],
        text: "He lowers the Budweiser half an inch, which for Bert is a whisper. " +
        "\"White Dish Group. Front company — owns most of the paper on Soi 6. The " +
        "man behind it is a Brit named Ryan Powers, and no, you never met him, and " +
        "neither did I. The bars run clean enough. The books don't. Leave that one " +
        "alone, bud.\"" },
      { topic: "sponsor", text: "He refills without asking. \"See it every season. " +
        "Good man, sends the money, thinks he's the only one, thinks she thinks " +
        "about him every day. Maybe she does. Maybe Somchai next door does too.\" " +
        "He sets the bottle down. \"I gave up doing the math twenty years ago. " +
        "Not my business. Not yours either, bud — unless somebody asks you to " +
        "make it yours.\"" },
      { topic: "phil", req: ["toldPhilTruth"],
        text: "He looks at you a long time before he speaks. \"You did a hard thing.\" " +
        "The Budweiser goes up once, comes down. \"Man needed to know. Or he needed " +
        "not to know, and you made that call for him. Either way —\" he taps the bar " +
        "once \"— not your fault. Some things end.\"" },
      { topic: "1998", text: "He sets the Budweiser down with the quiet authority of a " +
        "man who has heard this speech many times, from many Nigels. \"The baht was " +
        "fifty to the dollar in '98, bud. Tom Yum Goong crash — half the Thai economy " +
        "went sideways overnight. Your British pensioner walking in with sterling felt " +
        "like a king because he was, arithmetically.\" He refills without ceremony. " +
        "\"That's point one. Point two: Nigel in 1998 was forty years old with a full " +
        "head of hair and a functioning liver. He's sixty-eight now and his main topic " +
        "is his prostate. The girls didn't change.\" He picks the Budweiser back up. " +
        "\"Point three: before smartphones, this town ran on beautiful anonymity. You " +
        "could reinvent yourself completely. No one Googled you. The girl couldn't " +
        "see the Good Morning texts from the other three guys in Europe. Technology " +
        "didn't kill the romance, bud. It killed the illusion.\" He drains it. " +
        "\"The city never grew a conscience. Nigel just grew old.\"" },
      { topic: "free drink", text: "He points the Budweiser at you. \"You know what I " +
        "call it? The Oklahoma Trap. Guy walks in — plumber from Tulsa, first night " +
        "in town — mamasan sends him a free shot. He thinks he beat the system.\" " +
        "The Budweiser comes down. \"You ever go to Walmart back home and the promo " +
        "girl gives you a sausage on a toothpick? Do you lose your mind? Do you go " +
        "to the register and buy a thousand dollars of sausages for the cashier and " +
        "the store manager just to prove what a great guy you are?\" He waits. \"No. " +
        "But you put that same man under neon lights with loud music and a pretty girl " +
        "telling him he's special — the receipt at two a.m. says thirty thousand baht " +
        "and he can't tell you where it went.\" He drains the Budweiser. \"The free " +
        "drink is a business investment, bud. The cheapest one they'll make all night.\"" },
      { topic: "danny", text: "The Budweiser stops an inch off the bar. \"Danny " +
        "the Coin Guy.\" He sets it down with exaggerated care, the way you " +
        "handle something instead of someone. \"Eighty thousand baht of mine in " +
        "'PattayaChain,' bud. Whole pitch, whitepaper, the works — I've been " +
        "hustled by professionals on three continents and this one got me with " +
        "a PowerPoint.\" He shrugs, genuinely more amused than angry. \"Cost of " +
        "tuition. But he knows the rule: he doesn't drink in my bar till the " +
        "ledger's square. You'll notice he never does. Man keeps exactly one " +
        "kind of promise.\"" },
      { topic: "shame", text: "He stares at the pool table for a while. \"The ones " +
        "who worry me aren't the ones who complain. Complain all day — fine, they're " +
        "still talking. It's the ones who stopped bragging.\" The Budweiser goes " +
        "down on the bar with no particular force. \"Man spends two years telling " +
        "everybody he found himself a good woman, mocking the butterflies, the " +
        "bar-hoppers — you think that man can pick up the {{phone}} when it all goes " +
        "sideways and say he needs help?\" He doesn't look at you. \"The pride is " +
        "the part that kills 'em, bud. Not the girl, not the visa, not the money. " +
        "The pride.\" He picks the Budweiser back up. \"So you call anyway. You " +
        "call and you let them hang up on you. And then you call again.\"" },
    ],
  },

  phil: {
    name: "Phil", th: "ฟิล", emoji: "📱",
    room: "stinky_bar",
    desc: "Mid-fifties, a fleece vest in the Pattaya heat, {{phone}} face-down on the bar " +
      "in the specific way of a man waiting for a message he wants and dreads in equal " +
      "measure. Bristol accent. He has the look of someone who has been coming here " +
      "for long enough that 'holiday romance' stopped fitting years ago.",
    dialogue: [
      { req: ["toldPhilTruth"],
        text: "Phil is still on the stool, but somewhere else entirely. The {{phone}} is " +
        "in his pocket now, face-in. He lifts two fingers off the bar in acknowledgment " +
        "— that's all there is tonight.",
        short: "Phil lifts two fingers off the bar. That's all there is tonight." },
      { text: "\"Phil.\" He shakes without getting off the stool. \"Twelve years " +
        "coming here — every March, every October, no exceptions. I've got a girl up " +
        "in Surin. Nit. Good girl. Used to work the bars, I got her sorted out of all " +
        "that — she's got a little fabric shop now. I send the rent, the bills, bit " +
        "extra every month.\" He says the amount the way men do when a number has " +
        "become ordinary. \"Twelve years is not a holiday romance.\"",
        short: "\"Twelve years coming here — I've got a girl in Surin. Good girl. Send money every month.\"" },
      { topic: "nit", text: "His face does something complicated and fond. \"Beautiful " +
        "girl. Same as when I met her — some women just don't change. Rings me every " +
        "Sunday, never misses. Sends photos of the shop, her mum's birthday, the " +
        "temple fair. Real life, yeah? Not just when she wants something.\" He " +
        "straightens a beer mat. \"Real life.\"" },
      { topic: "neighbor", text: "\"There's a neighbour of hers — Somchai. He's been " +
        "a godsend, honestly. Fixes the scooter when it breaks, takes the mum to " +
        "hospital appointments when I can't be there. Waters the plants when Nit " +
        "visits her sister.\" He trails off and looks at his phone. \"Very helpful. " +
        "Very.\" A long pause. \"Asks her about me sometimes. She says he's just — " +
        "neighbourly.\"" },
      { topic: "somchai", text: "He looks at his phone. Doesn't say anything." },
      { topic: "phone",
        text: "He unlocks it and slides it across the bar without meeting your eyes. " +
        "A LINE chat — Nit's profile picture, the one she probably sent him herself. " +
        "The thread is with someone named สมชาย: daily timestamps, heart stickers, " +
        "a selfie you catch before he pulls it back. The Thai you can make out is " +
        "enough. The rest you don't need to read — the timestamps say it.",
        sets: ["readPhilPhone"],
        short: "Nit's LINE thread with a man called สมชาย — daily, heart stickers, a selfie. The timestamps say it." },
      { topic: "truth", req: ["readPhilPhone"], notFlags: ["toldPhilTruth"],
        text: "You tell him. Not cruelly — just straight. He doesn't say anything " +
        "for a long time. The beer Bert has silently placed in front of him goes " +
        "untouched. \"Right,\" he says finally. \"Right.\" Then: \"Twelve years.\" " +
        "You don't have anything useful to add to that. Neither does he.",
        sets: ["toldPhilTruth"],
        short: "You already told him. \"Twelve years,\" was all he said." },
    ],
  },

  nit: {
    name: "Nit", th: "นิด", emoji: "🧵",
    room: "buakhao_market",
    desc: "Mid-thirties, upcountry-neat, working the fabric stalls with the practised " +
      "eye of a woman who buys to sell. Two checked laundry bags of folded cotton " +
      "already at her feet. Something in the way she reads the market — which vendors " +
      "she wais, which she doesn't — says she worked a soi like this once, and left " +
      "it on her own terms.",
    dialogue: [
      { req: ["toldPhilTruth"],
        text: "She is at the fabric stall, but the buying has stopped. The {{phone}} in " +
        "her hand is dark. She looks at you for a long moment — word moves fast on " +
        "this soi, and she has already done the arithmetic on who told him. " +
        "\"Twelve years,\" she says, to nobody in particular. It is the exact thing " +
        "Phil said. Then she picks up her bags and goes back to choosing cotton, " +
        "because that is what she knows how to do.",
        short: "She picks up her bags and goes back to choosing cotton." },
      { req: ["warnedNit"],
        text: "She catches your eye across the stall and gives you a small nod — the " +
        "nod of a closed account. The Sunday call will happen on Sunday. It always " +
        "has.",
        short: "A small nod across the stall. The Sunday call will happen on Sunday." },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "She wais politely — the reflex of a shopkeeper, not a bar girl. \"You " +
        "are not buying fabric,\" she says, friendly and precise. \"I am. I have a " +
        "shop in Surin — I come down two times a year for cotton. The market here is " +
        "still the best price.\" She runs a thumb along a bolt of indigo without " +
        "looking at it, the way other people check their phone.",
        short: "\"Two times a year for cotton. Best price in the market.\"" },
      { topic: "phil", text: "The name lands and something in her face adjusts — " +
        "not closes, adjusts. \"You know Phil.\" It isn't a question. \"He is a good " +
        "man. Twelve years.\" She folds a length of cotton in half, in half again. " +
        "\"Every Sunday I call him. Every Sunday for twelve years, I never miss " +
        "one.\" She says it the way you'd point at a wall you built with your own " +
        "hands. Both things are true: it is an accounting, and she is proud of it." },
      { topic: "shop", text: "\"Fabric shop, in the market road in Surin. Six years " +
        "now.\" For the first time the warmth is entirely unguarded. \"I do school " +
        "uniforms, monk robes, funeral cloth — the things people always need. Rich " +
        "or poor, everyone's children go to school and everyone's mother dies.\" " +
        "She pats the laundry bags. \"This cotton is for the uniforms. Term starts " +
        "soon.\"" },
      { topic: "somchai", req: ["readPhilPhone"], notFlags: ["toldPhilTruth", "warnedNit"],
        text: "You say the name and her hands stop moving on the fabric. They stay " +
        "exactly where they are. \"So.\" Not a denial. She looks at you the way a " +
        "cashier looks at a large bill — checking the watermark. \"Somchai is my " +
        "husband. Before Phil. During Phil. After Phil, if there is an after.\" She " +
        "resumes folding, slower now. \"You think I steal from him. Tell me what he " +
        "is missing. Twelve years — he is never sad one Sunday. Never lonely one " +
        "visit. Everything he pays for, he receives.\" She ties the bundle off. " +
        "\"So. You will tell him? Or you came to tell me you won't?\" She reads " +
        "your face for the answer and accepts either one. \"Whatever you choose — " +
        "he will hear it kindly on Sunday.\"",
        sets: ["warnedNit"],
        short: "No denial. \"Somchai is my husband — before, during, after Phil. You will tell him? Or tell me you won't?\"" },
    ],
  },

  bee: {
    name: "Bee", th: "ผึ้ง", emoji: "🐝",
    room: "candy_bar_2",
    desc: "Candy Bar 2's floor boss — early twenties, quick everywhere at once, wearing " +
      "the same rose-pink polo as the original bar. Candy's niece, though nobody " +
      "says it and everybody knows it. The smile is the family franchise.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Candy Bar TWO!\" — the number lands with enormous pride. " +
        "\"Auntie— ah, KHUN Candy teach me everything. You her customer? Then you " +
        "MY customer. Sit sit sit.\"",
        short: "\"You Candy's customer? Then you MY customer. Sit sit sit!\"" },
      { topic: "candy", text: "\"Khun Candy start with one bar, twenty year on the " +
        "soi, save every baht, never barfine, never lazy. Now: TWO bar.\" Bee " +
        "holds up two fingers like a victory sign. \"I do same. Watch me.\"" },
      { topic: "myth night", text: "\"Myth Night VERY new. Young people, craft beer " +
        "— hundred-eighty baht, can you believe — live band Friday. Security all " +
        "shared, grey shirt boys, very professional. Not like old day, Candy say.\"" },
      { topic: "job", text: "She checks something on her phone with the fluency of " +
        "someone managing three things at once. \"Before here? Bangkok. Marketing " +
        "agency. I work for them eight month, very serious, very professional. " +
        "Twenty thousand baht.\" She shows you her phone screen — a spreadsheet, " +
        "she's actually tracking something. \"Here: three month and I open a LINE " +
        "shop selling skincare. Good margin. Khun Candy say I have business brain.\" " +
        "She tilts the screen away. \"She is correct.\"" },
    ],
  },

  mem: {
    name: "Mamasan Mem", th: "เม้ม", emoji: "👵",
    room: "tequila_queen",
    desc: "The Tequila Queen's mamasan — silver-streaked chignon, reading glasses on a " +
      "gold chain, and a stage presence undimmed since she headlined this same room " +
      "in another century. The dancers call her 'Khun Mae'. So do some customers.",
    dialogue: [
      { th: "หนูมาแล้วเหรอ", rom: "nuu maa laeo rer",
        text: "\"New face! Sit, na. Tequila Queen is OLDEST go-go in Pattaya — " +
        "before Walking Street have arch, before Central have escalator, we have " +
        "this stage. My girls not young like Soi 6.\" A magnificent shrug. \"Wine " +
        "also not young. Somehow everybody still order wine.\"" },
      { topic: "girls", text: "\"My girls dance here ten, twenty year. They know " +
        "every song, every trick, every kind of man who walk in that door — " +
        "including your kind, tilac, whatever kind you think you are.\" She smiles " +
        "to soften it. Mostly." },
      { topic: "oy", text: "\"Oy? Rainbow Girls Oy? HA. She dance HERE first, one " +
        "season, before Crystal Palace take her. Number 71. I give her that number " +
        "myself. Tell her Mem say she still owe me one uniform.\"" },
      { topic: "free drink", text: "She considers you for a long moment. \"The first " +
        "drink —\" she says it very carefully \"— is not a drink. It is an interview. " +
        "I watch: how he receive it. Does he say thank you and sit quiet? Or does the " +
        "chest go out?\" She demonstrates: a small mime of a man inflating with pride. " +
        "\"The chest-out one — he already tell me everything. He think he is special. " +
        "He think he is the one the bar been waiting for.\" She folds her hands. " +
        "\"We call that one: good customer.\"" },
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
      { topic: "sabai", text: "\"Sabai.\" He says it like it's the answer to something " +
        "you didn't quite ask. \"Took me four years in town to understand it. I kept " +
        "wanting to talk about the future — five-year plans, feelings, meaning.\" " +
        "The retriever yawns. \"You know what she said the night I finally stopped? " +
        "She said, 'Good. Now you are here.'\" He looks at the lake. \"That was 2009. " +
        "We moved out here in 2011. The lake was her idea.\"" },
      { topic: "1998", text: "He watches the lake for a moment. \"I hear it from the " +
        "town lads every time I come in. 'Wasn't like this in 1998.'\" The retriever " +
        "shifts at his feet. \"They're right, it wasn't. It was louder, cheaper, " +
        "and I was younger. Two of those things I miss.\" He doesn't say which two. " +
        "\"The lake's better than 1998. Quieter. That's not nostalgia — that's " +
        "just true.\"" },
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
  "tree town":      { room: "buakhao_s", price: MOTOSAI_TOWN },
  "lk metro":       { room: "lk_entrance", price: MOTOSAI_TOWN },
  "soi 6":          { room: "soi6_street", price: MOTOSAI_TOWN },
  "jomtien":        { room: "jomtien_bus_stop", price: MOTOSAI_TOWN },
  "naklua":         { room: "naklua_rd", price: MOTOSAI_TOWN },
  "darkside":       { room: "khao_talo", price: MOTOSAI_FAR },
  "khao talo":      { room: "khao_talo", price: MOTOSAI_FAR },
  "lake":           { room: "lake_mabprachan", price: MOTOSAI_FAR },
};

// ── Random street encounters ───────────────────────────────────────────────
// Data only — resolution logic lives in engine-encounters.js (_ENC). Each fires at most
// once per game, only in lit street rooms, on a seeded per-game RNG.
// `interactive: true` → the intro sets G.pendingEnc and the player's NEXT
// command is their snap reaction; otherwise the encounter resolves instantly.

const TONIC_PRICE = 99;      // the friendly ฿99 street bottle — the hook, not the sting
const TONIC_FLEECE = 6000;   // the side-soi shop's full high-pressure fleece
const TONIC_SHAKEDOWN = 3000;// what it costs to bully your way back out of the shop
const FORTUNE_READ = 199;    // the ฿199 palm reading — the hook, not the sting
const FORTUNE_RITUAL = 1900; // the four-figure "curse-removal" cleansing upsell
const FORTUNE_MERIT = 500;   // the "small merit" you pay to bully your way clear
const BOOK_PRICE = 2500;     // a freelancer booked "direct" off the apps — no bar, no barfine
const TONIC_POLICE_CUT = 0.35; // the police "negotiation fee" kept out of any recovery

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
    rooms: ["buakhao_n", "buakhao_market", "buakhao_s", "tt_entrance", "lk_entrance", "lk_main", "soi6_street", "ws_south"],
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
  freelancer: {
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade", "buakhao_n"],
    interactive: true, nightly: true, // resets every night — Beach Road and band-night Buakhao restock
    th: "ไปไหนคะ", rom: "pai nai kha?",
    intro: "She's leaning on the promenade rail where the lamplight is kindest — no " +
      "bar, no mamasan, freelance and unhurried. “Going where, hansum? Tonight I " +
      "am also free.” A beat, then, nodding down the rail at a friend pretending " +
      "not to listen: “Ning also free. VERY boring night, na.”",
    hint: "(Company is ฿700. Ning makes it ฿1400 — cheaper than a bar, but no " +
      "mamasan means nobody to complain to if it goes wrong. YES / NO.)",
  },
  bkktourist: {
    rooms: ["ws_south", "ws_north", "beach_rd_c", "second_rd_c", "buakhao_market"],
    interactive: true, nightly: true,
    th: "รอเพื่อนอยู่ค่ะ", rom: "ror phuean yu kha",
    intro: "A young woman in good sneakers and a Bangkok-boutique dress is checking " +
      "her phone against the crowd, plainly waiting for someone. No bar behind her, " +
      "no smile-for-hire — just a weekender killing five minutes. She catches you " +
      "noticing and returns a small, neutral nod.",
    hint: "(She's a tourist, not a trade. Manners — or a little Thai — go further than a wallet here.)",
  },
  jptourist: {
    rooms: ["ws_gate", "ws_south", "ws_north", "beach_rd_c"],
    interactive: true, nightly: true,
    intro: "At the go-go rail a sharply-dressed Japanese woman is watching the dancers " +
      "with the frank, appraising interest of someone shopping rather than spectating. " +
      "A cocktail, an amused mouth. She clocks you clocking her — and clocking what " +
      "she's looking at — and the smile says: game recognises game. “Konbanwa.”",
    hint: "(She isn't working, and she isn't shy. Read it right — money is the wrong move.)",
  },
  britles: {
    rooms: ["ws_gate", "ws_south", "ws_north", "beach_rd_c"],
    interactive: true, nightly: true,
    intro: "At the go-go rail, pint in hand and entirely at home, a British woman is " +
      "watching the dancers with more expertise than you will ever have. One of the " +
      "girls blows her a kiss; she winks back like she owns the place. She catches " +
      "your eye and grins. “Alright? Best seat in the house, this — and I don't even " +
      "have to pretend, do I.”",
    hint: "(Not on the menu — for you. Play it decent and she might be the best wingman you get all night.)",
  },
  punterwife: {
    rooms: ["ws_south", "ws_north", "beach_rd_c", "second_rd_c", "buakhao_market"],
    interactive: true, nightly: true,
    intro: "A poised Filipina woman stands beside a farang who is unmistakably her " +
      "husband — matching rings, the comfortable boredom of the long-married. He's " +
      "deep in a football argument with a mate; she's people-watching, amused. The " +
      "working girls nearby treat her with warm, unthreatened respect — she's not " +
      "competition, and everybody knows it.",
    hint: "(Somebody's wife. Hands to yourself. Friendly, though — and she knows everyone on this soi.)",
  },
  pingpong: {
    rooms: ["ws_gate", "ws_south", "ws_north"],
    interactive: true,
    intro: "A wiry tout materialises at your elbow with a laminated card he holds " +
      "like a royal decree. “PING PONG SHOW! Very famous! No cover charge, one " +
      "drink only, up stair, best show Walking Street, my friend, BEST show.” " +
      "The stairs behind him go up into a red glow and a smell of mop water.",
    hint: "(Everyone knows the stories. ฿600 says they're exaggerated. YES / NO.)",
  },
  tonic: {
    // A Beach Road tout only — never inside a bar, and not up on Walking Street
    // or over in Jomtien. Same beachfront stretch the other roaming touts work.
    // Canon: a Pakistani hair-tonic tout, relentlessly friendly, whose ฿99
    // street bottle is only bait — the money is made by walking you into a
    // side-soi shop full of his cousins where it turns into high-pressure
    // sales and, if you resist, threats. Fleeced tourists file police reports
    // that mostly go nowhere; when pushed, the police "settle" for a cut. The
    // shop scene + police-report recovery live in _ENC.tonic / _doReport.
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade"],
    interactive: true,
    intro: "A dapper man with a briefcase falls into step beside you, smiling like " +
      "you're the friend he's been looking for all night. “My friend! Where you " +
      "from? You have very lucky face — but—” he winces, eyes flicking to your " +
      "hairline “—I am seeing one small problem.” The briefcase clicks open: rows " +
      "of little brown bottles. “Himalayan herbal tonic. Hair grow back one " +
      "hundred per cent, guarantee. For you, special, ninety-nine baht only. Or " +
      "better — come my shop, just here in the soi, my cousin show you the full " +
      "treatment, VIP price. Two minute, my friend, two minute!”",
    hint: "(BUY the ฿99 bottle, follow him to the SHOP, or just tell him NO.)",
  },
  fortune: {
    // A Beach Road curse-removal con (real Tourist Police bust, Pattaya, 16 Jul
    // 2026). A man in monk-like robes reads your "unlucky" face on the beachfront,
    // does a ฿199 palm reading with a blessed string and a "lucky number", then
    // upsells a four-figure cleansing ritual, turning aggressive if refused. The
    // fleece is banked in G.curseOwed so a police REPORT claws most of it back —
    // the ritual + recovery live in _ENC.fortune / _curseRitual / _doReport.
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade"],
    interactive: true,
    intro: "A man in saffron robes and a wound head-cloth steps into your path, " +
      "palms pressed, and studies your face with sudden grave concern. “Friend. " +
      "Wait — your face…” A slow, sorrowful head-shake. “Very unlucky this month. " +
      "I see it clear. A dark spirit is following you.” He is already reaching for " +
      "your hand, a red blessed string looped around his own wrist. “I read your " +
      "palm, write your lucky number — only one-nine-nine baht. Then we fix. Sit, sit.”",
    hint: "(Let him READ your palm for ฿199, or tell him NO and walk on.)",
  },
  booking: {
    // The app-booked freelancer + the catfish (from a punter report). Fires late,
    // near home, once you're settled (act1Done). YES and she takes her time (the
    // apps run on the 'tomorrow' clock even at 1 a.m.); then a photos-vs-reality
    // roll — sometimes a genuine payout, more often the catfish, worst in heels.
    // The two-step catfish + the hit live in _ENC.booking / _catfishDoor.
    rooms: ["hotel_room", "qv_room", "metropole_room", "naklua_rd"],
    interactive: true, nightly: true,
    intro: "Your phone buzzes — one of the girls you'd been messaging off the apps, " +
      "the stunner from the photos who kept leaving you on read, is suddenly awake " +
      "and suddenly free. “Hi baby, I finish work. I come you now? 2500, no bar, no " +
      "barfine, only you.” It is gone 1 a.m. The photos are, it must be said, " +
      "extraordinary.",
    hint: "(YES, book her — she'll be a while — or NO and turn in.)",
  },
};

// ── Quests (adventures) ─────────────────────────────────────────────────────
// The engine's quest subsystem (engine-systems.js) drives these: givers surface the
// offer in conversation, ACCEPT starts it (handing over `item` if any),
// setting `doneFlag` completes it next turn and pays `reward`. `deps` are
// quest ids that must be done first.

const QUESTS = {
  sangsom: {
    name: "The Sister-Bar Run",
    giver: "candy",
    desc: "Carry Candy's gift bottle of Sang Som to Bee at Candy Bar 2, in Myth " +
      "Night (GIVE SANG SOM TO BEE).",
    deps: [],
    item: "sang_som",
    doneFlag: "sangsomDelivered",
    reward: { money: 200, happy: 3 },
  },
  league: {
    name: "King of the Killer Table",
    giver: "bert",
    desc: "Win a killer pool league night — every third night, ฿100 entry, the " +
      "Stinky Bar is the league's home felt (PLAY KILLER).",
    deps: [],
    doneFlag: "wonLeague",
    reward: { money: 0, happy: 5 },
  },
  bee_number: {
    name: "Bee's First Investor",
    giver: "bee",
    desc: "Bee wants her expansion fund taken seriously: get her number (CONTACT " +
      "BEE) and wire ฿100 through the banking app (SEND 100 TO BEE).",
    deps: ["sangsom"],
    doneFlag: "beeBanked",
    reward: { money: 0, happy: 4 },
  },
};

// ── Quiz night ──────────────────────────────────────────────────────────────
// Thursday, 20:00–22:00, at three bars drawn fresh each week. Walk in during
// the window and you're a contestant — the host does not take no.

const QUIZ_BARS = [
  "candy_bar", "candy_bar_2", "lucky_tiger", "silk_rose", "jasmine_garden",
  "gold_rush", "starlight_bar", "midnight_sun", "stinky_bar", "khao_talo_bar",
  "rock_factory",
];

// {q, opts (3), a: correct index} — Pattaya street knowledge and survival Thai.
const QUIZ_POOL = [
  { q: "The baht bus driver says “สิบห้าบาท”. He wants…", opts: ["฿15", "฿50", "฿55"], a: 0 },
  { q: "'Sabai sabai' means…", opts: ["hurry up", "easy, relaxed", "very expensive"], a: 1 },
  { q: "เปิด on a bar's door means the bar is…", opts: ["open", "closed", "cash only"], a: 0 },
  { q: "A 'butterfly' is a man who…", opts: ["tips too much", "flits from girl to girl", "won't sing karaoke"], a: 1 },
  { q: "Soi Khao Talo is…", opts: ["on the Darkside, east of Sukhumvit", "off Walking Street", "in Naklua"], a: 0 },
  { q: "A lady drink runs…", opts: ["฿80", "฿150", "฿300"], a: 1 },
  { q: "ห้ามเข้า on a door means…", opts: ["welcome", "no entry", "ring the bell"], a: 1 },
  { q: "A piwin's vest is…", opts: ["orange", "grey", "hot pink"], a: 0 },
  { q: "Thai for water is…", opts: ["nam", "chang", "sanuk"], a: 0 },
  { q: "The oldest go-go in Pattaya is…", opts: ["Neon Paradise", "Tequila Queen", "Crystal Palace"], a: 1 },
  { q: "ซ้าย, painted on a maze wall, points…", opts: ["left", "right", "straight on"], a: 0 },
  { q: "'Songthaew' literally means…", opts: ["blue bus", "two rows", "fifteen baht"], a: 1 },
  { q: "'Mai pen rai' means…", opts: ["never mind", "how much?", "one more bottle"], a: 0 },
  { q: "Thailand's lucky number is…", opts: ["7", "9", "13"], a: 1 },
  { q: "Ringing the bar bell means…", opts: ["last orders", "a round for the house, on you", "the quiz is starting"], a: 1 },
];

// ── Canon checklist (used by tests) ────────────────────────────────────────

// ── Named patrons: bar customers with a home bar and (mostly) wandering feet ──
// Hoppers drift to a different bar each hour until 22:00, then settle at their
// home bar for the rest of the night; non-hoppers never leave home. The engine
// places them by pure hash (same night, same hour, same stool) and their
// dialogue trees reset daily. Schema matches NPC dialogue: fallback + topics,
// `short` for terse repeats.
const PATRONS = {

  ron: {
    name: "Ron", emoji: "🦘", age: 66, nat: "Australian",
    home: "mama_yai", hops: false,
    desc: "Sixty-six, Wollongong, a faded steel-town singlet and thongs that have " +
      "worn a groove in this soi. He has the settled bulk of a man who stopped " +
      "moving fifteen years ago and rates it his finest decision.",
    dialogue: [
      { text: "\"Ron.\" He tips a Chang toward the empty stool. \"Wollongong — " +
        "steel town, back when the mill still made noise. Come for a fortnight in " +
        "2011, never got on the plane.\" He nods at the kitchen, the photo wall, the " +
        "lake somewhere out past it. \"Married a cashier off that very stool, paid " +
        "off a room behind the water, haven't set foot on Walking Street in six " +
        "years. You can KEEP it, mate.\"",
        short: "\"Come for a fortnight in 2011, never got on the plane.\"" },
      { topic: "walking street", text: "\"Town? Mate.\" He snorts into the Chang. " +
        "\"Six hundred baht a barfine to be lied to by a professional. Out here the " +
        "beer's ten baht cheaper, the wife's real, and Mama Yai feeds me for what a " +
        "lady drink costs in town. Tourists reckon WE'RE the sad ones.\" He looks " +
        "genuinely delighted. \"Let 'em.\"" },
      { topic: "darkside", text: "\"Darkside's just Pattaya for blokes who did the " +
        "sums,\" he says, comfortable as an old couch. \"Quieter, cheaper, older, " +
        "honest. Gary out at the lake'll tell you the same — if he can be bothered " +
        "talking, which he can't. That's the whole appeal, really.\"" },
      { topic: "wollongong", text: "\"The Gong. Steel, rugby league, rain sideways " +
        "off the sea.\" A shrug that forgives the place. \"Mill shed half its men " +
        "the year I left. No grand tragedy — I just did the arithmetic and the " +
        "arithmetic said Khao Talo. Same beer money, twice the sun, none of the " +
        "committee meetings.\"" },
    ],
  },

  mort: {
    name: "Mort", emoji: "🦉", age: 74, nat: "American",
    home: "queen_vic", hops: false,
    desc: "Seventy-four, a Hawaiian shirt at war with itself, a spiral notebook and a " +
      "biro he clicks while he watches the soi. He has been on this coast longer than " +
      "most of the bars, and he is writing all of it down whether it likes it or not.",
    dialogue: [
      { text: "\"Mort.\" He finishes the line before he looks up. \"I write the Nite " +
        "Owl — the back-page column, the one your granddad read on the toilet. Retired " +
        "twice, un-retired twice; a man needs a deadline or the days run together and " +
        "the mind goes to soup.\" He clicks the pen. \"So I watch, I write it down, and " +
        "I don't give a hoot who minds. READ THE COLUMN if you like — it's mostly true.\"",
        short: "\"I write the Nite Owl. READ THE COLUMN — mostly true. Keeps me sane.\"" },
      { topic: "column", text: "\"Forty years of the same story, squire, and it never " +
        "gets old because the punters keep arriving new. A reader letter, a bar listing, " +
        "a joke, and whatever the street taught me that week. I don't moralise — I report " +
        "the weather and the women and let a man draw his own conclusions.\" A dry look. " +
        "\"He never does. READ THE COLUMN — you can pull it up anywhere now.\"" },
      { topic: "sane", text: "\"Boredom's the killer out here — not the drink, not the " +
        "girls, the BOREDOM. Fella retires on his pension, sits in the condo, and by March " +
        "he's counting ceiling tiles and eyeing the balcony.\" He taps the notebook. \"This " +
        "is my ceiling tiles. Five hundred words a week and a reason to leave the room. " +
        "Cheaper than a psychiatrist, and funnier.\"" },
      { topic: "nineties", text: "\"Everyone tells me it was better in '98. Everyone's " +
        "wrong, and I was HERE, filing copy, so I would know. It wasn't better — the beer " +
        "was cheaper and so were they, and so, crucially, were you.\" He almost smiles. " +
        "\"The city never changed, chief. You did. Printed that once. Forty angry letters. " +
        "Framed two.\"" },
    ],
  },

  nigel: {
    name: "Nigel", emoji: "🍻", age: 68, nat: "British",
    home: "lucky_tiger", hops: true,
    desc: "Sixty-eight, sun-spotted, a Chang vest gone grey at the seams. He has " +
      "the fixed forward stare of a man permanently addressing an audience of " +
      "1998. Whatever bar he's in, he looks like he's comparing it to a better one.",
    dialogue: [
      { text: "\"Nigel.\" He doesn't ask your name. \"You should've seen this town " +
        "before, son. Beach Road had trees. TREES. A lady drink was fifty baht and " +
        "the girls loved you for who you were.\" He takes a long, wounded pull of " +
        "his lager. \"It's all gone corporate now. QR codes. No soul.\"",
        short: "\"Trees on Beach Road, fifty-baht lady drinks. No soul now, son. No soul.\"" },
      { topic: "1998", text: "\"Best year of my life, 1998. Pound went twice as far — " +
        "I lived like a lord on a printer salesman's redundancy.\" He counts the " +
        "losses on his fingers: \"The Marine Bar. Gone. The old pier. Gone. My " +
        "hair.\" He does not include the exchange rate, his knees, or the fact " +
        "that he was forty then. The list is curated.",
        short: "\"1998. Lived like a lord. All gone now.\"" },
      { topic: "home", text: "For a second the performance stops. \"Maidstone. Sold " +
        "the bungalow in 2009 — split it with the wife, hers by rights, most of " +
        "it.\" He turns the glass a quarter-turn. \"Nothing to go back for. My " +
        "daughter sends photos at Christmas. The grandkids are... big now.\" The " +
        "performance resumes: \"Anyway. This town's finished. Same again, love!\"",
        short: "\"Maidstone. Nothing to go back for. Anyway — this town's finished.\"" },
      { topic: "bars", text: "\"I do the rounds, keep an eye on standards. Lucky " +
        "Tiger's the only honest pour left on the soi — I'm there by ten, ask " +
        "anyone.\" He leans in. \"The rest of them? Watered Chang and tourist " +
        "prices. I only drink in them to confirm it.\"",
        short: "\"Lucky Tiger by ten. The rest I drink in purely for evidence.\"" },
      { topic: "barfine", text: "\"Barfines? Sit down, son.\" He turns on the stool " +
        "like a lecturer finding his podium. \"Rule one: settle short time or long " +
        "time BEFORE a single baht moves. Leave it open and an experienced girl " +
        "will price it after, and the price only ever moves one way. Rule two: if " +
        "the plan is taking someone home, ask EARLY — nothing worse than four " +
        "lady drinks into building rapport and she's got temple in the morning. " +
        "Rule three:\" — the glass comes down for emphasis — \"barfined her long " +
        "time once, lovely girl, sudden emergency at half eleven, grandmother " +
        "very sick. Found her back on her stool the same night. Or it might have " +
        "been Beach Road. If it happens to you, go back and tell the mamasan — " +
        "she'll make it right. Not out of kindness. Bad girls are bad business.\"",
        short: "\"Settle ST or LT before money moves, ask early, and if she runs — tell the mamasan.\"" },
    ],
  },

  chuck: {
    name: "Chuck", emoji: "🤠", age: 58, nat: "American",
    home: "tequila_queen", hops: true,
    desc: "Sunburn over sunburn, a polo shirt with a plumbing-company logo, and the " +
      "unmistakable glow of a man who believes he is winning. Day four of two weeks. " +
      "There is usually a drink in front of him that he will tell you was free.",
    dialogue: [
      { text: "\"Chuck. Tulsa, Oklahoma. Plumbing and drainage, twenty-nine years.\" " +
        "The handshake could crack pipe. \"Buddy, I gotta tell you — they LOVE me " +
        "here. Mamasan sent me a shot on the house, didn't even order it. You know " +
        "how many bars do that back home? Zero.\" He beams at the room. \"These " +
        "people are the friendliest people on God's earth.\"",
        short: "\"They LOVE me here, buddy. Shot on the house. Friendliest people on earth.\"" },
      { topic: "free drink", text: "\"See, everybody else is out here getting nickel-" +
        "and-dimed, and I'm drinking FREE.\" He lowers his voice to a roar. \"It's " +
        "about respect. They can tell I'm not some tourist. Last night at the " +
        "Tequila Queen the mamasan comped me twice.\" He shows you the receipt " +
        "as proof of his triumph; it says ฿11,450. He has not read it as closely " +
        "as you just did.",
        short: "\"Drinking free, buddy. It's about respect.\" The receipt says otherwise." },
      { topic: "money", text: "\"Cheapest vacation of my life. I mean, the ATM's " +
        "been a little— the bank keeps texting me, whatever, fraud department " +
        "being jumpy.\" He waves it off with a hand still holding the free shot. " +
        "\"You can't put a price on being somewhere you're APPRECIATED.\"",
        short: "\"Cheapest vacation of my life.\" The bank keeps texting him." },
      { topic: "wife", text: "A beat. \"Diane. Twenty-two years. She, uh—\" he " +
        "rotates the shot glass. \"She kept the house. Her lawyer was a shark.\" " +
        "Then, rallying, indicating the whole neon street: \"Her loss, right? " +
        "HER LOSS.\" The rally doesn't entirely reach his eyes.",
        short: "\"Diane kept the house. Her loss, right?\"" },
    ],
  },

  dave: {
    name: "Dave", emoji: "📋", age: 55, nat: "British",
    home: "stinky_bar", hops: true,
    desc: "Fifty-five, neat polo, shandy in front of him going flat. He drinks less " +
      "than anyone in whatever bar he's in and looks at the door more. His phone " +
      "sits face-up: a long list of names, a lot of them greyed out.",
    dialogue: [
      { text: "\"Dave.\" A nod, an appraisal — not unfriendly, just thorough. \"New " +
        "face. You here long, or just passing through?\" He files your answer " +
        "somewhere. \"Either way — you ever see a bloke on his own looking wrong, " +
        "proper wrong, you tell someone. Tell me, tell Bert at the Stinky. We keep " +
        "a bit of an eye, us lot.\"",
        short: "\"See a bloke looking proper wrong, you tell me or Bert. We keep an eye.\"" },
      { topic: "rounds", text: "\"I do a lap most nights — few bars, see who's " +
        "about, who's not.\" He says it like a man describing a hobby, but the " +
        "{{phone}} list is right there. \"Who's NOT is the important bit. Fella drops " +
        "off the radar a week, that's when you knock on his door. Wish I'd " +
        "learned that earlier than I did.\"",
        short: "\"A lap most nights. Who's NOT about is the important bit.\"" },
      { topic: "simon", text: "He looks at you properly. \"Now where'd you hear " +
        "that name.\" A slow mouthful of the flat shandy. \"Mate of mine. Went " +
        "quiet for a week — visa gone, money gone, the girl gone, and too proud " +
        "to say a word. I rang him till he picked up.\" Another mouthful. \"He's " +
        "in Ban Chang now, near his sister. Grows chillies. Sends me photos of " +
        "chillies, mate, endless photos of chillies.\" He smiles at his phone " +
        "like it owes him money. \"Best boring photos I ever got.\"",
        short: "\"Simon's in Ban Chang growing chillies. Best boring photos I ever got.\"" },
      { topic: "flying club", text: "\"Heard the joke, have you.\" It isn't a " +
        "question and he isn't smiling. \"Every one of them had mates who said " +
        "afterwards, 'never saw it coming.' Saw it fine. Just didn't ring.\" He " +
        "straightens the beer mat. \"So I ring. That's it. That's the whole trick.\"",
        short: "\"'Never saw it coming' — saw it fine, just didn't ring. So I ring.\"" },
    ],
  },

  helmut: {
    name: "Helmut", emoji: "🔧", age: 61, nat: "German",
    home: "silk_rose", hops: false,
    desc: "Sixty-one, pressed short-sleeve shirt, glasses polished to optical-lab " +
      "standard. He occupies the third stool from the left as if allocated it by " +
      "the state. One Chang, one glass, one coaster, all aligned.",
    dialogue: [
      { text: "\"Helmut.\" A precise nod. \"Stuttgart. Retired — industrial " +
        "toolmaking, thirty-eight years.\" He indicates the bar with a small " +
        "economical gesture. \"I come here every night at nineteen hundred. Same " +
        "stool. The staff do not ask what I want because it is not necessary. " +
        "This,\" he says, with the closest thing to warmth, \"is quality of life.\"",
        short: "\"Same stool, nineteen hundred, nobody asks. Quality of life.\"" },
      { topic: "stool", text: "\"The third stool. I evaluated all nine.\" He is " +
        "not joking. \"Best angle on the television, full coverage from fan " +
        "number two, and the rail does not wobble.\" A sip, precisely timed. " +
        "\"The Walking Street bars have better fans and worse everything else. " +
        "I did the assessment in 2013. It has not required updating.\"",
        short: "\"Third stool. I evaluated all nine in 2013. No update required.\"" },
      { topic: "germany", text: "\"Nothing is wrong with Germany.\" A pause of " +
        "engineering tolerance. \"My apartment is worth four times what I paid. " +
        "My pension is index-linked. My brother calls on Sundays.\" Another " +
        "pause. \"In Stuttgart I was a man waiting for the weather to improve. " +
        "Here the weather is improved. That is the entire calculation.\"",
        short: "\"Nothing is wrong with Germany. Here the weather is improved. Entire calculation.\"" },
      { topic: "barhop", text: "He looks at you as if you have proposed dismantling " +
        "a working machine to see what it does. \"Why would I go to a different " +
        "bar? The variables are all known here. New bar: unknown pour, unknown " +
        "prices, unknown stool.\" He shakes his head once, closing the matter. " +
        "\"Some of these men visit six bars a night. Six sets of variables. Madness.\"",
        short: "\"Six bars a night is six sets of variables. Madness.\"" },
    ],
  },

  somsak: {
    name: "Somsak", emoji: "🌇", age: 47, nat: "Thai",
    home: "blue_dog", hops: false,
    desc: "Forty-seven, hotel-maintenance polo, the end seat at the Blue Dog rail " +
      "with the best line on both the sunset and the checkpoint. He drinks one " +
      "big Leo very slowly and misses absolutely nothing on the road.",
    dialogue: [
      { text: "\"Somsak.\" He raises the Leo a centimetre in greeting. \"Chief " +
        "engineer, hotel on Second Road — aircon, pumps, everything that breaks.\" " +
        "He nods at the rail, the bay, the road. \"Every evening I sit here one " +
        "hour before I go home. Best seat in Pattaya.\" He checks the sun's " +
        "progress like a man checking a gauge. \"You are early or late, depending.\"",
        short: "\"Best seat in Pattaya.\" He checks the sunset like a gauge." },
      { topic: "police", text: "As if on cue he tips the bottle toward the road. " +
        "\"My cousin. The tall one, left side.\" A farang on a scooter is being " +
        "waved over as he says it. \"Every evening, six to seven. No helmet, no " +
        "license — five hundred, maybe two thousand if you argue.\" He shrugs " +
        "with one shoulder. \"Farang call it corruption. My cousin calls it " +
        "the only hour of the day farang wear helmets.\"",
        short: "\"My cousin, the tall one. The only hour of the day farang wear helmets.\"" },
      { topic: "farang", text: "He considers the street for a while. \"Farang think " +
        "Pattaya happens TO them. Big adventure, big drama, big broken heart.\" " +
        "The Leo comes down a centimetre. \"For us it is Tuesday. The bars are " +
        "the factory. The girls are the shift. The sunset—\" he nods west \"—is " +
        "the sunset. You want to understand this town, watch who is still calm.\"",
        short: "\"Farang think Pattaya happens to them. For us it is Tuesday.\"" },
      { topic: "sunset", text: "\"Twenty-two years I watch it from this chair and " +
        "it is not two times the same.\" He does not look away from it while " +
        "speaking. \"My wife asks why I do not come straight home. I tell her: " +
        "a man who maintains machines all day must watch one thing that needs " +
        "no maintenance.\" A slow sip. \"She thinks it is about the beer. It is " +
        "sixty percent not about the beer.\"",
        short: "\"One thing that needs no maintenance. Sixty percent not about the beer.\"" },
    ],
  },

  randy: {
    name: "Randy", emoji: "🐻", age: 54, nat: "American",
    home: "jasmine_garden", hops: true,
    desc: "Six-foot-four and built like the loads he used to carry, with hands that " +
      "make the Chang bottle look like a miniature. Fifty-four, Alabama drawl, and " +
      "a permanently mild expression of a man who still can't quite believe where " +
      "he wakes up. There is usually at least one hostess using him as furniture.",
    dialogue: [
      { text: "\"Randy.\" The handshake is careful, the way big men learn to make " +
        "it. \"Cordova, Alabama — you won't know it, nobody knows it, that's " +
        "kindly the point of it.\" A girl drapes an arm over his shoulder in " +
        "passing, pats him twice like a horse, moves on. He accepts this as " +
        "weather. \"Thirty-five years of poured concrete and warehouse floors, " +
        "and now I'm... here.\" He looks around, genuinely puzzled by his own " +
        "sentence. \"Still checkin' if it's real, most mornings.\"",
        short: "\"Cordova, Alabama. Thirty-five years of concrete, and now I'm here.\"" },
      { topic: "lawsuit", text: "\"Forklift come off a ramp that shoulda been " +
        "condemned in the nineties. Crushed my foot, two discs.\" He says it " +
        "flat, no drama. \"Company lawyer offered me eight grand and a handshake. " +
        "My sister's boy just passed the bar exam, took one look and said don't " +
        "you sign NOTHIN', Uncle Randy.\" A slow grin spreads. \"Three years " +
        "later the settlement come through. I ain't sayin' the number. I'll say " +
        "the beer's on me and the beer's gonna KEEP bein' on me.\"",
        short: "\"Forklift, bad ramp, good nephew, big settlement. Beer's on me.\"" },
      { topic: "navy", text: "The grin goes somewhere quieter. \"Buddy of mine, " +
        "Earl. Navy man — Seventh Fleet, come through Pattaya in the eighties " +
        "on shore leave. He'd tell stories about this town at the plant, lunch " +
        "breaks, and we'd call him a liar to his face. Ladies like THAT? Bars " +
        "like THAT? G'won, Earl.\" He turns the bottle slowly. \"Lung cancer " +
        "took him in '19. Never got back here.\" He raises the Chang maybe an " +
        "inch off the bar. \"First month I was here I sat down, looked around, " +
        "and said out loud: well I'll be damned, Earl. Every word.\"",
        short: "\"My buddy Earl told me about this town. Every word was true. Every word.\"" },
      { topic: "girls", text: "On cue, a hostess passing behind him stops to " +
        "squeeze both his shoulders like she's testing produce, says \"Mee yai " +
        "jai dee,\" and carries on. \"They call me Mee. Means bear, I'm told.\" " +
        "He shrugs, a geological event. \"Back home a fella my size, folks cross " +
        "the parkin' lot. Here I sit down and they braid my damn hair if I let " +
        "'em grow it.\" He considers his bottle. \"Fifty-four years bein' the " +
        "biggest thing in the room, and this is the first place it made anybody " +
        "SOFTER toward me. Don't that beat all.\"",
        short: "\"They call me Mee. Big bear, good heart, they say. Don't that beat all.\"" },
      { topic: "barfine", text: "\"Learned this one the expensive way.\" He holds " +
        "up fingers the size of moo ping. \"One: most of 'em are straight " +
        "shooters — girl's got a quota to hit, mama takes her cut, everybody " +
        "eats. But a sharp one'll read a new fella like a menu. Paid a long " +
        "time once, and she matched me beer for beer all night till the room " +
        "door shut — then 'mao mak mak, cannot boom boom,' out cold, gone by " +
        "sunup, fresh as a daisy I bet, back on shift.\" He shrugs, geological. " +
        "\"Went back next evening, told the mama. Got every baht back and an " +
        "apology with it. These bars run on repeat customers, son. The mamas " +
        "know it better than anybody.\"",
        short: "\"Most girls are straight. The sharp ones read newbies like a menu — and the mama pays you back.\"" },
    ],
  },

  drew: {
    name: "Drew", emoji: "🚬", age: 53, nat: "American",
    home: "stinky_bar", hops: true,
    desc: "Fifty-three, Navy posture that never demobbed, a Marlboro going and its " +
      "successor already tapped out of the pack. In front of him: Jack and Coke, " +
      "no lemon — an arrangement he supervises like a treaty. The eyes do a " +
      "room-sweep every few minutes, out of training rather than interest.",
    dialogue: [
      { text: "\"Drew.\" A nod through the smoke. He catches the bartender's eye " +
        "and taps his glass: \"Jack-Coke. NO lemon. Tell him. Last week somebody's " +
        "new girl put a lemon wedge in it like it's a goddamn spa water.\" He " +
        "exhales a long grey ribbon. \"Twenty years Navy, then contract work on " +
        "the bases in Korea — Yongsan, Humphreys, Osan, you name it. Linguist. " +
        "Korean.\" A drag. \"Fat lot of good it does me on this soi.\"",
        short: "\"Jack-Coke, NO lemon. Twenty years Navy, Korean linguist. Fat lot of good here.\"" },
      { topic: "korea", text: "\"The Navy taught me Korean at DLI — eighteen " +
        "months, Monterey, hardest thing I ever did sober.\" The cigarette " +
        "conducts. \"Did my last tours listening to the north talk to itself, " +
        "then went civilian and stayed on the bases another decade. Good money. " +
        "Cold winters. Soju hangovers that arrive BEFORE you stop drinking.\" " +
        "He taps ash with precision. \"Twenty-two years in country and the " +
        "country still decided I was temporary.\"",
        short: "\"DLI Monterey, then twenty-two years in Korea. Still temporary, apparently.\"" },
      { topic: "jihyun", text: "The glass pauses halfway. \"Somebody's been " +
        "talking.\" A drag, a decision. \"Jihyun. Dentist — her own clinic in " +
        "Pyeongtaek, smarter than me in two languages. Fourteen years married.\" " +
        "The ice gets a slow turn. \"She left me for a K-drama-looking sonofabitch " +
        "ten years younger who moisturizes. I got the apartment furniture and " +
        "the dog's ashes.\" He stubs the cigarette with more force than required. " +
        "\"Anyway. Thailand's warmer.\"",
        short: "\"Jihyun. Fourteen years. She picked the pretty boy. Thailand's warmer.\"" },
      { topic: "canada", text: "His face executes a manoeuvre. \"Don't get me " +
        "started on Canadians. Whole country's a passive-aggressive apology " +
        "with a flag on its backpack — and they're EVERYWHERE down here, being " +
        "POLITE at you.\" The volume has attracted the bartender's attention. " +
        "\"Except Davey. Davey's the one good one. They made exactly one and " +
        "then they made the rest.\" He lights the successor Marlboro off the " +
        "first. \"A man needs a rule and a exception. That's mine.\"",
        short: "\"Canadians. Don't start. Except Davey — they made exactly one good one.\"" },
      { topic: "danny", text: "The cigarette stops halfway. \"Do NOT.\" A long " +
        "drag, a visible decision not to raise his voice. \"Hundred and twenty " +
        "thousand baht. A CANADIAN — I broke my own rule for a Canadian because " +
        "Davey vouched, and Davey vouches for weather.\" Smoke leaves him like " +
        "pressure venting. \"'Illiquid.' You know what else is illiquid? My " +
        "hands around his neck, pending. He sees me come in a bar, he remembers " +
        "an appointment.\" He stubs the cigarette. \"The exception list stays " +
        "at one, and it is not him.\"" },
      { topic: "angela", text: "\"Ang? Yeah.\" Smoke, consideration. \"Class behind " +
        "me at the schoolhouse. Sharp — better accent than mine and I'd been at " +
        "it longer, which I did not enjoy.\" He taps ash. \"Wasn't friends with " +
        "her. Navy's like that — you share a hallway for two years and then it's " +
        "twenty-five years and a Facebook like.\" A drag. \"She turned up here " +
        "without a word, which frankly I respect. She's over at the Queen Vic " +
        "with her little CD player.\" He almost smiles. \"Still a better accent. " +
        "Still don't enjoy it.\"",
        short: "\"Class behind me at DLI. Better accent than mine. Still don't enjoy it.\"" },
      { topic: "oahu", text: "The smoke slows down. \"First posting, Pearl. " +
        "Twenty-two years old, Oahu, sailor money.\" Something in him unclenches " +
        "half a turn. \"North Shore on weekends, plate lunch, that rain that " +
        "comes over the Ko'olaus at four o'clock like it kept an appointment. " +
        "Met Jihyun at a wedding at Kaneohe.\" He looks at the Jack and Coke. " +
        "\"Everything since has been a long detour from a beach I can't get " +
        "back to. Don't repeat that. I'll deny it.\"",
        short: "\"Pearl, twenty-two years old. Everything since is a detour. I'll deny I said that.\"" },
    ],
  },

  david: {
    name: "David", emoji: "🇨🇦", age: 52, nat: "Canadian",
    home: "stinky_bar", hops: false, days: [1, 5], // teacher's days off: Mon & Fri
    desc: "Fifty-two, ball cap gone soft with washing, the delighted open face of a " +
      "golden retriever that learned English. One beer in front of him, nursed " +
      "with the skill of a man who has budgeted exactly four. He is either " +
      "talking, about to talk, or dancing.",
    dialogue: [
      { text: "\"Oh hey! Hi! David!\" He relocates to the stool next to yours in " +
        "one motion, delighted. \"Saskatoon originally, but I teach English here " +
        "now — M3 and M4, great kids, terrible kids, same kids.\" The beer gets " +
        "a small tactical sip. \"Mondays and Fridays are my days off so those " +
        "are my beer days, and buddy, it is one of THOSE days.\" He beams like " +
        "this is the best news either of you has had all week.",
        short: "\"David! Saskatoon! It's a beer day, buddy!\" He beams." },
      { topic: "teaching", text: "\"Thirty-two thousand baht a month and they " +
        "haven't done my visa paperwork right in three years, eh?\" He says it " +
        "cheerfully, like the score of a game he enjoys losing. \"But I got a " +
        "kid this term, little guy, couldn't say two words in September — " +
        "yesterday he tells me a whole joke in English. Bad joke. GREAT joke.\" " +
        "He taps the bar. \"You can't buy that. Which is good. Because I can't.\"",
        short: "\"32k a month, but a kid told me a joke in English yesterday. Can't buy that.\"" },
      { topic: "money", text: "\"Oh I'm broke, yeah, super broke.\" Total " +
        "cheerfulness. \"Four beers Monday, four beers Friday, one pad krapao " +
        "a day and rent on a room you couldn't swing a small cat in.\" He " +
        "shrugs hugely. \"The girls know I'm a zero-lady-drink guy — they wave " +
        "at me anyway, eh? Lek calls me 'teacher.' I'd rather be broke here " +
        "than whatever I was back in the staff room in Saskatoon. Oh — buddy, " +
        "I was BROKE there too!\" This strikes him as very funny.",
        short: "\"Super broke, super happy. Broke in Saskatoon too — but colder!\"" },
      { topic: "drew", text: "\"Drew! My best buddy!\" No hesitation, full warmth. " +
        "\"I know how he sounds, eh? First night he heard my accent he stood up " +
        "off the stool. Called me a — well. It rhymed with 'sanctimonious snow " +
        "goblin'.\" A happy pull of beer. \"Then we got talking about his dog — " +
        "he had this dog in Korea, and I had the same dog growing up, same " +
        "breed, same name even, and by closing time he says 'you're alright, " +
        "Davey.'\" He grins. \"He pays for my beers when I run out. Don't tell " +
        "him I told you. He'll deny it, eh?\"",
        short: "\"Drew's my best buddy. He'll deny everything. He pays for my beers.\"" },
      { topic: "dance", text: "He is already half off the stool. \"Okay so — two " +
        "beers is talking, three beers is DANCING, that's just science.\" He " +
        "demonstrates a move that is either the twist or a man putting out a " +
        "small fire. \"The girls voted it 'same same monkey' which I choose to " +
        "hear as encouragement, eh?\" He sits back down, breathing lightly. " +
        "\"Beer three's coming. Consider yourself warned, buddy. And beer four—\" " +
        "he winks enormously \"—beer four is a whole other show, eh?\"",
        short: "\"Three beers is dancing. That's just science. Beer four is a whole other show.\"" },
      { topic: "danny", text: "\"Danny! Oh, Danny's okay, eh?\" This is clearly a " +
        "minority position and he holds it with total serenity. \"I put in " +
        "fifteen thousand — my emergency fund, took me two years to save it.\" " +
        "A cheerful sip. \"Drew says I should be furious. But Danny showed me " +
        "the chart, and buddy, the chart went UP before it went away. I saw it " +
        "go up. That was pretty exciting for a Tuesday, eh?\" He shrugs " +
        "enormously. \"He says I get paid back first when it relaunches. Drew " +
        "says there's no relaunch. One of them's right, eh? Exciting either way.\"" },
      { topic: "prince albert", text: "\"Oh — buddy! Did Drew tell you?\" He is " +
        "glowing with civic pride and his hands are already at his belt buckle. " +
        "\"Vancouver, '96. Lost a bet, kept the winnings, eh?\" The bar's early-" +
        "warning system engages as one organism: two hostesses relocate with " +
        "practiced speed, the patron at the rail studies the ceiling, and Bert, " +
        "without looking up from the felt, says \"FOURTH beer, Davey. House " +
        "rule. And never near the table.\" David re-buckles, wholly unoffended, " +
        "a man used to being rescheduled. \"After the next one, then. It's " +
        "TASTEFUL, buddy.\" He leans in, confidential, delighted: \"There's a " +
        "little maple leaf on it.\"",
        short: "\"After the next beer, buddy. It's TASTEFUL. There's a little maple leaf on it.\"" },
    ],
  },

  superman: {
    name: "Superman", emoji: "🦸", age: 62, nat: "American",
    home: "blue_dog", hops: false,
    desc: "Sixty-two, in tonight's Superman shirt — the S faded from a hundred " +
      "washes, stretched over a chest that carries three stents and a story. He " +
      "sits angled to the bay, not the bar. Sometimes, mid-sentence, he goes " +
      "perfectly still for a few seconds — like a video buffering — then carries " +
      "on from the exact word he stopped at.",
    dialogue: [
      { text: "He doesn't look away from the water. \"They call me Superman. The " +
        "shirts.\" He plucks the faded S. \"Got a drawer full — the girls at my " +
        "condo wash 'em in rotation.\" Only now does he turn, and the handshake " +
        "is light, careful, like a man rationing everything. \"Sit down if you " +
        "want. Show starts in a bit.\" He means the sun. He always means the sun.",
        short: "\"They call me Superman.\" He doesn't look away from the water." },
      { topic: "sunset", text: "\"I've watched it from this chair every day for " +
        "four years. Missed twice — once for a funeral, once for the cath lab.\" " +
        "The bay is going gold as he says it. \"People ask why I don't travel, " +
        "see other sunsets. Boys —\" he opens both hands at the entire sky \"— " +
        "this is the same sun that sets everywhere, and I've got the best seat " +
        "on earth, and I don't know how many tickets I got left.\" He goes " +
        "still. Four seconds. Five. Then: \"— so I don't miss showings.\"",
        short: "\"Best seat on earth, and I don't know how many tickets I got left.\"" },
      { topic: "heart", text: "\"Three stents and a valve they keep threatening " +
        "to replace.\" He says it like a car repair estimate. \"Doc gives me the " +
        "speech every visit — quit the beer, quit the salt, walk more, and I " +
        "nod, and he knows I'm lying, and we're both fine with the arrangement.\" " +
        "He pats the S on his chest. \"Man of steel. Everything except the " +
        "actual heart.\" The joke lands soft because he's clearly made it " +
        "five hundred times and needs it to keep working.",
        short: "\"Man of steel. Everything except the actual heart.\"" },
      { topic: "girlfriend", text: "\"Marites.\" He nods slowly, like confirming " +
        "the spelling, and his hand moves to the empty chair on his left without " +
        "him seeming to notice it. \"Filipina — worked at the Friendship " +
        "supermarket, went to church twice a week, took my blood pressure with " +
        "one of those wrist machines every morning like a little nurse.\" A " +
        "small tip of the head at the chair. \"Two years she sat right there. " +
        "Every sunset. Brought her own cushion — it's still behind the bar, " +
        "nobody's moved it.\" The stillness takes him, briefly. \"— then one " +
        "evening she stood up before the sun was even down. Said she could " +
        "watch it set every night or watch me do it, not both. Wasn't going to " +
        "sit front row while I chose this chair over her.\" He watches the " +
        "water. \"Smart woman. I still think I got the better seat.\" It is not " +
        "entirely convincing, and he knows it. Nobody ever takes the chair on " +
        "his left.",
        short: "\"Marites. Two years in that chair, every sunset. Nobody sits there now.\"" },
      { topic: "shirt", text: "\"Started as a joke at the VFW in Manila — I " +
        "carried a fridge up two flights, some guy yells 'Superman!' and it " +
        "stuck.\" He looks down at the faded S with real affection. \"Now it's " +
        "so the girls here got something to call me that ain't 'papa,' and so " +
        "the ambulance boys can describe me easy.\" A beat of the buffering " +
        "stillness, then the grin resumes exactly where it left. \"— efficient, " +
        "right? One shirt, three jobs.\"",
        short: "\"One shirt, three jobs.\" The grin resumes where it left off." },
    ],
  },

  angela: {
    name: "Angela", emoji: "🎧", age: 47, nat: "American",
    home: "queen_vic", hops: false,
    desc: "Forty-seven, Navy-short hair gone grey at the temples, a flannel shirt " +
      "tied at the waist in a climate that argues against it. On the bar next to " +
      "her Singha: an actual Discman, its foam headphones held together with " +
      "electrical tape. She has the corner seat with the window view of Soi 6 — " +
      "the chaos observed from the calm side of the glass.",
    dialogue: [
      { text: "\"Angela.\" The handshake is brief and Navy-firm; the eye contact is " +
        "rationed. \"Yes, that's a Discman. No, it's not ironic.\" She turns the " +
        "corner of a smile at the window, at Soi 6 howling away across the road. " +
        "\"I sit on this side of the glass. Best nature documentary in town — " +
        "you get the whole ecosystem without getting wet.\" She slides the " +
        "headphones down to her neck, which for her is a door opening.",
        short: "\"Yes, it's a Discman. No, it's not ironic.\" The headphones come down: a door opening." },
      { topic: "drew", text: "\"Drew. Yeah.\" The tone of a fact being filed. \"Same " +
        "schoolhouse at DLI — Korean, he was a class ahead. We weren't friends. We " +
        "just conjugated the same verbs in the same hallways.\" She turns the " +
        "Singha a quarter. \"Twenty-five years later his Facebook is all neon and " +
        "beach bars, and he looked — unstuck. I'd been stuck a long time. So.\" A " +
        "small shrug at the enormity of the decision. \"I was here four months " +
        "before I told him. He said 'huh.' We nod now, across town. That's the " +
        "right amount of Drew.\"",
        short: "\"Same schoolhouse, not friends. His Facebook looked unstuck. So. We nod now.\"" },
      { topic: "90s", text: "She taps the Discman like a witness taking the oath. " +
        "\"In here it's 1997, permanently. Mixtapes, a working Tower Records, my " +
        "whole life ahead of me and none of it wrong yet.\" She says it lightly, " +
        "which is the practiced part. \"Everything after 2001 reads like somebody " +
        "else's biography — the medical discharge, the marriage, the medications " +
        "with the names like minor Star Trek characters.\" The headphones get a " +
        "small adjustment. \"The 90s is the last decade I trust. So I brought it " +
        "with me.\"",
        short: "\"In here it's 1997, permanently. The last decade I trust.\"" },
      { topic: "depression", text: "She doesn't flinch at the word; she's clearly " +
        "done more reps with it than you have. \"Twenty years of it. The " +
        "brochure calls it 'treatment-resistant,' which is a hell of a review.\" " +
        "A sip. \"Thailand doesn't cure it. Anybody says this town cures " +
        "anything, count your kidneys.\" Then, at the window, the light going " +
        "gold on the chaos: \"But back home the sadness had my address. Here it " +
        "has to commute. The sun, the fruit guy who knows my order, a hundred " +
        "small transactions a day with people who don't need me to be okay " +
        "first.\" She resettles the headphones. \"It buys me daylight. I " +
        "reinvest the daylight. That's the whole system.\"",
        short: "\"Back home the sadness had my address. Here it has to commute.\"" },
      { topic: "queen vic", text: "\"Terry holds the corner seat if I'm late — we " +
        "have never discussed this and never will, it's load-bearing.\" She " +
        "nods at the room: dartboard, wood, air conditioning like a national " +
        "embassy of moderation. \"The bars over there want something from you. " +
        "This one just wants you to mind the dart line.\" The window gets " +
        "another look. \"I tried the soi once. {{Nice}} girls. Loud planet. I do " +
        "better with a pane of glass between me and 1999.\"",
        short: "\"Terry holds the corner seat. It's load-bearing. We've never discussed it.\"" },
    ],
  },

  danny: {
    name: "Danny", emoji: "💪", age: 50, nat: "Canadian",
    home: "club_mirage", hops: true,
    avoids: ["stinky_bar", "las_vegas"], // the map of his debts, drawn in bars
    desc: "Fifty, but built like a rendering of forty — tank top, veins, a full " +
      "sleeve of tattoos that reads like a rap sheet of previous personalities. " +
      "He is always mid-conversation with somebody about an opportunity, and " +
      "always angled so he can see the door. Notably, he is never seen anywhere " +
      "near the Stinky Bar — or Las Vegas a-go-go — of his own free will.",
    dialogue: [
      { text: "\"Hey — hey, big guy.\" You have been selected. The handshake " +
        "arrives with a shoulder squeeze, warm as a heat lamp. \"Danny. Windsor, " +
        "Ontario, originally — twenty years moving cars, top salesman three years " +
        "running, and then I saw where the REAL market was going.\" He taps his " +
        "temple. \"I don't sell cars anymore, bro. I sell the future.\" He is " +
        "already reaching for his phone. \"You hold any crypto? Doesn't matter. " +
        "Sit down. Two minutes.\"",
        short: "\"Danny. I don't sell cars anymore, bro. I sell the future. Two minutes.\"" },
      { topic: "crypto", text: "The {{phone}} is out and a chart is going up on it — " +
        "cropped, you notice, at a flattering moment. \"Ground floor, bro: " +
        "SOI-Coin. Tokenized nightlife. Every lady drink on the blockchain, " +
        "loyalty points that MOON.\" The pitch has the polished cadence of the " +
        "dealership, retooled. \"I've got a guy in Dubai, I've got a guy in " +
        "Phnom Penh, and the smart-contract guy is basically almost out of " +
        "prison. Pre-sale closes Friday.\" It has closed every Friday for a " +
        "year. \"I like your face, so I'm telling you first.\"",
        short: "\"SOI-Coin, bro. Tokenized nightlife. Pre-sale closes Friday.\" It always does." },
      { topic: "debt", text: "The warmth drops one degree; the smile holds. " +
        "\"Whoa — okay. I see Bert's been talking. Or the linguist.\" He " +
        "recalibrates. \"Nobody LOST anything, bro. PattayaChain didn't fail, " +
        "the exchange failed — totally different thing. The funds aren't gone, " +
        "they're ILLIQUID.\" The word arrives polished from frequent use. \"Bert " +
        "gets his eighty back with interest when we relaunch. Drew's hundred-" +
        "twenty, same.\" A pause, the first unpolished thing about him: \"And " +
        "Davey gets his fifteen back first. That one—\" he rolls a shoulder, " +
        "uncomfortable inside his own tank top \"—that one I feel, bro. Guy " +
        "drinks four beers a week. Don't tell him I said that.\"",
        short: "\"Not lost, bro. ILLIQUID.\" But Davey gets his fifteen back first." },
      { topic: "tattoos", text: "He rotates the sleeve like a dealer showing " +
        "trims. \"Full history, bro. The maple leaf — obviously. The tiger's " +
        "from the dealership days, 'Top Gun' underneath, that was my thing on " +
        "the floor.\" Further down: a Bitcoin logo, done large and confident. " +
        "Below it, something moon-shaped, extensively reworked into what is now " +
        "maybe a wolf. \"That one's a wolf.\" It was not always a wolf. \"We " +
        "don't talk about what it was, bro. Cost me more to fix than to get.\"",
        short: "\"That one's a wolf now.\" It was not always a wolf." },
      { topic: "steroids", text: "\"Bro, it's not — okay, it's TRT. Doctor " +
        "supervised.\" The doctor is a pharmacy on Soi Buakhao with a laminated " +
        "menu. \"Fifty years old. You see this?\" He performs a brief, " +
        "unsolicited flex; two hostesses applaud out of professional courtesy. " +
        "\"In Windsor I'd be some guy at the end of the bar. Here I'm — " +
        "PRESENCE, bro. Presence is capital. The body is the brand.\" He " +
        "resettles the tank top. \"Also the pharmacy doesn't ask questions, " +
        "which I respect enormously as a business model.\"",
        short: "\"It's TRT, bro. The body is the brand.\" The pharmacy has a laminated menu." },
      { topic: "reginald", text: "The pitch stops. Completely. It is the first " +
        "time you have seen the machine idle. \"Reg? We're good. Me and Reg " +
        "are all good.\" His eyes do one lap of the room. \"Why. Did he say " +
        "something?\" A pause you could park a truck in. \"What did he say, " +
        "exactly?\" He rallies, badly: \"Look — that situation is basically " +
        "resolved, there's a structure in place, it's—\" he does not say " +
        "illiquid. Even Danny knows not to say illiquid about Reg's money. " +
        "\"Anyway. I gotta bounce, bro. Early gym.\"",
        short: "\"Me and Reg are all good. What did he say, exactly?\" Early gym, apparently." },
    ],
  },

  josey: {
    name: "Josey", emoji: "🏋️", age: 32, nat: "Australian",
    home: "rock_factory", hops: false,
    desc: "Thirty-two, Australian, shoulders that still remember lane ropes, in " +
      "gym wear that is clearly working clothes rather than costume. She has a " +
      "regular table by the stage with sightlines on the drummer, a {{phone}} on a " +
      "small tripod she mostly ignores, and the settled ease of someone who is " +
      "exactly where she decided to be.",
    dialogue: [
      { text: "\"Josey.\" Firm handshake, the grip of someone who still trains " +
        "like it's her job — because it partly is. \"Melbourne, originally. " +
        "Pattaya going on four years.\" On stage the band lands a chorus and " +
        "she glances over, entirely involuntarily, at the drummer, who does " +
        "not drop a beat and grins anyway. \"Sit down if you like this table — " +
        "best sound in the room. I measured. With an app. I'm not proud of it.\"",
        short: "\"Josey. Best sound in the room — I measured. With an app.\"" },
      { topic: "freedom", text: "\"Why Pattaya?\" She turns her glass, deciding " +
        "how much of the interview version to give you. \"Back home I was a " +
        "headline. Two years of being a Discussion — my face on panel shows " +
        "with the sound off in gyms I used to train in.\" A shrug that has done " +
        "a lot of work over the years and got efficient at it. \"Here? I'm " +
        "Josey. I lift in the morning, I film the bands at night, the " +
        "seven-eleven bloke calls me 'sister' and sells me a toastie.\" She " +
        "taps the table once. \"Nobody here needs me to be a Conversation. " +
        "That's the whole visa. Freedom's a quiet thing, turns out.\"",
        short: "\"Back home I was a headline. Here I'm Josey. Freedom's a quiet thing.\"" },
      { topic: "athlete", text: "\"Swimming. Two hundred fly, nationals — I was " +
        "ranked, I'll leave it there.\" She says it the way you close a door " +
        "gently. \"The medals live in a box at Mum's. The sport and I... " +
        "finished with each other, and honestly the sport was always going to " +
        "outlive me anyway. They all do.\" She flexes one hand, an old habit. " +
        "\"What I kept was the four-fifty alarm and the belief that you get " +
        "better on the days you don't feel like it. Turns out that transfers " +
        "to absolutely everything.\"",
        short: "\"Two hundred fly, nationals. I kept the 4:50 alarm. It transfers.\"" },
      { topic: "content", text: "\"Fitness and the live music scene — that's " +
        "the channel. Hotel gym reviews, band showcases, where to eat clean " +
        "at two a.m.\" She nods at the tripod, currently pointed at nothing. " +
        "\"The algorithm keeps begging me for Walking Street chaos and bar " +
        "girl 'exposés'. Not my lane. I ask the band first, I never film the " +
        "staff without a yes, and I pay for my own drinks on camera.\" A dry " +
        "look. \"Eight hundred thousand followers on the strength of a " +
        "Filipina vocalist nailing Zombie once a week. The algorithm copes.\"",
        short: "\"Fitness and live music. I ask first. The algorithm copes.\"" },
      { topic: "drummer", text: "The look she throws the stage answers before " +
        "she does. \"Jun. Three years behind that kit, holds the whole band " +
        "together and lets the guitarist take the credit — that tells you " +
        "everything about him, honestly.\" The drummer, aware he is being " +
        "discussed, plays a tiny unnecessary fill. She refuses to smile and " +
        "fails. \"I came in to film the band. He watched me count the bars in " +
        "before I hit record — drummers notice timing.\" She turns back. " +
        "\"Two years now. His mum in Cebu knits me things for a climate she " +
        "refuses to believe in. I'm keeping all of it. Him included.\"",
        short: "\"Jun. Drummers notice timing. Two years. I'm keeping him.\"" },
    ],
  },

  reginald: {
    name: "Reginald", emoji: "🥂", age: 60, nat: "British",
    home: "las_vegas", hops: true,
    desc: "Sixty and annoyingly aware that he doesn't look it: linen shirt with " +
      "exactly the right number of buttons open, a tan that took discipline, " +
      "silver hair with a part you could draw a property line down. He holds a " +
      "glass like a man who used to be paid to make rooms enjoy themselves — " +
      "because he was. Wherever he stands becomes, gradually, the centre.",
    dialogue: [
      { text: "\"Reginald.\" The handshake comes with the full beam, and you get " +
        "the brief, disorienting sense of being the most interesting person he's " +
        "met all year. \"Thirty years in the club trade — Soho, then Essex, then " +
        "places we needn't itemize. I ran rooms, dear boy. Now I attend them.\" " +
        "He surveys the bar with a professional eye. \"This one's running at " +
        "about sixty percent. Watch — I'll have it at eighty by midnight without " +
        "leaving this stool. It's a craft. Somebody has to keep standards up.\"",
        short: "\"Reginald. I ran rooms, dear boy. Now I attend them.\" Sixty percent, rising." },
      { topic: "party", text: "\"A party is a fire, dear boy — you don't light " +
        "the whole thing, you light three corners and let it spread.\" He " +
        "counts on manicured fingers: \"Buy the quietest table a round, not " +
        "the loudest. Request a song for someone ELSE. And the bell—\" he " +
        "wags a finger \"—the bell is a defibrillator, not a toy. You ring it " +
        "when the room's heart stops, not when yours does.\" He sips. \"Thirty " +
        "years of licensed premises, and the whole trade fits on a napkin. The " +
        "rest is knowing when to leave — which is early, looking fabulous, " +
        "while they're still sorry.\"",
        short: "\"Light three corners and let it spread. The bell is a defibrillator, not a toy.\"" },
      { topic: "ladyboys", text: "\"I'll assume you're asking as a gentleman.\" " +
        "The beam recalibrates, one candle warmer. \"I've been flexible since " +
        "before your country was, dear boy. And the ladyboys of this town — the " +
        "polished ones, the cabaret girls, the ones who put the WORK in — are, " +
        "pound for pound, the most glamorous women in Southeast Asia. Presence, " +
        "wit, cheekbones you could sign contracts on.\" He raises the glass to " +
        "no one in particular; somewhere on Beach Road, a tall silhouette " +
        "probably feels it. \"Beauty is beauty. Only the dull need it filed.\"",
        short: "\"Beauty is beauty, dear boy. Only the dull need it filed.\"" },
      { topic: "clubs", text: "\"Soho in the eighties, Essex in the nineties — " +
        "two rooms of my own by ninety-five.\" The polish stays; something " +
        "underneath it goes still. \"You didn't run doors in that trade without " +
        "meeting... colourful investors. Men who counted in favours.\" He " +
        "straightens a cufflink that didn't need it. \"I sold up in '09. " +
        "Quickly. The margin between 'sold up' and 'got out' is a matter for my " +
        "memoirs, which will be published posthumously, for everyone's " +
        "comfort.\" The beam returns to full. \"Anyway — Thailand. Better " +
        "weather, better company, fewer shovels.\"",
        short: "\"Sold up in '09. Quickly. The memoirs are posthumous, for everyone's comfort.\"" },
      { topic: "danny", text: "The glass goes down without a sound, which is " +
        "somehow louder than slamming it. \"Daniel. Yes. Two hundred thousand " +
        "baht of mine is currently 'illiquid.'\" He smiles, and for exactly one " +
        "second you see a much older kind of club owner — the back office, the " +
        "door team, the ledger that always balanced eventually. \"I'll tell you " +
        "this once, dear boy, because I like you: if I didn't love living in " +
        "this country quite so much, Danny Boy would be found dead in a ditch " +
        "one day. Face down. Tank top and all.\" The beam switches back on, " +
        "instant and immaculate. \"But I DO love it here. So he gets to keep " +
        "jogging. Isn't Thailand marvellous? Another drink?\"",
        short: "\"If I didn't love it here quite so much... but I do. So he keeps jogging.\"" },
    ],
  },

  mikkel: {
    name: "Mikkel", emoji: "🎒", age: 24, nat: "Danish",
    home: "neon_paradise", hops: true,
    desc: "Twenty-four, backpacker tan, friendship bracelets to the elbow, and the " +
      "incandescent certainty of a man eleven days into the love of his life. He " +
      "shows people his phone a lot. There is a girl on the lock screen.",
    dialogue: [
      { text: "\"Hey man! Mikkel!\" The handshake becomes a shoulder clasp; you " +
        "have been friends for four seconds. \"Denmark — Aarhus. Gap year. Man, " +
        "this town is INSANE, right? Everyone said be careful and it's like — " +
        "the most genuine people I've ever met?\" He glances at his phone, " +
        "lights it up, glances away. The girl on the lock screen dances at " +
        "Neon Paradise. \"Anyway. What's your story?\"",
        short: "\"Denmark, gap year, the most genuine people I've ever met!\" The lock screen glows." },
      { topic: "girl", text: "\"Her name's Mind. M-I-N-D, isn't that beautiful? She " +
        "dances at Neon Paradise but she's not like— it's not what you think.\" " +
        "It is a speech he has given often and polished nowhere. \"She's saving " +
        "for her mother's farm. We talk till 4 a.m. — real talks, deep talks. " +
        "She says I'm different.\" He looks up, sincere as sunrise. \"I know how " +
        "it sounds, man. But she SAYS I'm different.\"",
        short: "\"Mind. She says I'm different, man.\"" },
      { topic: "plan", text: "\"Okay so — she comes to Denmark in spring. Visa's " +
        "like six hundred euro, plus flights, plus she owes the bar some fine " +
        "thing? Barfine? Whatever, technicality.\" He is counting on the " +
        "friendship-bracelet arm. \"I've got my student grant, plus my dad's — " +
        "look, money's just money, man. You can't put a price on THIS.\" You " +
        "have recently heard a man in a plumbing polo say almost exactly that.",
        short: "\"Denmark in spring. Money's just money, man.\"" },
      { topic: "warning", text: "The brightness dims one notch — someone has " +
        "clearly tried before. \"The old guys all do this speech, man. 'The " +
        "machine eats white knights,' whatever. Bert did like ten minutes.\" He " +
        "picks at a bracelet. \"But they don't KNOW her. And honestly — even if " +
        "they were right?\" A very young shrug. \"It's the best thing that ever " +
        "happened to me. So.\"",
        short: "\"They don't KNOW her, man. And even if they're right — so.\"" },
    ],
  },
};

const CANON_BARS = [
  "Lucky Tiger Bar", "Pink Lotus Lounge", "Neon Paradise A-Go-Go",
  "Golden Dragon Bar", "Sunset Dreams Lounge", "Starlight Bar",
  "Rainbow Girls Bar", "Paradise Nights Club", "Gold Rush Lounge",
  "Silk Rose Bar", "Club Mirage", "Jasmine Garden Bar",
  "Crystal Palace A-Go-Go", "Midnight Sun Bar", "Candy Bar",
  "Rock Factory",
  "KINKY Go-Go", "Slutty Go-Go", "Las Vegas Go-Go",
  "Blue Dog",
];

const CANON_HOSTESSES = [
  "lek", "noi", "ping", "aom", "joy", "fon", "gift", "kwan",
  "candy", "nong", "pim", "oy", "bee", "mem",
  "jane",
];

// ── Bar social roles ────────────────────────────────────────────────────────
// A lady's role shapes what she tolerates: hostesses work the room, cashiers
// keep the books not the customers, and you do NOT lay a hand on the mamasan.
// (Ringing the bell a couple of times has been known to soften the rules.)

const NPC_ROLES = {
  lek: "hostess", noi: "hostess", ping: "hostess", aom: "hostess",
  joy: "hostess", fon: "hostess", gift: "hostess", kwan: "hostess",
  nong: "hostess", pim: "hostess", bee: "hostess", jane: "hostess", mercedes: "hostess", kratae: "hostess",
  yai: "mamasan", rose: "mamasan",
  ploy: "cashier", aek: "cashier", malee: "cashier",
  candy: "mamasan", oy: "mamasan", daeng: "mamasan", mem: "mamasan", wan: "mamasan",
};

// ── Generic (filler) hostesses ──────────────────────────────────────────────
// The rank and file. Canon: most girls on the soi are from Isan, in Pattaya to
// feed a family back home, with broken English ("Tinglish") — and the phone /
// Google Translate comes out the moment talk gets past small. Rather than hand-
// write sixty near-identical entries, each is a compact [name, th, room] tuple
// expanded by _buildHostess with flavour hash-picked from the id, so a bar reads
// populated, each girl is stable (same id → same backstory), and the store stays
// tiny. The named, story-bearing hostesses stay in NPCS above; these are added
// to it below. Keep authored, plot-relevant dialogue OUT of here.
const _H_FROM = ["Udon Thani", "Khon Kaen", "Roi Et", "Sisaket", "Buriram", "Ubon",
  "Surin", "{{Nong Khai}}", "Kalasin", "Yasothon", "Mukdahan", "Nakhon Phanom",
  "Chaiyaphum", "Loei", "Maha Sarakham", "Sakon Nakhon", "Amnat Charoen", "{{Nong Bua Lamphu}}"];
// The Darkside register: the ladies out here are older but better at this
// than anyone in town, and they are here to make money. No nervous new girls
// on this side of Sukhumvit.
const _H_LOOK_DARK = [
  "Twenty seasons of soi behind her eyes and a laugh that got louder every one",
  "Older than the town girls and visibly better at this than any of them",
  "A gold tooth, a sharper tongue, and drink arithmetic you can watch happening",
  "Pouring out here since the lake road was dirt; minds her regulars like livestock",
  "A veteran's easy patience — she will out-sit, out-drink, and out-earn the room",
  "Somebody's mother, twice over, and nobody's fool ever",
];
const _H_LOOK = [
  "Round-faced and quick to laugh",
  "Tall and quiet, watching the door",
  "Tiny and loud, all elbows and energy",
  "Sleepy-eyed and entirely unbothered",
  "New enough to still look a little nervous",
  "Gold everywhere — earrings, chain, {{phone}} case",
  "A crooked, disarming grin",
  "Bored until you try a word of Thai, then radiant",
  "Older than the go-go average, and unhurried about it",
  "Baby-faced, chewing gum, thumbing her phone under the bar",
  "Long hair, longer eyelashes, a practised pout",
  "Small and sharp, and misses nothing",
];
const _H_FAMILY = [
  "I have two baby, they stay with my mama, {from}",
  "My papa sick — my mama look after him, so only me can send money",
  "One boy, six year old, he stay with my grandmother in {from}",
  "Three little sister, all still in school — I pay everything for them",
  "My son in school; my mama too old for the rice field now",
  "Just me and my little brother — I put him in university, very expensive",
  "My daughter stay {from} with my mama; I see her Songkran only",
  "My mama, my papa, two nephew — everybody eat from my {{phone}}",
  "My mama house not finish — I send money every month for the roof",
  "I have one baby, no papa for him — so I am papa and mama both",
];
const _H_PLAN = [
  "open a small clothes shop",
  "build a house for my mama",
  "buy a pickup truck for the farm",
  "send my brother to university",
  "open a nail salon back home",
  "have a som tam stall in my village",
  "study to be a nurse",
  "open a small coffee shop",
  "buy some land for rice",
  "learn hair and make-up and open a salon",
];
const _H_EMOJI = ["🌸", "🌺", "💐", "🌷", "🌼", "🌻", "💫", "✨", "🌙", "💕", "🦋", "🍒"];
const _H_PHONE = [
  "The {{phone}} never leaves her hand.",
  "Google Translate is open before you finish the sentence.",
  "She types more than she talks — and laughs at both.",
];

function _hh(s, salt) {
  let h = salt >>> 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return h;
}

// A room's display name as a venue — the marquee `bar` name, else the room
// name; undefined for an unknown id (callers pick their own fallback). Lives
// here (not engine-core) because world.js loads first, so both the builders
// below and every engine file can use it.
function _barName(id) {
  const r = ROOMS[id];
  return r && (r.bar || r.name);
}

// Connect 4 skill ladder — the c4Ai search depth for this opponent. Mamasans
// have played every shift for twenty years: top tier. The rank and file sit
// one step down. A girl fresh off the farm (an explicit `c4` on her entry,
// like Nong's, or a filler whose hash-picked desc says she's new) is beatable
// by a sharp human player.
function _c4Depth(id) {
  const n = id && NPCS[id];
  if (!n) return 6;                          // "the hostess on shift"
  if (n.c4) return n.c4;                     // hand-tuned (new girls: 2)
  if (NPC_ROLES[id] === "mamasan") return 8; // the shark
  return 6;                                  // everyone else on the floor
}

function _buildHostess(name, th, room) {
  const id = name.toLowerCase();
  const bar = _barName(room) || "the bar";
  const idx = (arr, salt) => arr[_hh(id, salt) % arr.length];
  const from = idx(_H_FROM, 3);
  const darkside = ROOMS[room] && ROOMS[room].region === "Darkside";
  const look = idx(darkside ? _H_LOOK_DARK : _H_LOOK, 5);
  const family = idx(_H_FAMILY, 7).replace(/\{from\}/g, from);
  const plan = idx(_H_PLAN, 11);
  const emoji = idx(_H_EMOJI, 13);
  const phone = idx(_H_PHONE, 19);

  const GREET = [
    '"Hello hello! You sit na. I no speak English good — talk slow for me, okay?"',
    '"Welcome ka! You handsome — I say to everybody, but you MORE." She laughs at her own line.',
    '"Oh! Farang come my table. Lucky me na." She pats the stool. "You buy me cola? Only cola, promise... maybe."',
    '"Sawatdee ka~ You want talk? I try. My English small small, my heart big big."',
    '"You sit sit sit! No shy. I not dangerous — only my mama dangerous."',
  ];
  const GREET_SHORT = [
    '"Sit sit! Talk slow for me na."',
    '"You buy me cola? Only cola... maybe."',
    '"English small small, heart big big."',
  ];
  const FAMILY = [
    `"${family}. Every month I send money — school, rice, everything. This why I working, not for me." She turns the {{phone}} to you: a photo, everyone squinting in the sun.`,
    `"You ask my family? Aiyo." She goes soft. "${family}. I not see them long time. Money go home, I stay here. Same same every girl."`,
    `"${family}." A proud, tired little smile, and a photo held up. "I work, they eat. Simple. Farang always think complicated — no complicated."`,
  ];
  const PLAN = [
    `You ask her something bigger and she holds up one finger — "wait wait" — thumbs it into the {{phone}} and turns the screen to you: "I WOULD LIKE TO ${plan.toUpperCase()}." She beams. "Like that na. You understand?"`,
    `"Plan?" She types into Google Translate and reads the robot voice out, carefully: "My dream is to ${plan}." A shrug, a grin. "Phone say it better than me."`,
    `"Big word! Wait wait." Tap tap tap. She shows you the translation: "SOMEDAY I ${plan.toUpperCase()}, IF BUDDHA HELP." She laughs. "Buddha and good customer — same job."`,
  ];
  const HOME = [
    `"Home? ${from}. Isan! You know Isan? Very hot, very poor, very happy." She grins. "Rice, buffalo, my mama, som tam every day. I miss, but no money there. Pattaya have money, no buffalo."`,
    `"I from ${from}, Isan side. Small village, everybody know everybody. Here nobody know me — sometime good, sometime lonely na." A little shrug.`,
    `"${from}. Long bus, ten hour, aircon too cold." She mimes shivering. "I go home Songkran, Buddha day, when mama call. Rest of time — here, working."`,
  ];
  const WALLET = [
    '"Wallet? Aiyo, not here — nobody steal here, bad luck for the bar. You go Buakhao, ask Candy. Candy know everything, everybody."',
    '"You lose wallet?? Poor you." She pats your arm. "I no see. Go Candy Bar, talk to Candy — she the boss of boss. She fix."',
    '"No no, not my bar. Try Candy, Soi Buakhao side. Everybody problem go to Candy, my mama say."',
  ];

  // a girl whose desc says she's new plays Connect 4 like she's new — the
  // tier the player can actually beat, signalled by what they read of her
  const green = look.startsWith("New enough") || look.startsWith("Baby-faced");
  return {
    name, th, emoji, room, filler: true,
    ...(green ? { c4: 2 } : {}),
    desc: `${look} — one of the ${bar} girls, from ${from}. ${phone}`,
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", text: idx(GREET, 23), short: idx(GREET_SHORT, 29) },
      { topic: "family", text: idx(FAMILY, 31) },
      { topic: "home", text: idx(HOME, 43) },
      { topic: "plan", text: idx(PLAN, 37) },
      { topic: "wallet", text: idx(WALLET, 41) },
    ],
  };
}

// [name, Thai nickname, room]. Distribution: go-gos busiest, beer/Soi 6/club
// modest, expat & live-music bars light — Queen Vic is a pub, so none.
const _FILLER_HOSTESSES = [
  ["Dao","ดาว","tequila_queen"], ["Mook","มุก","tequila_queen"], ["Ice","ไอซ์","tequila_queen"], ["Praew","แพรว","tequila_queen"],
  ["Mint","มิ้น","neon_paradise"], ["Fah","ฟ้า","neon_paradise"], ["View","วิว","neon_paradise"], ["Sara","ซาร่า","neon_paradise"],
  ["Bow","โบว์","club_mirage"], ["Nam","น้ำ","club_mirage"], ["Yui","ยุ้ย","club_mirage"],
  ["Aof","อ๊อฟ","crystal_palace"], ["Cherry","เชอรี่","crystal_palace"], ["Beam","บีม","crystal_palace"], ["Boom","บูม","crystal_palace"],
  ["Toey","เตย","rainbow_girls"], ["Pang","แป้ง","rainbow_girls"], ["Ploen","เพลิน","rainbow_girls"], ["Sai","ทราย","rainbow_girls"],
  ["Fang","แฟง","kinky"], ["Gib","กิ๊บ","kinky"], ["Nice","ไนซ์","kinky"],
  ["Tukta","ตุ๊กตา","slutty"], ["Jum","จุ๋ม","slutty"], ["Pop","ป๊อป","slutty"],
  ["Namwan","น้ำหวาน","las_vegas"], ["Orn","อร","las_vegas"], ["Gigi","กีกี้","las_vegas"],
  ["Kaew","แก้ว","paradise_nights"], ["Meaw","เหมียว","paradise_nights"],
  ["Nan","แนน","candy_bar"], ["Bua","บัว","candy_bar"],
  ["Fern","เฟิร์น","candy_bar_2"], ["Mai","ใหม่","candy_bar_2"],
  ["Ann","แอน","midnight_sun"], ["Nut","นัท","midnight_sun"],
  ["Rung","รุ้ง","lucky_tiger"], ["Oat","โอ๊ต","lucky_tiger"],
  ["Ton","ต้น","silk_rose"], ["Nid","นิด","silk_rose"], ["Wa","หว้า","silk_rose"],
  ["Noon","นุ่น","jasmine_garden"], ["Prae","แพร","jasmine_garden"],
  ["Tan","ตาล","gold_rush"], ["Tik","ติ๊ก","gold_rush"],
  ["Pui","ปุ้ย","starlight_bar"], ["Mild","มายด์","starlight_bar"],
  ["Namtan","น้ำตาล","khao_talo_bar"], ["Ying","หญิง","khao_talo_bar"],
  ["Kai","ไก่","golden_dragon"], ["Nook","นุ้ก","golden_dragon"], ["Dew","ดิว","golden_dragon"],
  ["Puu","ปู","pink_lotus"], ["Belle","เบล","pink_lotus"],
  ["Kat","แคท","sunset_dreams"], ["May","เมย์","sunset_dreams"], ["Dear","เดียร์","sunset_dreams"],
  ["Lin","หลิน","water_buffalo"], ["Nim","นิ่ม","water_buffalo"],
  ["Duan","เดือน","firefly_bar"], ["Saifon","สายฝน","firefly_bar"],
  ["Wanpen","วันเพ็ญ","mama_yai"],
  ["Pear","แพร์","orchid_club"], ["Jinda","จินดา","orchid_club"],
  ["Dokmai","ดอกไม้","night_heron"], ["Jampa","จำปา","night_heron"],
  ["Ing","อิง","blue_dog"], ["Khing","ขิง","blue_dog"],
  ["Bam","บาม","rock_factory"], ["Kwang","กวาง","rock_factory"],
  ["Chompoo","ชมพู่","stinky_bar"], ["Manow","มะนาว","stinky_bar"],
];

for (const [name, th, room] of _FILLER_HOSTESSES) {
  const id = name.toLowerCase();
  NPCS[id] = _buildHostess(name, th, room);
  NPC_ROLES[id] = "hostess";
}

// ── Generic (filler) mamasans and cashiers ──────────────────────────────────
// Every hostess bar needs a mamasan who runs the floor and a cashier who runs
// the till (a chain shares ONE mama — Candy covers both Candy Bars — but each
// bar keeps its own cashier). Same hash-from-id builder trick as the hostesses,
// but the ENGLISH register steps up: hostesses talk Tinglish, cashiers are
// businesslike and mostly fluent, the mamasan is the most fluent of all — each
// still drops a Thai particle or leans on the phone now and then. Canon-plain:
// no plot flags, no gives. Named, story-bearing mamas/cashiers stay in NPCS above.
const _M_LOOK = [
  "Immaculate, unhurried, and missing nothing",
  "A former headliner's posture and a gaze like a cash register",
  "Gold at the wrist and throat, reading glasses pushed up into her hair",
  "Warm to your face, ice at the till, and fluent in both",
  "Sits like she owns the stool, because she does",
  "Older, sharper, and entirely done being impressed by farang",
];
const _M_STORY = [
  "danced this same street before you were her problem",
  "came up from the rice fields and never once looked back",
  "has run this floor longer than most of the girls have been alive",
  "buried a husband, raised two kids, and built a concrete house on lady drinks",
];
const _C_LOOK = [
  "In a cage of fairy lights, counting notes faster than the eye follows",
  "Black polo, a lanyard of too many keys, a calculator she never needs",
  "Neat bun, neat ledger, an engagement ring worn on a chain",
  "Headset on one ear, {{phone}} in one hand, the till in perfect order",
  "Quiet and quick, the still point the whole loud room pays into",
];

function _buildMama(name, th, room) {
  const id = name.toLowerCase();
  const bar = _barName(room) || "the bar";
  const idx = (arr, salt) => arr[_hh(id, salt) % arr.length];
  const from = idx(_H_FROM, 3);
  const look = idx(_M_LOOK, 5);
  const story = idx(_M_STORY, 7);
  const GREET = [
    '"Welcome, welcome. Sit anywhere — my bar, easy rules: be polite, buy a girl a drink when you like her company, don\'t touch the stage." A practised, unhurried smile.',
    '"New face. Good." She looks you over the way a woman checks fruit at the market. "I am the mamasan. Anything you need — a drink, a girl, a problem — you come to me. To fix it, na, not to make it."',
    '"Ah, farang, come in. Twenty year I stand at this bar. I danced here before; now I count the drinks and mind the girls." A wink. "Better job — my knees agree."',
  ];
  const GREET_SHORT = [
    '"Sit anywhere. Be polite, buy a lady drink, mind the stage."',
    '"The mamasan. Any problem, you come to me — to fix it."',
    '"Twenty year at this bar. Anything you need, ask me."',
  ];
  const GIRLS = [
    '"My girls are good girls — most from Isaan, like me a long time ago. They work hard, send the money home, and they won\'t cheat you if you don\'t cheat them." A level look. "Treat them nice, I treat you nice. Same-same."',
    '"You like one of them? Tell me, I introduce you proper — better than the grab-grab, tilac. The girl who chooses you likes you more than the girl you corner. This I know, twenty year of it."',
  ];
  const FAMILY = [
    `"Me? My children are grown now. One in a Bangkok office, one still study. I built my mama a house — concrete, real bathroom, not the old wood." Quiet pride. "This bar paid for all of it. People look down on the work; the house is still real."`,
    `"Grandchildren now, can you believe it? I send money, I go home Songkran, I come back. Pattaya is my second home — longer than the first one, these days."`,
  ];
  const PLAN = [
    `"A plan? I already did my plan, tilac — poor girl from the field, now I run the bar." She taps the till. "My plan now is the girls' plan: get out smarter than I did. Save it, don't drink it, don't marry the first farang who cries."`,
    `"Big questions, ha." She thumbs her phone a moment, then just talks — she doesn't really need it. "I want to keep the bar honest and the girls safe. Not so romantic, but it is the plan that pays."`,
  ];
  const WALLET = [
    '"You lost your wallet? Aiyo. Not in my bar — we don\'t do that here, bad for business, bad for luck." She considers. "Ask Candy, on Soi Buakhao. If it moved through this area, Candy heard about it."',
    '"Not here, tilac. I would know — nothing moves in this bar without me." A tilt of the head toward the door. "Candy Bar, Buakhao side. Everybody\'s trouble ends up on Candy\'s desk."',
  ];
  return {
    name, th, emoji: "👑", room, filler: true,
    desc: `${look} — the mamasan of ${bar}, from ${from}. She ${story}.`,
    dialogue: [
      { th: "เชิญค่ะ", rom: "chern kha", text: idx(GREET, 23), short: idx(GREET_SHORT, 29) },
      { topic: "girls", text: idx(GIRLS, 31) },
      { topic: "family", text: idx(FAMILY, 37) },
      { topic: "plan", text: idx(PLAN, 41) },
      { topic: "wallet", text: idx(WALLET, 43) },
    ],
  };
}

function _buildCashier(name, th, room) {
  const id = name.toLowerCase();
  const bar = _barName(room) || "the bar";
  const idx = (arr, salt) => arr[_hh(id, salt) % arr.length];
  const from = idx(_H_FROM, 3);
  const look = idx(_C_LOOK, 5);
  const GREET = [
    '"Bar\'s open. Drinks at the bar, lady drinks on the tab, and the tab is with me." She barely looks up from the money. "Whatever you order, I count it. So — welcome."',
    '"Hi, sit where you like." A quick, professional smile, gone as fast as it came. "You want a drink, I make the bill. You want change, I have change. Easy."',
    '"Welcome ka." She\'s already sliding notes through her fingers, fast. "I keep the till — so if you pay, or you think the tab is wrong, you come to me. Not the girls. I\'m never wrong, but you can check, na."',
  ];
  const GREET_SHORT = [
    '"Drinks at the bar, tab with me. Welcome."',
    '"You pay, I count. Easy."',
    '"The till is mine — any money question, ask me."',
  ];
  const MONEY = [
    '"Everything goes through this book." She pats the ledger. "Your drink, her drink, the barfine — I write it, you pay it. Watch me write and there\'s no surprise. The farang who don\'t watch, they get the surprise. Not my problem, na."',
    '"You want to know the price? Ask before, not after." A dry almost-smile. "I do the number honest, but I do it fast. Slow customers cost me the ones behind them."',
  ];
  const FAMILY = [
    `"My family? Isaan, like everyone here. I send money every month — same as the girls, only I get to sit down to do it." A small dry smile. "Cashier is better than dance, for me. My boyfriend prefers it too."`,
    `"One boy, he stays with my mother in ${from}. I do this job because I\'m good with numbers, and the number here is bigger than the number at home." A shrug. "Simple."`,
  ];
  const WALLET = [
    '"Lost a wallet? Not here — I count everything, I\'d know." She tips her head toward the door. "Ask the mamasan, or ask Candy on Buakhao. They keep track of what walks through."',
    '"Aiyo, no. My till is exact; a wallet is not a till problem." She\'s already back to the money. "Candy Bar, Soi Buakhao. Start there."',
  ];
  return {
    name, th, emoji: "🧾", room, filler: true,
    desc: `${look} — the cashier at ${bar}, from ${from}.`,
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", text: idx(GREET, 23), short: idx(GREET_SHORT, 29) },
      { topic: "money", text: idx(MONEY, 31) },
      { topic: "tab", text: idx(MONEY, 31) },
      { topic: "family", text: idx(FAMILY, 37) },
      { topic: "wallet", text: idx(WALLET, 43) },
    ],
  };
}

// [name, Thai nickname, room]. One mamasan per bar (a chain shares hers, so the
// Candy Bars are absent here) and one cashier per bar. Distribution mirrors the
// hostesses': every hostess venue gets both; the Queen Vic pub gets neither.
const _FILLER_MAMAS = [
  ["Pen","เพ็ญ","blue_dog"], ["Muay","หมวย","rock_factory"], ["Lamai","ละมัย","stinky_bar"],
  ["Jeab","เจี๊ยบ","neon_paradise"], ["Da","ดา","club_mirage"], ["Rin","ริน","crystal_palace"],
  ["Kob","กบ","paradise_nights"], ["Koi","ก้อย","midnight_sun"], ["Ratana","รัตนา","lucky_tiger"],
  ["Waew","แวว","silk_rose"], ["Ple","เปิ้ล","jasmine_garden"], ["Orm","อ้อม","gold_rush"],
  ["Jom","จอม","starlight_bar"], ["Nee","หนี่","pink_lotus"], ["Peung","ผึ้ง","golden_dragon"],
  ["Malai","มาลัย","sunset_dreams"], ["Somsri","สมศรี","kinky"], ["Ratree","ราตรี","las_vegas"],
  ["Wandee","วันดี","water_buffalo"], ["Somjai","สมใจ","firefly_bar"],
  ["Tui","ตุ่ย","night_heron"],
];
const _FILLER_CASHIERS = [
  ["Golf","กอล์ฟ","tequila_queen"], ["Air","แอร์","blue_dog"], ["Apple","แอปเปิ้ล","rock_factory"],
  ["Cake","เค้ก","stinky_bar"], ["Care","แคร์","candy_bar_2"], ["Cartoon","การ์ตูน","neon_paradise"],
  ["Earn","เอิร์น","club_mirage"], ["Eye","อาย","crystal_palace"], ["Fai","ฝ้าย","paradise_nights"],
  ["Gam","แก้ม","candy_bar"], ["Ging","กิ่ง","lucky_tiger"], ["Grace","เกรซ","silk_rose"],
  ["Hong","ห่อง","jasmine_garden"], ["Jah","จ๊ะ","gold_rush"], ["Jeed","จี๊ด","starlight_bar"],
  ["Jenny","เจนนี่","pink_lotus"], ["Joon","จูน","golden_dragon"], ["Jun","จัน","sunset_dreams"],
  ["Kaimook","ไข่มุก","slutty"], ["Kanom","ขนม","las_vegas"], ["Keng","เก่ง","khao_talo_bar"],
  ["Best","เบสท์","water_buffalo"], ["Aim","เอม","firefly_bar"], ["Tangmo","แตงโม","mama_yai"],
  ["Kanya","กัญญา","orchid_club"],
  ["Mon","มล","night_heron"],
];

for (const [name, th, room] of _FILLER_MAMAS) {
  const id = name.toLowerCase();
  NPCS[id] = _buildMama(name, th, room);
  NPC_ROLES[id] = "mamasan";
}
for (const [name, th, room] of _FILLER_CASHIERS) {
  const id = name.toLowerCase();
  NPCS[id] = _buildCashier(name, th, room);
  NPC_ROLES[id] = "cashier";
}

// The girls every bar knows by name — their barfine never gets waived,
// whatever the hour. Everyone else's quietly comes off the book after
// midnight (the fee walks out with the girl soon anyway).
const POPULAR_GIRLS = ["fon", "gift", "noi", "pim"];

// ── Real-world anchors ───────────────────────────────────────────────────────
// [lat, lon] for every room, anchored to the actual city via OpenStreetMap
// (fetched 2026-07-17; spine geometry cached in tools/map/pattaya-geom.json).
// PRESENTATION-ONLY data: the text engine never reads it — it drives
// tools/gen-map.mjs (the neon city map + the exits-vs-reality audit) and any
// future 2D frontend. Real venues sit at their real spots (LK Metropole, the
// Buakhao market, Big Buddha); fictional venues sit where their canon puts
// them. Two knowing deviations from the game graph, kept for the audit to
// flag rather than silently smoothed: the REAL Tree Town is at the Buakhao/
// Klang corner (north end — the game graph hangs it off Buakhao south), and
// the real police station is on Soi 9 SOUTH of Central Festival (the graph
// walks north from the mall).
const ROOM_GEO = {
  // Jomtien
  jomtien_beach:    [12.8890, 100.8688],
  dongtan_beach:    [12.8960, 100.8655],
  jomtien_beach_rd: [12.8893, 100.8718],
  soi_rompho:       [12.8901, 100.8742],
  jomtien_7eleven:  [12.8880, 100.8724],
  jomtien_bus_stop: [12.8940, 100.8710],
  // Pratumnak
  pratumnak_rd:     [12.9105, 100.8690],
  buddha_hill:      [12.9142, 100.8618],
  // Walking Street (the gate is the north end; "ws_north" is the DEEP end)
  ws_gate:          [12.9268, 100.8703],
  ws_south:         [12.9247, 100.8697],
  ws_alley:         [12.9245, 100.8689],
  ws_north:         [12.9226, 100.8692],
  neon_paradise:    [12.9248, 100.8694],
  club_mirage:      [12.9246, 100.8701],
  crystal_palace:   [12.9227, 100.8689],
  paradise_nights:  [12.9225, 100.8695],
  midnight_sun:     [12.9220, 100.8693],
  // Beach Road
  beach_rd_s:       [12.9295, 100.8715],
  short_time_motel: [12.9293, 100.8705],
  beach_rd_c:       [12.9348, 100.8744],
  tequila_queen:    [12.9338, 100.8740],
  promenade:        [12.9357, 100.8737],
  central_mall:     [12.9352, 100.8768],
  police_station:   [12.9330, 100.8757],
  beach_rd_n:       [12.9425, 100.8827],
  blue_dog:         [12.9426, 100.8819],
  stinky_bar:       [12.9428, 100.8821],
  // Soi 6 (Soi Yodsak)
  soi6_street:      [12.9448, 100.8858],
  pink_lotus:       [12.9452, 100.8857],
  golden_dragon:    [12.9447, 100.8866],
  sunset_dreams:    [12.9445, 100.8860],
  queen_vic:        [12.9449, 100.8872],
  qv_room:          [12.9449, 100.8872],
  // Naklua
  naklua_rd:        [12.9530, 100.8885],
  orchid_club:      [12.9524, 100.8876],
  hotel_soi:        [12.9565, 100.8898],
  hotel_room:       [12.9567, 100.8900],
  // Second Road
  second_rd_s:      [12.9268, 100.8768],
  second_rd_c:      [12.9330, 100.8795],
  second_rd_n:      [12.9345, 100.8805],
  pattaya_klang:    [12.9362, 100.8815],
  // Myth Night
  myth_night:       [12.9322, 100.8822],
  candy_bar_2:      [12.9324, 100.8824],
  // Soi Buakhao
  buakhao_n:        [12.9315, 100.8848],
  metropole_room:   [12.9308, 100.8853],
  rock_factory:     [12.9318, 100.8845],
  lucky_tiger:      [12.9312, 100.8852],
  buakhao_market:   [12.9262, 100.8820],
  candy_bar:        [12.9264, 100.8814],
  silk_rose:        [12.9260, 100.8826],
  buakhao_s:        [12.9218, 100.8795],
  jasmine_garden:   [12.9214, 100.8797],
  // Tree Town (real: the Buakhao/Klang corner)
  tt_entrance:      [12.9330, 100.8852],
  tt_lane_1:        [12.9331, 100.8857],
  tt_lane_2:        [12.9332, 100.8862],
  tt_back:          [12.9330, 100.8865],
  tt_deep:          [12.9327, 100.8867],
  gold_rush:        [12.9333, 100.8857],
  starlight_bar:    [12.9334, 100.8862],
  rainbow_girls:    [12.9326, 100.8871],
  oy_office:        [12.9325, 100.8873],
  // LK Metro (the L-shaped soi off Buakhao)
  lk_entrance:      [12.9297, 100.8845],
  lk_main:          [12.9298, 100.8852],
  kinky:            [12.9300, 100.8851],
  slutty:           [12.9296, 100.8853],
  lk_bend:          [12.9300, 100.8858],
  las_vegas:        [12.9298, 100.8860],
  // The Darkside
  sukhumvit_crossing: [12.9100, 100.8975],
  khao_talo_strip:  [12.9078, 100.9090],
  water_buffalo:    [12.9078, 100.9092],
  firefly_bar:      [12.9077, 100.9086],
  night_heron:      [12.9079, 100.9098],
  mama_yai:         [12.9066, 100.9114],
  khao_talo:        [12.9073, 100.9113],
  khao_talo_bar:    [12.9071, 100.9118],
  lake_mabprachan:  [12.9300, 100.9560],
};
