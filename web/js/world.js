// The Last Baht Bus — world data: rooms, items, NPCs, gossip chain.
// Pure data, no DOM (unit-tested via node:vm). The engine (engine-*.js) walks
// these tables; puzzle-specific behaviour lives in the engine's handlers.
//
// Canon: Soi Sanuk / Pattaya nightlife universe. PG-13 wink throughout.

// ── Constants ──────────────────────────────────────────────────────────────

const BUS_FARE   = 15;   // baht bus, any hop on a line
const MOTOSAI_TOWN = 50; // motosai hop inside town
const MOTOSAI_FAR  = 100;// motosai to/from the Darkside
const LAST_BUS_TURN = 80;   // 02:00 — the last songthaew makes its final run; after this no ฿15 ride home (the title's climax)
const LATE_MOTO_MULT = 1.6; // small-hours "stranded tax": piwins gouge once the buses have stopped
const DOG_MOTOSAI_FARE = 10; // a dog needs his own bike — a buddy's saleng, waved over and paid on top (waived on the free pity-ride)
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
// Male host bars charge a steep premium — a host drink is 2x+ a lady drink and
// the "off" fee doubles the go-go barfine (canon). Even your own beer is
// premium-priced (and arrives with ice, whether you wanted ice or not).
const HOST_DRINK = 350, HOST_OFF = 2500, HOST_BEER = 120;
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
      "A row of beached longtails to the south. Two gray-and-white soi cats hold down the end " +
      "of a lounger, the big one sitting slightly in front of the small one, both watching the " +
      "water. The beach road glows to the east. " +
      "Your face was in this sand until about a minute ago.",
    exits: { n: "dongtan_beach", e: "jomtien_beach_rd" },
  },
  dongtan_beach: {
    name: "Dongtan Beach",
    region: "Jomtien",
    dark: true,
    desc: "The quieter stretch north of Jomtien proper — by day rainbow flags and beach " +
      "chairs, the gay end of the sand; right now it's shapes and shadows and the hiss of " +
      "surf. Inland the beach road bends and climbs into neon: the Main Strip of Thappraya " +
      "Road, running UP and east to Second Road.",
    exits: { s: "jomtien_beach", e: "jomtien_beach_rd", up: "thappraya_w" },
  },
  jomtien_beach_rd: {
    name: "Jomtien Beach Road",
    region: "Jomtien",
    desc: "Streetlights, seafood smoke, and baht buses rattling past. East, Soi 7 runs inland " +
      "off the beach road toward Second Road, its little beer bars and massage shops already " +
      "lit; a 7-Eleven hums to the south and the bus stop is just north. Pratumnak Hill rises " +
      "darkly to the far north.",
    exits: { w: "jomtien_beach", e: "soi_7_w", s: "jomtien_7eleven", n: "jomtien_bus_stop", spa: "jomtien_thai" },
  },
  soi_rompho: {
    name: "Rompho Market",
    bar: "Rompho Market",
    region: "Jomtien",
    food: true,
    desc: "Directly across Second Road from the mouth of Soi 7: the sprawl of Rompho Market — " +
      "grilled everything, fruit pyramids, plastic stools, and a haze of chilli smoke. Locals, " +
      "long-stay farang, and a few bar girls off shift graze the stalls. The Jomtien branch of " +
      "KISS glows just to the north. (BUY FOOD / EAT.)",
    exits: { w: "jomtien_2nd", n: "kiss_jomtien" },
  },

  // ── Soi 7 (Jomtien) — runs inland from Jomtien Beach Road to Second Road ──
  soi_7_w: {
    name: "Soi 7 (beach end)",
    region: "Jomtien",
    desc: "The beach end of Soi 7: a mellow strip of open-front beer bars strung with fairy " +
      "lights, a couple of massage shops, and the easy Jomtien pace — older expats, cold beer, " +
      "nobody in a hurry. The soi runs east toward the roar of Second Road; the sea breeze " +
      "follows you a little way in.",
    exits: { w: "jomtien_beach_rd", e: "soi_7_e", n: "lucky7", s: "seabreeze", spa: "soi7_oil" },
  },
  soi_7_e: {
    name: "Soi 7 (Second Road end)",
    region: "Jomtien",
    desc: "The far end of Soi 7, where it spills onto Second Road by a 7-Eleven. A couple more " +
      "beer bars and a massage shop see out the strip. On the south side, set back behind a fence " +
      "and a flagpole, squats the grey bulk of the Chonburi Immigration Office — dark and locked " +
      "at this hour, a place farang only ever visit in daylight and never fondly.",
    exits: { w: "soi_7_w", e: "jomtien_2nd", n: "coconut", s: "sandbar", spa: "soi7_thai" },
  },
  jomtien_2nd: {
    name: "Second Road / Soi 7 (Jomtien)",
    region: "Jomtien",
    seven: true,
    desc: "The Soi 7 corner on Jomtien's Second Road, traffic hissing both ways. A 7-Eleven holds " +
      "down the northwest corner, bright as an operating theatre. Straight across the road sprawls " +
      "Rompho Market; the Jomtien KISS glows just beyond it. Soi 7 runs back west toward the beach.",
    exits: { w: "soi_7_e", e: "soi_rompho" },
  },
  kiss_jomtien: {
    name: "KISS Jomtien",
    bar: "KISS Jomtien",
    region: "Jomtien",
    food: true,
    desc: "The Jomtien branch of the famous open-air corner restaurant, just north of Rompho " +
      "Market — the exact same mile-long menu as the Pattaya original (simple Thai one side, " +
      "farang comfort food the other) and exactly as packed. Plastic chairs, a grill going full " +
      "tilt, and in high season a twenty-minute wait for a stool; tonight, just about a seat. " +
      "(BUY FOOD / EAT.)",
    exits: { out: "soi_rompho", s: "soi_rompho" },
  },
  lucky7: {
    name: "Lucky 7 Bar",
    bar: "Lucky 7 Bar", barType: "beer",
    region: "Jomtien",
    desc: "The soi's namesake: a friendly open-front beer bar with sevens painted on everything, " +
      "a Connect 4 frame, and a knot of regulars who've been coming since before the fairy lights. " +
      "The girls know every one of them by their drink.",
    exits: { out: "soi_7_w" },
  },
  seabreeze: {
    name: "Sea Breeze Bar",
    bar: "Sea Breeze Bar", barType: "beer",
    region: "Jomtien",
    desc: "Stools that catch the wind straight off the beach, a battered guitar somebody strums " +
      "between customers, and the most relaxed hostesses in Jomtien. Nobody hard-sells here; the " +
      "beer is cold and the evening goes where it goes.",
    exits: { out: "soi_7_w" },
  },
  coconut: {
    name: "Coconut Bar",
    bar: "Coconut Bar", barType: "beer",
    region: "Jomtien",
    desc: "Thatch over the bar, coconut shells for ashtrays, and a blender that hasn't stopped " +
      "since 2016. A little louder than its neighbours, a little younger — the closest Soi 7 gets " +
      "to a party, which is not very, which is the point.",
    exits: { out: "soi_7_e" },
  },
  sandbar: {
    name: "The Sandbar",
    bar: "The Sandbar", barType: "beer",
    region: "Jomtien",
    desc: "Last bar before Second Road: a narrow slot with sand actually underfoot, a dartboard, " +
      "and a cat that outranks everyone. The end-of-the-soi place, where a slow night winds all the " +
      "way down and the last customers put the stools up themselves.",
    exits: { out: "soi_7_e" },
  },
  soi7_oil: {
    name: "Sunset Oil Massage",
    bar: "Sunset Oil Massage",
    region: "Jomtien",
    massage: "oil",
    desc: "A pink-lit oil shop halfway down Soi 7, girls on the step, the small sticker on the " +
      "mirror, and the beach breeze doing its best to keep it wholesome. It fails, pleasantly.",
    exits: { out: "soi_7_w" },
  },
  soi7_thai: {
    name: "Soi 7 Thai Massage",
    bar: "Soi 7 Thai Massage",
    region: "Jomtien",
    massage: "legit",
    desc: "A proper traditional shop near the Second Road end: foot chairs, tiger balm, aunties in " +
      "matching polos, and a price list that stops at 'oil, one hour.' Where the long-stay expats " +
      "come to get their backs put right.",
    exits: { out: "soi_7_e" },
  },

  // ── Thappraya Road (the Jomtien "Main Strip") — Dongtan Beach ↔ Second Road ──
  thappraya_w: {
    name: "Thappraya Rd — Main Strip (west)",
    region: "Thappraya",
    seven: true,
    desc: "Where the beach road turns inland and becomes the Main Strip of Jomtien: neon, barkers, " +
      "and the warm churn of the night starting up. A 7-Eleven holds the north corner where the road " +
      "bends east. A couple of doors down, ARROW BAR's sign buzzes; across the way a discreet " +
      "gentleman's club keeps its door shut and its aircon cold. The strip runs east.",
    exits: { down: "dongtan_beach", e: "thappraya_mid", n: "arrow_bar", s: "the_boardroom", spa: "beach_turn_massage" },
  },
  thappraya_mid: {
    name: "Thappraya Rd — Main Strip (middle)",
    region: "Thappraya",
    desc: "The thick of the strip: beer bars and their fairy lights, and on the south side HYPER " +
      "A-GO-GO throwing chrome light across the road — run-down for years until the Samson brothers " +
      "gutted and remade it. On the north side a narrow L-shaped alley cuts away toward Second Road: " +
      "the SUPERTOWN complex, Jomtien's gay quarter, its drag-show lights flickering somewhere " +
      "around the elbow.",
    exits: { w: "thappraya_w", e: "thappraya_e", s: "hyper", n: "cheeky_monkey", gents: "velvet_club", super: "supertown_alley" },
  },
  thappraya_e: {
    name: "Thappraya Rd — Main Strip (Second Road end)",
    region: "Thappraya",
    seven: true,
    desc: "The far end of the strip, spilling onto Second Road. TAKE CARE ME, a live-music rock pub, " +
      "throws a guitar solo out its open front — the freelancers' favourite, and loud about it. " +
      "Another 7-Eleven glows across the intersection. One last beer bar and a massage shop see out " +
      "the strip before the traffic of Second Road takes over.",
    exits: { w: "thappraya_mid", n: "take_care_me", s: "the_office", spa: "thappraya_massage" },
  },
  supertown_alley: {
    name: "Supertown Complex (alley)",
    region: "Thappraya",
    desc: "The mouth of the Supertown alley — Jomtien's gay bar complex, an L-bend of half-lit " +
      "venues running back toward Second Road. Rainbow bunting, a poster for a drag revue, and a " +
      "security guy on a stool who nods you in, easy. One door glows an unhurried gold: THE ADONIS " +
      "CLUB, a host bar, a numbered row of oiled young men behind the glass instead of girls. The " +
      "drag stage is deeper in, at the elbow.",
    exits: { out: "thappraya_mid", in: "supertown_elbow", e: "supertown_elbow",
             host: "adonis_club", adonis: "adonis_club" },
  },
  adonis_club: {
    name: "The Adonis Club",
    bar: "The Adonis Club",
    region: "Thappraya",
    // A male host bar — the go-go gender-flipped. NOT a barType room, so the
    // (female-coded) barfine engine never touches it; host drinks and the "off"
    // fee run on their own premium track (HOST_DRINK / HOST_OFF), and BUY DRINK
    // FOR / HIRE are intercepted here. Welcoming to every orientation; most of
    // the boys are gay-for-pay and honest about it.
    hostBar: true,
    desc: "Cool gold light, a low mirrored bar, and a raised bench where the hosts sit in numbered " +
      "order — young men, gym-cut, oiled to catch the light, some bored, some working the room with " +
      "their eyes. A drinks list stands on the bar with prices that would make a Walking Street " +
      "mamasan weep with envy. Nott runs the floor with a papasan's easy authority; Arm (number 4) " +
      "and Win (number 9) are the two who clocked you first. (TALK · BUY DRINK FOR <host> · HIRE " +
      "<host> — all of it, whoever you are.)",
    exits: { out: "supertown_alley" },
  },
  supertown_elbow: {
    name: "Supertown Complex (the elbow)",
    region: "Thappraya",
    desc: "The elbow of the L, where the alley turns and the drag bars cluster — the stage end. One " +
      "venue is alive tonight: THE PEACOCK CABARET, its mirrored sign lit and pulsing, a queue of " +
      "boys and a scatter of curious farang filing in under a poster of a sequinned goddess mid-lip-sync. " +
      "The bass thumps through the wall. The alley carries on east and opens onto Second Road by the " +
      "strip's far corner.",
    exits: { w: "supertown_alley", e: "thappraya_e", in: "peacock_cabaret", cabaret: "peacock_cabaret" },
  },
  peacock_cabaret: {
    name: "The Peacock Cabaret",
    bar: "The Peacock Cabaret",
    region: "Thappraya",
    liveMusic: true,
    // A drag-cabaret venue, not a barfine bar — no barType, so none of the go-go
    // apparatus applies. You come to WATCH DRAG, tip, and be gently roasted.
    desc: "Inside it is all mirror and marabou and a stage lit like a jewel box, the little tables " +
      "packed with a mixed, delighted crowd — gay boys, a hen party, three sunburnt husbands whose " +
      "wives dragged them in and who are now, unexpectedly, having the night of their lives. Miss Mala " +
      "compères from the lip of the stage in a headdress you could signal ships with; a younger star, " +
      "Petch, is halfway through a lip-sync that is frankly better than the original. (WATCH DRAG. TIP " +
      "the performers. TALK if you dare.)",
    exits: { out: "supertown_elbow" },
  },
  arrow_bar: {
    name: "Arrow Bar",
    bar: "Arrow Bar", barType: "beer",
    region: "Thappraya",
    desc: "A couple of doors from the 7-Eleven at the top of the strip: a bright open beer bar with a " +
      "bullseye painted over the counter, a Connect 4 frame, and a row of hostesses who've clearly " +
      "done the maths on where the foot traffic enters the soi. First bar most punters hit; many " +
      "don't get past it.",
    exits: { out: "thappraya_w" },
  },
  cheeky_monkey: {
    name: "Cheeky Monkey Bar",
    bar: "Cheeky Monkey Bar", barType: "beer",
    region: "Thappraya",
    desc: "A Samson-brothers house, mid-strip: cartoon monkeys over the bar, cold towers of Chang, and " +
      "a crew of hostesses who run it at a permanent gentle party. Same owners as half the strip, and " +
      "it shows in the fresh paint and the working aircon.",
    exits: { out: "thappraya_mid" },
  },
  the_office: {
    name: "The Office Bar",
    bar: "The Office Bar", barType: "beer",
    region: "Thappraya",
    desc: "The other Samson beer bar, down the Second Road end — the joke's on the sign, so a man can " +
      "honestly say he's 'at the office.' Dartboard, a telly showing football nobody watches, and the " +
      "easy end-of-strip pace before Second Road takes over.",
    exits: { out: "thappraya_e" },
  },
  hyper: {
    name: "Hyper A Go-Go",
    bar: "Hyper A Go-Go", barType: "gogo",
    region: "Thappraya",
    desc: "The strip's one go-go, and its jewel: mirrored, chromed, a fog of aircon and bass, a stage " +
      "of numbered dancers under lights that cost more than the old place ever made. The Samson " +
      "brothers bought Hyper as a wreck and rebuilt it into this. Working the floor like a general is " +
      "Diamond, the mamasan — six feet of poise in heels, and every inch of it a choice.",
    exits: { out: "thappraya_mid" },
  },
  take_care_me: {
    name: "Take Care Me",
    bar: "Take Care Me", barType: "pub", band: true,
    region: "Thappraya",
    desc: "A live-music rock pub at the top of Second Road end of the strip — a proper stage, a tight " +
      "Filipino band murdering and resurrecting the classics, and a crowd three deep at the rail. No " +
      "house girls work it, but the freelancers love it: they come for the music, the cold beer, and " +
      "the chance to pick a man who came for the same. Loud, sweaty, and the best room on the strip.",
    exits: { out: "thappraya_e" },
  },
  the_boardroom: {
    name: "The Boardroom",
    bar: "The Boardroom", barType: "gents", outlet: true,
    region: "Thappraya",
    desc: "A gentleman's club behind a shut door at the top of the strip: cold, gold, low-lit, deep " +
      "leather couches with curtains that draw, and ladies already crossing the floor in not very " +
      "much. Quiet money, discretion, and a barfine that reflects both. The strip's noise dies the " +
      "moment the door sighs closed behind you.",
    exits: { out: "thappraya_w" },
  },
  velvet_club: {
    name: "The Velvet Club",
    bar: "The Velvet Club", barType: "gents", outlet: true,
    region: "Thappraya",
    desc: "The strip's second gentleman's club, mid-way and even quieter: velvet, brass, a whisper of " +
      "a sound system, and hostesses who don't chase — you buy a drink, they settle in close, and the " +
      "rest is between you and the curtain. Another of the Samson brothers' rooms, run cold and " +
      "expensive on purpose.",
    exits: { out: "thappraya_mid" },
  },
  beach_turn_massage: {
    name: "Beach Turn Oil Massage",
    bar: "Beach Turn Oil Massage",
    region: "Thappraya",
    massage: "oil",
    desc: "A pink-lit oil shop right where the beach road turns into the strip, girls on the step " +
      "catching the punters as they arrive, the small sticker on the mirror, the usual friendly " +
      "arrangement.",
    exits: { out: "thappraya_w" },
  },
  thappraya_massage: {
    name: "Thappraya Thai Massage",
    bar: "Thappraya Thai Massage",
    region: "Thappraya",
    massage: "legit",
    desc: "A proper traditional shop near the Second Road end of the strip: foot chairs, tiger balm, " +
      "a wall price list, and firm-thumbed aunties who do exactly one thing and do it well. No sticker " +
      "on this mirror.",
    exits: { out: "thappraya_e" },
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
    exits: { s: "ws_gate", n: "beach_rd_c", e: "second_rd_s", w: "short_time_motel", spa: "papaya_massage", spa2: "beachthai_massage" },
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
    exits: { s: "beach_rd_s", n: "beach_rd_n", w: "promenade", e: "central_mall", in: "tequila_queen", spa: "beachrd_oil" },
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
    exits: { s: "beach_rd_c", e: "soi6_street", n: "naklua_rd", in: "stinky_bar", w: "blue_dog",
             row: "beach_row" },
  },
  beach_row: {
    name: "Beach Road (The Beachside Row)",
    region: "Beach Road",
    desc: "The strip of open-air beer bars strung along the sand side, all tin roofs and " +
      "plastic chairs pointed at the bay — the row the Blue Dog anchors and shares its one " +
      "sandy bathroom with. SUNSET RAIL BAR, BAY WATCH BAR, and SANDY TOES trade sunsets and " +
      "cheap Chang down the line, each rail a little louder than the last.",
    exits: { e: "beach_rd_n", in: "sunset_rail", n: "bay_watch", s: "sandy_toes" },
  },
  sunset_rail: {
    name: "Sunset Rail Bar",
    region: "Beach Road",
    bar: "Sunset Rail Bar", barType: "beer", outlet: true,
    desc: "A long bamboo rail and a row of stools bolted to face west, so the whole bar " +
      "watches the sun go down together like a congregation. Pukky pours without turning " +
      "from the view, and gets it right anyway.",
    exits: { out: "beach_row" },
  },
  bay_watch: {
    name: "Bay Watch Bar",
    region: "Beach Road",
    bar: "Bay Watch Bar", barType: "beer",
    desc: "A red-and-yellow lifeguard theme run entirely as a joke — a plastic float on the " +
      "wall, a whistle nobody's allowed to blow twice. Somo keeps the cooler cold and the " +
      "banter warm.",
    exits: { out: "beach_row" },
  },
  sandy_toes: {
    name: "Sandy Toes",
    region: "Beach Road",
    bar: "Sandy Toes", barType: "beer",
    desc: "The last rail before the sand takes over entirely: no floor to speak of, just swept " +
      "beach and a string of bulbs. Nina brings the beer to your chair so you never have to " +
      "leave the view.",
    exits: { out: "beach_row" },
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
      "putting green. Bert — the manager — holds court from the end stool with a " +
      "bottomless Budweiser and opinions on everyone's break. Next door, the Blue Dog's rail " +
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
    exits: { w: "beach_rd_s", e: "buakhao_s", n: "second_rd_c", s: "pratumnak_rd", spa: "second_thai", honey: "soi_honey_w" },
  },
  second_rd_c: {
    name: "Second Road (Central)",
    region: "Second Road",
    desc: "Mid-Second-Road: baht buses in convoy, pharmacies, and the constant churn " +
      "between the mall's back doors to the west and the fairy-lit mouth of MYTH " +
      "NIGHT market to the east.",
    exits: { s: "second_rd_s", n: "second_rd_n", w: "central_mall", e: "myth_night", diana: "diana_w" },
  },
  second_rd_n: {
    name: "Second Road (North)",
    region: "Second Road",
    desc: "The north stretch, where Second Road angles toward the Dolphin roundabout. " +
      "Central Pattaya Road — Pattaya Klang — crosses just ahead, cutting the whole " +
      "town into north and south. This block is a massage row: SMILE MASSAGE winks pink " +
      "from the west side, and opposite, four floors of blue neon spell POSEIDON MASSAGE " +
      "over a doorman and a fish tank.",
    exits: { s: "second_rd_c", n: "pattaya_klang", w: "smile_massage", e: "poseidon_soapy" },
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
      "pink as the original. North, a LIVE-STAGE YARD throws sound over the roofs; " +
      "south, the CONTAINER ROWS glow like a docked ship someone plugged in.",
    exits: { w: "second_rd_c", e: "buakhao_n", in: "candy_bar_2", n: "myth_stage", s: "myth_rows" },
  },
  myth_stage: {
    name: "Myth Night — Live-Stage Yard",
    region: "Myth Night",
    liveMusic: true,
    desc: "A gravel yard walled in by container bars, all facing a corrugated stage where " +
      "a covers band murders a Carabao song to a delighted crowd. THE AMP ROOM, FEEDBACK " +
      "BAR, ENCORE, and SOUNDCHECK BAR ring the yard, each with its own tap wall and its " +
      "own idea of how loud is too loud.",
    exits: { s: "myth_night", in: "amp_room", e: "feedback_bar", w: "encore_bar", n: "soundcheck_bar" },
  },
  amp_room: {
    name: "The Amp Room",
    region: "Myth Night",
    bar: "The Amp Room", barType: "beer", liveMusic: true, outlet: true,
    desc: "Speaker cabinets stacked to the ceiling, half of them decorative, all of them " +
      "sticky. The beer is cold, the bass is a full-body experience, and Ju has to lean " +
      "in close to take your order — which is, of course, the point.",
    exits: { out: "myth_stage" },
  },
  feedback_bar: {
    name: "Feedback Bar",
    region: "Myth Night",
    bar: "Feedback Bar", barType: "beer",
    desc: "A container split down the long side, one wall a chalkboard of craft taps nobody " +
      "in here can pronounce. Pat pours a flight of four and lines them up like a dare.",
    exits: { out: "myth_stage" },
  },
  encore_bar: {
    name: "Encore",
    region: "Myth Night",
    bar: "Encore", barType: "beer",
    desc: "The after-the-band bar: fairy lights, low stools, a battered acoustic guitar on " +
      "a hook that everyone threatens to play and nobody does. Pun keeps the tab and the peace.",
    exits: { out: "myth_stage" },
  },
  soundcheck_bar: {
    name: "Soundcheck Bar",
    region: "Myth Night",
    bar: "Soundcheck Bar", barType: "beer",
    desc: "Closest to the stage and proud of it — you order in the gaps between songs or not " +
      "at all. Som mouths the prices and holds up fingers, a whole transaction in mime.",
    exits: { out: "myth_stage" },
  },
  myth_rows: {
    name: "Myth Night — Container Rows",
    region: "Myth Night",
    desc: "Two facing rows of shipping containers cut open into bars, festoon lights strung " +
      "between them like rigging. Quieter than the stage yard, a degree cooler, the crowd a " +
      "little older. CRAFT & CARGO, THE GROWLER, CONTAINER 8, and RELOAD BAR trade pours " +
      "down the line.",
    exits: { n: "myth_night", in: "craft_cargo", e: "the_growler", w: "container_8", s: "reload_bar" },
  },
  craft_cargo: {
    name: "Craft & Cargo",
    region: "Myth Night",
    bar: "Craft & Cargo", barType: "beer", outlet: true,
    desc: "A shipping container with the doors thrown wide, kegs where the freight used to " +
      "ride, and a blackboard of guest taps chalked in three colours. Mam runs the taps with " +
      "the calm of someone who has poured through every kind of night.",
    exits: { out: "myth_rows" },
  },
  the_growler: {
    name: "The Growler",
    region: "Myth Night",
    bar: "The Growler", barType: "beer",
    desc: "Named for the take-home jugs on the back shelf, half of them dusty. A good stool, " +
      "a cheap pour, and Jib behind the bar who remembers your drink before your name.",
    exits: { out: "myth_rows" },
  },
  container_8: {
    name: "Container 8",
    region: "Myth Night",
    bar: "Container 8", barType: "beer",
    desc: "Literally the eighth container in the row, the number stencilled in freight paint " +
      "and adopted as a name. Toon keeps a jar of chilli-lime peanuts on the bar as bait.",
    exits: { out: "myth_rows" },
  },
  reload_bar: {
    name: "Reload Bar",
    region: "Myth Night",
    bar: "Reload Bar", barType: "beer",
    desc: "The last container before the wall, where the crowd washes up to steady itself " +
      "before another lap of the market. Yaya works the rail, quick with a coaster and a joke.",
    exits: { out: "myth_rows" },
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
      "is not visible from the gate, but you'll feel it by the time you reach the other end. " +
      "Just east, RUEAN SABAI THAI MASSAGE has a row of foot chairs out for the walking " +
      "wounded.",
    exits: { s: "ws_south", n: "beach_rd_s", w: "pratumnak_rd", e: "thai_massage" },
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
      "down an alley — easy to miss, worth finding. Soi Diana opens off the 7-Eleven on " +
      "the corner here, its go-go neon running away west; two doors south toward the " +
      "market, Candy Bar's rose-pink sign is close enough to read.",
    exits: { w: "myth_night", n: "pattaya_klang", s: "buakhao_market", e: "lucky_tiger",
             in: "rock_factory", alley: "lk_entrance", hotel: "metropole_room", diana: "diana_e" },
  },
  buakhao_market: {
    name: "Buakhao Market",
    region: "Soi Buakhao",
    desc: "Tarps, fans, fruit pyramids, and a man forever restacking ice crates behind a " +
      "som tam cart. The smell of papaya salad could pull you here from two sois away. " +
      "CANDY BAR's rose-pink sign glows just south; SILK ROSE and JASMINE GARDEN share " +
      "the block east.",
    exits: { n: "buakhao_n", s: "buakhao_s", w: "candy_bar", e: "silk_rose", in: "candy_bar", spa: "buakhao_oil" },
  },
  buakhao_s: {
    name: "Soi Buakhao (South)",
    region: "Soi Buakhao",
    desc: "The south end, where Tree Town's fairy-lit maze of mini-bars spills onto the " +
      "pavement. The Tree Town arch is east — a complex that eats tourists and spits out " +
      "poorer, happier ones. A motosai stand waits by the corner, engines ticking.",
    motosai: true,
    exits: { n: "buakhao_market", w: "second_rd_s", e: "tt_entrance", s: "jasmine_garden", in: "jasmine_garden", honey: "soi_honey_e" },
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
      "routines. Without light, every exit feels like the same wrong one. South, past " +
      "the bins, a FAR LANE of cheap bars nobody photographs leaks a little warm light.",
    sign: "maze_3",
    exits: { n: "tt_lane_1", w: "tt_lane_2", e: "tt_deep", s: "tt_lane_3" },
  },
  tt_lane_3: {
    name: "Tree Town (Far Lane)",
    region: "Tree Town",
    desc: "The cheap seats of the maze, behind the kitchens where the rent drops and the " +
      "neon budget with it: three little bars under one sagging string of bulbs. THE RABBIT " +
      "HOLE, LUCKY CHARM BAR, and MOONSHINE BAR trade the regulars who ran out of maze. " +
      "Friendlier than it has any right to be down here.",
    exits: { n: "tt_back", in: "rabbit_hole", e: "lucky_charm", w: "moonshine_bar" },
  },
  rabbit_hole: {
    name: "The Rabbit Hole",
    region: "Tree Town",
    bar: "The Rabbit Hole", barType: "beer", outlet: true,
    desc: "A burrow of a bar you have to duck to enter, painted with tumbling playing cards " +
      "and a grinning cat. Deeper than it looks and easy to lose an evening in. Aump and " +
      "Guitar keep the stools warm and the tab creeping.",
    exits: { out: "tt_lane_3" },
  },
  lucky_charm: {
    name: "Lucky Charm Bar",
    region: "Tree Town",
    bar: "Lucky Charm Bar", barType: "beer", pool: true,
    desc: "Horseshoes, four-leaf clovers, a lottery-number shrine, and a pool table with a " +
      "lucky rip in the felt. Namtip and Bella will read your palm for a lady drink and " +
      "predict, every time, that you buy another.",
    exits: { out: "tt_lane_3" },
  },
  moonshine_bar: {
    name: "Moonshine Bar",
    region: "Tree Town",
    bar: "Moonshine Bar", barType: "beer",
    desc: "A jars-on-the-shelf hillbilly theme done on a Pattaya budget — fairy lights in " +
      "mason jars, a banjo nobody plays, ya dong in an unlabelled bottle for the brave. Prik " +
      "and Mek run the rail and dare you to try the house infusion.",
    exits: { out: "tt_lane_3" },
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
    desc: "The soi hits you before you round the corner — a wall of bars at volume, each " +
      "trying to drown the next, the whole street a wall of competing bass lines and shouted " +
      "Thai pop. Open-air bars on both sides, hostesses spilling out front in sequins and very " +
      "little else. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" You are grabbed by the wrist. " +
      "You are grabbed by the other wrist. Someone significantly shorter than you attempts " +
      "to climb onto your back. PINK LOTUS LOUNGE (north), GOLDEN DRAGON BAR (east), and " +
      "SUNSET DREAMS LOUNGE (south) are the main combatants. The QUEEN VIC INN (pub) " +
      "halfway down is the one place that isn't shouting, and the soi keeps going deeper " +
      "east into more of the same.",
    exits: { w: "beach_rd_n", n: "pink_lotus", e: "golden_dragon", s: "sunset_dreams",
             in: "pink_lotus", pub: "queen_vic", deep: "soi6_deep" },
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
  soi6_deep: {
    name: "Soi 6 (East End)",
    region: "Soi 6",
    seven: true,
    desc: "Deeper into the soi, past the Queen Vic, where the bars run on toward Second Road " +
      "and the shouting never lets up. KITTEN CORNER, CHERRY POP BAR, and RUBY KISS BAR trade " +
      "wrist-grabs down this stretch. Same open fronts, same three-colour neon, same " +
      "staircases behind the bar that the menu doesn't mention.",
    exits: { w: "soi6_street", in: "kitten_corner", n: "cherry_pop", s: "ruby_kiss" },
  },
  kitten_corner: {
    name: "Kitten Corner",
    region: "Soi 6",
    bar: "Kitten Corner", barType: "soi6",
    desc: "Open to the pavement, walled in cat posters and a neon paw print. Praewa and " +
      "Nangfah work the front, and the grab-and-giggle starts before you've fully stopped " +
      "walking. A staircase at the back goes up to the short-time rooms.",
    exits: { out: "soi6_deep" },
  },
  cherry_pop: {
    name: "Cherry Pop Bar",
    region: "Soi 6",
    bar: "Cherry Pop Bar", barType: "soi6",
    desc: "Red from floor to ceiling, a bowl of actual cherries on the bar that nobody eats, " +
      "and a sound system stuck on one bubblegum playlist. Tabtim and Chaba call the odds " +
      "from the rail. The stairs are where the stairs always are.",
    exits: { out: "soi6_deep" },
  },
  ruby_kiss: {
    name: "Ruby Kiss Bar",
    region: "Soi 6",
    bar: "Ruby Kiss Bar", barType: "soi6",
    desc: "The last loud front before the soi spills onto Second Road: lipstick-red lighting, " +
      "a mirror wall, and a lipstick-mark motif on everything including the glasses. Kluay and " +
      "Benz have claimed the two nearest stools for you already.",
    exits: { out: "soi6_deep" },
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
      "sequins at a speed that's technically legal. THE OFFSIDE SPORTS BAR breaks the neon " +
      "with the cold blue wash of a dozen screens. The alley bends east at the far end.",
    exits: { w: "lk_entrance", n: "kinky", s: "slutty", e: "lk_bend", in: "kinky", pub: "lk_sports" },
  },
  lk_sports: {
    name: "The Offside Sports Bar",
    region: "LK Metro",
    bar: "The Offside Sports Bar", barType: "pub", outlet: true,
    desc: "A proper sports bar wedged into the go-go alley: a wall of screens, a Premier " +
      "League fixture list chalked up beside a Thai-boxing card, a dartboard with a queue, " +
      "and a fridge of import beer at import prices. The commentary is in three languages " +
      "and the groans when a penalty's missed are universal. A quiet corner to sober up in, " +
      "if the match lets you.",
    exits: { out: "lk_main" },
  },
  lk_bend: {
    name: "LK Metro (Corner)",
    region: "LK Metro",
    desc: "The corner where the alley turns south. LAS VEGAS GO-GO burns at the end of " +
      "the second leg — the signage outspends everything else in sight. The crowd thins " +
      "slightly here: the regulars who know the place, the girls finishing a shift on the " +
      "back of a motorbike, a few tourists who followed the sound far enough to find it. " +
      "Two open-front beer bars, THE METRO BEER GARDEN and THE PIT STOP, catch the ones " +
      "who've had enough go-go for one night. Less overwhelming than Walking Street; more " +
      "like something you discovered.",
    exits: { w: "lk_main", s: "las_vegas", in: "las_vegas", diana: "diana_e",
             n: "metro_garden", e: "pit_stop" },
  },
  metro_garden: {
    name: "The Metro Beer Garden",
    region: "LK Metro",
    bar: "The Metro Beer Garden", barType: "beer", outlet: true,
    desc: "A strip of pavement roofed in fairy lights and plastic ivy, a beer garden by " +
      "sheer force of naming. Cold towels, cheap Chang, and a view straight down the alley " +
      "at the neon. Near keeps the cooler stocked and the stools filled.",
    exits: { out: "lk_bend" },
  },
  pit_stop: {
    name: "The Pit Stop",
    region: "LK Metro",
    bar: "The Pit Stop", barType: "beer",
    desc: "One container-width of bar with a motorsport theme it can't quite afford — a " +
      "cardboard cutout of a pit crew, a checkered valance, a shelf of dusty toy cars. " +
      "Milin waves you onto a stool like she's flagging you into the pits.",
    exits: { out: "lk_bend" },
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
      "guests consider part of the charm. The soi itself is dark as a power cut. " +
      "East, a quiet BAR CORNER of expat beer bars glows low; a SPA ROW of massage " +
      "and soapland fronts runs off the other way.",
    busStop: "beachrd",
    exits: { s: "beach_rd_n", n: "hotel_soi", w: "orchid_club", e: "naklua_bars", spa: "naklua_massage" },
  },
  naklua_bars: {
    name: "Naklua (Bar Corner)",
    region: "Naklua",
    desc: "A pocket of low-key expat beer bars off the main road, the kind that open at four " +
      "and know every customer's pour by five. No neon war up here — just fairy lights, a " +
      "sea breeze off the old fishing harbour, and the clack of a single pool table. THE " +
      "ANCHOR BAR, DOLPHIN BAR, and THE MOORING share the corner and most of the regulars.",
    exits: { w: "naklua_rd", in: "anchor_bar", n: "dolphin_bar", s: "mooring_bar" },
  },
  anchor_bar: {
    name: "The Anchor Bar",
    region: "Naklua",
    bar: "The Anchor Bar", barType: "beer", pool: true, outlet: true,
    desc: "A nautical-junk beer bar — a real ship's wheel on the wall, glass floats in a net, " +
      "a barometer nobody trusts. The long-stay crowd holds the stools like moorings. Namfon " +
      "pours a cold one before you've picked a seat.",
    exits: { out: "naklua_bars" },
  },
  dolphin_bar: {
    name: "Dolphin Bar",
    region: "Naklua",
    bar: "Dolphin Bar", barType: "beer",
    desc: "Named for the roundabout to the south, painted with a leaping dolphin that's had a " +
      "few touch-ups too many. Quiet, cheap, and friendly. Bunny keeps the cooler stocked and " +
      "the football on low.",
    exits: { out: "naklua_bars" },
  },
  mooring_bar: {
    name: "The Mooring",
    region: "Naklua",
    bar: "The Mooring", barType: "beer",
    desc: "The last light before the dark soi, a single-container bar where the harbour smell " +
      "wins over the beer. Jaja works the rail and remembers birthdays she has no business " +
      "remembering.",
    exits: { out: "naklua_bars" },
  },
  naklua_massage: {
    name: "Naklua (Spa Row)",
    region: "Naklua",
    desc: "The quieter, older end of the trade: no shorts on the step, just tall blue-lit " +
      "soapland towers and clean traditional shopfronts side by side. NAKLUA TRADITIONAL " +
      "MASSAGE glows honest white; LOTUS OIL MASSAGE leaks pink and cold air; and the " +
      "EMPEROR looms four floors over the lot, a fish tank behind one-way glass.",
    exits: { s: "naklua_rd", in: "naklua_thai", n: "lotus_oil", up: "emperor_soapy" },
  },
  naklua_thai: {
    name: "Naklua Traditional Massage",
    bar: "Naklua Traditional Massage",
    region: "Naklua",
    massage: "legit",
    desc: "A calm white shopfront among the seafood restaurants, ceiling fans turning over rows " +
      "of proper mats. A laminated list — foot 250, Thai 300, herbal compress 400 — and ladies " +
      "in tidy uniforms who wai and mean it. The honest kind, for the long-stay aches.",
    exits: { out: "naklua_massage" },
  },
  lotus_oil: {
    name: "Lotus Oil Massage",
    bar: "Lotus Oil Massage",
    region: "Naklua",
    massage: "oil",
    desc: "Pink light, a beaded curtain, air-con bleeding cold onto the pavement, and the " +
      "little NO SEX sticker on the mirror that the warm oil and the few questions rather " +
      "contradict. Quieter than the town shops, and in less of a hurry.",
    exits: { out: "naklua_massage" },
  },
  emperor_soapy: {
    name: "The Emperor Massage",
    bar: "The Emperor Massage",
    region: "Naklua",
    soapy: true,
    desc: "Four floors of blue neon over the Naklua trade, a doorman in a shiny suit, and past " +
      "the marble lobby the fishbowl: tiered benches behind one-way glass, two dozen ladies in " +
      "evening gowns with numbered discs at the hip, some watching a hidden TV, some watching " +
      "you. The manageress has a laminated menu of tiers. Pick a number; the rest is a package " +
      "and a very long shower.",
    exits: { out: "naklua_massage" },
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

  // ── Massage (three of the town's nine kinds) ──────────────────────────────
  // In Pattaya "massage" is the most elastic word in the language and the sign
  // never tells you which kind. Non-bar rooms on purpose (no barType) so none of
  // the bar apparatus — lady drinks, bell, games, barfine — applies; the MASSAGE
  // and SOAPY verbs carry the whole interaction.
  thai_massage: {
    name: "Ruean Sabai Thai Massage",
    bar: "Ruean Sabai Thai Massage",
    region: "Walking Street",
    massage: "legit",
    desc: "A clean, bright shopfront a step off the Walking Street gate: a row of reclining " +
      "chairs facing the street, a laminated price list on the wall — foot 250, Thai 300, " +
      "oil 350, aloe for the sunburned — and the good sharp smell of tiger balm. The ladies " +
      "wear matching polo shirts and wais, are mostly old enough to be your aunt, and mean " +
      "every knuckle of it. Pensri runs the front. No short shorts, no barker, no nonsense — " +
      "the one honest kind of massage in a town that sells nine.",
    exits: { out: "ws_gate" },
  },
  smile_massage: {
    name: "Smile Massage",
    bar: "Smile Massage",
    region: "Second Road",
    massage: "oil",
    desc: "Pink light and an open front, and two girls in very short shorts draped over the " +
      "doorway chairs who come alive the instant you slow down — “hello handsome, massaaage, " +
      "you come!” The sign says massage; the shorts file a dissenting opinion. Inside is " +
      "cooler and dimmer: curtained cubicles, a wall of mirrors, and a small printed sign in " +
      "three languages you clock without meaning to — no sex. Waan is already smiling at you " +
      "like she knows something.",
    exits: { out: "second_rd_n" },
  },
  poseidon_soapy: {
    name: "Poseidon Massage",
    bar: "Poseidon Massage",
    region: "Second Road",
    soapy: true,
    desc: "Four floors of blue neon and a doorman in a bad suit. Past a lobby of fake marble " +
      "and a tank of actual fish is the other tank: a wall of bright one-way glass, tiered " +
      "benches behind it, and behind those a couple of dozen ladies in evening dresses with " +
      "numbered discs pinned at the hip — some watching a TV you cannot see, some watching " +
      "you. Toom, the manageress, sits at a little desk with a laminated menu of tiers. You " +
      "pick a number; everything after that is a set package and a very long shower.",
    exits: { out: "second_rd_n" },
  },
  // Area coverage — the same three kinds, spread across town (generic staff).
  buakhao_oil: {
    name: "Golden Touch Massage",
    bar: "Golden Touch Massage",
    region: "Soi Buakhao",
    massage: "oil",
    desc: "One of a hundred pink-lit shopfronts on Buakhao, indistinguishable from its " +
      "neighbours except that this one caught your eye. Girls in shorts on the step, a " +
      "beaded curtain, air-con leaking cold onto the pavement, and the inevitable little " +
      "sticker on the mirror inside. The oil is warm and the questions are few.",
    exits: { out: "buakhao_market" },
  },
  jomtien_thai: {
    name: "Jomtien Sabai Massage",
    bar: "Jomtien Sabai Massage",
    region: "Jomtien",
    massage: "legit",
    desc: "A breezy open front on the beach road, ceiling fans turning, a rack of aloe gel " +
      "by the till for the day's crop of sunburned farang. Foot chairs face the sea, the " +
      "ladies wear a tidy uniform, and the only oil on offer goes on your shoulders. After " +
      "a day frying on Dongtan, this is the kindest ฿300 in Jomtien.",
    exits: { out: "jomtien_beach_rd" },
  },
  beachrd_oil: {
    name: "Cherry Oil Massage",
    bar: "Cherry Oil Massage",
    region: "Beach Road",
    massage: "oil",
    desc: "Wedged between a tailor and a currency booth on Beach Road, a narrow shop with a " +
      "loud sign, a louder girl on the step, and a staircase to curtained rooms up top. The " +
      "traffic roars past two feet away; inside, the mirror-and-sticker arrangement is " +
      "exactly as advertised everywhere else in town.",
    exits: { out: "beach_rd_c" },
  },
  second_thai: {
    name: "Second Road Traditional Massage",
    bar: "Second Road Traditional Massage",
    region: "Second Road",
    massage: "legit",
    desc: "Blue plastic stools, a certificate on the wall in a gold frame, and a proprietress " +
      "who runs it like a small clinic. Traditional Thai and oil, done properly and firmly, " +
      "no funny business — the sort of place the long-stay expats come to get their backs put " +
      "right after a night that went wrong.",
    exits: { out: "second_rd_s" },
  },
  // ── Soi Honey (the map calls it Soi 11) — cuts between Second Rd and Buakhao ──
  soi_honey_w: {
    name: "Soi Honey (west end)",
    region: "Soi Honey",
    desc: "A short, narrow soi threading between Second Road and Soi Buakhao — the map calls it " +
      "Soi 11, everyone else calls it Soi Honey, after the soapland whose blue glow owns the " +
      "west end. Beer bars string fairy lights and Filipino covers across the lane; a soapy " +
      "massage hums to the south, and the loudest of the beer bars is just north.",
    exits: { w: "second_rd_s", e: "soi_honey_e", n: "honey_trap", s: "honey_soapy" },
  },
  soi_honey_e: {
    name: "Soi Honey (east end)",
    region: "Soi Honey",
    desc: "The Buakhao end of Soi Honey, where the lane spits you back out among the pharmacies " +
      "and laundries. Two more beer bars face each other across the narrow strip, close enough " +
      "that the girls of one heckle the customers of the other. It smells of grilled chicken, " +
      "spilled Chang, and somebody's jasmine.",
    exits: { w: "soi_honey_w", e: "buakhao_s", n: "queen_bee", s: "buzz_inn" },
  },
  honey_soapy: {
    name: "Honeycomb Massage",
    bar: "Honeycomb Massage",
    region: "Soi Honey",
    soapy: true,
    desc: "The blue-neon soapland the soi is named for: three floors, a doorman, a lobby that " +
      "smells of chlorine and jasmine, and the wall of one-way glass where the numbered girls " +
      "sit under honeycomb-gold light. A manageress works the menu at a little desk. Same ritual " +
      "as Poseidon up on Second Road — a number, a set price, a very long shower.",
    exits: { out: "soi_honey_w" },
  },
  honey_trap: {
    name: "Honey Trap Bar",
    bar: "Honey Trap Bar", barType: "beer",
    region: "Soi Honey",
    desc: "The loud one: a horseshoe bar under a ceiling solid with fairy lights, a Connect 4 " +
      "frame chained to the rail, and a hand-painted sign promising HAPPY HOUR ALL NIGHT (it is " +
      "not). The girls clock you from thirty feet and have your stool wiped before you reach it.",
    exits: { out: "soi_honey_w" },
  },
  queen_bee: {
    name: "The Hive",
    bar: "The Hive", barType: "beer",
    region: "Soi Honey",
    desc: "Yellow-and-black everything, a plywood bee the size of a scooter over the bar, and a " +
      "sound system punching well above the venue's weight. Smaller and friendlier than the " +
      "Honey Trap across the way, which the two bars settle nightly by volume.",
    exits: { out: "soi_honey_e" },
  },
  buzz_inn: {
    name: "Buzz Inn",
    bar: "Buzz Inn", barType: "beer",
    region: "Soi Honey",
    desc: "A narrow slot of a bar, six stools deep, run at a gentle simmer — the sort of place a " +
      "man ends up when the big bars are too much work. A dartboard nobody uses, a cat asleep on " +
      "the till, and whichever girls the Honey Trap couldn't seat.",
    exits: { out: "soi_honey_e" },
  },
  // ── Soi Diana (the next big soi south of Soi Honey) — Second Rd ↔ Buakhao ──
  // Threads past the far arm of the LK Metro "L". KISS marks its Second Road
  // mouth; Areca Lodge sits along it; it spills out onto Buakhao at the 7-Eleven
  // corner, two doors up from Candy Bar.
  diana_w: {
    name: "Soi Diana (Second Road end)",
    region: "Soi Diana",
    desc: "The Second Road mouth of Soi Diana, a long strip of open-fronted beer bars one block " +
      "south of Soi Honey. On the south corner, the open-air KISS restaurant does brisk trade under " +
      "its fairy lights — everyone in Pattaya gives directions off it. East, the soi runs away into " +
      "warm light and eighty different sound systems; the first beer bar's girls are already waving.",
    exits: { w: "second_rd_c", e: "diana_mid", s: "kiss", n: "dollhouse" },
  },
  diana_mid: {
    name: "Soi Diana (middle)",
    region: "Soi Diana",
    desc: "The thick of Soi Diana: open beer bars shoulder to shoulder down both sides, barkers " +
      "working the narrow strip between, a hundred fairy-lit stools and a lady on every one. A side " +
      "door of the LK Metro complex breathes cold air and go-go bass from further east — but that's " +
      "the complex; the soi itself keeps it simple. Somewhere a bell rings and a whole bar cheers.",
    exits: { w: "diana_w", e: "diana_e", n: "sapphire", s: "sundowner" },
  },
  diana_e: {
    name: "Soi Diana (Buakhao end)",
    region: "Soi Diana",
    desc: "The Buakhao end of Soi Diana. The LK Metro alley opens off to one side (its other " +
      "mouth is up on Buakhao proper); the Areca Lodge's lit driveway is on the other. Ahead, the " +
      "soi spills onto Soi Buakhao by the 7-Eleven on the corner — Candy Bar's rose-pink sign " +
      "glows just two doors south of it.",
    exits: { w: "diana_mid", e: "buakhao_n", n: "cricketers", s: "areca_room", lk: "lk_bend" },
  },
  kiss: {
    name: "KISS Restaurant",
    bar: "KISS Restaurant",
    region: "Soi Diana",
    food: true,
    desc: "The famous open-air corner restaurant at the mouth of Soi Diana — plastic chairs, " +
      "paper menus a mile long (simple Thai one side, farang comfort food the other), and a grill " +
      "going full tilt. Everyone knows KISS; everyone meets at KISS. In high season you can stand " +
      "twenty minutes waiting for a table; tonight there's a stool free, just. (BUY FOOD / EAT.)",
    exits: { out: "diana_w" },
  },
  dollhouse: {
    name: "The Dollhouse",
    bar: "The Dollhouse", barType: "beer",
    region: "Soi Diana",
    desc: "A big open-fronted beer bar, all fairy lights and cane stools, its counter wrapped in a " +
      "horseshoe so the girls can reach every seat. No stage, no pole — just cold Chang, a Connect 4 " +
      "frame, and a dozen hostesses who treat every farang who slows down as a long-lost friend.",
    exits: { out: "diana_w" },
  },
  sapphire: {
    name: "Sapphire Bar",
    bar: "Sapphire Bar", barType: "beer",
    region: "Soi Diana",
    desc: "Blue neon over a long open bar, a decent sound system, and stools that face the soi so you " +
      "can watch Diana churn past while you drink. Friendlier than it is flash — the Sapphire runs on " +
      "regulars, lady drinks, and the slow art of talking you into one more.",
    exits: { out: "diana_mid" },
  },
  sundowner: {
    name: "Sundowner Bar",
    bar: "Sundowner Bar", barType: "beer",
    region: "Soi Diana",
    desc: "An open-fronted beer bar with a horseshoe counter, a Connect 4 frame, and a row of " +
      "friendly girls who'd rather chat than dance. The stools face the soi so you can watch the " +
      "go-go crowd churn past while you nurse a Chang. Cheaper, easier, kinder on the wallet.",
    exits: { out: "diana_mid" },
  },
  cricketers: {
    name: "The Cricketers",
    bar: "The Cricketers", barType: "beer",
    region: "Soi Diana",
    desc: "A farang sports bar wedged onto the go-go soi: three screens, a dartboard, a menu of pies, " +
      "and a knot of expats who've solved the world twice over by nine o'clock. There are girls, and " +
      "there is beer, but mostly there is opinion. Somebody is explaining the offside rule to a " +
      "hostess who stopped listening in 2019.",
    exits: { out: "diana_e" },
  },
  papaya_massage: {
    name: "Papaya Massage",
    bar: "Papaya Massage",
    region: "Beach Road",
    massage: "oil",
    desc: "Just south of KISS, where Soi Diana's noise gives way to the Beach Road breeze — a " +
      "pink-lit oil shop with the usual girls on the usual stools and the usual small sticker on " +
      "the mirror. The sea air almost makes it feel wholesome. Almost.",
    exits: { out: "beach_rd_s" },
  },
  beachthai_massage: {
    name: "Beach Road Thai Massage",
    bar: "Beach Road Thai Massage",
    region: "Beach Road",
    massage: "legit",
    desc: "Next door to the oil shop and a world apart: a proper traditional place with foot chairs " +
      "facing the sea, aunties in a tidy uniform, and a menu that stops at 'oil, one hour.' The spot " +
      "the tuk-tuk drivers themselves come to get their shoulders sorted.",
    exits: { out: "beach_rd_s" },
  },
  areca_room: {
    name: "Your Room — Areca Lodge",
    region: "Soi Diana",
    outlet: true,
    desc: "A proper mid-range room at the Areca Lodge on Soi Diana: firm bed, cold aircon that " +
      "actually works, a kettle, and a window over the garden pool where a few long-stay couples " +
      "are doing slow lengths. Comfortable, central, unremarkable in the best way — the whole soi's " +
      "racket is thirty seconds out the door, and none of it follows you in.",
    exits: { out: "diana_e" },
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
  foreman_keys: {
    name: "ring of site keys", aliases: ["keys", "site keys", "foreman keys", "ring of keys"],
    portable: true, location: null, // Wimon hands them over for the shrine run
    desc: "A heavy ring of brass site keys, every one oiled and worn — the locks of Hyper " +
      "A Go-Go as they were the day the hoarding came down. Kept polished by a widow's " +
      "thumb for years.",
  },
  revue_flyer: {
    name: "Peacock revue flyer", aliases: ["flyer", "revue flyer", "peacock flyer"],
    portable: true, location: null, // Miss Mala hands it over for the scout run
    desc: "A glossy flyer for the Peacock Cabaret's revue: Petch mid-lip-sync in a gown " +
      "made of light, Miss Mala's headdress filling the top corner like weather. On the " +
      "back, in careful biro: 'for the Alcazar man — M.'",
  },
  brass_tag: {
    name: "brass dog tag", aliases: ["tag", "brass tag", "dog tag", "seamus"],
    portable: true, location: null, // worked free of the Shamrock's shutter hasp
    desc: "A brass dog tag gone green with four rainy seasons: SEAMUS — THE SHAMROCK — " +
      "GOOD BOY. The pub is shuttered and Paddy is long gone home, but somebody once " +
      "paid to have GOOD BOY engraved in brass, and they were right.",
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
  soi_cats: {
    name: "two soi cats", aliases: ["cats", "cat", "big one", "little one", "kittens", "soi cats"],
    portable: false, location: "jomtien_beach",
    desc: "Two gray-and-white shorthairs holding down the end of a lounger like a deposit. " +
      "Sisters, plainly — same coat, same sea-watching squint — though the little one is a " +
      "runt who never grew into her ears, and the big one sits slightly in front of her the " +
      "way she always has and always will. The beach calls them Big One and Little One; " +
      "Auntie Nok feeds them scraps and calls them her security. They have watched a " +
      "thousand of these sunsets and fully intend to watch a thousand more. (PET them, " +
      "if Big One permits it.)",
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
      { topic: "cat", text: "\"The gray sisters, by the loungers? Mine — well, nobody's, but I feed them, morning and night, ten year now. Big One and Little One. You watch the big one: she never eat before the little one eat. Not one time in ten year.\" Auntie Nok's whole face goes soft. \"They my security, na. Nobody sleep rough on MY beach the cats don't tell me first. Better than police. Cheaper than police, hahaha.\"",
        short: "\"The gray sisters — I feed them ten year. Big One never eats before Little One. My security.\"" },
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
      { bond: 3, text: "\"You keep coming back to the Gold Rush for ME — the paint is not " +
          "that charming, we both know it.\" For once Mercedes lets the dry line land soft. " +
          "\"After Munich I made myself one promise: no more man I have to manage. And here " +
          "is you — needing no managing, buying the paint-bar girl her drink like it is " +
          "Vienna. Don't make me like you, farang. I am badly out of practice.\"",
        short: "\"Don't make me like you, farang. I'm badly out of practice.\"" },
      { bond: 2, text: "\"Sit — the good stool, I saved it.\" Mercedes slides your drink over " +
          "without asking; she knows the order now. \"You are the only one in here who asks me " +
          "a question and then waits for the answer. It is a low bar, I know. Munich was lower.\"",
        short: "\"You ask a question and wait for the answer. Low bar. Munich was lower.\"" },
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

  // ── Masseuses (not bar staff — deliberately NOT in NPC_ROLES, so barfine and
  // lady-drink logic ignore them; the MASSAGE / SOAPY verbs carry the trade) ──
  pensri: {
    name: "Pensri", emoji: "💆", masseuse: true,
    room: "thai_massage",
    desc: "Fifty-odd, iron thumbs, reading glasses on a beaded chain. Pensri has run the " +
      "front of this shop twenty years and can tell where you hurt before you sit down.",
    dialogue: [
      { rom: "sawatdee kha",
        text: "\"Welcome, welcome. You sit.\" Pensri looks you over the way a mechanic looks " +
          "at a car that made a noise. \"Farang shoulder, always same — too much {{phone}}, too " +
          "much Chang, too much walking Soi 6. We fix. Foot, Thai, oil — up to you. No funny " +
          "business here, na; this one real massage.\" A crisp, kind smile. \"After, you feel " +
          "like new man.\"",
        short: "\"Sit. Foot, Thai, or oil — real massage only. After, new man.\"" },
      { topic: "special", text: "\"Special?\" She laughs, not unkindly, and swats the idea " +
          "away like a fly. \"Wrong shop, tilac. Go down Second Road, plenty. Here we fix the " +
          "body, not sell it. You want strong, or soft?\"" },
      { topic: "hurt", text: "\"Where you pain? Here?\" A thumb finds the exact knot before " +
          "you can point. \"Mm. This one from carry too much — not money, worry. Lie down.\"" },
    ],
  },
  waan: {
    name: "Waan", emoji: "💗", masseuse: true,
    room: "smile_massage",
    desc: "Young, round-cheeked, shy until she isn't. Waan works the oil room at Smile and " +
      "has decided, for reasons of her own, that she likes you.",
    dialogue: [
      { rom: "sawatdee ka",
        text: "\"Heee, hello. You want massage? Come, come.\" Waan tugs your sleeve toward a " +
          "curtain, then goes suddenly bashful. \"I shy with you little bit — you handsome, I " +
          "like. Is okay?\" She grins at her own admission. \"Oil massage very good. And " +
          "after… up to you, na.\" A flick of the eyes at the small NO SEX sign on the wall, " +
          "and a smaller, more private smile that files its own dissent.",
        short: "\"You want massage? Oil very good — and after, up to you, na.\"" },
      { topic: "special", text: "\"Special I can do, tilac — hand, mouth, you choose.\" She " +
          "lowers her voice and nods at the sign. \"But no boom boom HERE — boss rule, " +
          "sticker everywhere, you see. Boom boom…\" a shrug, a smile \"…when I finish work, " +
          "you come, na. Different place.\"" },
      { topic: "shop", text: "\"Smile good shop. Boss okay, not too strict — only the one " +
          "rule.\" She taps the sign and giggles. \"Every customer read it. Every customer " +
          "ask me anyway.\"" },
    ],
  },
  toom: {
    name: "Toom", emoji: "🛁", soapyBoss: true,
    room: "poseidon_soapy",
    desc: "Broad, brisk, unbothered. Toom runs the Poseidon floor from a little desk by the " +
      "glass, and has explained the menu ten thousand times.",
    dialogue: [
      { rom: "choen kha",
        text: "\"Welcome to Poseidon. First time?\" Toom taps the laminated menu without " +
          "looking at it. \"Very simple. You see the glass — you pick a number, I tell you " +
          "the price, you go up. Bath, massage, everything: one price, no surprise. Star, " +
          "super star, model — prettier, more expensive, is honest, na.\" She smiles like a " +
          "woman who has never once haggled. (SOAPY when you want to choose.)",
        short: "\"Pick a number from the glass, one price, everything included. (SOAPY)\"" },
      { topic: "girls", text: "\"All my girl clean, checked, professional. The number on the " +
          "hip is how you choose — no need talk, no need shy. You like a number, you say the " +
          "number.\" A shrug. \"Inside, she take care everything.\"" },
    ],
  },
  kesorn: {
    name: "Kesorn", th: "เกสร", emoji: "👑",
    room: "honey_trap", bars: ["honey_trap", "queen_bee", "buzz_inn"],
    desc: "The madam of Soi Honey — sixties, gold everywhere, a voice like a till drawer. She owns " +
      "all three beer bars on the lane and works them one night at a time, so the girls never " +
      "quite know which bar mama is watching.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to my soi, darling.\" Kesorn spreads a ringed hand at the lane. \"Three " +
          "bar, all mine — the Honey Trap, the Hive, the Buzz Inn. I sit one each night, keep the " +
          "girls honest. You drink, you play, you buy a lady a cola — everybody happy, nobody " +
          "cheat. That is the whole business, na.\"",
        short: "\"Three bars, all mine. Drink, play, buy a lady a cola. Nobody cheat.\"" },
      { topic: "soi", text: "\"This little lane? Thirty year I am on it — the soapland, the beer " +
          "bar, the noodle lady, all know me.\" A gold-toothed smile. \"The map call it Soi 11. " +
          "Nobody call it that.\"" },
      { topic: "girls", text: "\"My girls are good girls. Isan girls, work hard, send money home. " +
          "I am strict but I am fair — she no cheat you, you no cheat her. Somebody make problem, " +
          "they answer to me.\" The smile does not waver, which is somehow the point." },
    ],
  },
  lawan: {
    name: "Lawan", th: "ลาวัลย์", emoji: "👑",
    room: "dollhouse", bars: ["dollhouse", "sapphire", "sundowner", "cricketers"],
    desc: "The grande dame of Soi Diana — a former Crystal Palace headliner who hung up the heels " +
      "and parlayed twenty years on the stage into four beer bars on the busiest drinking soi in " +
      "town. Silk, jade, a gaze that prices you before you've sat down. She works a different one " +
      "of her houses each night, and the girls behave accordingly.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Soi Diana.\" Lawan takes you in with a professional's glance. \"Four " +
          "beer bar, all mine, all down this one soi. No stage, no cover, no nonsense — just cold " +
          "beer, a lady to talk to, a game if you want. The go-go, that is inside LK Metro, other " +
          "business. Here we keep it friendly. Only be honest about the money and we are friends.\"",
        short: "\"Four beer bars, all mine down this soi. Be honest about the money, we're friends.\"" },
      { topic: "soi", text: "\"Diana is the busiest beer-bar soi in town — LK Metro on one side, " +
          "KISS on the corner, everybody pass through here.\" A cool smile. \"The go-go dancing is " +
          "in the complex. My girls just pour, and talk, and win at Connect 4. Cheaper for you, na.\"" },
      { topic: "diana", text: "\"The soi, or the girl? Ha. The soi is named for a lady, like " +
          "everything good in this town.\" She lets that sit. \"Me, I just run it.\"" },
    ],
  },
  sumalee: {
    name: "Sumalee", th: "สุมาลี", emoji: "👑",
    room: "lucky7", bars: ["lucky7", "seabreeze", "coconut", "sandbar"],
    desc: "The matriarch of Soi 7 — thirty years in Jomtien, four little beer bars, and not one " +
      "gram of hurry. Where the Buakhao mamas price you like a market, Sumalee just wants everyone " +
      "fed, watered, and coming back next season. She works a different bar each night, mostly to " +
      "keep the girls honest and the regulars guessing.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Soi 7, the quiet side of the party.\" Sumalee waves at the strip of " +
          "fairy lights. \"Four bar, all mine, all easy — Lucky 7, Sea Breeze, Coconut, Sandbar. No " +
          "go-go, no hard sell, no drama. You want that, go Buakhao. Here you drink slow, you talk " +
          "to a nice lady, you come back next year. That is Jomtien, na.\"",
        short: "\"Four easy bars, all mine. Drink slow, talk to a nice lady, come back next year.\"" },
      { topic: "soi", text: "\"Soi 7 — beach one end, Second Road and Rompho Market the other, the " +
          "7-Eleven on the corner, the immigration office down the dark end nobody like.\" A dry " +
          "little laugh. \"Come for the beer, not the go-go. The go-go is other people's headache.\"" },
      { topic: "jomtien", text: "\"Jomtien is for the ones who already know the game — long-stay, " +
          "retire, married before, married again.\" She shrugs. \"Slower money than Pattaya, but it " +
          "come every month, and nobody fall off a balcony on my soi.\"" },
    ],
  },
  diamond: {
    name: "Diamond", th: "ไดมอนด์", emoji: "💎",
    room: "hyper",
    desc: "The mamasan of Hyper A Go-Go — six feet of poise in heels, cheekbones you could open " +
      "letters with, and a katoey's hard-won certainty that she is the most finished thing in any " +
      "room. She ran the floor here when it was a dump and stayed to run it now the Samson brothers " +
      "have made it shine. Nothing on this stage happens that Diamond didn't allow.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Hyper, darling — mind the step, mind your wallet, mind your manners.\" " +
          "Diamond looks you over the way a jeweller looks at a stone that might be paste. \"Yes, I am " +
          "a lady-boy, and yes, I am prettier than most of my girls, and no, I am not for sale — I am " +
          "the one who sells. You buy a dancer a drink, you treat her nice, everybody happy. You make " +
          "trouble, you find out how fast a big girl in heels can move.\" A dazzling, weaponised smile.",
        short: "\"Buy a girl a drink, treat her nice, mind your manners. I run this floor.\"" },
      { topic: "hyper", text: "\"You should have seen this place before — sticky floor, dead neon, " +
          "three girls and a fan.\" She waves a manicured hand at the chrome. \"Two brothers, European, " +
          "buy it in the COVID time, when every bar in Jomtien is dying. Put in every baht they own — " +
          "and, crazy, they live UPSTAIRS in the old short-time rooms, to watch the builders with their " +
          "own eyes. Everybody laugh at them then. Nobody laughing now.\"" },
      { topic: "samson", text: "\"My bosses. Two brothers — came with their savings and a wreck of a " +
          "go-go, made a fortune out of it, and never once stopped buying.\" A cool look. \"Now: seven " +
          "beer bar, three of the quiet clubs, and Hyper. They took partners to grow so fast — quiet " +
          "money, and you do not ask a Samson brother about the quiet money. The go-go is not their " +
          "favourite child any more; they just want more strip. Good bosses, though — pay on time, let " +
          "me run my floor. I make them money; they leave me be.\"" },
      { topic: "ladyboy", text: "\"You have a question, I can hear you thinking it.\" She laughs, not " +
          "unkindly. \"Twenty year ago I danced this soi. Now I run it. In Thailand a katoey can be a " +
          "queen or a punchline — I decided early which one. The girls call me Mae. That is enough " +
          "answer, na.\"" },
      { topic: "upstairs", bond: 2, sets: ["hyperUpstairs"],
        text: "Diamond studies you for a long moment — the look of a woman deciding whether you've " +
          "earned something — then leans close, voice dropped under the bass. \"You want to know about " +
          "upstairs. The old short-time rooms, where the brothers used to sleep before the money came. " +
          "We keep them. For friends. Trusted men only.\" A slow, dazzling smile. \"You are a friend " +
          "now, na. So — you barfine a girl short-time here, you do not take her to some hotel. You go " +
          "UP. Quiet, clean, no walk. Our little secret.\" (You've learned Hyper's upstairs.)",
        short: "\"Upstairs is yours now, friend — barfine a girl short-time here and go UP, no hotel.\"" },
      { topic: "upstairs", text: "\"Upstairs?\" Diamond's smile stays warm and shuts like a vault. " +
          "\"That is for friends of the house, tilac. Buy a girl a drink, buy ME one, come back a few " +
          "times. We will see how good a friend you are.\" The subject is closed, pleasantly." },
      { topic: "glam", req: ["glamTruth"], sets: ["diamondTruth"],
        text: "\"Wimon sent you. I know — she message me before you finish your beer.\" Diamond " +
          "looks at you a long time, then out at her floor, her chrome, her lights. \"He is my " +
          "father.\" Flat and quiet, like setting down something heavy. \"Forty years ago: a German " +
          "rocker with silk shirts, and a girl from Chonburi. He went home to his money and his wife; " +
          "mama married a builder — a GOOD man, who raised me and never once made me feel borrowed.\" " +
          "A slow breath. \"When papa came back old, his boys wanted a bar. Any bar. He walked them " +
          "past twenty and stopped at the wreck where his kathoey daughter ran the floor, and said: " +
          "this one. They think they found it themselves.\" The vault-smile, but her eyes are wet. " +
          "\"The brothers own half the strip and do not know they have a sister in the middle of it. " +
          "You carry the keys of the man who raised me up to my shrine, so now you carry this too. " +
          "Carefully, na.\"",
        short: "\"He is my father. The brothers do not know they have a sister. Carry it carefully, na.\"" },
      { topic: "glam", text: "\"Khun Glam? An old friend of the house.\" The smile stays warm and " +
          "shuts like a vault, and a dancer needs her at the far end of the bar, immediately." },
    ],
  },
  wimon: {
    name: "Wimon", th: "วิมล", emoji: "👑",
    room: "arrow_bar", bars: ["arrow_bar", "cheeky_monkey", "the_office"],
    desc: "The mamasan who runs the Samson brothers' three beer bars on the strip — fifties, brisk, a " +
      "{{phone}} in each hand and an eye on every tab. She works a different bar each night and somehow " +
      "knows exactly what happened at the other two.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome, sit anywhere.\" Wimon's smile is warm and her arithmetic is instant. \"Three " +
          "bar I look after for the boss — Arrow, Cheeky Monkey, the Office. Beer cold, girls nice, no " +
          "funny business. You drink, you play a game, you buy a lady a cola — easy. The go-go and the " +
          "quiet clubs, different manager; me, I do the honest bars.\"",
        short: "\"Three beer bars I run for the boss. Drink, play, buy a lady a cola. Easy.\"" },
      { topic: "samson", text: "\"The Samson brothers own this bar, and that one, and the go-go, and " +
          "the two quiet clubs — half the strip, really.\" A businesslike nod. \"Good owners. They put " +
          "the money back in. That is why the aircon work and the roof don't leak, na.\"" },
      { topic: "glam", text: "\"Ah — Khun Glam.\" Wimon's face softens into something you can't read " +
          "and will not get past. \"He is our friend, long long time. Very kind man. Very...\" a small, " +
          "final smile \"...special. His lady take care of him, we take care of him, everybody take " +
          "care of him. That is all.\" She is already turning to the till. \"You want another beer, na?\" " +
          "And that is the entire interview." },
      { topic: "husband", text: "\"My husband.\" The two phones go down, and for a moment the till " +
          "does not exist. \"Twenty-eight year a builder. The best foreman in Chonburi — Khun Glam " +
          "said so, to the brothers' faces, and that is how he got the Hyper job. Studs out, everything " +
          "new — too much work for the time those boys wanted it in. They pushed. Angry men in a " +
          "hurry, calling him slow — SLOW, a man who never once sat down on a roof in thirty years.\" " +
          "A breath. \"Near the end, he fell. The company paid what the law says. And Khun Glam came " +
          "the day after the temple, alone, with an envelope the law never heard of.\" Her eyes come " +
          "up, level. \"The brothers don't know about the envelope. They will never know. You " +
          "understand me, na.\"",
        short: "\"Glam got him the Hyper job; the brothers pushed the schedule; near the end he fell. " +
          "The envelope after the temple, the boys never knew.\"" },
    ],
  },
  ampai: {
    name: "Ampai", th: "อำไพ", emoji: "👑",
    room: "the_boardroom", bars: ["the_boardroom", "velvet_club"],
    desc: "The madame of the strip's two gentleman's clubs — silk, low voice, immaculate, the kind of " +
      "calm that costs a fortune to be near. She sells the quiet more than the girls, and she knows " +
      "every regular's business and says none of it.",
    dialogue: [
      { th: "เชิญค่ะ", rom: "choen kha",
        text: "\"Welcome. Come in from the noise.\" The door closes and the strip vanishes. \"The " +
          "Boardroom, the Velvet Club — both mine to run, both the same idea: cold, quiet, discreet. " +
          "You buy a lady a drink, she sits close, and after that it is between you and the curtain. " +
          "No barkers, no bells, no drama. A man pay for that peace more than for anything else.\"",
        short: "\"Two quiet clubs, both mine. Buy a lady a drink; the rest is behind the curtain.\"" },
      { topic: "samson", text: "\"The Samson brothers hold the papers. They understand the quiet end " +
          "of the business — they leave it quiet.\" A faint smile. \"That is rarer than you think, in " +
          "men who own bars.\"" },
    ],
  },
  nira: {
    name: "Nira", th: "นิรา", emoji: "💵",
    room: "neon_paradise",
    desc: "A dancer who watches the room the way the mamasan does — the best English on the stage and a " +
      "calculator behind her eyes. She smiles like she has already worked out your monthly salary and " +
      "rounded it down.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Sit, sit. You look like a man who reads the menu before he orders — I like that.\" " +
          "Nira's English is easy, almost accentless, and her attention is total in a way that costs " +
          "other men money. \"Most girls here want you to buy them a drink. Me, I want to know what you " +
          "DO. Numbers are more interesting than cola.\"",
        short: "\"Numbers are more interesting than cola. What is it you do, exactly?\"" },
      { topic: "english", text: "\"My English?\" A small, dry smile. \"I learn it for work — not this " +
          "work. Before, two years in a compound over the border, Cambodia side. 'Call centre,' they " +
          "say. We call the farang, the Australian, the American, all day, very polite — and we take " +
          "their money.\" A shrug. \"Good training. Same job, better costume, now.\"" },
      { topic: "cambodia", text: "\"The compound. A hundred-fifty thousand baht a month I make there, " +
          "commission — more than any girl on this soi.\" Flat, a fact, not a boast. \"Then the border " +
          "go bad — the two countries, the soldiers — they shut it, send everybody home. So here I am, " +
          "dancing. For now.\" The 'for now' has a whole business plan folded inside it." },
      { topic: "money", text: "\"What do I do with money?\" She leans in, and for once it is genuine " +
          "interest. \"Home, my family lend it. Short-time loan — village people need money for the " +
          "school fee, the fertiliser, the funeral. We charge…\" she taps the bar twice \"…ยี่สิบ, " +
          "twenty percent, pay back in a few days. Everybody happy.\" A beat. \"You think the bar owns " +
          "me. The bar RENTS me. Different thing, na.\"" },
      { topic: "loan", text: "\"You want to borrow?\" The smile sharpens by exactly one degree. \"From " +
          "ME — not the family; family rate is for family. For you: twenty percent, pay back in three " +
          "days. But understand one thing: I always, always get paid back. Ask anybody in my village. " +
          "Ask the ones who tried not to.\" (BORROW <amount> here — REPAY here too, early if you're wise.)" },
    ],
  },

  mala: {
    name: "Miss Mala", th: "มาลา", emoji: "🦚",
    room: "peacock_cabaret",
    desc: "The Peacock's compère and its mama both — a kathoey of a certain age and total command, " +
      "in a headdress that arrived by its own truck. Twenty years on this stage; she has watched a " +
      "hundred nervous farang husbands walk in braced and walk out fans.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome, welcome, sit anywhere the light is kind!\" Miss Mala looks you up and down " +
          "with the fond, forensic eye of a customs officer who likes you. \"You are not our usual, " +
          "na — no, don't apologise, we LOVE a tourist. Nobody bites. Not you, anyway, darling. Buy a " +
          "drink, tip a girl, laugh loud. That is the whole religion here.\"",
        short: "\"Not our usual, na? Don't apologise — we love a tourist. Nobody bites. Not YOU, darling.\"" },
      { topic: "show", text: "\"The show?\" She presses a hand to the sequins. \"Sixty minutes, three " +
          "costume changes, one number that will make your straight little heart cry and you will not " +
          "know why. We are not Alcazar, not Tiffany's — we are small, we are Jomtien, we are BETTER, " +
          "because up here she can see your face.\" (WATCH DRAG, and TIP if she moves you.)" },
      { topic: "scene", text: "\"Gay Jomtien, this little L,\" she gestures down the alley, \"is not " +
          "Walking Street and not the tourist ladyboy cabaret either — it is the local scene, the boys " +
          "and the kathoey and whoever wanders in kind. You want the big feathers-and-tourists show, " +
          "that is Pattaya side. You want a real night, you are already in it.\"" },
      { topic: "kathoey", text: "\"You are wondering the word, I can see you wondering.\" A patient, " +
          "generous smile. \"Kathoey — 'ladyboy' the farang say, we don't mind it. Not gay, not quite " +
          "your Western 'trans' either — a third thing, older than both, room for it here in a way your " +
          "country only just now is finding. Thailand made space for us a long time ago. On this stage, " +
          "anyway, I am simply the most beautiful woman you will meet all week.\"" },
      { topic: "tips", text: "\"How the tip works? You fold the note long-ways, you hold it up, she " +
          "comes and takes it in her teeth, or her décolletage, and blesses you — and the whole room " +
          "cheers YOU, not her. Cheapest star turn in Pattaya, forty baht.\" (TIP PETCH <amount>, or TIP MALA.)" },
    ],
  },
  petch: {
    name: "Petch", th: "เพชร", emoji: "💎",
    room: "peacock_cabaret",
    desc: "The Peacock's young star, all cheekbones and ambition, between numbers and still catching " +
      "her breath. She lip-syncs better than the record and knows it, and she is saving for a face " +
      "the big-city stages will fight over.",
    dialogue: [
      { th: "หวัดดีค่า", rom: "wat-dee khaa",
        text: "\"You clapped! I saw you clap, don't pretend.\" Petch drops onto the stool beside you, " +
          "glitter shedding like a friendly weather system. \"Most farang husbands, first time, they " +
          "sit like this—\" she mimes a rigid plank \"—and by my second song, like this—\" she throws " +
          "her arms up, radiant. \"You are already at song two, I can tell.\"",
        short: "\"You clapped, I saw! First-timers sit stiff, then by song two—\" arms up, radiant." },
      { topic: "dream", text: "\"Alcazar. Tiffany's. The big Pattaya stages, thousand seats, tour buses, " +
          "real money.\" Her eyes go somewhere bright. \"I am saving — the dancing they teach you, the " +
          "face they don't. One day a scout sits where you sit now, and I am ready. Until then, I am the " +
          "biggest star in the smallest room, and that is not nothing.\"" },
      { topic: "tips", text: "\"Tip? Ohh you are learning fast.\" She pats your hand. \"Fold it long, " +
          "hold it up, I do the rest and make you look like a hero doing it. Miss Mala takes her cut, " +
          "of course — she takes everybody's cut, she raised half of us — but the cheer is all yours.\" " +
          "(TIP PETCH <amount>.)" },
    ],
  },

  nott: {
    name: "Nott", th: "นนท์", emoji: "🕴️",
    room: "adonis_club",
    desc: "The Adonis Club's papasan — forties, immaculate, a silk shirt open one button past " +
      "advisable and a smile that has closed a thousand deals. He runs his boys like a talent " +
      "agent and reads a room's wallet before its face.",
    dialogue: [
      { th: "สวัสดีครับ", rom: "sawatdee khrap",
        text: "\"Welcome, welcome — sit anywhere.\" Nott spreads his hands over the room like a maître d'. " +
          "\"First time in a host bar? Then let me save you the worry: here it does not matter one baht what " +
          "you are. Gay, straight, bi, curious, married, just hiding from your wife — my boys have met all of " +
          "it and the price is the same for every one. Buy a boy a drink if you like him. Buy nothing and just " +
          "watch, also fine. Up to you, na.\"",
        short: "\"Gay, straight, curious, hiding from the wife — doesn't matter here. Same price for everyone. Up to you.\"" },
      { topic: "prices", text: "\"The list?\" He slides it over, unbothered. \"A host drink is ฿" + HOST_DRINK +
          " — yes, more than the girl bars, twice more, I know. And to take a boy out, the club fee is ฿" +
          HOST_OFF + ", plus whatever the two of you agree between yourselves after.\" A shrug of pure commerce. " +
          "\"We are the premium end. You are not paying for a body, farang — those are cheaper. You are paying " +
          "for one who makes you believe.\" (BUY DRINK FOR <host>, or HIRE <host>.)" },
      { topic: "gayforpay", text: "\"You want the honest version? Good, I like that.\" Nott lowers his voice, " +
          "friendly. \"Most of my boys — most — are what you call gay-for-pay. Straight. Girlfriends up-country, " +
          "some of them babies. They are here because a good-looking man makes double in this soi what he makes " +
          "on a building site, and treats his back better.\" A level look. \"It is a job. They are professionals. " +
          "The ones who are truly gay, like Win, you can count — and they are the ones who slip and fall in love, " +
          "which is the only real danger in my bar.\"" },
      { topic: "scene", text: "\"Host bars are small here, three or four doors, not like Bangkok.\" He gestures " +
          "at the gold walls. \"Our trade is gay farang, a few gay Thai men with money, and — more than you would " +
          "think — women. Thai women, farang ladies on holiday, a hen party feeling brave. Everybody's baht is " +
          "the same colour, na.\"" },
    ],
  },
  arm: {
    name: "Arm", th: "อาร์ม", emoji: "💪",
    room: "adonis_club",
    desc: "Host number 4: broad, easy, a footballer's build and a salesman's warmth. He leans in close " +
      "and makes you feel chosen, which is precisely the product. The tan line of a wedding-adjacent ring " +
      "is on the wrong finger.",
    dialogue: [
      { th: "หวัดดีครับ", rom: "wat-dee khrap",
        text: "\"You look like you need a cold drink and a laugh, my friend.\" Arm drops onto the stool " +
          "beside you, all shoulders and grin, close enough to be flattering and not one inch closer. \"Number " +
          "four. Best number. Nine will tell you HE is the best number — nine is lying.\"",
        short: "\"Number four — best number. Nine will say he is; nine's lying.\"" },
      { topic: "job", text: "\"The work?\" He shrugs the big shoulders. \"Sit, talk, pour, make a man feel like " +
          "the most interesting guy in Jomtien for an hour. Same as the girls do down the road, just — \" he flexes, " +
          "clowning \"— better lighting on the merchandise. Good money. Easy, mostly. The gym is the hard part.\"" },
      { topic: "home", text: "\"Home?\" A flicker — the salesman steps back and a tired 24-year-old shows for " +
          "a second. \"Buriram. I have a girlfriend there, a little girl, two years. They think I do hotel work " +
          "in Pattaya, which — \" a crooked grin \"— is not a lie, exactly. I send money every week. The customers " +
          "here, they know what I am. Gay-for-pay, you say. Nobody lied to anybody. That is more than most of this " +
          "town can promise.\"" },
    ],
  },
  win: {
    name: "Win", th: "วิน", emoji: "✨",
    room: "adonis_club",
    desc: "Host number 9: slighter than Arm, prettier, quieter, with a stillness the loud ones don't have. " +
      "He watches you a beat longer than the job strictly requires, and means a little more of it than he should.",
    dialogue: [
      { th: "หวัดดีครับ", rom: "wat-dee khrap",
        text: "\"Don't listen to Arm about the numbers.\" Win's smile is smaller and lands harder for it. " +
          "\"He's louder. I'm—\" a small shrug \"—the one you remember on the plane home. Different skill.\"",
        short: "\"Arm's louder. I'm the one you remember on the plane home. Different skill.\"" },
      { topic: "job", text: "\"For me it's not pretend, if you want the truth.\" He says it simply, no pitch " +
          "in it. \"Most of the boys here are straight, doing a job — good at it, no shame. Me, I'm gay, so the " +
          "job and the real thing sit very close together, and Nott is always telling me that is dangerous. He's " +
          "right. I fall a little every slow season and it costs me every time.\"" },
      { topic: "dream", text: "\"What I want?\" He turns his glass. \"One farang who comes back for ME, not for " +
          "the row. Who learns which number I am and asks for it by name.\" A rueful tilt. \"Every host wants that " +
          "and every host knows better. We are the ones who sell the feeling and still, idiots, want it ourselves.\"" },
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
    manager: true, // the bar-manager NPC type (see _managerHere/_buyManDrink); NOT in NPC_ROLES, so girl-logic ignores him
    desc: "The Stinky's manager — American, sixty-something, forearms like dock rope, a " +
      "Budweiser that never empties and never seems to get him drunk. Candy's man, and " +
      "once the manager of her bars; now he runs the Stinky for its ailing owner and, " +
      "quietly, works at being his own man out from under her shadow. Twenty-two years " +
      "on Beach Road, most of them within nine feet of that pool table.",
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
      { topic: "dog", req: ["hasDog"],
        text: "Bert looks past you at the dog by the door and sets his Budweiser down " +
        "slow. \"I'll be damned. That's the Shamrock dog, bud. Paddy's dog — the Irish " +
        "place out on Khao Talo, went under in COVID. Paddy caught the one flight home " +
        "and the dog sat that step for a month. Then he went walking.\" He shakes his " +
        "head. \"Four years walking, and of every farang in this town he picked you. " +
        "Do him a right thing: walk him out to the old place and let him see it. Dogs " +
        "need funerals too, in their way.\"",
        short: "\"That's the Shamrock dog — Paddy's. Walk him out to the old place on " +
        "Khao Talo. Dogs need funerals too.\"" },
      { topic: "dog", text: "\"Dogs? Kept one on the rail at Candy's place for years. " +
        "Best doorman I ever had — worked for chicken and never once stole from the " +
        "till.\" He chalks a cue. \"This town's full of good dogs. Feed one sometime, " +
        "see what happens.\"" },
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
      { topic: "candy", text: "A crooked grin. \"Candy? My lady, and my old boss — both, " +
        "which is a hell of a retirement plan. She's got a quiet piece of the Stinky, so " +
        "don't jump if she wanders in some night to eyeball the girls. Twenty years I ran " +
        "her bars. Love her to death. Doesn't mean I want her name over my door forever.\"" },
      { topic: "owner", text: "\"Real owner's a Yank, older than me even, " +
        "and his ticker's packing up — that's why I'm behind this bar and not Candy's. Good " +
        "man. Wanted somebody he trusted keeping the lights on while the doctors do their " +
        "thing. So here I am, bud.\"" },
      { topic: "manager", text: "\"Managing a bar " +
        "out here? Six nights a week, seven in the season, and you drink with every customer " +
        "or you're no damn good at it. Chews a man up in a year, two if he's tough. There's " +
        "always a stool open somewhere for the next poor bastard.\" He lifts the Bud in a " +
        "small, tired salute." },
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
const CLUB_TAXI = 2000;      // the morning-after "taxi money" — the back-loaded club-pickup fee
const GIFT_DEBT = 500;       // the bun-khun a "free" gift calls in on the spot
const GIFT_TIP = 100;        // paying tao-rai up front closes the account clean
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
  clubpickup: {
    // The back-loaded transaction (from a canon essay): you pull a girl on a
    // Walking Street club dancefloor — no bar, no lady drinks, no barfine, feels
    // entirely real — and the invoice arrives the next morning as "taxi money".
    // Two-step: the night (feels free) → the morning ฿2,000 ask, in _ENC.clubpickup.
    rooms: ["ws_south", "ws_north"],
    interactive: true, nightly: true,
    intro: "Coming out of the club, still half-deaf from the bass, you fall into step with a girl who " +
      "was on the dancefloor next to you all night — no bar, no barfine, no lady drinks, just a real " +
      "laugh and a way of listening that undoes you a little. She isn't asking you for anything. She " +
      "just doesn't seem to want the night to end either.",
    hint: "(TAKE HER HOME — it feels like the real thing — or say GOODNIGHT.)",
  },
  freegift: {
    // "Nothing is free" made mechanical: a 'free' blessing that's really a tab.
    // ACCEPT opens a bun-khun the giver calls in on the spot; TAO RAI (pay a small
    // tip up front) closes it clean; REFUSE declines. Resolved in _ENC.freegift.
    rooms: ["promenade", "beach_rd_c", "ws_south"],
    interactive: true, nightly: true,
    intro: "A soft-faced woman with a tray of blessed strings steps into your path, and before you can " +
      "wave her off she has pressed a little gold-threaded amulet into your hand, still warm from her own " +
      "neck. “For you. For luck. No money — we friends, na.” She folds your fingers over it, beaming, and " +
      "does not quite let go.",
    hint: "(ACCEPT it · TAO RAI — ask the price and pay it · REFUSE)",
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
    desc: "Carry Candy's gift bottle of Sang Som to Bee (GIVE SANG SOM TO BEE).",
    deps: [],
    item: "sang_som",
    at: "bee",              // whose/where the next move is — HINT/journal resolve the live location
    doneFlag: "sangsomDelivered",
    reward: { money: 200, happy: 3 },
  },
  league: {
    name: "King of the Killer Table",
    giver: "bert",
    desc: "Win a killer pool league night — every third night, ฿100 entry (PLAY KILLER).",
    deps: [],
    at: "stinky_bar",       // a room id works too, not just an NPC
    doneFlag: "wonLeague",
    reward: { money: 0, happy: 5 },
  },
  bee_number: {
    name: "Bee's First Investor",
    giver: "bee",
    desc: "Bee wants her expansion fund taken seriously: get her number (CONTACT " +
      "BEE) and wire ฿100 through the banking app (SEND 100 TO BEE).",
    deps: ["sangsom"],
    at: "bee",
    doneFlag: "beeBanked",
    reward: { money: 0, happy: 4 },
  },
  // ── The Glam saga: a four-quest chain up the Thappraya strip ──────────────
  // Wimon → Diamond → Glam. Each rung is one flag; the revelations live in the
  // dialogue that sets them (Glam's lucid flashes via the patron `sets` support).
  oldrocker: {
    name: "The Man Out of Time",
    giver: "wimon",
    desc: "Sit with Glam a while and let him tell you about the tour (ASK GLAM ABOUT MUSIC).",
    deps: [],
    at: "cheeky_monkey",
    doneFlag: "glamHeard",
    reward: { money: 0, happy: 2 },
  },
  keys: {
    name: "The Foreman's Keys",
    giver: "wimon",
    desc: "Carry her late husband's site keys to the bar he built, for the shrine " +
      "(GIVE KEYS TO DIAMOND).",
    deps: ["oldrocker"],
    item: "foreman_keys",
    at: "diamond",
    doneFlag: "keysDelivered",
    reward: { money: 0, happy: 4 },
  },
  quietmoney: {
    name: "The Quiet Money",
    giver: "diamond",
    desc: "Nobody asks the Samson brothers where the seed money came from. Ask the man " +
      "out of time instead (ASK GLAM ABOUT HIS SONS).",
    deps: ["keys"],
    at: "cheeky_monkey",
    doneFlag: "glamTruth",
    reward: { money: 0, happy: 3 },
  },
  family: {
    name: "Family",
    giver: "wimon",
    desc: "Wimon thinks you have earned the whole of it, and gives her blessing to ask " +
      "(ASK DIAMOND ABOUT GLAM).",
    deps: ["quietmoney"],
    at: "diamond",
    doneFlag: "diamondTruth",
    reward: { money: 0, happy: 6 },
  },
  // ── Standalone jobs ───────────────────────────────────────────────────────
  recce: {
    name: "Candy's Competition Recce",
    giver: "candy",
    // three targets, so no single at: — the desc carries the geography for once
    desc: "Walk the new drinking strips with your eyes open — Myth Night's container " +
      "rows, Tree Town's far lane, and the beachside row off Beach Road North.",
    deps: [],
    doneFlag: "recceDone",
    reward: { money: 300, happy: 2 },
  },
  scout: {
    name: "A Scout for Petch",
    giver: "mala",
    desc: "Carry the revue flyer to Diamond — she danced with half of Alcazar in her " +
      "day, and her scout friend owes her a favour (GIVE FLYER TO DIAMOND).",
    deps: [],
    item: "revue_flyer",
    at: "diamond",
    doneFlag: "scoutSent",
    reward: { money: 0, happy: 3 },
  },
  debtrun: {
    name: "The Collection Run",
    giver: "nira",
    desc: "฿500 to jog a deadbeat's memory — no rough stuff, just find Fergie in his " +
      "maze and ASK him ABOUT THE DEBT.",
    deps: [],
    at: "gold_rush",
    doneFlag: "fergieReminded",
    reward: { money: 500, happy: 2 },
  },
  shamrock: {
    name: "The Shamrock Dog",
    giver: "bert",
    reqFlags: ["hasDog"], // no dog, no quest — Bert has to recognise him at your heel
    desc: "Bert swears your dog is the old Shamrock bar dog, out on Soi Khao Talo. " +
      "Walk him out to the dead pub and let him see it.",
    deps: [],
    at: "khao_talo_strip",
    doneFlag: "shamrockVisited",
    reward: { money: 0, happy: 6 },
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

  glam: {
    name: "Glam", emoji: "🎸", age: 77, nat: "German",
    home: "cheeky_monkey", hops: false, shuttle: { after: 4, to: "hyper" }, protected: true,
    desc: "Somewhere north of seventy-five and dressed like it's 1983 in a Munich discotheque: a silk " +
      "shirt open one button too far, and a wild halo of sparse blonde hair caught somewhere between " +
      "Einstein and a glam rocker on his third encore. Frail now, and — the whole strip agrees, gently " +
      "— not entirely present. His companion, an older lady-boy who speaks only to the mama, wheels him " +
      "in on a lovingly modified saleng, and most nights has him escorted across to Hyper once the " +
      "music starts.",
    dialogue: [
      { text: "\"Ach — THERE you are.\" Glam seizes your hand in both of his, delighted, entirely " +
        "certain he knows you. \"They told me Cologne, but I said no, no — the acoustics, the — you " +
        "remember the acoustics.\" He leans in, confidential. \"The countess kept the silver. I kept " +
        "the SHIRTS.\" A radiant pause, and whatever thread he was holding is simply gone; he beams at " +
        "your left ear as though it, too, has just arrived from Cologne.",
        short: "\"The countess kept the silver. I kept the SHIRTS.\" He beams at your left ear." },
      { topic: "wife", text: "You ask, carefully, about the lady-boy at his side. Glam turns, sees " +
        "her, and his face floods with an uncomplicated joy that stops the question dead. \"My — yes. " +
        "YES.\" He pats the air near her hand; she does not look up from the mama. \"She drives the — " +
        "the little one, with the wheels. Very fast. We were in Ibiza. Or we will be.\" He nods, " +
        "satisfied that this settles it. It does not settle it." },
      { topic: "music", sets: ["glamHeard"],
        text: "\"You want to hear about the TOUR.\" It is not a question; his eyes go " +
        "bright and forty years younger. \"Wembley. Or — no. A tent. A very large tent, and the " +
        "promoter was a crook, God rest him, and I wore the white one, the SILK—\" He mimes a chord no " +
        "instrument has ever made. \"They still play it. Somewhere. They must.\" For one second he " +
        "seems to know exactly that they don't; then the second passes.",
        short: "\"Wembley. Or a tent. I wore the SILK—\" He mimes the chord no instrument makes." },
      { topic: "son", sets: ["glamTruth"],
        text: "\"My boys?\" And the fog just — parts. For the first time since you sat down, Glam is " +
        "entirely here, and his eyes are old and clear and amused. \"They call every Sunday. So " +
        "polite. 'How are you feeling, Papa?' They are not asking how I am feeling.\" A dry little " +
        "laugh. \"I gave them the bar money — every mark of it, the last of the good years — and they " +
        "think that was the TASTE. They are waiting for the rest, liebchen. The inheritance.\" He " +
        "leans in, delighted, conspiratorial, dying. \"There is no rest. I spent it. On the town, on " +
        "the envelope nobody knows about, on the SHIRTS. A man should go out like a good bottle — " +
        "empty, and having been a party.\" And the fog rolls back in, gently, like a tide.",
        short: "\"They are waiting for the inheritance, liebchen. There is no inheritance. A man " +
        "should go out like a good bottle — empty.\"" },
      { topic: "diamond", text: "\"Diamant...\" His eyes go soft, and for a moment, terribly clear. " +
        "\"You have seen her? The tall one, at the boys' bar. The most finished thing in any room — " +
        "she had that from her mother.\" His hand tightens on yours. \"I steered the boys there, you " +
        "know. Twenty bars on that strip and I walked them past every one.\" And then Cologne takes " +
        "him again, mid-sentence, and he is telling your left ear about the countess." },
      { topic: "girls", text: "You glance at the hostesses; Glam catches it and laughs, a real one. " +
        "\"They understand me,\" he says, and for once it is perfectly clear. \"Perfectly. Every word. " +
        "You—\" a fond, pitying pat on your arm \"—not so much. Don't worry. Nobody good ever made " +
        "sense, hm?\" And he's off again, telling one of the girls something in three languages that " +
        "has her genuinely crying with laughter." },
    ],
  },

  fergie: {
    name: "Fergie", emoji: "🥃", age: 58, nat: "Northern Irish",
    home: "gold_rush", hops: true, haunts: ["Soi Buakhao", "Tree Town"],
    avoids: ["candy_bar", "candy_bar_2", "stinky_bar"], rage: ["bert", "candy", "stinky"],
    desc: "Short, bald, and boiled red — the nose of a man who has met a great deal of liquor and " +
      "won none of the arguments, and two cauliflower ears that agree. Late fifties, Northern Irish, a " +
      "retired tradesman of some sort, though which sort changes with the tide. Guarded stone-cold " +
      "sober, a magnificent liar three drinks in, and — on the nights he's had a smoke as well — a " +
      "nasty piece of work best left entirely alone. Banned from Bert's and Candy's bars, and not " +
      "sorry about it.",
    dialogue: [
      { text: "\"Buy us a wee one and I'll tell you anything you like — and I do mean anything.\" " +
        "Fergie's grin is missing a tooth and gaining a story. \"See these?\" He turns a cauliflowered " +
        "ear. \"Nineteen-eighty... ah, doesn't matter. Different life. I've had a few.\" He has, and " +
        "not one of them agrees with another, and he knows that you know, and it delights him.",
        short: "\"I've had a few lives, son, and none of them agree with each other.\"" },
      { topic: "army", text: "\"Regiment,\" he says, tapping the side of that ruined nose, sloshing " +
        "the glass. \"Two tours nobody's cleared to talk about — don't ask me which sandbox. Came " +
        "home, fitted bathrooms thirty years after. Best cover there is, a plumber. Nobody looks " +
        "twice at a man under a sink.\" He is completely sincere. He was completely sincere last week, " +
        "when he was an English teacher in Shenzhen." },
      { topic: "china", text: "\"China, aye — six years teaching the Queen's English to wee " +
        "millionaires' weans in Shenzhen. Or Guangzhou. One of them.\" A fond, faraway sip. \"Married " +
        "a girl from the school. Or that was the OTHER time — this was before the rigs.\" He frowns " +
        "briefly at the arithmetic of his own past, then abandons it as a bad job." },
      { topic: "belfast", text: "The glass stops halfway. For a second the bar-room bullshitter is " +
        "gone and there's just a hard, tired man off a hard, tired street. \"Belfast,\" he says, and " +
        "nothing else, and the word shuts like a door. Then he blinks and the grin snaps back on like " +
        "a light. \"Ancient history, son. What're you drinking?\"" },
      { topic: "debt", sets: ["fergieReminded"],
        text: "\"Debt? DEBT?\" Fergie's outrage arrives before his memory does. \"I PAID that woman. " +
        "Twice, if you count the—\" he counts nothing. \"And anyway it was never a loan, it was an " +
        "INVESTMENT, we shook on— who did you say sent you?\" You didn't. He deflates by degrees, " +
        "glances round the bar, and lands somewhere almost honest. \"Aye. Right. Tell her — tell her " +
        "Fergie says next week. On my mother's life.\" His mother has died three times this month " +
        "already, but the message will carry.",
        short: "\"Tell her next week. On my mother's life.\" His third dead mother this month." },
    ],
  },

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
  nira: "hostess",
  yai: "mamasan", rose: "mamasan", kesorn: "mamasan", lawan: "mamasan", sumalee: "mamasan",
  diamond: "mamasan", wimon: "mamasan", ampai: "mamasan",
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
  ["Near","เนียร์","metro_garden"], ["Milin","มิลิน","pit_stop"],
  ["Kaew","แก้ว","paradise_nights"], ["Meaw","เหมียว","paradise_nights"],
  ["Nan","แนน","candy_bar"], ["Bua","บัว","candy_bar"],
  ["Fern","เฟิร์น","candy_bar_2"], ["Mai","ใหม่","candy_bar_2"],
  ["Ju","จู","amp_room"], ["Pat","แพท","feedback_bar"], ["Pun","ปั้น","encore_bar"], ["Som","ส้ม","soundcheck_bar"],
  ["Mam","แหม่ม","craft_cargo"], ["Jib","จิ๊บ","the_growler"], ["Toon","ตูน","container_8"], ["Yaya","ยาย่า","reload_bar"],
  ["Ann","แอน","midnight_sun"], ["Nut","นัท","midnight_sun"],
  ["Rung","รุ้ง","lucky_tiger"], ["Oat","โอ๊ต","lucky_tiger"],
  ["Ton","ต้น","silk_rose"], ["Nid","นิด","silk_rose"], ["Wa","หว้า","silk_rose"],
  ["Noon","นุ่น","jasmine_garden"], ["Prae","แพร","jasmine_garden"],
  ["Tan","ตาล","gold_rush"], ["Tik","ติ๊ก","gold_rush"],
  ["Pui","ปุ้ย","starlight_bar"], ["Mild","มายด์","starlight_bar"],
  ["Aump","อั้ม","rabbit_hole"], ["Guitar","กีตาร์","rabbit_hole"],
  ["Namtip","น้ำทิพย์","lucky_charm"], ["Bella","เบลล่า","lucky_charm"],
  ["Prik","พริก","moonshine_bar"], ["Mek","เมฆ","moonshine_bar"],
  ["Namtan","น้ำตาล","khao_talo_bar"], ["Ying","หญิง","khao_talo_bar"],
  ["Kai","ไก่","golden_dragon"], ["Nook","นุ้ก","golden_dragon"], ["Dew","ดิว","golden_dragon"],
  ["Puu","ปู","pink_lotus"], ["Belle","เบล","pink_lotus"],
  ["Kat","แคท","sunset_dreams"], ["May","เมย์","sunset_dreams"], ["Dear","เดียร์","sunset_dreams"],
  ["Praewa","แพรวา","kitten_corner"], ["Nangfah","นางฟ้า","kitten_corner"],
  ["Tabtim","ทับทิม","cherry_pop"], ["Chaba","ชบา","cherry_pop"],
  ["Kluay","กล้วย","ruby_kiss"], ["Benz","เบนซ์","ruby_kiss"],
  ["Lin","หลิน","water_buffalo"], ["Nim","นิ่ม","water_buffalo"],
  ["Duan","เดือน","firefly_bar"], ["Saifon","สายฝน","firefly_bar"],
  ["Wanpen","วันเพ็ญ","mama_yai"],
  ["Pear","แพร์","orchid_club"], ["Jinda","จินดา","orchid_club"],
  ["Namfon","น้ำฝน","anchor_bar"], ["Bunny","บันนี่","dolphin_bar"], ["Jaja","จาจา","mooring_bar"],
  ["Dokmai","ดอกไม้","night_heron"], ["Jampa","จำปา","night_heron"],
  ["Ing","อิง","blue_dog"], ["Khing","ขิง","blue_dog"],
  ["Pukky","ปุ๊กกี้","sunset_rail"], ["Somo","โซโม่","bay_watch"], ["Nina","นีน่า","sandy_toes"],
  ["Bam","บาม","rock_factory"], ["Kwang","กวาง","rock_factory"],
  ["Chompoo","ชมพู่","stinky_bar"], ["Manow","มะนาว","stinky_bar"],
  ["Goong","กุ้ง","honey_trap"], ["Jiab","เจี๊ยบ","honey_trap"],
  ["Meen","มีน","queen_bee"], ["Yok","หยก","queen_bee"],
  ["Namphueng","น้ำผึ้ง","buzz_inn"], ["Gaem","แก้ม","buzz_inn"],
  ["Bum","บุ๋ม","dollhouse"], ["Ohm","โอม","dollhouse"],
  ["Fasai","ฟ้าใส","sapphire"], ["Tarn","ธาร","sapphire"],
  ["Pao","เป้า","sundowner"], ["Poom","ภูมิ","sundowner"],
  ["Bright","ไบรท์","cricketers"], ["Lukkade","ลูกเกด","cricketers"],
  ["Bpom","บอม","lucky7"], ["Proud","พราว","lucky7"],
  ["Namo","นะโม","seabreeze"], ["Somruedee","สมฤดี","seabreeze"],
  ["Ratchada","รัชฎา","coconut"], ["Nittaya","นิตยา","coconut"],
  ["Duang","ดวง","sandbar"], ["Mookda","มุกดา","sandbar"],
  ["Aoi","อ้อย","hyper"], ["Noey","เนย","hyper"],
  ["Gig","กิ๊ก","arrow_bar"], ["Kade","เกด","arrow_bar"],
  ["Pinky","พิงกี้","cheeky_monkey"], ["Mona","โมนา","cheeky_monkey"],
  ["Gina","จีน่า","the_office"], ["Bpaeng","แป้ง","the_office"],
  ["Tim","ทิม","the_boardroom"], ["Min","มิน","the_boardroom"],
  ["Milk","มิ้ลค์","velvet_club"], ["June","จูน","velvet_club"],
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
  jomtien_thai:     [12.8890, 100.8724],
  // Soi 7 (Jomtien Beach Rd → Second Rd) and its Second-Road cluster
  soi_7_w:          [12.8896, 100.8728],
  soi_7_e:          [12.8899, 100.8738],
  jomtien_2nd:      [12.8901, 100.8748],
  soi_rompho:       [12.8905, 100.8756],
  kiss_jomtien:     [12.8911, 100.8756],
  lucky7:           [12.8899, 100.8726],
  seabreeze:        [12.8892, 100.8730],
  coconut:          [12.8903, 100.8736],
  sandbar:          [12.8896, 100.8741],
  soi7_oil:         [12.8890, 100.8726],
  soi7_thai:        [12.8905, 100.8739],
  // Thappraya Road / Jomtien Main Strip (Dongtan → Second Rd)
  thappraya_w:      [12.8968, 100.8668],
  thappraya_mid:    [12.8972, 100.8685],
  thappraya_e:      [12.8975, 100.8702],
  supertown_alley:  [12.8978, 100.8688],
  supertown_elbow:  [12.8982, 100.8698],
  peacock_cabaret:  [12.8983, 100.8700],
  adonis_club:      [12.8977, 100.8686],
  arrow_bar:        [12.8971, 100.8666],
  the_boardroom:    [12.8965, 100.8670],
  beach_turn_massage:[12.8964, 100.8664],
  cheeky_monkey:    [12.8975, 100.8683],
  hyper:            [12.8969, 100.8687],
  velvet_club:      [12.8970, 100.8690],
  take_care_me:     [12.8978, 100.8700],
  the_office:       [12.8972, 100.8704],
  thappraya_massage:[12.8973, 100.8706],
  jomtien_7eleven:  [12.8880, 100.8724],
  jomtien_bus_stop: [12.8940, 100.8710],
  // Pratumnak
  pratumnak_rd:     [12.9105, 100.8690],
  buddha_hill:      [12.9142, 100.8618],
  // Walking Street (the gate is the north end; "ws_north" is the DEEP end)
  ws_gate:          [12.9268, 100.8703],
  thai_massage:     [12.9266, 100.8710],
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
  papaya_massage:   [12.9290, 100.8712],
  beachthai_massage:[12.9288, 100.8710],
  short_time_motel: [12.9293, 100.8705],
  beach_rd_c:       [12.9348, 100.8744],
  beachrd_oil:      [12.9352, 100.8748],
  tequila_queen:    [12.9338, 100.8740],
  promenade:        [12.9357, 100.8737],
  central_mall:     [12.9352, 100.8768],
  police_station:   [12.9330, 100.8757],
  beach_rd_n:       [12.9425, 100.8827],
  blue_dog:         [12.9426, 100.8819],
  stinky_bar:       [12.9428, 100.8821],
  beach_row:        [12.9426, 100.8817],
  sunset_rail:      [12.9427, 100.8815],
  bay_watch:        [12.9424, 100.8814],
  sandy_toes:       [12.9428, 100.8816],
  // Soi 6 (Soi Yodsak)
  soi6_street:      [12.9448, 100.8858],
  pink_lotus:       [12.9452, 100.8857],
  golden_dragon:    [12.9447, 100.8866],
  sunset_dreams:    [12.9445, 100.8860],
  queen_vic:        [12.9449, 100.8872],
  qv_room:          [12.9449, 100.8872],
  soi6_deep:        [12.9448, 100.8866],
  kitten_corner:    [12.9450, 100.8867],
  cherry_pop:       [12.9446, 100.8865],
  ruby_kiss:        [12.9451, 100.8869],
  // Naklua
  naklua_rd:        [12.9530, 100.8885],
  orchid_club:      [12.9524, 100.8876],
  hotel_soi:        [12.9565, 100.8898],
  hotel_room:       [12.9567, 100.8900],
  naklua_bars:      [12.9528, 100.8890],
  anchor_bar:       [12.9527, 100.8892],
  dolphin_bar:      [12.9530, 100.8891],
  mooring_bar:      [12.9525, 100.8892],
  naklua_massage:   [12.9533, 100.8882],
  naklua_thai:      [12.9535, 100.8880],
  lotus_oil:        [12.9531, 100.8879],
  emperor_soapy:    [12.9536, 100.8883],
  // Second Road
  second_rd_s:      [12.9268, 100.8768],
  second_thai:      [12.9272, 100.8774],
  second_rd_c:      [12.9330, 100.8795],
  second_rd_n:      [12.9345, 100.8805],
  smile_massage:    [12.9346, 100.8799],
  poseidon_soapy:   [12.9347, 100.8812],
  pattaya_klang:    [12.9362, 100.8815],
  // Myth Night
  myth_night:       [12.9322, 100.8822],
  candy_bar_2:      [12.9324, 100.8824],
  myth_stage:       [12.9326, 100.8823],
  amp_room:         [12.9327, 100.8821],
  feedback_bar:     [12.9328, 100.8824],
  encore_bar:       [12.9325, 100.8820],
  soundcheck_bar:   [12.9329, 100.8823],
  myth_rows:        [12.9318, 100.8821],
  craft_cargo:      [12.9317, 100.8819],
  the_growler:      [12.9316, 100.8823],
  container_8:      [12.9319, 100.8818],
  reload_bar:       [12.9315, 100.8822],
  // Soi Buakhao
  buakhao_n:        [12.9315, 100.8848],
  metropole_room:   [12.9308, 100.8853],
  rock_factory:     [12.9318, 100.8845],
  lucky_tiger:      [12.9312, 100.8852],
  buakhao_market:   [12.9262, 100.8820],
  candy_bar:        [12.9264, 100.8814],
  silk_rose:        [12.9260, 100.8826],
  buakhao_oil:      [12.9260, 100.8832],
  buakhao_s:        [12.9218, 100.8795],
  jasmine_garden:   [12.9214, 100.8797],
  // Soi Honey (Soi 11, between Second Rd and Buakhao)
  soi_honey_w:      [12.9255, 100.8778],
  soi_honey_e:      [12.9238, 100.8786],
  honey_soapy:      [12.9250, 100.8780],
  honey_trap:       [12.9260, 100.8776],
  queen_bee:        [12.9242, 100.8790],
  buzz_inn:         [12.9232, 100.8784],
  // Soi Diana (the big go-go soi; Second Rd ↔ Buakhao, past LK Metro)
  diana_w:          [12.9325, 100.8805],
  diana_mid:        [12.9320, 100.8822],
  diana_e:          [12.9316, 100.8840],
  kiss:             [12.9322, 100.8802],
  dollhouse:        [12.9328, 100.8806],
  sapphire:         [12.9323, 100.8823],
  sundowner:        [12.9317, 100.8821],
  cricketers:       [12.9319, 100.8842],
  areca_room:       [12.9312, 100.8840],
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
  tt_lane_3:        [12.9326, 100.8863],
  rabbit_hole:      [12.9325, 100.8861],
  lucky_charm:      [12.9324, 100.8864],
  moonshine_bar:    [12.9327, 100.8862],
  // LK Metro (the L-shaped soi off Buakhao)
  lk_entrance:      [12.9297, 100.8845],
  lk_main:          [12.9298, 100.8852],
  kinky:            [12.9300, 100.8851],
  slutty:           [12.9296, 100.8853],
  lk_bend:          [12.9300, 100.8858],
  las_vegas:        [12.9298, 100.8860],
  lk_sports:        [12.9297, 100.8853],
  metro_garden:     [12.9302, 100.8858],
  pit_stop:         [12.9301, 100.8861],
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
