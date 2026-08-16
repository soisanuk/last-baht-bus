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
const CORD_PRICE = 20;   // black nylon off a 7-Eleven counter; what an amulet hangs on
const TAXI_DEBT = 12000; // what Nira is owed in the cousin's name — see QUESTS.taxi_debt
const BAND_ROUND = 400;  // buying the band a round (≈ bell to the mama; girls prefer the real bell)
const WINGMAN_TURNS = 15;// how long a friendly wing-woman's good word lasts
const CHARGER_PRICE = 59;
const SAFE_CASH = 3000;  // the emergency stash in the hotel room safe
const WALLET_CASH = 500; // what's left in the recovered wallet — TWO recovery paths
                         // (Oy hands it back in _deliver; you crack the safe in _doSafe),
                         // each printing the number, so it must be one constant
const SOI6_POCKET = 1000, SOI6_BANK = 100000; // the challenge week's stake — _soi6Setup
                         // sets them, _soi6Opening and index.html quote them
const EXPAT_SAVINGS = 20000; // wired over when you make the move

// ── Buying the Stinky: the old man carries the paper ────────────────────────
// The player cannot buy a bar. Pocket + bank tops out at ฿120,000 and an
// established Soi 6 beer bar with a lease, fittings and ten years of goodwill
// is seven figures. So the sale is SELLER-FINANCED, which is what Bert's line
// already implies — "he'll take a regular over a company… he'll lose money on
// you, and he knows that too. For the lights staying on the way they are."
// White Dish offers cash up front; you offer a promise over six years. He takes
// the promise, because a company would gut the place in a season.
//
// BAR_DEPOSIT is deliberately the player's entire plausible ceiling: it empties
// you, and leaves nothing for the first month's supply. The monthly is owed to
// a dying man in Ohio whether or not it rains, which is what makes low season
// bite instead of merely being mentioned.
const BAR_PRICE    = 1800000;  // the headline, mostly for the prose
const BAR_DEPOSIT  = 120000;   // everything you have
const BAR_MONTHLY  = 25000;    // to the old man, every 30 days, for six years
const BAR_TERM     = 72;       // months

// Nightly trade. Tuned so a well-run bar clears the monthly and a badly-run one
// doesn't — the margin is thin ON PURPOSE, because that's the whole point of
// the procurement decision.
const BAR_TAKINGS  = 3200;     // base take on an ordinary night
const BAR_SWING    = 2800;     // …plus up to this, on the night's luck
const BAR_COSTS    = 3000;     // wages, supply, rent, the lot
const BAR_PRESENT  = 800;      // you behind your own rail sells drinks
const BAR_FRICTION = 0.08;     // each refused procurement job adds this to costs
const LOW_SEASON   = 0.55;     // takings multiplier when the town empties

// ── The presence dilemma ────────────────────────────────────────────────────
// The bar's real job is not to be a business game next to the night game. It's
// to put a PRICE on the night — the thing the player actually came for. Every
// evening is the same question: stand behind your own rail, or go out and have
// the night you moved here for. Both are real, neither is sustainable, and that
// tension is the whole design.
//
// Working pays properly and steadies the staff, but the night out is where
// สนุก, the encounters and the relationships live — and the hedonic treadmill
// means a player who only ever works stops gaining happiness at all. A player
// who never works watches the takings drift and the girls quietly leave.
const WORK_TAKINGS = 1.35;     // your own rail, your own room
const AWAY_TAKINGS = 0.72;     // Bert is good, but Bert is not the owner
const WORK_SANUK   = 2;        // the satisfaction of a night's decent trade
const WORK_DRIFT   = 6;        // nights away in a row before the staff feel it
// The ATM: draw pocket cash from your account (G.bank) at any `atm:true` room.
const ATM_FEE = 300;         // foreign-card fee per withdrawal (charged to the account)
const ATM_DAILY_CAP = 20000; // most you can pull in a day (principal, fees don't count)
const ATM_DENOMS = [1000, 5000, 10000];
// The Soi 6 challenge mode confines movement to this pocket of the map.
const SOI6_ROOMS = new Set([
  "qv_room", "queen_vic", "soi6_street", "soi6_mid", "soi6_deep",
  "pink_lotus", "orchid_room", "golden_dragon", "sunset_dreams", "kitten_corner", "cherry_pop", "ruby_kiss",
  "beach_rd_n", "stinky_bar", "blue_dog", "sunset_rail", "bay_watch", "sandy_toes",
  "north_beach",
]);
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
    name: "Jomtien Beach (South)",
    region: "Jomtien",
    desc: "Soft sand, folded-up loungers, and the last smear of sunset dying over the sea. " +
      "Two gray-and-white soi cats hold down the end of a lounger, the big one sitting slightly " +
      "in front of the small one, both watching the water. The beach road glows to the east; the " +
      "sand runs north up the shore and narrows south toward the Soi 7 end, where a drinks cart " +
      "is parked. Your face was in this sand until about a minute ago.",
    revisit: [
      "The cats have not moved. The big one checks you, decides, and looks back at the water.",
      "Somebody's flip-flops sit neatly by a lounger, ownership unclear, hours old.",
      "The last of the light has gone out of the sea. The loungers stay folded.",
      "Sand still warm through your soles. It will not be for much longer.",
      "A dog trots the tide line with somewhere to be, and does not look up.",
    ],
    exits: { e: "jomtien_beach_rd_s", n: "jomtien_beach_m", s: "jomtien_soi_7_beach_end" },
  },
  jomtien_beach_m: {
    name: "Jomtien Beach (North)",
    region: "Jomtien",
    desc: "The north end of Jomtien Beach: raked sand, stacked loungers under folded umbrellas, " +
      "the surf hissing to the west and the beach road's bus stop lit up to the east. The sand " +
      "runs south back toward the Soi 7 end and north to where Dongtan's quieter stretch begins.",
    revisit: [
      "Raked sand, stacked umbrellas, and the bus stop glowing away to the east.",
      "The surf arrives, considers the raked sand, and takes a little of it back.",
      "Somebody is swimming out there in the dark, which seems ambitious.",
      "The lounger stacks throw long shadows the length of the beach.",
      "Quiet up this end. The noise is all behind you and to the south.",
    ],
    exits: { s: "jomtien_beach", n: "dongtan_beach", e: "jomtien_beach_rd" },
  },
  jomtien_soi_7_beach_end: {
    name: "Jomtien Soi 7 Beach End",
    region: "Jomtien",
    desc: "Where Soi 7 finally gives out onto the sand: a scrap of hard-packed beach, a couple of " +
      "upturned boats, and Auntie Nok's drinks cart parked in the lee of a sea almond tree, cooler " +
      "humming. The beach opens north; Soi 7 runs back inland to the east.",
    revisit: [
      "Auntie Nok's cooler hums. The upturned boats have not moved in years.",
      "Hard-packed sand underfoot, and the sea almond dropping something onto the cart roof.",
      "The soi's fairy lights end exactly where the sand starts, as if agreed.",
      "Nok looks up, clocks that you are not buying, and goes back to her phone.",
    ],
    exits: { n: "jomtien_beach", e: "jomtien_soi_7_m", s: "jomtien_beach_s1" },
  },
  dongtan_beach: {
    name: "Dongtan Beach (Jomtien End)",
    region: "Jomtien",
    dark: true,
    desc: "The quieter stretch north of Jomtien proper — by day rainbow flags and beach " +
      "chairs, the gay end of the sand; right now it's shapes and shadows and the hiss of " +
      "surf. This is where the two beaches meet: south the sand runs back down to Jomtien, north " +
      "it carries on up the darker Dongtan shore. Inland to the east the beach road reaches its " +
      "north end, where it bends into the neon of the Thappraya Main Strip.",
    revisit: [
      "Shapes and shadows and the surf. By day this is all rainbow flags; by now it is sand.",
      "The join between two beaches, and in the dark you cannot tell where it happens.",
      "Somebody's beach chair, left out, filling slowly with wind-blown sand.",
      "The Jomtien lights stop somewhere behind you. Ahead there is just more dark.",
    ],
    exits: { s: "jomtien_beach_m", e: "jomtien_beach_rd_n", n: "dongtan_beach_s" },
  },
  jomtien_beach_rd: {
    name: "Jomtien Beach Road (Baht Bus Stop)",
    region: "Jomtien",
    busStop: "jomtien",
    motosai: true,
    desc: "The middle of the beach road and the heart of it: a knot of people waiting where the " +
      "blue songthaews swing around, a sun-bleached sign listing the loop into Pattaya, a lone " +
      "motosai driver dozing on his bike. Streetlights, seafood smoke, the sea just west across " +
      "the sand. The beach road runs north toward the Thappraya climb and south past the 7-Eleven " +
      "toward the mouth of Soi 7.",
    exits: { w: "jomtien_beach_m", n: "jomtien_beach_rd_n", s: "jomtien_beach_rd_s" },
    venues: ["jomtien_thai"],
  },
  jomtien_beach_rd_s: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Jomtien Beach Road (South)",
    region: "Jomtien",
    desc: "The south end of the beach road, where it meets the mouth of Soi 7. A 7-Eleven glows on " +
      "the corner, its air-con bleeding into the street; Soi 7's beer bars and massage shops run " +
      "inland to the east, the bus stop is back to the north, and the sand and the sea lie west.",
    exits: { n: "jomtien_beach_rd", e: "jomtien_soi_7_w", w: "jomtien_beach" },
    venues: ["jomtien_7eleven"],
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
    exits: { out: "jomtien_2nd" },
  },

  // ── Soi 7 (Jomtien) — runs inland from Jomtien Beach Road to Second Road ──
  jomtien_soi_7_w: {
    name: "Jomtien Soi 7 (West / beach end)",
    region: "Jomtien",
    desc: "The beach end of Soi 7, off the south end of the beach road: a mellow strip of " +
      "open-front beer bars strung with fairy lights, a couple of massage shops, and the easy " +
      "Jomtien pace — older expats, cold beer, nobody in a hurry. The soi runs east, deeper inland " +
      "toward Second Road; the sea breeze follows you a little way in.",
    exits: { w: "jomtien_beach_rd_s", e: "jomtien_soi_7_m" },
    venues: ["lucky7", "seabreeze", "jomtien_soi_7_oil"],
  },
  jomtien_soi_7_m: {
    name: "Jomtien Soi 7 (Middle)",
    region: "Jomtien",
    desc: "The middle of Soi 7, where the beer bars thin to guesthouses and a lone som tam cart " +
      "doing quiet business. CHEAP CHARLIE'S has the corner unit — the Jomtien branch, and the " +
      "newer regulars swear by it. The soi runs west toward the sea and the beach road, and east " +
      "toward the Second Road roar.",
    venues: ["cheap_charlies_jt"],
    exits: { w: "jomtien_soi_7_w", e: "jomtien_soi_7_e", s: "jomtien_soi_7_beach_end" },
  },
  cheap_charlies_jt: {
    name: "Cheap Charlie's (Jomtien)",
    bar: "Cheap Charlie's (Jomtien)",
    region: "Jomtien",
    food: true,
    desc: "The second one, and the newer regulars swear it is better — more room, a " +
      "fan that works, and a woman on the wok who does not stop from six until the " +
      "rice runs out. The board is the same board. The prices are the same prices. " +
      "The Buakhao lot will tell you it is not the same, and mean it.",
    reads: {
      board: "The board is the same board — same fourteen dishes, same decade-old photos, " +
        "same chalk line underneath. They photocopied the menu when they opened this " +
        "branch, and the Buakhao lot have never forgiven the photocopier.",
    },
    exits: { out: "jomtien_soi_7_m" },
  },
  jomtien_soi_7_e: {
    name: "Jomtien Soi 7 (East / Second Road end)",
    region: "Jomtien",
    desc: "The far end of Soi 7, where it spills onto Second Road by a 7-Eleven. A couple more " +
      "beer bars and a massage shop see out the strip. On the south side, set back behind a fence " +
      "and a flagpole, squats the grey bulk of the Chonburi Immigration Office — dark and locked " +
      "at this hour, a place farang only ever visit in daylight and never fondly.",
    exits: { w: "jomtien_soi_7_m", e: "jomtien_2nd" },
    venues: ["coconut", "sandbar", "jomtien_soi_7_thai"],
  },
  jomtien_2nd: {
    name: "Jomtien Second Road (South)",
    region: "Jomtien",
    seven: true,
    desc: "The Soi 7 corner on Jomtien's Second Road, traffic hissing both ways. A 7-Eleven holds " +
      "down the corner, bright as an operating theatre. Straight across the road sprawls Rompho " +
      "Market. Soi 7 runs back west toward the beach; Second Road runs north up the strip.",
    exits: { w: "jomtien_soi_7_e", n: "jomtien_2nd_m" },
    venues: ["soi_rompho"],
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
      "(BUY FOOD / EAT · READ MENU.)",
    reads: {
      menu: "The same laminated mile of a menu as the Diana original — Thai down one side, farang " +
        "comfort down the other, the 24-hour full English, the fried-egg 'HANGOVER CURE', the " +
        "legendary Item 47 ('BIG BEER'). Someone has biro'd a smiley beside the pad kaprao. " +
        "Jomtien portions, the regulars swear, run a shade larger.",
    },
    exits: { out: "jomtien_2nd_m" },
  },
  jomtien_2nd_n: {
    name: "Jomtien Second Road (North)",
    region: "Jomtien",
    desc: "The top of Jomtien's Second Road, where it meets the Thappraya Main Strip climbing up " +
      "to the east. Shuttered day-shops, a late khanom cart, the traffic thinning. TAKE CARE ME " +
      "throws a guitar solo down the pavement from the junction; Second Road runs back south down " +
      "the strip.",
    exits: { s: "jomtien_2nd_m", n: "thappraya_e" },
    venues: ["take_care_me"],
  },
  jomtien_2nd_m: {
    name: "Jomtien Second Road (Middle)",
    region: "Jomtien",
    desc: "The middle of Second Road: a 24-hour pharmacy, a laundry, a scatter of plastic-stool " +
      "eateries, and the Jomtien branch of KISS glowing on the east side. The strip runs north to " +
      "the Thappraya junction and south to the Soi 7 corner.",
    exits: { n: "jomtien_2nd_n", s: "jomtien_2nd" },
    venues: ["kiss_jomtien"],
  },
  lucky7: {
    name: "Lucky 7 Bar",
    bar: "Lucky 7 Bar", barType: "beer",
    region: "Jomtien",
    desc: "The soi's namesake: a friendly open-front beer bar with sevens painted on everything, " +
      "a Connect 4 frame, and a knot of regulars who've been coming since before the fairy lights. " +
      "The girls know every one of them by their drink.",
    exits: { out: "jomtien_soi_7_w" },
  },
  seabreeze: {
    name: "Sea Breeze Bar",
    bar: "Sea Breeze Bar", barType: "beer",
    region: "Jomtien",
    desc: "Stools that catch the wind straight off the beach, a battered guitar somebody strums " +
      "between customers, and the most relaxed hostesses in Jomtien. Nobody hard-sells here; the " +
      "beer is cold and the evening goes where it goes.",
    reads: {
      guitar: "The house guitar — sun-faded, sand in the soundhole, tuned to something " +
        "approximate and strummed between customers by whoever's nearest. It has three songs " +
        "in it and the sea takes the blame for the rest.",
    },
    exits: { out: "jomtien_soi_7_w" },
  },
  coconut: {
    name: "Coconut Bar",
    bar: "Coconut Bar", barType: "beer",
    region: "Jomtien",
    desc: "Thatch over the bar, coconut shells for ashtrays, and a blender that hasn't stopped " +
      "since 2016. A little louder than its neighbours, a little younger — the closest Soi 7 gets " +
      "to a party, which is not very, which is the point.",
    reads: {
      blender: "The blender is the bar's engine and sounds like it — a workhorse with a " +
        "cracked jug and a motor that has outlived three owners' plans to replace it. It has " +
        "not stopped since 2016. Nobody remembers switching it on.",
    },
    exits: { out: "jomtien_soi_7_e" },
  },
  sandbar: {
    name: "The Sandbar",
    bar: "The Sandbar", barType: "beer", darts: true,
    region: "Jomtien",
    desc: "Last bar before Second Road: a narrow slot with sand actually underfoot, a dartboard, " +
      "and a cat that outranks everyone. The end-of-the-soi place, where a slow night winds all the " +
      "way down and the last customers put the stools up themselves.",
    exits: { out: "jomtien_soi_7_e" },
  },
  jomtien_soi_7_oil: {
    name: "Sunset Oil Massage",
    bar: "Sunset Oil Massage",
    region: "Jomtien",
    massage: "oil",
    desc: "A pink-lit oil shop halfway down Soi 7, girls on the step, the small sticker on the " +
      "mirror, and the beach breeze doing its best to keep it wholesome. It fails, pleasantly.",
    exits: { out: "jomtien_soi_7_w" },
  },
  jomtien_soi_7_thai: {
    name: "Jomtien Soi 7 Thai Massage",
    bar: "Soi 7 Thai Massage",
    region: "Jomtien",
    massage: "legit",
    desc: "A proper traditional shop near the Second Road end: foot chairs, tiger balm, aunties in " +
      "matching polos, and a price list that stops at 'oil, one hour.' Where the long-stay expats " +
      "come to get their backs put right.",
    exits: { out: "jomtien_soi_7_e" },
  },

  // ── Thappraya Road (the Jomtien "Main Strip") — Dongtan Beach ↔ Second Road ──
  thappraya_w: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Rd — Main Strip (west)",
    region: "Thappraya",
    seven: true,
    desc: "Where the beach road turns inland and becomes the Main Strip of Jomtien: neon, barkers, " +
      "and the warm churn of the night starting up. A 7-Eleven holds the north corner where the road " +
      "bends east. A couple of doors down, ARROW BAR's sign buzzes; across the way a discreet " +
      "gentleman's club keeps its door shut and its aircon cold. The strip runs east.",
    exits: { e: "thappraya_mid", w: "jomtien_beach_rd_n" },
    venues: ["arrow_bar", "the_boardroom", "beach_turn_massage"],
  },
  thappraya_mid: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Rd — Main Strip (middle)",
    region: "Thappraya",
    desc: "The thick of the strip: beer bars and their fairy lights, and on the south side HYPER " +
      "A-GO-GO throwing chrome light across the road — run-down for years until the Samson brothers " +
      "gutted and remade it. On the north side a narrow L-shaped alley cuts away toward Second Road: " +
      "the SUPERTOWN complex, Jomtien's gay quarter, its drag-show lights flickering somewhere " +
      "around the elbow.",
    exits: { w: "thappraya_w", e: "thappraya_e", n: "supertown_alley" },
    venues: ["hyper", "cheeky_monkey", "velvet_club"],
  },
  thappraya_e: { motosai: true,
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Rd — Main Strip (Second Road end)",
    region: "Thappraya",
    seven: true,
    desc: "The far end of the strip, spilling onto Second Road. TAKE CARE ME, a live-music rock pub, " +
      "throws a guitar solo out its open front — the freelancers' favourite, and loud about it. " +
      "Another 7-Eleven glows across the intersection. One last beer bar and a massage shop see out " +
      "the strip before the traffic of Second Road takes over.",
    exits: { w: "thappraya_mid", e: "jomtien_2nd_n", n: "thappraya_ext_s",
             up: "thappraya_ext_s" },
    venues: ["take_care_me", "the_office", "thappraya_massage"],
  },
  supertown_alley: {
    name: "Supertown Complex (alley)",
    region: "Thappraya",
    desc: "The mouth of the Supertown alley — Jomtien's gay bar complex, an L-bend of half-lit " +
      "venues running back toward Second Road. Rainbow bunting, a poster for a drag revue, and a " +
      "security guy on a stool who nods you in, easy. One door glows an unhurried gold: THE ADONIS " +
      "CLUB, a host bar, a numbered row of oiled young men behind the glass instead of girls. The " +
      "drag stage is deeper in, at the elbow.",
    exits: { s: "thappraya_mid", e: "supertown_elbow" },
    venues: ["adonis_club"],
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
  supertown_elbow: { motosai: true,
    name: "Supertown Complex (the elbow)",
    region: "Thappraya",
    desc: "The elbow of the L, where the alley turns and the drag bars cluster — the stage end. One " +
      "venue is alive tonight: THE PEACOCK CABARET, its mirrored sign lit and pulsing, a queue of " +
      "boys and a scatter of curious farang filing in under a poster of a sequinned goddess mid-lip-sync. " +
      "The bass thumps through the wall. The alley carries on east and out onto the foot of the Thappraya " +
      "hill road, where the strip's neon finally gives out.",
    exits: { w: "supertown_alley", n: "thappraya_ext_s" },
    venues: ["peacock_cabaret"],
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
    reads: {
      bullseye: "The bullseye is painted dead centre over the counter, rings slightly off " +
        "true, and it isn't decoration — it's a thesis. The girls here did the maths on " +
        "where the foot traffic enters the soi, and the paint says so: this is the target, " +
        "you walked into it, and everyone is very pleased to see you.",
    },
    revisit: [
      "Back into Arrow Bar — the bullseye over the counter, the Connect 4 frame, the hostesses who read foot traffic for a living.",
      "The first bar on the soi takes you back. Plenty of punters never get past it; tonight, again, neither did you.",
      "You drop back onto a stool under the painted bullseye. The girls here did the maths on where the money walks in — and it walks in here.",
      "Arrow Bar again: bright, open, and stationed exactly where the soi spills its traffic.",
    ],
    exits: { out: "thappraya_w" },
  },
  cheeky_monkey: {
    name: "Cheeky Monkey Bar",
    bar: "Cheeky Monkey Bar", barType: "beer",
    region: "Thappraya",
    desc: "A Samson-brothers house, mid-strip: cartoon monkeys over the bar, cold towers of Chang, and " +
      "a crew of hostesses who run it at a permanent gentle party. Same owners as half the strip, and " +
      "it shows in the fresh paint and the working aircon.",
    revisit: [
      "Back into the Cheeky Monkey — cartoon monkeys over the bar, cold towers of Chang, the permanent gentle party never quite ending.",
      "The Samson house takes you back: fresh paint, working aircon, and a crew of hostesses running it at an easy simmer.",
      "You slide back into the party that was already going. Nobody here started it and nobody's going to stop it.",
      "Cheeky Monkey again — monkeys, Chang towers, and the mid-strip hum of a bar that's always this glad to see you.",
    ],
    exits: { out: "thappraya_mid" },
  },
  the_office: {
    name: "The Office Bar",
    bar: "The Office Bar", barType: "beer", darts: true,
    region: "Thappraya",
    desc: "A Samson house at the Second Road end of the strip — the joke's on the sign, so a man can " +
      "honestly say he's 'at the office.' Dartboard, a telly showing football nobody watches, and the " +
      "easy end-of-strip pace before Second Road takes over. (PLAY DARTS.)",
    revisit: [
      "Back into The Office — dartboard, a telly playing football nobody watches, and the easy end-of-strip pace.",
      "The Samsons' other beer bar takes you back, and a man can still honestly say he's at the office.",
      "You settle back in at the far end of the strip, where the noise thins and the Chang stays cold.",
      "The Office again: the joke on the sign, the darts, the football on to nobody, the unhurried end of the soi.",
    ],
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
    revisit: [
      "Back into Hyper's cold roar — mirrors, chrome, bass in your sternum, the numbered stage doing its slow turn.",
      "Hyper again: the aircon fog, the fresh chrome the Samsons paid for, dancers under lights worth more than the building was.",
      "The go-go swallows you back into its fog and thump. The room doesn't notice you return; the stage keeps turning.",
      "You push back through into the chrome and the cold and the wall of bass. Somewhere a number changes on the stage.",
    ],
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
    revisit: [
      "Back through the shut door into the Boardroom — cold, gold, low-lit, the strip's noise dying the moment it sighs closed behind you.",
      "The gentleman's club folds you back into its hush: deep leather, curtains that draw, ladies already crossing the floor.",
      "You step back into the quiet money. Discretion here has a price, and the barfine reflects it; nobody mentions either.",
      "The Boardroom again — the door closes, the strip vanishes, and the room lowers its voice to meet yours.",
    ],
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
    revisit: [
      "Back into the Velvet Club — velvet, brass, a whisper of a sound system, and the strip a distant rumour.",
      "The room settles cold and close around you again. Nobody chases here; you buy a drink and the rest arrives on its own.",
      "You slip back behind the curtain-quiet. The Velvet is run cold and expensive on purpose, and the purpose is working.",
      "Velvet Club again — brass, hush, and a hostess already drifting to the stool beside yours.",
    ],
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
    exits: { out: "jomtien_beach_rd_s" },
  },
  jomtien_beach_rd_n: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Jomtien Beach Road (North)",
    region: "Jomtien",
    desc: "The north end of the beach road, quieter and darker, the sea sighing away to the west. " +
      "Here it bends east into the neon of the Thappraya Main Strip; a hill road runs on north " +
      "into the dark toward Pratumnak and, eventually, Pattaya. The bus stop and the Jomtien " +
      "lights are back to the south, the Dongtan sand off to the west.",
    exits: { s: "jomtien_beach_rd", n: "dongtan_rd_s", e: "thappraya_w", w: "dongtan_beach" },
  },

  // ─── Pratumnak Hill ───
  pratumnak_rd: { motosai: true,
    name: "Pratumnak Hill Road (to Pattaya)",
    region: "Pratumnak",
    dark: true,
    desc: "The main hill road between Jomtien and Pattaya proper — condos behind walls, " +
      "sleeping soi dogs, and long stretches where the streetlights have given up. " +
      "The Buddha Hill viewpoint is up a path to the west; Walking Street is on north.",
    exits: { n: "second_rd_india", w: "buddha_hill",
             soi5: "pratumnak_hill_rd", pier: "bali_hai" },
  },

  // ── Pratumnak north extension: the loop over the hill ────────────────────────
  // Two roads climb north off the Jomtien rectangle — Dongtan Beach Road (west,
  // along the sand) and the Thappraya extension (east) — joined across the top by
  // Pratumnak Hill Road, so the whole hill walks as a loop back to the strip.
  // (Separate from pratumnak_rd above, the main road on to Walking Street.)
  thappraya_ext_s: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Road — Hill (lower)",
    region: "Pratumnak",
    desc: "Where the Main Strip's neon finally gives out and the road tips upward: the last few " +
      "late-night noodle carts, then condo walls and the hill proper. The strip is back down to " +
      "the south; the mouth of the Supertown drag alley opens to the west; the road climbs on north.",
    exits: { down: "thappraya_e", n: "thappraya_ext_m", s: "supertown_elbow" },
  },
  thappraya_ext_m: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Road — Hill (middle)",
    region: "Pratumnak",
    dark: true,
    desc: "Mid-climb on the eastern shoulder of Pratumnak: gated condos, a sleeping soi dog or " +
      "three, the streetlights getting shy. The lights of Jomtien spread out below to the south.",
    exits: { s: "thappraya_ext_s", n: "thappraya_ext_n" },
  },
  thappraya_ext_n: {
    busStop: "jomtien", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Thappraya Road — Hilltop",
    region: "Pratumnak",
    dark: true,
    desc: "The top of the eastern climb, where the road levels and Pratumnak Hill Road cuts away " +
      "west across the crest toward the Dongtan side. Quiet, dark, and a long way from a lady drink.",
    exits: { s: "thappraya_ext_m", w: "pratumnak_hill_rd" },
  },
  pratumnak_soi5: {
    name: "Pratumnak Soi 5",
    region: "Pratumnak",
    desc: "Where Soi 5 leaves the hill road and starts down toward the sea. Nothing up " +
      "here is for you: condo walls with broken glass set into the top, a security box " +
      "with a man asleep in it, and gates with intercoms that answer in Thai or not at " +
      "all. The road tips west from here and keeps tipping — you can feel the gradient " +
      "in your calves before you can see it. Between two walls there is one gap, and " +
      "through it the whole bay, black and enormous, with Jomtien's lights strung along " +
      "the far edge of it. East, further up, two of the walls have doors in them; west " +
      "and down, the first bar lights start where the gradient eases.",
    revisit: [
      "Wall, wall, gate, wall. Somebody's air-conditioning unit dripping.",
      "A dog barks behind a gate, thinks better of it, and settles.",
      "The gap between the walls, the bay, and Jomtien laid out along the far side.",
      "Downhill from here. Your knees register it before you do.",
    ],
    exits: { e: "pratumnak_clubs", w: "pratumnak_soi5_m" },
  },
  pratumnak_soi5_m: {
    name: "Pratumnak Soi 5 (middle)",
    region: "Pratumnak",
    desc: "The gradient eases and the walls give way to the first bars — open-air, all of " +
      "them, because up here the evening does the air-conditioning for free. THE TERRACE " +
      "and THE KINGFISHER hold this block, and both are visibly better kept than a hill " +
      "bar needs to be: matched stools, a roof that has been re-thatched this year, ice " +
      "that arrives before you ask. The Samson brothers own the pair, and the difference " +
      "shows from across the road. Next door, HALF MOON MASSAGE has its shutters up and " +
      "two ladies on the step.",
    revisit: [
      "Two rails of fairy lights and a hill breeze doing the work of an aircon unit.",
      "Somebody laughs at the Terrace. Somebody at the Kingfisher laughs back.",
      "The massage ladies on the step consider you, without much urgency.",
      "Open fronts, cold ice, and the sea a long way down through a gap in the wall.",
    ],
    exits: { e: "pratumnak_soi5", w: "pratumnak_soi5_b" },
    venues: ["the_terrace", "kingfisher", "half_moon_massage"],
  },
  pratumnak_soi5_b: {
    name: "Pratumnak Soi 5 (bottom)",
    region: "Pratumnak",
    desc: "The last stretch before the beach road, and the tone drops a grade: TWO STOOLS " +
      "BAR is exactly as advertised and has been since somebody painted the sign by hand, " +
      "and THE GECKO next to it runs on one strip light, a cool box and a lady who owns " +
      "the place outright. Both open to the road, both cheaper than anything up the hill, " +
      "and both entirely comfortable about it. HILLSIDE MASSAGE occupies the last shopfront " +
      "before the corner. You can hear Dongtan from here.",
    revisit: [
      "One strip light, one cool box, and a conversation that has been going for hours.",
      "The hand-painted sign at Two Stools has had another coat since you last looked.",
      "Somebody's radio, the surf a street away, and nobody selling you anything.",
      "Cheap and unbothered, and the beach road glowing at the bottom of the slope.",
    ],
    exits: { e: "pratumnak_soi5_m", w: "dongtan_rd_n" },
    venues: ["two_stools", "the_gecko", "hillside_massage"],
  },
  the_terrace: {
    name: "The Terrace",
    bar: "The Terrace", barType: "beer",
    region: "Pratumnak",
    desc: "Open on three sides to the hill, with the good half of the view: a long teak rail, " +
      "stools that all match, and a thatched roof somebody actually maintains. The Samson " +
      "brothers bought it two seasons ago and spent money where it shows least and matters " +
      "most — the ice, the glassware, the fact that the beer is genuinely cold. The girls " +
      "are unhurried because the trade up here is regulars, and regulars do not need working.",
    revisit: [
      "Back onto the Terrace. The rail, the breeze, and a cold one landing without ceremony.",
      "Somebody has taken the good corner. There is another good corner; there always is.",
      "Matched stools, proper glasses, and the hill going quietly dark past the rail.",
      "The Terrace again — the kind of easy that costs an owner money to maintain.",
    ],
    exits: { out: "pratumnak_soi5_m" },
  },
  kingfisher: {
    name: "The Kingfisher",
    bar: "The Kingfisher", barType: "beer",
    region: "Pratumnak",
    desc: "The Terrace's sister bar and its opposite in temperament: same owners, same money " +
      "spent, but this one has the pool table, the speaker that gets used, and the staff who " +
      "will absolutely take your bet. Open-fronted onto the soi with a painted bird over the " +
      "bar that nobody can identify. Loud by Pratumnak standards, which is to say you can " +
      "still hear the person next to you.",
    reads: {
      bird: "You give the painted bird a proper look. Blue where a kingfisher is blue, but " +
        "the beak is wrong, the tail is somebody else's, and the feet belong to a duck. The " +
        "regulars' best theory is that the painter was working from a description given over " +
        "the phone. Nobody would dream of fixing it.",
    },
    revisit: [
      "The Kingfisher takes you back, at volume. Somebody is losing at pool, cheerfully.",
      "The painted bird over the bar remains unidentifiable. Opinions are offered.",
      "Cold beer, warm noise, and the hill absorbing all of it ten metres out.",
      "Back in. The speaker is doing something the eighties would recognise.",
    ],
    pool: true,
    exits: { out: "pratumnak_soi5_m" },
  },
  two_stools: {
    name: "Two Stools Bar",
    bar: "Two Stools Bar", barType: "beer",
    region: "Pratumnak",
    desc: "There are eleven stools. The name is a joke that stopped being a joke around the " +
      "time the sign faded, and nobody is going to repaint it now. Open to the road, one " +
      "fan, a cool box, a fridge that hums like it is thinking about it, and prices that " +
      "have moved twice this decade. The lady who runs it has run it a long time and treats " +
      "the whole business as a way of having company in the evenings, which it is.",
    revisit: [
      "Two Stools again, and still eleven of them. Nobody has ever explained it.",
      "The fridge hums, thinks about it, and carries on. Somebody tops up your glass.",
      "Cheap, open to the road, and comfortable in a way that cannot be bought.",
      "Back on a stool. The fan turns. The evening does not require anything of you.",
    ],
    exits: { out: "pratumnak_soi5_b" },
  },
  the_gecko: {
    name: "The Gecko",
    bar: "The Gecko", barType: "beer",
    region: "Pratumnak",
    desc: "One strip light, four stools, a cool box, and an actual gecko somewhere in the " +
      "roof that the owner refers to by name and has never caught. She owns the place " +
      "outright — no rent, no partner, no brothers — and says so about once an hour. Open " +
      "to the road because there is no front to close. The cheapest beer on the hill and " +
      "the best conversation on it, in that order or the other one.",
    reads: {
      gecko: "You look up. Two clicks from the dark of the roof answer you. The owner calls " +
        "him Somchai, insists he is staff, and has never once managed to lay eyes on him — " +
        "the longest-serving employee in the soi, on the best terms of anyone with the boss.",
    },
    revisit: [
      "The strip light, the cool box, and the gecko not being caught again.",
      "Four stools. Two occupied. The owner counts this a good night and she is right.",
      "Back at the Gecko, where the beer is cheapest and nobody is working an angle.",
      "Somebody up in the roof clicks twice. The owner points at it, vindicated.",
    ],
    exits: { out: "pratumnak_soi5_b" },
  },
  half_moon_massage: {
    name: "Half Moon Massage",
    bar: "Half Moon Massage",
    massage: "legit",
    region: "Pratumnak",
    desc: "A clean two-room shop with a laminated list on the wall — foot, Thai, oil, aloe " +
      "for the sunburned — and the sharp green smell of balm. The ladies are middle-aged " +
      "and mean it; the sticker on the mirror is the small one. Half the hill's condo " +
      "residents come here weekly and are on first-name terms with a specific pair of hands.",
    revisit: [
      "Balm, cool tile, and somebody being folded in half two feet away.",
      "The laminated list has not changed price since it was laminated.",
      "A lady looks up, works out which of your shoulders is the bad one, and is right.",
      "Somebody's condo keys on the counter, and a pair of sandals lined up under a chair.",
    ],
    exits: { out: "pratumnak_soi5_m" },
  },
  hillside_massage: {
    name: "Hillside Massage",
    bar: "Hillside Massage",
    massage: "legit",
    region: "Pratumnak",
    desc: "The last shopfront before the corner, and the more relaxed of the hill's two: " +
      "plastic chairs out front, a television on low, and whoever is not working asleep in " +
      "one of the recliners. Foot massage on the pavement while you watch the road go by is " +
      "the house speciality, and at this end of the soi the road going by is two scooters " +
      "and a dog.",
    revisit: [
      "A television on low, a lady asleep in a recliner, and the road doing nothing.",
      "Plastic chairs, a bucket of warm water, and the corner glowing past the shopfront.",
      "Somebody waves you at a chair without getting up. It is that kind of establishment.",
      "Two scooters and a dog go past. That is the whole of the traffic report.",
    ],
    exits: { out: "pratumnak_soi5_b" },
  },
  pratumnak_clubs: {
    name: "Pratumnak Hill Road (the clubs)",
    region: "Pratumnak",
    // NOT dark, unlike the rest of this hill: two lit premises on one short
    // stretch is the whole reason the stretch exists. (A dark room prints the
    // darkness line instead of its desc, so it cannot carry a revisit pool.)
    desc: "Halfway up, the walls stop being condominiums and start being something else. Two " +
      "doors on this stretch, neither of them advertising: THE DOGHOUSE, down a ramp into " +
      "the basement of a villa somebody remade for the purpose, its sign a small lit " +
      "rectangle you would take for a dentist; and across the road SUCCUBUS, behind a " +
      "hedge, with a porch light and a bell. No barkers, no flyer girls, nobody outside at " +
      "all. Cars come up, cars go down, and the men who use these rooms park where they " +
      "cannot be read from the road.",
    revisit: [
      "Two lit doors and a lot of wall. Nobody outside either of them, as usual.",
      "A car comes up the hill, slows for a gate that isn't a gate, and carries on.",
      "The Doghouse ramp, the Succubus hedge, and the hill breathing between them.",
      "Quiet enough up here to hear the aircon plant behind the wall.",
    ],
    exits: { w: "pratumnak_soi5", e: "pratumnak_hill_rd" },
    venues: ["doghouse", "succubus"],
  },
  doghouse: {
    name: "The Doghouse",
    bar: "The Doghouse", barType: "gents", outlet: true,
    region: "Pratumnak",
    desc: "Down the ramp and through a door heavier than it looks, into the basement of a " +
      "villa: no windows anywhere, which is the whole design, and cold enough that your " +
      "shirt goes stiff. Low leather, low light, a bar along the back with optics lit from " +
      "beneath, and ladies who do not get up when you come in — they look, they " +
      "decide, and one of them arrives. The newest of the Samson brothers' rooms, and the " +
      "only one they built rather than bought — you can see the money in the joinery. " +
      "Bill runs it, and Bill runs it properly.",
    revisit: [
      "Down the ramp again. The door shuts and the hill stops existing.",
      "No windows, no clocks, no way to tell what o'clock it is out there. As intended.",
      "The Doghouse takes you back — cold air, low leather, and somebody already deciding.",
      "The optics glow up from under the bottles. Somebody laughs quietly at the far end.",
    ],
    exits: { out: "pratumnak_clubs" },
  },
  succubus: {
    name: "Succubus",
    bar: "Succubus", barType: "gents", outlet: true,
    region: "Pratumnak",
    desc: "Past the hedge, up a porch, and into a front room somebody has been improving for " +
      "twenty years: dark wood, a proper bar with a brass rail, a ceiling fan turning under " +
      "the aircon because the owner likes the look of it, and framed photographs going all " +
      "the way back — the same coast with nothing on it. Nobody's chain owns this one. Bob " +
      "is behind the bar most nights and his wife runs the floor, and between them they " +
      "have never once had to explain the house rules twice.",
    reads: {
      photos: "The framed photographs run back along the wall in order: the same coast, " +
        "decade by decade, with less on it each frame you go back — bars to shophouses to " +
        "casuarinas to, in the oldest frame, nothing at all: sand, sea, one long-tail " +
        "boat. Bob hung them in sequence and offers no commentary. None is needed.",
    },
    revisit: [
      "Back through the hedge. The fan turns, the photographs watch, the ice bucket refills.",
      "Succubus again — brass rail, dark wood, and somebody's whole life on the walls.",
      "The porch light, the door, and the temperature dropping fifteen degrees at the step.",
      "Somebody at the bar is telling Bob something and Bob is not hurrying him.",
    ],
    exits: { out: "pratumnak_clubs" },
  },
  pratumnak_hill_rd: {
    name: "Pratumnak Hill Road (crest)",
    region: "Pratumnak",
    dark: true,
    desc: "The saddle over the top of Pratumnak Hill, linking the two roads that climb it — the " +
      "Thappraya side to the east, the Dongtan Beach side to the west. Walls, viewpoints you can't " +
      "make out in the dark, and the sea breathing somewhere below on both sides.",
    exits: { e: "thappraya_ext_n", w: "pratumnak_clubs", n: "pratumnak_rd" },
  },
  dongtan_rd_n: {
    name: "Dongtan Beach Road (North)",
    region: "Pratumnak",
    dark: true,
    seven: true, atm: true,
    desc: "The top of Dongtan Beach Road, where it bends inland and starts up onto Pratumnak. " +
      "The sand is a black rumour to the west; east the road climbs to the Soi 5 turn and, " +
      "past that, the crest. On the bend a 7-ELEVEN throws the only real light for half a " +
      "kilometre — cold air, a cash machine, and two lads on a scooter parked across the " +
      "front eating toasties. Everyone going up the hill or down it stops here, because " +
      "there is nothing either way for a long time.",
    exits: { s: "dongtan_rd_m", e: "pratumnak_soi5_b", w: "dongtan_beach_n" },
  },
  dongtan_beach_s: {
    name: "Dongtan Beach (South)",
    region: "Jomtien",
    dark: true,
    desc: "Dongtan proper begins here, and the difference is immediate: the beach chairs " +
      "thin out, the lights of Jomtien fall behind, and the sand widens into the dark. " +
      "The surf is the loudest thing for a hundred metres. A short access path climbs " +
      "east to Dongtan Beach Road; the sand runs south back toward the Jomtien end and " +
      "north up the shore.",
    revisit: [
      "The chairs have thinned to nothing. The sand widens and the dark widens with it.",
      "Surf, and the sound of your own feet, and very little else for a hundred metres.",
      "The lights of Jomtien sit low behind you now, more glow than lights.",
      "The access path is a paler smudge going up the bank to the east.",
    ],
    exits: { s: "dongtan_beach", n: "dongtan_beach_m", e: "dongtan_rd_s" },
  },
  dongtan_beach_m: {
    name: "Dongtan Beach (Middle)",
    region: "Jomtien",
    dark: true,
    desc: "A dark reach of Dongtan sand, well off the Jomtien lights: the surf close and loud, a " +
      "few couples' silhouettes. The sand runs south back toward Jomtien and north on up the " +
      "shore; a beach-access path cuts up to Dongtan Beach Road to the east.",
    revisit: [
      "Two silhouettes down the sand, close together, entirely uninterested in you.",
      "The surf is close and loud here, and there is nothing else at all.",
      "Far enough out that the town is a rumour in both directions.",
      "Somebody has built something out of sand and the tide is halfway through it.",
    ],
    exits: { s: "dongtan_beach_s", n: "dongtan_beach_n", e: "dongtan_rd_m" },
  },
  dongtan_beach_n: {
    name: "Dongtan Beach (North)",
    region: "Jomtien",
    dark: true,
    desc: "The north tip of Dongtan Beach, where the sand runs out against the black shoulder of " +
      "Pratumnak Hill. Quiet, unlit, the sea working away below. The sand runs south back down the " +
      "shore; a beach-access path climbs to Dongtan Beach Road to the east.",
    revisit: [
      "The hill's black shoulder ends the beach. The sea works away underneath it.",
      "The sand runs out here and there is nowhere further to walk.",
      "Unlit, and quiet enough to hear the water moving stones somewhere below.",
      "The path up to the road is the only way on from here, and it is steep.",
    ],
    exits: { s: "dongtan_beach_m", e: "dongtan_rd_n" },
  },
  dongtan_rd_m: {
    name: "Dongtan Beach Road (Middle)",
    region: "Jomtien",
    dark: true,
    desc: "The middle of Dongtan Beach Road: quiet condos, a shuttered café or two, beach-access " +
      "paths down to the sand between them. The road runs south back toward Jomtien and north up " +
      "toward the hill.",
    exits: { s: "dongtan_rd_s", n: "dongtan_rd_n", w: "dongtan_beach_m" },
  },
  dongtan_rd_s: {
    name: "Dongtan Beach Road (South)",
    region: "Jomtien",
    desc: "The south end of Dongtan Beach Road, where it peels off the top of Jomtien's beach: " +
      "rainbow flags by day, a mellow gay-friendly stretch, cocktail shacks winding down. Dongtan " +
      "Beach is back to the south; the road runs on north up the coast.",
    exits: { s: "jomtien_beach_rd_n", n: "dongtan_rd_m", w: "dongtan_beach_s" },
  },
  buddha_hill: {
    name: "Buddha Hill Viewpoint",
    region: "Pratumnak",
    dark: true,
    desc: "The big golden Buddha watches the bay with infinite patience. Below, the whole " +
      "curve of Pattaya glitters — Walking Street burning neon-pink at the south end. " +
      "Someone has left an offering of marigolds and a small bottle of red Fanta. It is the " +
      "one quiet place for miles, and the view is the whole reason to climb. (WATCH THE BAY.)",
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
    exits: { s: "ws_gate", n: "beach_rd_c", e: "second_rd_s", spa: "papaya_massage", spa2: "beachthai_massage" },
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
    reads: {
      keys: "A ring of numbered keys on a nail, each fob worn smooth. No computer, no " +
        "ledger anyone can see — the old man knows which rooms are turning and which are " +
        "done, the way a stationmaster knows his trains. The nail has held that ring longer " +
        "than most marriages in this town.",
    },
    exits: { out: "pattaya_soi_7" },
  },
  beach_rd_c: {
    name: "Beach Road Central",
    atm: true,
    region: "Beach Road",
    seven: true,
    desc: "Mid-Beach-Road: tour groups, tailor touts, and the sea breathing in the dark " +
      "beyond the promenade. The glass cliff of CENTRAL mall rises a block inland, and " +
      "just south of it TEQUILA QUEEN's ancient neon señorita kicks her leg, as she " +
      "has since before you were born.",
    busStop: "beachrd",
    exits: { s: "beach_rd_s", n: "beach_rd_soi9", w: "promenade", e: "central_mall", in: "tequila_queen", spa: "beachrd_oil" },
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
    reads: {
      "mirror ball": "The mirror ball is missing a continent of tiles and throws its light " +
        "accordingly — a starfield with a dark patch that sweeps the room like weather. " +
        "Management could re-tile it for a few hundred baht. The regulars would riot. The " +
        "dark patch has a name, allegedly, but nobody will tell you until you've earned it.",
    },
    revisit: [
      "Back into Tequila Queen — bald red velvet, a mirror ball short a continent of tiles, and dancers who answer to no mamasan but time.",
      "The oldest go-go in town takes you back: proudly unrestored, and prouder still of the women who've held its floor for years.",
      "You settle back onto a worn stool. Mem still runs the room like the national institution it is, because it is one.",
      "Tequila Queen again — what the place concedes in paint and mirror tiles it repays, every night, in showmanship.",
    ],
    exits: { out: "beach_rd_c" },
  },
  beach_rd_soi7: {
    busStop: "beachrd",
    motosai: true,
    name: "Beach Road (Soi 7)",
    region: "Beach Road",
    desc: "Where Soi 7 comes down to the sea. The soi runs inland behind you, all beer " +
      "stools and laundry steam; out here it is the seafront doing its evening thing " +
      "— joggers who have misjudged the hour, a man selling roasted chestnuts nobody " +
      "buys, and the long slow crawl of songthaews with their benches half full. " +
      "Central Pattaya Road comes down to the sea a hundred metres north, and its " +
      "traffic is still deciding things by the time it reaches you. Soi 7 runs " +
      "inland here; Soi 8 comes down to the front a block south, and on a still " +
      "night you can hear which of the two has the bars.",
    revisit: [
      "The chestnut man has moved four metres and changed nothing.",
      "A songthaew slows, reads you, and rolls on unconvinced.",
      "Somebody jogs past in the wrong clothes at the wrong hour, entirely content.",
      "The sea does its thing on the other side of the railing, unbothered.",
    ],
    exits: { n: "beach_rd_klang", s: "beach_rd_soi8", e: "pattaya_soi_7" },
  },
  pattaya_soi_8: {
    name: "Soi 8",
    region: "Beach Road",
    desc: "One soi south of Soi 7 and a different proposition entirely. The beach end is " +
      "solid bars — open fronts shoulder to shoulder, stools out to the kerb, four " +
      "sound systems inside thirty metres and every one of them winning something. " +
      "It thins as you go inland: the bars give way to guesthouses and a tailor about " +
      "halfway along, and by the Second Road end it could be any street in Thailand. " +
      "Everyone stands at the wrong end at least once.",
    revisit: [
      "Four sound systems, thirty metres, no winner. The beach end is doing its thing.",
      "A girl leans off her stool to say something to the girl on the next stool's stool.",
      "Somebody wanders up from the beach end and stops dead where the noise runs out.",
      "Two beers, two stools, one conversation that has clearly been going for hours.",
    ],
    exits: { w: "beach_rd_soi8", e: "second_rd_soi8" },
    venues: ["neon_palm", "the_bucket"],
  },
  beach_rd_soi9: {
    busStop: "beachrd",
    name: "Beach Road (Soi 9)",
    region: "Beach Road",
    desc: "The Soi 9 corner, and the least rowdy hundred metres on the whole seafront " +
      "for an obvious reason: PATTAYA CENTRAL POLICE STATION occupies the north-east " +
      "corner, lit all night, with a row of pickups nosed in against the kerb. " +
      "Central Mall's bulk sits to the south-east. People walk a little straighter " +
      "past here and nobody sells you anything at all.",
    revisit: [
      "A pickup pulls out of the station yard and turns south without hurrying.",
      "Nobody has tried to sell you anything for a hundred metres. It is unsettling.",
      "Two officers stand under the light doing nothing in particular, at length.",
      "The quietest stretch of Beach Road, and everybody knows exactly why.",
    ],
    exits: { n: "beach_rd_soi8", s: "beach_rd_c", e: "pattaya_soi_9", police: "police_station" },
  },
  pattaya_soi_9: {
    name: "Soi 9",
    region: "Beach Road",
    desc: "A short working soi between the police station and the back of Central Mall, " +
      "and it behaves accordingly: motorbike repair, a print shop, somewhere doing " +
      "visa paperwork with a queue of resigned farang outside, and a noodle place that " +
      "is very good and knows it. The bars are two sois north. Nothing here is open " +
      "at three in the morning and nothing here needs to be.",
    revisit: [
      "The visa shop's queue has not moved. It never appears to.",
      "Someone is arguing with a mechanic about a scooter, amiably, in two languages.",
      "The noodle place has a queue too, and that one moves.",
      "Daytime business on a night street. It feels like the wrong hour to be here.",
    ],
    exits: { w: "beach_rd_soi9", e: "second_rd_c" },
  },
  beach_rd_klang: {
    busStop: "beachrd",
    motosai: true,
    name: "Beach Road (Pattaya Klang)",
    region: "Beach Road",
    desc: "Where Central Pattaya Road runs out of town and hits the sea. It is one of " +
      "the three roads that cut Pattaya into pieces, and this is the end of it: a " +
      "wide junction, a lot of traffic deciding what to do next, and the beach " +
      "railing beyond. Baht buses turn here in numbers. Soi 7 comes down a hundred " +
      "metres south, which is close enough that the two junctions bleed into one " +
      "long slow crawl at the wrong hour.",
    revisit: [
      "Songthaews turning, songthaews waiting, songthaews going nowhere in particular.",
      "The traffic sorts itself out and immediately unsorts itself.",
      "Somebody crosses four lanes with the unbothered timing of long practice.",
      "The sea is right there, past the railing, minding its own business.",
    ],
    exits: { n: "beach_rd_n", s: "beach_rd_soi7", e: "pattaya_klang", w: "central_beach" },
  },
  dolphin: {
    busStop: "beachrd",
    motosai: true,
    name: "Dolphin Roundabout",
    region: "Naklua",
    desc: "The top of the town, where four roads give up arguing and go round in a " +
      "circle instead. The dolphins are in the middle of it — a concrete pod of them " +
      "mid-leap, floodlit, permanently about to enter water that is two hundred metres " +
      "west. Terminal 21 sits on the corner pretending to be an airport, its departure " +
      "boards lit all night for a terminal nobody flies from. Beach Road runs south " +
      "along the sea, Second Road south into town, Naklua Road north-east toward the " +
      "quieter money, and the songthaews go round and round because this is where the " +
      "loop turns. Across from Terminal 21, a rank of blue trucks fills bench by " +
      "bench for the run south — the drivers don't budge until the benches do.",
    revisit: [
      "Round go the songthaews. The dolphins remain mid-leap.",
      "Terminal 21's boards announce destinations to a car park.",
      "A bus full of tourists takes the roundabout twice, deliberating.",
      "Four roads' worth of traffic, folding into each other and out again.",
    ],
    exits: { s: "beach_rd_top", n: "naklua_rd", second: "second_rd_soi6" },
  },
  beach_rd_soi8: {
    busStop: "beachrd",
    motosai: true,
    name: "Beach Road (Soi 8)",
    region: "Beach Road",
    desc: "The Soi 8 corner, and you hear it before you reach it. The soi comes out here " +
      "with its bar end first — open fronts, four sound systems, the noise rolling " +
      "down the last thirty metres and out over the railing to a sea that has no " +
      "opinion. North along the front toward Soi 7 the bars are all on this side of the " +
      "road with their fronts open to the west, so you drink facing the gulf and the " +
      "gulf is on the far side of four lanes. Different kind of evening: same beer, " +
      "quieter, and a view you have to look through the traffic to get.",
    revisit: [
      "The noise comes down the soi in a wave, hits the railing, and gives up.",
      "Somebody stops dead at the corner, deciding between the sea and the sound.",
      "A songthaew slows for the corner, reads nobody, and carries on south.",
      "Bar light one way, black water the other, and the road running between them.",
    ],
    exits: { n: "beach_rd_soi7", s: "beach_rd_soi9", e: "pattaya_soi_8" },
    venues: ["sea_wall", "breakwater"],
  },
  second_rd_soi8: {
    busStop: "secondrd",
    name: "Second Road (Soi 8)",
    region: "Beach Road",
    desc: "Where Soi 8 gives out onto Second Road, and it gives out quietly — this is the " +
      "wrong end of it, the end where the bars have already turned into guesthouses " +
      "and a tailor. Four lanes of traffic go past without slowing. People who come " +
      "out of the soi here are usually leaving; people going in tend to have been told " +
      "which end to start at, and they walk.",
    revisit: [
      "Traffic, and the mouth of a soi that sounds better a hundred metres in.",
      "Two farang come out squinting at a phone, turn round, and go back in.",
      "The noise from the beach end arrives thin and secondhand.",
      "Nobody hails anything. The traffic keeps not stopping.",
    ],
    exits: { w: "pattaya_soi_8", n: "second_rd_n", s: "second_rd_c" },
  },
  beach_rd_top: {
    busStop: "beachrd",
    motosai: true,
    name: "Beach Road (the north corner)",
    region: "Beach Road",
    desc: "Where Beach Road stops coming down off the roundabout and turns to run the " +
      "length of the bay. The sand starts along here, behind a low wall and the last of " +
      "the trees, and from this corner you can see the whole sweep " +
      "south, the road and the beach side by side for two kilometres until the neon " +
      "starts. It is the quiet end. Joggers, a few couples on the wall, an ice-cream " +
      "cart that shuts before anything interesting happens, and no bars at all.",
    revisit: [
      "The corner, the trees, and the bay opening up all the way south.",
      "Somebody on the sea wall with a coffee, watching nothing in particular.",
      "The ice-cream cart is packing up. It always seems to be packing up.",
      "Quiet enough here to hear the water. Two kilometres down, it will not be.",
    ],
    exits: { n: "dolphin", s: "beach_rd_n", w: "beach_north_end" },
  },
  beach_north_end: {
    name: "Pattaya Beach (north end)",
    region: "Beach Road",
    desc: "The top of the sand, where the bay runs out and the trees come down almost to " +
      "the water. This is the end nobody works: no deckchair men, no jet-skis, no " +
      "flyer girls, because there is nothing up here to sell to. Thai families with " +
      "mats and carrier bags of food, a couple of kids in the shallows well after they " +
      "should be, and somebody's grandmother asleep in a folding chair facing the wrong " +
      "way. South, the sand goes on for two kilometres and gets steadily less like this.",
    revisit: [
      "Mats, carrier bags, and a small child being called out of the water again.",
      "The trees come down nearly to the water here, and the dark under them is total.",
      "Somebody's grandmother has not moved, and is facing resolutely inland.",
      "Quiet sand. The neon is a rumour two kilometres south.",
    ],
    exits: { e: "beach_rd_top", s: "north_beach" },
  },
  central_beach: {
    name: "Pattaya Beach (central)",
    region: "Beach Road",
    desc: "The working stretch, opposite where Central Pattaya Road comes down. By day " +
      "this is rank after rank of loungers and umbrellas; by now it is rank after rank " +
      "of them folded and chained together in stacks, which somehow takes up more beach " +
      "than when they were open. The jet-ski men have gone home to whatever they do " +
      "there. A last vendor works the seawall with a cool box and no real hope, and " +
      "further along the sand a few people are sitting on it in ones and twos, facing " +
      "the water, not obviously waiting for anything.",
    revisit: [
      "Stacked loungers, chained in threes, taking up more room folded than open.",
      "A cool-box vendor works the wall without much conviction and does not stop.",
      "People sitting on the sand in ones and twos, facing out. Nobody talks.",
      "The jet-skis are pulled up and padlocked. In the morning they will be a menace again.",
    ],
    exits: { e: "beach_rd_klang", n: "north_beach" },
  },
  jomtien_beach_s1: {
    name: "Jomtien Beach (past the works)",
    region: "Jomtien",
    dark: true,
    desc: "South of Soi 7 the beach road simply stops. Steel hoarding runs the length of " +
      "the frontage, the carriageway behind it is opened up to the pipes, and a line of " +
      "cones funnels everything inland up the soi — which is why nobody comes down here " +
      "any more, and why the sand beside it has gone quiet in a way Jomtien sand never " +
      "is. A digger sits with its arm folded down for the night. The beach carries on " +
      "south past all of it, because a beach does not care about a road.",
    revisit: [
      "The hoarding, the cones, the digger with its arm down. Nothing has moved.",
      "You can hear the traffic taking the detour, one street inland and grumbling.",
      "Sand on this side, a dug-up road on the other, and nobody on either.",
      "The works go on for as far as the lights do, which is not far.",
    ],
    exits: { n: "jomtien_soi_7_beach_end", s: "jomtien_beach_s2" },
  },
  jomtien_beach_s2: {
    name: "Jomtien Beach (the unraked stretch)",
    region: "Jomtien",
    dark: true,
    desc: "Nobody rakes this. You can tell instantly — the sand has the tide's own " +
      "arrangement on it, a long crooked line of weed and bottle caps and one flip-flop, " +
      "and your feet keep finding the ridges the water left. No loungers, no umbrella " +
      "poles, no cool boxes, nobody at all. It is the first place all night where nothing " +
      "whatsoever is being sold to you, and the effect is stranger than it should be.",
    revisit: [
      "The tide line, the flip-flop, and your own footprints going back the way you came.",
      "Nothing is being sold to you here, and you keep noticing it.",
      "Ridged sand underfoot, unraked since the last high water.",
      "Dark, and quiet enough that the water is the loudest thing in Jomtien.",
    ],
    exits: { n: "jomtien_beach_s1", s: "jomtien_beach_s3" },
  },
  jomtien_beach_s3: {
    name: "Jomtien Beach (the far end)",
    region: "Jomtien",
    dark: true,
    desc: "As far as walking gets you. A stand of casuarinas leans off the dune with the " +
      "wind's shape set into them, and under the nearest one somebody long ago put a " +
      "spirit house — weathered grey, one corner gone, the little figures inside still " +
      "facing out to sea. There are no offerings on the shrine. There is no rubbish either, " +
      "which takes some explaining on a beach nobody sweeps. Behind you the lights of " +
      "Jomtien are a low orange smear a long way north.",
    reads: {
      shrine: "A closer look: a spirit house on a low post, weathered grey and salt-scoured, one " +
        "corner broken clean off. The little figures inside — a guardian, his servants, a stone " +
        "elephant — face out to sea rather than inland, which is not how these are usually set and " +
        "does not look like a mistake. No incense, no marigolds, no offering of any kind — and yet " +
        "not a scrap of litter, on a beach nobody sweeps. Somebody tends it. They just don't leave " +
        "anything.",
    },
    revisit: [
      "The spirit house, the leaning trees, and the sea doing what it does.",
      "No offerings, no rubbish. Somebody still comes here, or nobody ever has.",
      "The little figures face out to sea, as they have through everything.",
      "The end of the walkable sand. Jomtien is an orange smear behind you.",
    ],
    exits: { n: "jomtien_beach_s2" },
  },
  sea_wall: {
    name: "The Sea Wall",
    bar: "The Sea Wall", barType: "beer",
    region: "Beach Road",
    desc: "Across the road from the sand, with every stool on the front rail turned to " +
      "face it — which means every stool also faces four lanes of Beach Road, and that " +
      "is the arrangement you are accepting. Between the songthaews you get the whole " +
      "gulf going dark, and the regulars stopped seeing the traffic years ago. Older " +
      "crowd. Nobody shouts. The girls sit beside you facing the same way and point " +
      "things out — a squid boat's lights, the ferry, weather coming in.",
    revisit: [
      "Every stool on the rail pointed west, and four lanes of traffic in the way.",
      "Somebody points out a squid boat and everybody looks, including the staff.",
      "A songthaew stops dead in the view. Nobody at the rail reacts at all.",
      "A quiet rail, a cold bottle, and the gulf going dark past the headlights.",
    ],
    exits: { out: "beach_rd_soi8" },
  },
  breakwater: {
    name: "The Breakwater",
    bar: "The Breakwater", barType: "beer",
    region: "Beach Road",
    desc: "Next door to the Sea Wall and a few degrees livelier — same sea over the same " +
      "traffic, more of a bar about it: a pool table with a permanent list to one " +
      "corner, a dartboard, and a crew of regulars who have watched this stretch of " +
      "water across this stretch of road for years and have opinions about both. When " +
      "the wind comes off the sea the fairy lights swing and everybody pretends not to " +
      "notice.",
    revisit: [
      "The pool table still lists. Everybody still plays the slope rather than fights it.",
      "Fairy lights swinging in the sea wind, and nobody remarking on it.",
      "The regulars are discussing the weather with more authority than the forecast.",
      "Back at the Breakwater — same water, slightly more noise about it.",
    ],
    pool: true, darts: true,
    exits: { out: "beach_rd_soi8" },
  },
  neon_palm: {
    name: "Neon Palm",
    bar: "Neon Palm", barType: "beer",
    region: "Beach Road",
    desc: "First of the Soi 8 beach-end bars and the loudest of them, which on this " +
      "thirty metres is a real contest. Open the full width of the shopfront, a plastic " +
      "palm strung with LED rope that changes colour whether you want it to or not, and " +
      "a sound system aimed squarely at the bar across the way. The girls are young and " +
      "the pace is quick. Nothing subtle happens here and nothing is meant to.",
    revisit: [
      "The plastic palm cycles through a colour nobody has a name for.",
      "The sound system wins a round against the bar opposite, briefly.",
      "Quick, loud, and entirely unbothered about it. Back in.",
      "Somebody's order is shouted twice and arrives right the first time.",
    ],
    exits: { out: "pattaya_soi_8" },
  },
  the_bucket: {
    name: "The Bucket",
    bar: "The Bucket", barType: "beer",
    region: "Beach Road",
    desc: "Directly opposite the Neon Palm and locked in a sound war with it that " +
      "neither has ever won. Named for what it sells: a sand bucket of ice, a bottle of " +
      "something, and enough straws for a table. The clientele skews a decade younger " +
      "than anywhere else on this beach, and the staff have the specific patience of " +
      "people who work where the customers are having a better night than they are.",
    reads: {
      bucket: "The house product, mid-assembly along the bar: a child's sand bucket, a " +
        "bottle upended into ice, a fistful of straws like a losing hand of pick-up-sticks. " +
        "Engineering-wise it is a delivery system for regret. Commercially it is genius — " +
        "nobody has ever bought one alone.",
    },
    revisit: [
      "A bucket goes past at shoulder height with four straws in it.",
      "The sound war continues. Neither side has ever won and neither will.",
      "Young crowd, loud room, and the staff moving through it unhurried.",
      "Back into the Bucket, where the measure of an evening is literal.",
    ],
    exits: { out: "pattaya_soi_8" },
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
    name: "Beach Road (foot of Soi 6)",
    region: "Beach Road",
    desc: "Where Soi 6 meets Beach Road. The soi runs inland to the east — short, loud, and " +
      "lit like a runway. Across Beach Road to the west lies the open sand and the bay; the " +
      "Dolphin roundabout and Naklua are a couple of kilometres north up the road, out of " +
      "sight. Two bars hold the corners of the junction and stare each other down: THE STINKY " +
      "PINKY's sign — a cartoon skunk hoisting a Chang — buzzes over its open front on one " +
      "side, and across the mouth of the soi the BLUE DOG's rail faces the water. From either " +
      "corner you can still catch the sun going down over the bay. From about five, the police " +
      "run a checkpoint on Beach Road just south of the junction, waving over helmetless farang " +
      "for a paperwork stop and an on-the-spot fine — more than a few of the two bars' regulars " +
      "first came in off the road ducking exactly that. Blue songthaews — the baht buses — " +
      "rattle past on the Beach Road run, headlights strung north toward the Dolphin and south " +
      "into the rest of the neon city.",
    busStop: "beachrd",
    reads: {
      skunk: "From the junction you get the Stinky Pinky's sign at full wattage: a cartoon " +
        "skunk hoisting a Chang, buzzing gently, visible from the sand. As landmarks go it " +
        "is unlovely, unmissable, and — by about the third night — unexpectedly dear.",
    },
    revisit: [
      "Back to the foot of Soi 6, the soi blazing inland east, the bay open across the road west, the Stinky Pinky and the Blue Dog eyeing each other across the junction.",
      "The mouth of Soi 6 again — the skunk sign buzzing one corner, the Blue Dog's rail facing the water on the other, and the sun thinking about going down over the bay.",
      "You're back at the junction. Soi 6's runway of light runs off east; blue songthaews rattle by on the Beach Road run, and the junction absorbs you back into its noise.",
      "Back where the soi hits Beach Road. Two corner bars, one loud sea breeze, and the choice you keep making: into the noise east, or a quiet cold one with a sunset.",
      "The foot of the soi, the cartoon skunk and the Blue Dog holding their corners, the bay going gold across the traffic. A baht bus slows, hopeful; you let it pass.",
      "Back to the junction, the neon fuse of Soi 6 lit and waiting east, the water and the last of the light off west past the road.",
    ],
    exits: { s: "beach_rd_klang", e: "soi6_street", n: "beach_rd_top", w: "north_beach" },
    venues: ["stinky_bar", "blue_dog"],
  },
  sunset_rail: {
    name: "The Shady Lady",
    region: "Soi 6",
    bar: "The Shady Lady", barType: "beer", outlet: true,
    desc: "A beer bar in the quiet middle of Soi 6, deliberately set back under a low awning " +
      "and a stand of potted palms — shade, in both senses. A long rail faces the soi so the " +
      "regulars can watch the parade go past without being in it. Pukky pours without being " +
      "asked and misses nothing that happens on the pavement.",
    revisit: [
      "Back to the Shady Lady, set back under its awning, the rail facing the soi so you can watch the circus without joining it.",
      "Pukky has your bottle open before you've picked a stool. Out front the soi does its thing; in here nobody makes you part of it.",
      "You settle back onto the rail in the shade. The parade grinds past a few feet away, and the whole pleasure is being just outside it.",
      "The Shady Lady again — potted palms, low awning, cold Chang, and the best seat on the soi for watching other men get pulled into bars.",
      "Back under the awning where the noise softens by half. Pukky nods, pours, and goes back to reading the pavement like a form guide.",
      "The shaded rail takes you back. A go-go tout two doors down loses a customer; the Shady Lady's regulars rate the technique and drink on.",
      "Back to the quiet middle and the shade, a cold one sweating on the rail, the soi safely at arm's length where you like it.",
    ],
    exits: { out: "soi6_mid" },
  },
  bay_watch: {
    name: "Front Row Bar",
    region: "Soi 6",
    bar: "Front Row Bar", barType: "beer",
    desc: "A beer bar that leans all the way into what the middle of Soi 6 is good for: a row " +
      "of stools pulled right up to the open front, angled at the soi like theatre seating. " +
      "The house joke is a laminated 'SHOW TIMES' card that just reads ALL NIGHT. Somo keeps " +
      "the cooler cold and the running commentary warm.",
    reads: {
      card: "The laminated 'SHOW TIMES' card, greasy at the corners: 6PM — ALL NIGHT. 9PM — ALL " +
        "NIGHT. MIDNIGHT — STILL ALL NIGHT. LAST SHOW — THERE IS NO LAST SHOW. Underneath, smaller: " +
        "'the show is the soi. seats face out.'",
    },
    revisit: [
      "Back into the Front Row, stools pulled up to the open front, the soi playing out a few feet away like it's ticketed.",
      "Somo slides your Chang over and picks up the commentary mid-sentence, narrating the pavement like a man calling the races.",
      "You take a front-row stool. Down the soi a barker reels one in; the bar murmurs its scoring and drinks.",
      "Front Row again — the ALL NIGHT show card, the theatre seating, Somo cold-beer-ready and full of opinions on the passing trade.",
      "Back to the best cheap seats on the soi, where the entertainment is free, continuous, and always someone else.",
      "The open front takes you back in. A hen party gets herded past; the Front Row rates it a seven and Somo pours another.",
      "Back to the row of stools aimed at the parade, a cold one in reach and the whole soi performing for the price of a beer.",
    ],
    exits: { out: "soi6_mid" },
  },
  sandy_toes: {
    name: "The Verandah",
    region: "Soi 6",
    bar: "The Verandah", barType: "beer",
    desc: "The calmest front on Soi 6: a raised wooden deck a step up off the pavement, a rail, " +
      "a couple of lazy fans, and enough of a threshold that the soi's aggressive lady-pullers " +
      "don't bother climbing it. Nina brings the beer to your chair so you never have to give " +
      "up the good seat.",
    revisit: [
      "Back up onto the Verandah's wooden deck, a step above the soi and just far enough off it to be left alone.",
      "Nina walks your Chang out to the rail chair again. Down on the pavement the pullers work; up here the fans turn and nobody hurries.",
      "You settle back into a chair on the raised deck. The step up is doing its quiet job — the grabbers stay on the pavement where they belong.",
      "The Verandah again — the deck, the lazy fans, the rail, and the small civilised miracle of a Soi 6 seat where no one climbs into your lap.",
      "Back above the soi by one wooden step, which turns out to be exactly enough. Nina reads your thirst and beats you to it.",
      "The raised deck takes you back. The soi churns a step below; you put your feet on the rail and let it.",
      "Back to the quietest chair on the loudest soi, a cold one arriving unbidden, the parade safely down off the deck.",
    ],
    exits: { out: "soi6_mid" },
  },
  blue_dog: {
    name: "Blue Dog",
    region: "Beach Road",
    bar: "Blue Dog", barType: "beer",
    desc: "An open-air beer bar holding the beach-side corner at the foot of Soi 6 — no walls, " +
      "no door, just a tin roof, a long rail, and a line of plastic chairs facing out across " +
      "Beach Road to the bay. The Stinky Pinky glowers back from the opposite corner over the " +
      "mouth of the soi. At the Blue Dog the view IS the entertainment: the evening police " +
      "checkpoint down the road to the south, the sunset out over the water and the sand, and " +
      "then whatever the junction decides to do about it. Half the regulars found the place " +
      "ducking in off a helmetless motorbike. (WATCH POLICE · WATCH SUNSET.)",
    revisit: [
      "Back onto the Blue Dog's rail, chairs pointed across the road at the bay, the view doing the entertaining.",
      "The Blue Dog folds you back in — no walls, no door, just the water across the road and the Stinky Pinky glowering from the far corner.",
      "You reclaim a plastic chair facing out. The Stinky Pinky's skunk buzzes across the junction; the bay does its slow gold thing beyond the traffic.",
      "The Blue Dog again — the open front, the plastic chairs, the best cheap sunset at the foot of the soi.",
      "Back to the rail and the open corner. The soi roars off to the east behind you, the bay glows west past the road, and you sit in the seam and drink.",
      "You drop back into a chair aimed at the water. Nobody grabs you out here — the Blue Dog's regulars came to watch the sea, not to be sold anything.",
      "Back to the tin roof and the corner seating. Someone points at a squid boat, someone argues about the squid boat, the Chang stays cold and the sun keeps sinking.",
    ],
    exits: { out: "beach_rd_n" },
  },
  north_beach: {
    name: "Pattaya Beach (Soi 6)",
    region: "Beach Road",
    desc: "The open sand across Beach Road from the foot of Soi 6, quiet after the soi's wall " +
      "of noise — just the hiss of the little waves and, back east across the road, the neon " +
      "of the junction where the Stinky Pinky and the Blue Dog hold their corners. A soi dog " +
      "is having the night of his life in the shallows, charging the waves, losing to them, " +
      "shaking off and charging again — and every few laps he stops to check whether anyone's " +
      "watching. Tonight, that's you. (FEED DOG, if you'd like to matter to one.) Further up the dark sand, a few women share plastic " +
      "stools under the coconut palms — no bar, no beer, no sign: the “coconut bar,” freelance " +
      "and unhurried, watching the beach for a walk-up. Beach Road and the soi are back to the east.",
    revisit: [
      "Back onto the dark sand across from the soi, the soi's roar softened by the road between, the junction neon glowing east where the Stinky Pinky and the Blue Dog face off.",
      "The beach again, quiet after the wall of noise. Out past the last of the light the bay is black and enormous and supremely uninterested in who you are, which is its own kind of mercy.",
      "A soi dog is out in the shallows, charging the little waves and losing to them with total commitment — and every few laps he checks whether anybody on the sand is appreciating this. (A snack would be appreciated too. FEED DOG.)",
      "Up the beach, under the coconut palms, the freelance stools are occupied again — a cigarette ember, a low laugh, eyes reading the dark sand for a walk-up. The coconut bar keeps its own hours.",
      "Back onto the sand, the junction's neon strung warm across the road behind you, the sea working away at the dark in front. A good place to be nobody in particular for a while.",
      "A soi dog trots the tideline with an air of ownership, pausing to bark down a wave that had it coming. The night is his; you're just passing through it.",
      "The palms rattle dry overhead. Somewhere up the dark beach the coconut-bar women murmur to each other and wait, and the surf keeps the time for all of you.",
    ],
    exits: { e: "beach_rd_n", n: "beach_north_end", s: "central_beach" },
  },
  stinky_bar: {
    name: "The Stinky Pinky",
    region: "Beach Road",
    bar: "The Stinky Pinky", barType: "beer", pool: true, liveMusic: true,
    desc: "An American-run beer bar that smells, in defiance of its name, of lime and " +
      "cue chalk. League trophies crowd the back bar; the table is brushed like a " +
      "putting green. Bert — the manager — holds court from the end stool with a " +
      "bottomless Singha and opinions on everyone's break. It holds the inland corner at the " +
      "foot of Soi 6; across the mouth of the soi the Blue Dog faces the water. From the open " +
      "front you can watch the evening checkpoint work the road to the south — half of Bert's " +
      "regulars ducked in here to dodge it once and never left — and the sun go down over the " +
      "bay between shots. (WATCH POLICE · WATCH SUNSET.)",
    reads: {
      skunk: "The sign's cartoon skunk hoists his Chang over the junction, tail up, grin " +
        "fixed, buzzing on a transformer that should have been replaced years ago. Bert " +
        "claims the previous owner won the artwork in a bet. The skunk has outlasted the " +
        "bet, the artist, and very nearly the bar.",
      trophies: "League trophies crowd the back bar three deep — killer pool, darts, one " +
        "cup for a football tournament nobody can place. The engraving stops mid-decade, " +
        "which is not when the winning stopped; it's when the engraver's shop closed. The " +
        "winning is continuous. Ask Bert. Or don't, if you have somewhere to be.",
    },
    revisit: [
      "Back into the Stinky Pinky — lime and cue chalk in defiance of the name, trophies crowding the back bar, the table brushed like a green.",
      "The pool bar takes you back. Bert holds the end stool with a bottomless Singha and an opinion on your break already loading.",
      "You step back into the crack of cue balls. Across the junction the Blue Dog's rail faces another sunset over the bay.",
      "The Stinky Pinky again: chalk, trophies, cold Singha, and Bert's court in permanent session at the end of the bar.",
      "Back under the buzzing skunk into the crack of pool balls and the smell of lime. Somebody's mid-break; Bert's already narrating it from the end stool.",
      "The Stinky Pinky folds you back in — league flags, brushed felt, the Blue Dog glowing across the mouth of the soi. Bert lifts his Singha a half-inch in greeting.",
      "You duck back in past the skunk sign. The regulars call it the Stinky and mean it fondly; the table's free, the Singha's cold, and Bert has a theory about your last shot.",
    ],
    exits: { out: "beach_rd_n" },
  },
  central_mall: {
    name: "Central Mall (Beach Road front)",
    region: "Beach Road",
    outlet: true,
    desc: "The air-conditioned mothership: seven storeys of glass, brand names, and " +
      "farang families who have no idea what this town does after dinner. Free " +
      "outlets by the food court, arctic air, and security guards who wai. Beach " +
      "Road glitters west; Second Road runs behind the mall to the east. The " +
      "police station squats a couple of blocks north like a paperweight — round " +
      "on the Beach Road side, not through here; nobody walks out of Central " +
      "Festival into a charge desk.",
    exits: { w: "beach_rd_c", e: "second_rd_mall" },
  },
  police_station: {
    name: "Pattaya Central Police Station",
    region: "Beach Road",
    desc: "Brown uniforms, whiteboards of unpaid fines, and a desk sergeant with the " +
      "unhurried patience of a man who has seen every possible farang. A wall of " +
      "confiscated selfie sticks. Sitting between the mall and the Beach Road bars, " +
      "it catches whatever the tide washes up. Best visited voluntarily.",
    exits: { w: "beach_rd_soi9" },
  },

  // ─── Second Road ───
  second_rd_s: {
    busStop: "secondrd",
    name: "Second Road (South)",
    region: "Second Road",
    desc: "The working road running parallel between Beach Road and Soi Buakhao — less " +
      "neon, more motorbikes, the town with its makeup half off. South it runs down to " +
      "the Pattaya Tai crossroads and the hill beyond; Buakhao is a block east, but " +
      "not from here — the sois between are somebody's back wall.",
    exits: { w: "beach_rd_s", n: "second_rd_diana", s: "pattaya_tai", spa: "second_thai" },
  },
  second_rd_c: {
    busStop: "secondrd",
    name: "Second Road (Central)",
    region: "Second Road",
    desc: "Mid-Second-Road: baht buses in convoy, pharmacies, and the constant churn of " +
      "a four-lane road that never quite stops. Soi 9 comes in from the beach side, " +
      "quiet and daytime-ish next to all this; the mall's Second Road entrance and " +
      "its run of food stalls is a block south, and MYTH NIGHT market further down again.",
    exits: { s: "second_rd_mall", n: "second_rd_soi8", soi9: "pattaya_soi_9" },
  },
  // Second Road's Soi Diana mouth. Until now the whole road was three rooms and
  // this junction had none, which left Soi Diana, Soi Honey and Myth Night all
  // pointing at whichever node happened to be nearest. It is also the first
  // 7-Eleven ON Second Road — the only nightlife spine that had neither shop
  // nor cash machine anywhere along it.
  second_rd_diana: {
    busStop: "secondrd",
    motosai: true,
    seven: true,
    atm: true,
    name: "Second Road (Soi Diana)",
    region: "Second Road",
    desc: "The mouth of Soi Diana, and Second Road doing what Second Road does: four " +
      "lanes of baht buses running nose to tail, a permanent shoal of motorbikes in " +
      "the gutter lane, and pavement so narrow that walking it is a negotiation. " +
      "The go-go neon starts about twenty metres up the soi and doesn't stop until " +
      "Buakhao. On this corner: a 7-Eleven with a cash machine, a knot of piwins " +
      "who have claimed the shade of its sign, and a girl on the back of a bike " +
      "checking her lipstick in a wing mirror at a red light.",
    revisit: [
      "The lights change. Nothing much happens, then everything does at once.",
      "A baht bus pulls in, three people get off, eleven decide not to get on.",
      "Somebody's just bought a toastie and is eating it leaning on the 7-Eleven " +
        "window, watching the soi like it's television.",
      "Two piwins argue amiably about a fare neither of them is being offered.",
    ],
    exits: { n: "second_rd_honey", s: "second_rd_s", e: "diana_w", spa: "diana_oil",
             mall: "mikes_mall" },
  },
  diana_oil: {
    name: "Bamboo Oil Massage",
    bar: "Bamboo Oil Massage",
    region: "Second Road",
    massage: "oil",
    desc: "Pink strip light, a beaded curtain, and three girls on plastic stools out " +
      "front who greet every passing farang with the same unhurried hello. Inside " +
      "it is cold, dim and clean, and the traffic on Second Road becomes a rumour.",
    exits: { out: "second_rd_diana" },
  },
  second_rd_n: {
    busStop: "secondrd",
    name: "Second Road (Soi 7)",
    region: "Second Road",
    desc: "Soi 7 comes out here and carries on east; the seafront is fifteen minutes " +
      "down it, or four with a piwin. Central Pattaya Road crosses just ahead, cutting " +
      "the whole town into north and south. Soi 8 comes out a block south — this " +
      "end of it is quiet, whatever the other end is doing. This block is a massage row: SMILE MASSAGE winks pink " +
      "from the west side, and opposite, four floors of blue neon spell POSEIDON MASSAGE " +
      "over a doorman and a fish tank.",
    exits: { s: "second_rd_soi8", n: "pattaya_klang", w: "pattaya_soi_7", e: "poseidon_soapy",
             spa: "smile_massage" },
  },
  pattaya_klang: { motosai: true, busStop: "secondrd",
    name: "Central Pattaya Road (Pattaya Klang)",
    region: "Second Road",
    desc: "The big east-west artery, bisecting Beach Road, Second Road, and Soi Buakhao " +
      "in one straight shot from the sea to Sukhumvit. Baht buses, banks, gold shops, " +
      "and a river of traffic that never quite jams and never quite flows.",
    exits: { w: "beach_rd_klang", n: "second_rd_soi6", s: "second_rd_n", e: "buakhao_klang" },
  },

  // ─── Shopping (Second Road) ───
  // The Night Bazaar is where the Soi Buakhao cloth traders went when Tree Town
  // took the old market's trade. Nit moved with them, which is why she is here
  // and not on Buakhao any more.
  night_bazaar: {
    name: "Pattaya Night Bazaar",
    bar: "Pattaya Night Bazaar",
    region: "Second Road",
    desc: "Aisle after aisle of the same forty things, and somehow you still slow " +
      "down. Elephant-print trousers, wooden frogs that croak when you run a stick " +
      "down their spine, {{phone}} cases, fake football shirts, and CHANG SINGLETS in " +
      "every size from optimistic to honest — the unofficial uniform of a certain " +
      "kind of holiday. Nobody quotes a first price they expect to get. Deeper in, " +
      "past the food court and its smell of frying garlic, the aisles turn quieter " +
      "and become cloth: bolts of it stacked to the roof, and the traders who moved " +
      "here from the Buakhao market when Tree Town took the trade.",
    reads: {
      frog: "The wooden frogs sit in ranks by size, spines ridged, and the stallholder " +
        "demonstrates without being asked: a stick down the back and the thing croaks, " +
        "convincingly, every time. Nobody needs one. Thousands go home in luggage every " +
        "high season, croaking through customs the world over.",
    },
    revisit: [
      "A vendor holds a Chang singlet against your chest without breaking " +
        "conversation with the woman on the next stall.",
      "Somewhere near the food court a wooden frog is being demonstrated, at length.",
      "The same forty things. You slow down anyway.",
      "Two Russian teenagers are haggling hard over something that costs less than " +
        "their bus fare here, and enjoying it enormously.",
    ],
    exits: { out: "myth_night" },
  },
  // Down-market by design, and the food court upstairs is where the fixed-income
  // expats eat — the same men the girls call cheap charlies, seen from the other side.
  mikes_mall: {
    name: "Mike's Mall",
    bar: "Mike's Mall",
    region: "Second Road",
    desc: "Four floors of strip-lit shopping for people counting it. Luggage, {{phone}} " +
      "repair, tailors who will do you a suit by Thursday, and a whole floor of " +
      "swimwear that has been there since before the swimwear was fashionable the " +
      "first time. The lift works most days. Up on the top floor is the food court: " +
      "laminated photo menus, a fifty-baht plate that is honestly enough food, and " +
      "a long table of men in their sixties and seventies who have been coming here " +
      "since it opened. Pension day is the busy one. They know each other's names, " +
      "and roughly what everyone's monthly is, and neither is ever mentioned.",
    revisit: [
      "The lift is out again. Everybody takes it in their stride and the stairs.",
      "Somebody at the long table upstairs is explaining the exchange rate to " +
        "somebody who already knows it.",
      "A tailor catches your eye through his doorway and does not press it.",
      "The food court smells, permanently and not unpleasantly, of frying garlic.",
    ],
    exits: { out: "second_rd_diana" },
  },

  // Second Road at the foot of Soi 6 — the junction is real and exact, and until
  // now the road simply stopped short of it, so Soi 6 dead-ended.
  second_rd_soi6: {
    busStop: "secondrd",
    motosai: true,
    name: "Second Road (Soi 6)",
    region: "Second Road",
    desc: "Second Road where Soi 6 runs into it, and the contrast does the work: " +
      "behind you a corridor of shouting neon, out here four lanes of traffic that " +
      "could not care less. Girls come out of the soi's mouth in ones and twos to " +
      "buy something from the stall on the corner and go straight back in. A " +
      "songthaew slows, reads the pavement, decides against it, and rolls on.",
    revisit: [
      "Somebody comes out of Soi 6 at speed, thinks better of it, and goes back in.",
      "The corner stall does steady business in cigarettes and cold water.",
      "Traffic, traffic, and the soi behind you making its noise into it.",
      "A girl in going-out clothes waits to cross, gives up, and walks the long way.",
    ],
    exits: { w: "soi6_deep", s: "pattaya_klang", n: "dolphin" },
  },

  pattaya_soi_7: {
    motosai: true,
    name: "Soi 7",
    region: "Beach Road",
    desc: "Quieter than its neighbours, and people who know the sois use it for exactly " +
      "that: guesthouses, a laundry, two minimarts facing each other in a war of " +
      "attrition, and a few small bars that shut when their last customer leaves " +
      "rather than when the clock says. It runs Beach Road to Second Road like the " +
      "rest of them, but nobody calls out as you pass, and the noise from Soi 8 " +
      "arrives one block late and secondhand.",
    revisit: [
      "Somebody is hosing the pavement outside a guesthouse, unhurried.",
      "The two minimarts continue their war. Neither is winning.",
      "A couple come out of a doorway not quite together and separate at the corner.",
      "Laundry steam, a television somewhere, and Soi 8 going off one block over.",
    ],
    exits: { w: "beach_rd_soi7", e: "second_rd_n", in: "short_time_motel" },
  },

  second_rd_honey: {
    busStop: "secondrd",
    name: "Second Road (Soi Honey)",
    region: "Second Road",
    desc: "Soi Honey opens east off Second Road here — a short bright soi that runs " +
      "through to Buakhao, and quiet enough at this end that you can hear the bars " +
      "at the other. Second Road does what it always does around it: four lanes, no " +
      "gaps, and a pavement everybody shares with the parked bikes.",
    revisit: [
      "The mouth of Soi Honey does steady, unhurried trade in people cutting through.",
      "A songthaew slows on spec, sees nobody moving, and carries on.",
      "Somebody is having a long {{phone}} call against the wall of the corner shop.",
      "A bike mounts the pavement to get round the queue, and nobody reacts.",
    ],
    exits: { s: "second_rd_diana", n: "second_rd_myth", e: "soi_honey_w" },
  },
  second_rd_mall: {
    busStop: "secondrd",
    name: "Second Road (Central Mall)",
    region: "Second Road",
    desc: "The mall's other face, and it is not a back door — CENTRAL MALL's signage runs " +
      "the full height of this side too, with its own entrance, its own escalators moving " +
      "behind the glass, and its own doorman. What the Beach Road front does not have is " +
      "the pavement: food stalls nose to tail the whole length of it, grilled pork and som " +
      "tam and fruit on ice, set up directly under the brand names. Mall staff, office " +
      "workers, and a steady trickle of people who have just walked out of an " +
      "air-conditioned food court and wanted the real thing thirty seconds later.\n\n" +
      "One stall stops everybody. A whole crocodile turns slowly on a spit over " +
      "charcoal, jaws wired shut, the length of a man — and the woman working it has " +
      "long since stopped looking up at the phones. She sells it by the skewer, and it " +
      "sells, and the people photographing it are almost never the people eating it.",
    reads: {
      crocodile: "The crocodile turns on its spit with its jaws wired shut, glazed and " +
        "patient, the length of a man. She sells it by the skewer. The queue is Thai, the " +
        "photographers are farang, and the two groups have politely agreed to find each " +
        "other ridiculous.",
    },
    revisit: [
      "The crocodile turns. Two people photograph it. Neither of them buys anything.",
      "Somebody comes out of the mall with a shopping bag and straight into a stall queue.",
      "Charcoal smoke drifting up a glass frontage. Nobody inside appears to mind.",
      "Signage four storeys high, and a som tam cart doing better business underneath.",
      "Somebody finally asks the crocodile woman a question. She answers without looking up.",
    ],
    exits: { n: "second_rd_c", s: "second_rd_myth", w: "central_mall" },
  },
  second_rd_myth: {
    busStop: "secondrd",
    name: "Second Road (Soi Myth Night)",
    region: "Second Road",
    desc: "The Soi Myth Night mouth, and you can tell it from a hundred metres by the " +
      "smell — grilled everything, drifting out of the lane on the back of a bassline. " +
      "The soi runs east to the night market and on to Buakhao. Out here it is just " +
      "Second Road, four lanes of it, but the corner has a queue for something.",
    revisit: [
      "The smell arrives before you do. It always does.",
      "The corner queue is for something. You cannot see what, and neither can they.",
      "Bass from up the soi, arriving in bits between the traffic.",
      "Two girls come out of the lane eating something on a stick, in no hurry at all.",
    ],
    exits: { s: "second_rd_honey", n: "second_rd_mall", e: "myth_night" },
  },

  // ─── Myth Night ───
  myth_night: { motosai: true,
    name: "Myth Night Market",
    region: "Myth Night",
    liveMusic: true,
    desc: "The newest bar complex in town, strung along the small road that runs from Second " +
      "Road east to the Made in Thailand mouth of Buakhao. Open-air beer bars, rows of them, and " +
      "every one is a variation on the same bar: the same cooler, the same stools out to the kerb, " +
      "the same fairy lights, the same girls who may or may not be going anywhere with anybody " +
      "tonight. One DJ plays for the whole complex and every bar in it hears him. North, two " +
      "covered rows face each other across a walking path; south, across the road, a third row " +
      "runs the same trade with less roof. CANDY BAR 2's rose-pink sign is unmistakably the same " +
      "pink as the original.",

    exits: { w: "second_rd_myth", e: "buakhao_myth", in: "candy_bar_2", n: "myth_stage", s: "myth_rows",
             bazaar: "night_bazaar" },
  },
  myth_stage: {
    name: "Myth Night — The Covered Rows",
    region: "Myth Night",
    liveMusic: true,
    desc: "Two rows of bars facing each other under one long roof, with a walking path up the " +
      "middle wide enough for two people and used by four. Every bar along it is the same bar with " +
      "a different name over the till — same cooler, same stools, same laminated list — so the " +
      "girls work the aisle rather than the street, leaning out as you pass and calling you back " +
      "when you don't stop. A couple of them are katoey bars and make no particular announcement " +
      "of it. THE AMP ROOM holds the far end, where the complex keeps its live music, and the " +
      "bathrooms everybody shares are behind it.",

    exits: { s: "myth_night", in: "amp_room", e: "feedback_bar", w: "encore_bar", n: "soundcheck_bar" },
  },
  amp_room: {
    name: "The Amp Room",
    region: "Myth Night",
    bar: "The Amp Room", barType: "beer", liveMusic: true, outlet: true,
    desc: "The far end of the covered rows, and the only stage in the complex: speaker cabinets " +
      "stacked to the roof, half of them decorative, all of them sticky. The beer is cold, the " +
      "bass is a full-body experience, and Ju has to lean in close to take your order — which " +
      "is, of course, the point.",

    exits: { out: "myth_stage" },
  },
  feedback_bar: {
    name: "Chok Dee Bar",
    region: "Myth Night",
    bar: "Chok Dee Bar", barType: "beer",
    desc: "Third along the covered row and indistinguishable from its neighbours until you sit " +
      "down, which is when Pat starts talking. The request slip for the complex DJ lives on a " +
      "clipboard by the till, and she has firm opinions about what you put on it. (READ BOARD.)",
    reads: {
      board: "Tonight's request sheet, biro on a laminated grid, one DJ for the whole complex " +
        "and every bar fighting for him. Someone has written 'HOTEL CALIFORNIA' three times in " +
        "three hands. Below it: 'sweet caroline — asked already, twice', a Thai luk thung title " +
        "nobody has crossed out, and 'anything, please, not hotel california'. The bottom line " +
        "is management's, in marker: 'ONE SONG ONE SLIP. DJ CANNOT SEE YOU WAVING.'",
    },

    exits: { out: "myth_stage" },
  },
  encore_bar: {
    name: "Sawasdee Bar",
    region: "Myth Night",
    bar: "Sawasdee Bar", barType: "beer",
    desc: "Fairy lights, low stools, and a battered acoustic guitar on a hook that everyone " +
      "threatens to play and nobody does. Pun keeps the tab and the peace, in that order.",

    reads: {
      guitar: "A battered acoustic on a wall hook, one string dead, the varnish worn to bare " +
        "wood where a forearm rests. Everyone who drinks here has threatened to play it. The " +
        "hook is the bar's most reliable act of public safety.",
    },
    exits: { out: "myth_stage" },
  },
  soundcheck_bar: {
    name: "Butterfly Bar",
    region: "Myth Night",
    bar: "Butterfly Bar", barType: "beer",
    desc: "Nearest the music end, so you order in the gaps between songs or not at all. Som " +
      "mouths the prices and holds up fingers, a whole transaction conducted in mime.",

    exits: { out: "myth_stage" },
  },
  myth_rows: {
    name: "Myth Night — The Third Row",
    region: "Myth Night",
    desc: "Across the small road from the covered pair, the third row does the same trade with " +
      "less roof over it: open fronts, plastic stools out to the kerb, a strip of tarmac doing " +
      "duty as a terrace. The DJ arrives a half-beat late from the other side and nobody minds. " +
      "A few baht cheaper and a degree quieter, and the staff know exactly which of those two " +
      "facts brought you across.",

    exits: { n: "myth_night", in: "craft_cargo", e: "the_growler", w: "container_8", s: "reload_bar" },
  },
  craft_cargo: {
    name: "Number One Bar",
    region: "Myth Night",
    bar: "Number One Bar", barType: "beer", outlet: true,
    desc: "First bar in the third row, named with the confidence of whoever got here first. Mam " +
      "runs it with the calm of a woman who has poured through every kind of night, and keeps " +
      "the coldest cooler on this side of the road.",

    exits: { out: "myth_rows" },
  },
  the_growler: {
    name: "Coco Bar",
    region: "Myth Night",
    bar: "Coco Bar", barType: "beer",
    desc: "A good stool, a cheap pour, and Jib behind the bar who remembers your drink before " +
      "your name. On the back shelf, half a dozen dusty jars of something homemade that nobody " +
      "has ever ordered.",

    reads: {
      shelf: "Half a dozen dusty jars of something homemade on the back shelf — fruit at " +
        "the bottom, spirit on top, labels in a hand nobody current can read. Nobody has " +
        "ever ordered one. They came with the bar, like the wiring, and each owner has " +
        "quietly decided the same thing: some inventory is structural.",
    },
    exits: { out: "myth_rows" },
  },
  container_8: {
    name: "Venus Bar",
    region: "Myth Night",
    bar: "Venus Bar", barType: "beer",
    desc: "Eighth along the row, and the number outlasted whatever the sign said before it. Toon " +
      "keeps a jar of chilli-lime peanuts on the bar as bait, and it works on everybody.",

    reads: {
      jar: "Toon's jar of chilli-lime peanuts, parked exactly where a hand rests between " +
        "sips. Bait, and everyone knows it's bait, and it works anyway — one handful and " +
        "your mouth needs a beer, and the beer needs company. The jar has paid for itself " +
        "ten thousand times.",
    },
    exits: { out: "myth_rows" },
  },
  reload_bar: {
    name: "Sunflower Bar",
    region: "Myth Night",
    bar: "Sunflower Bar", barType: "beer",
    desc: "The last bar in the row before the wall, where the crowd washes up to steady itself " +
      "before another lap. Yaya works the rail, quick with a coaster and quicker with a joke.",

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
  ws_gate: { motosai: true,
    name: "Walking Street Gate",
    region: "Walking Street",
    seven: true,
    desc: "The arch is still there — WALKING STREET PATTAYA, buzzing and flickering, famous " +
      "enough that people photograph it before they've seen what's behind it. The strip runs " +
      "south. It used to be louder. The gap between what this street was and what it is now " +
      "is not visible from the gate, but you'll feel it by the time you reach the other end. " +
      "Just east, RUEAN SABAI THAI MASSAGE has a row of foot chairs out for the walking " +
      "wounded.",
    exits: { s: "ws_north", n: "beach_rd_s", e: "pattaya_tai", spa: "thai_massage" },
  },
  ws_north: {
    atm: true,
    name: "Walking Street (North)",
    region: "Walking Street",
    desc: "Neon canyon, but the neon mix has changed. Bollywood bass competes with Thai pop " +
      "from somewhere inside Little India's encroachment from the east — restaurant signs in " +
      "Hindi above what used to be go-go bars, the smell of curry drifting across the touts. " +
      "NEON PARADISE A-GO-GO still strobes on the west side. CLUB MIRAGE shimmers opposite. " +
      "The touts with the laminated menus are still here. A dark side-alley slinks off " +
      "between them.",
    exits: { n: "ws_gate", s: "ws_south", w: "neon_paradise", e: "club_mirage", in: "neon_paradise", out: "ws_gate", alley: "ws_alley",
             diamond: "soi_diamond" },
  },
  ws_alley: {
    name: "Walking Street Side-Alley",
    region: "Walking Street",
    dark: true,
    desc: "Kitchen steam, stacked kegs, a motorbike with no plates. The kind of alley " +
      "where wallets change hands in both directions.",
    exits: { out: "ws_north", e: "ws_north" },
  },
  ws_south: {
    name: "Walking Street (South)",
    region: "Walking Street",
    desc: "The deep end of the strip, where the go-gos that survived COVID hold their ground " +
      "through stubbornness and reputation. CRYSTAL PALACE A-GO-GO at the west, PARADISE " +
      "NIGHTS CLUB beside it. MIDNIGHT SUN BAR glows a quieter yellow at the south end — " +
      "beer bar, conversation levels, the kind of place you end up after you've stopped " +
      "trying. Late enough, the whole strip fills with barfined ladies and their friends " +
      "en route to the clubs.",
    exits: { n: "ws_north", w: "crystal_palace", e: "paradise_nights", s: "midnight_sun",
             pier: "bali_hai" },
  },
  neon_paradise: {
    name: "Neon Paradise A-Go-Go",
    region: "Walking Street",
    bar: "Neon Paradise A-Go-Go", barType: "gogo",
    desc: "Chrome poles, mirror walls, a sound system you feel in your fillings. The dancers " +
      "rotate with the unhurried confidence of professionals — fewer of them than there used " +
      "to be, and the room notices, but the ones here are good. Security by the door: two " +
      "large gentlemen who have never once been surprised and are not about to start.",
    revisit: [
      "Back into Neon Paradise — chrome poles, mirror walls, that sound system finding your fillings again.",
      "The go-go folds you back into its cold and its bass. The dancers turn on the numbers; the room runs without you.",
      "Neon Paradise again: fewer girls than the mirrors were built for, but the ones working the poles are worth the walk.",
      "You slip back past the two large gentlemen at the door — neither surprised to see you — into the mirrored roar.",
    ],
    exits: { out: "ws_north" },
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
    revisit: [
      "Back into Club Mirage — ankle-deep dry ice, violet lasers slicing through it, everything looking better than it has any right to.",
      "The Mirage takes you back: the fog, the thin violet lines, the crowd of tourists and off-shift girls drinking on somebody's tab.",
      "You wade back into the dry ice. The lasers cut, the model holds, and everyone in here looks improved by the dark.",
      "Club Mirage again. Somewhere in the fog Aom is already noting your return; you won't see her cross the floor.",
    ],
    exits: { out: "ws_north" },
  },
  // The end of the strip and the end of the night for most people: songthaews,
  // piwins, and the Koh Larn boats. It is a HUB, which is the point — everyone
  // leaves from here, so everyone passes through.
  bali_hai: {
    motosai: true,
    // no busStop: the pier trucks are charters, not the loop (2026-08-15 canon)
    name: "Bali Hai Pier",
    region: "Walking Street",
    desc: "Walking Street runs out of neon and hands you to the water. The pier goes " +
      "out into the dark on concrete legs, the Koh Larn boats tied up for the night " +
      "with their awnings rolled, and the bay doing that thing where it looks " +
      "enormous and completely quiet a hundred metres from the loudest street in " +
      "Thailand. Behind you the strip is still going. In front of you a row of " +
      "songthaews wait with their engines off and their drivers asleep across the " +
      "benches, and the piwins have the good corner by the ramp because the piwins " +
      "always have the good corner. South the road starts climbing Pratumnak " +
      "almost at once — no pavement, no lighting worth the name, and the hill " +
      "between here and Jomtien.",
    revisit: [
      "A songthaew fills, doesn't quite fill, waits. Somebody always wants one more.",
      "Out on the water a boat's rigging knocks against its mast, unhurried.",
      "Two piwins are asleep on their bikes in a way that looks impossible and isn't.",
      "Somebody photographs the pier, gets it wrong, and tries again.",
    ],
    exits: { n: "ws_south", s: "pratumnak_rd" },
  },
  // Soi Diamond runs off Walking Street to Second Road — 153 m of it, and two of
  // the loudest rooms on the coast.
  soi_diamond: {
    motosai: true,
    name: "Soi Diamond",
    region: "Walking Street",
    desc: "A short soi off the main strip, and louder than the main strip, which takes " +
      "doing. Two doors face each other across eight metres of wet concrete and " +
      "spend the night trying to out-decibel one another: THE WINDMILL on one side, " +
      "KATOEY'S R US on the other, both with their own doorman, their own flyer " +
      "girl, and their own idea of what a good time looks like. Between them the " +
      "soi is a corridor of noise you have to walk down sideways when it is busy. " +
      "It comes out on Second Road at the far end, if you get that far.",
    revisit: [
      "The two doors are still shouting at each other across the soi. Neither is winning.",
      "A flyer girl presses something into your hand without breaking off her " +
        "conversation with the flyer girl from the other side.",
      "Somebody comes out of one door, thinks about it, and goes in the other.",
      "The bass from both sides meets in the middle of the soi and cancels into mush.",
    ],
    exits: { w: "ws_north", s: "second_rd_diamond", in: "windmill", out: "ws_north" },
    venues: ["windmill", "katoeys"],
  },
  windmill: {
    name: "The Windmill",
    region: "Walking Street",
    bar: "The Windmill", barType: "gogo",
    pool: false,
    desc: "The house that decided restraint was somebody else's problem. Three tiers of " +
      "stage, a lighting rig with more ambition than the budget behind it, and a " +
      "show that escalates all night on a schedule the regulars can recite. Nobody " +
      "here is pretending it is a bar with dancing in it. The drinks are dear, the " +
      "front row is a commitment, and the whole room runs on the understanding that " +
      "you knew exactly what this was when you came down the steps.",
    revisit: [
      "Back into the Windmill. Whatever is happening on the middle tier has a crowd.",
      "The lighting rig attempts something beyond it and gets away with it anyway.",
      "A cheer goes up from the front row for reasons you are two beats behind on.",
      "The Windmill, doing what the Windmill does, at volume.",
    ],
    exits: { out: "soi_diamond" },
  },
  katoeys: {
    name: "Katoey's R Us",
    region: "Walking Street",
    bar: "Katoey's R Us", barType: "gogo",
    desc: "Six feet of everything, all of it deliberate. The house is katoey and says " +
      "so on the sign, which is the point — nobody here is passing, or trying to, " +
      "and the room is funnier and sharper for it. The heels are higher than " +
      "anywhere on the street, the lip-sync is better than it has any need to be, " +
      "and the front-of-house patter would empty a comedy club. Punters arrive by " +
      "three routes: they know, they suspect, or they are about to find out, and " +
      "the staff can tell which from the door.",
    revisit: [
      "Back into Katoey's. Somebody on stage is doing Whitney and doing her justice.",
      "A punter two stools down is being taken apart, fondly, in two languages.",
      "The heels come past at eye level and somebody at the rail applauds.",
      "Katoey's R Us, running at a pitch the rest of the soi cannot reach.",
    ],
    exits: { out: "soi_diamond" },
  },
  pattaya_tai: {
    motosai: true,
    busStop: "loop",
    name: "South Pattaya Road (Pattaya Tai)",
    region: "Walking Street",
    desc: "The junction at the bottom of everything. South Pattaya Road comes down from " +
      "the east and meets Second Road here, a hundred metres short of the Walking " +
      "Street arch, and at two in the morning it is the busiest crossroads in the " +
      "city — every songthaew in the south end circling it, piwins stacked three " +
      "deep on the corner, and a slow river of people who have finished with the " +
      "strip and not yet decided what happens next. Pratumnak Hill goes up and away " +
      "to the south. Somebody is selling grilled squid to a queue.\n\nThis is THE " +
      "songthaew stop, and which corner you stand on is the whole decision: the " +
      "north-west corner is filling for the run north — up Second Road toward " +
      "Terminal 21 — and the south-east corner is filling for Jomtien, and neither " +
      "truck moves until its benches are full. The whole town runs one-way, " +
      "counter-clockwise, so stand on the wrong corner and you will get where you " +
      "are going eventually, the long way round, for the same fifteen baht.",
    revisit: [
      "The crossroads does its thing: everybody moving, nobody quite leaving.",
      "A songthaew crawls the junction with its driver leaning out, naming prices.",
      "The squid man has a queue. The squid man always has a queue.",
      "Two piwins settle an argument about whose fare you are before you have spoken.",
    ],
    exits: { w: "ws_gate", n: "second_rd_s", e: "buakhao_pt", s: "second_rd_diamond" },
  },
  buakhao_pt: {
    motosai: true,
    name: "Soi Buakhao (Pattaya Tai)",
    region: "Soi Buakhao",
    desc: "The foot of Soi Buakhao, where it ends on South Pattaya Road and the bar strip " +
      "stops dead. Four lanes of through-traffic, a piwin stand working the corner, and " +
      "the particular flatness of a junction nobody drinks at. West along Pattaya Tai " +
      "takes you past Tukcom — four floors of {{phone}} counters and repair booths, dark " +
      "and shuttered at this hour — and on to Second Road. North is the soi and " +
      "everything that happens on it.",
    revisit: [
      "Through-traffic, and the soi's noise starting a hundred metres north.",
      "A piwin looks up, reads you as someone going somewhere, and waits.",
      "Tukcom's frontage sits dark down the road, all shutters and dead signage.",
      "Nobody lingers on this corner. It isn't a corner for lingering on.",
    ],
    exits: { n: "buakhao_s", w: "pattaya_tai" },
  },
  second_rd_diamond: {
    busStop: "secondrd", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    motosai: true,
    name: "Second Road (Soi Diamond)",
    region: "Second Road",
    desc: "Second Road where Soi Diamond comes in — the same Soi Diamond that opens onto " +
      "Walking Street at its far end, which makes this the back door to the strip and " +
      "the way the people who work there actually arrive. Girls come up it in ones and " +
      "twos with helmets under their arms, an hour before anyone is meant to see them. " +
      "North is the big Pattaya Tai crossroads; south the road runs down toward the hill.",
    revisit: [
      "Two girls come up the soi in street clothes, unhurried, off the clock.",
      "The strip is four hundred metres that way and you cannot hear a thing of it.",
      "A motosai turns into the soi without slowing, because he has done it all night.",
      "Traffic north, the dark of the hill road south, and the soi mouth between.",
    ],
    exits: { n: "pattaya_tai", s: "second_rd_india", diamond: "soi_diamond" },
  },
  second_rd_india: {
    busStop: "secondrd", // on the route — hail-anywhere, no formal stop (2026-08-15 canon)
    name: "Second Road (Pratumnak end)",
    region: "Second Road",
    desc: "The long haul of Second Road between Soi Diamond and the hill, and the expats " +
      "have a name for this stretch they don't say kindly. What is actually wrong with " +
      "it is the pavement: there isn't one worth the word — broken kerb, parked bikes " +
      "nose-in, a shop's worth of stock set out across it — so everybody walks in the " +
      "road, and here everybody is a great many people at once. Tour groups come " +
      "through six and eight at a time, three abreast, friends hand in hand the way " +
      "friends are across most of the world and farang reliably misread, moving at the " +
      "speed of the conversation they are having. The bikes stack up behind them, fold " +
      "around, and lean on the horn; the piwins have views, at volume, in Thai. " +
      "Tailor shops down both sides, a currency booth beating the bank, and a tandoor " +
      "going somewhere out of sight that smells better than anything on Beach Road.",
    revisit: [
      "A rank of walkers eight across, at conversation pace. The bikes fold around them.",
      "Somebody leans on a horn for four unbroken seconds. Nothing whatsoever changes.",
      "You step down into the road as well, because there is nowhere else to step.",
      "Tandoor smoke out of a doorway, and a queue of bikes behind a slow group.",
      "A tailor gets as far as \"sir\" before the crowd carries you out of his range.",
    ],
    exits: { n: "second_rd_diamond", s: "pratumnak_rd" },
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
    reads: {
      poster: "The faded poster: dancers in numbered order, feathered and rhinestoned, a " +
        "lineup from a different decade. Nobody in it works here now. One of them, the " +
        "regulars will tell you quietly, owns the place — and looking from the poster to " +
        "the office door, you can believe it.",
    },
    revisit: [
      "Back into Crystal Palace — rhinestones on everything that holds still, the cashier's cage glittering like a shrine.",
      "The old go-go takes you back: subs you feel in the floor, and that carried-lightly dignity of a room older than its dancers.",
      "You step back into the glitter and the bass. Crystal Palace has seen every kind of man walk back in; it isn't impressed, exactly.",
      "Rhinestones, a wall of subs, decades of numbered girls on the faded poster — Crystal Palace, exactly as you left it.",
    ],
    exits: { out: "ws_south" },
  },
  paradise_nights: {
    name: "Paradise Nights Club",
    region: "Walking Street",
    bar: "Paradise Nights Club", barType: "club",
    desc: "Velvet rope, wristbands, drinks that cost like a departure lounge. The floor " +
      "heaves — tourists, freelancers working the margins, bar girls two hours past their " +
      "shift in trainers and someone else's jacket. Ping is everywhere at once. The bass " +
      "physically shortens the room.",
    revisit: [
      "Back past the velvet rope into Paradise Nights — wristbands, departure-lounge prices, and a floor that heaves.",
      "The club swallows you again: bass that physically shortens the room, and Ping somehow everywhere at once.",
      "You push back into the crush — tourists, freelancers, girls two hours past their shift dancing in someone else's jacket.",
      "Paradise Nights again. The rope, the wristband, the wall of bass; the night here has no intention of ending.",
    ],
    exits: { out: "ws_south" },
  },
  midnight_sun: {
    name: "Midnight Sun Bar",
    region: "Walking Street",
    bar: "Midnight Sun Bar", barType: "beer", pool: true,
    desc: "An open-front beer bar with actual conversation levels. Connect 4 boards and " +
      "sticky Jenga blocks on every table, and a pool table under a low lamp at the " +
      "back. The yellow neon sun above the till has one ray that won't stop twitching.",
    exits: { out: "ws_south" },
  },

  // ─── Soi Buakhao ───
  // Soi Buakhao runs Pattaya Klang down to Pattaya Tai, and for years the game
  // had three rooms for the whole of it. These two open the northern half, where
  // the real junctions are: Klang at the top, then Soi Made In Thailand where
  // Myth Night runs west and the Tree Town arch stands east.
  buakhao_klang: {
    motosai: true,
    seven: true,
    atm: true,
    name: "Soi Buakhao (Klang End)",
    region: "Soi Buakhao",
    desc: "Where the soi gives up and hands you to Central Pattaya Road. The traffic " +
      "arrives here to die: two baht buses nose to tail with nowhere to go, a third " +
      "wedged across the mouth of the junction while its driver leans out and " +
      "negotiates with nobody in particular. The motorbikes don't wait. They come " +
      "through the gaps in a steady braided stream — a girl side-saddle in six-inch " +
      "heels holding her hair down with one hand, a punter on the back of another " +
      "with his knees out like a man being carried to somewhere he didn't choose. " +
      "A 7-Eleven throws cold white light across the whole slow mess, and the piwins " +
      "at the corner watch it the way farmers watch weather.",
    revisit: [
      "The junction has rearranged itself and changed nothing. Different buses, " +
        "same standstill; the bikes still find the holes.",
      "A baht bus driver has switched his engine off, which on Buakhao is a kind of " +
        "surrender. The bikes stream past him on both sides.",
      "Somebody's horn goes and goes and achieves precisely what horns achieve here.",
      "Two piwins are eating noodles off the seat of a parked bike, unhurried, " +
        "watching the traffic fail to move.",
    ],
    exits: { w: "pattaya_klang", s: "buakhao_myth", spa: "klang_massage" },
  },
  buakhao_myth: {
    motosai: true,
    name: "Soi Buakhao (Made in Thailand)",
    region: "Soi Buakhao",
    desc: "The middle of the artery, and the busiest crossing on it. Soi Made In " +
      "Thailand opens west — the night plaza, and past it the lane becomes Soi Myth " +
      "Night and runs on to Second Road. The TREE TOWN arch is a block south, doing " +
      "fairy-lit best to look like an entrance to somewhere. Between the two, the " +
      "soi itself is barely moving: a baht bus at walking pace with four people " +
      "hanging off the back step, motorbikes threading the gap between it and the " +
      "parked cars, and everyone on the pavement stepping around a plastic table " +
      "that has been there long enough to count as architecture.",
    revisit: [
      "A bike goes through the gap between the baht bus and the kerb with maybe a " +
        "hand's width to spare, and nobody watching thinks anything of it.",
      "The plastic table has acquired two more chairs and a card game.",
      "Somebody's shopping bag splits at the arch. The soi flows round it.",
      "A baht bus stops dead to let a girl off, and forty people behind it wait.",
    ],
    exits: { n: "buakhao_klang", s: "buakhao_tt", w: "myth_night", spa: "myth_massage" },
  },
  klang_massage: {
    name: "Klang Corner Massage",
    bar: "Klang Corner Massage",
    region: "Soi Buakhao",
    massage: "legit",
    desc: "A narrow shopfront wedged between a laundry and a shuttered {{phone}} repair " +
      "stall, close enough to the junction that the traffic noise comes through the " +
      "wall. Four mats, a fan on a stand, and a lady who has been doing this for " +
      "twenty years and can tell from your walk which shoulder is the problem.",
    exits: { out: "buakhao_klang" },
  },
  myth_massage: {
    name: "Plaza Thai Massage",
    bar: "Plaza Thai Massage",
    region: "Soi Buakhao",
    massage: "legit",
    desc: "Right on the corner of the plaza, doors open to the soi so the whole " +
      "street can watch a row of farang being folded in half. Nobody minds. There " +
      "is a hand-lettered price list, a stack of loose cotton trousers, and a kettle " +
      "that never quite goes off the boil.",
    exits: { out: "buakhao_myth" },
  },
  buakhao_tt: {
    motosai: true,
    name: "Soi Buakhao (Tree Town Arch)",
    region: "Soi Buakhao",
    desc: "The TREE TOWN arch stands west off the soi, strung with fairy lights and " +
      "swallowing tourists at a steady rate. Out here the traffic has thickened to " +
      "a crawl — a baht bus stopped dead with its back step crowded, another behind " +
      "it, and the bikes going round the pair of them on whichever side has opened " +
      "up. Two girls on the back of one wave at somebody they know outside the arch. " +
      "The pavement is a single file of people going the other way.",
    revisit: [
      "The arch has swallowed another four, and returned three of somebody else’s.",
      "A baht bus has given up entirely. Its driver is having a cigarette on the step.",
      "Bikes, bikes, a gap, then more bikes. You could wait all night for a real one.",
      "Somebody comes out of Tree Town walking carefully and smiling at nothing.",
    ],
    exits: { n: "buakhao_myth", s: "buakhao_honey", w: "tt_entrance" },
  },
  buakhao_honey: {
    name: "Soi Buakhao (Soi Honey)",
    region: "Soi Buakhao",
    desc: "Soi Honey comes out here, narrow and pink-lit, and for about ten metres the " +
      "noise of it competes with the soi's own. The Metro mouth is a few doors south, " +
      "which makes this stretch of pavement a permanent bottleneck: two alleys emptying " +
      "into one road, everybody crossing to the other side to get round everybody else.",
    revisit: [
      "Two alleys' worth of people trying to occupy one pavement, as usual.",
      "Somebody comes out of Soi Honey at a clip and has to stop dead for the traffic.",
      "The bottleneck resolves itself, briefly, then doesn't.",
      "A motorbike noses out of the soi, waits, gives up, waits again.",
    ],
    exits: { n: "buakhao_tt", s: "buakhao_lk", w: "soi_honey_e" },
  },
  buakhao_lk: {
    motosai: true,
    name: "Soi Buakhao (Metro Alley)",
    region: "Soi Buakhao",
    desc: "The mouth of LK Metro, and you can hear it before you reach it — three lanes " +
      "of go-go bleeding into the soi through a gap barely wide enough for two people " +
      "and a motorbike, which is what is usually in it. Soi Honey comes out a few doors " +
      "north. The traffic here does not so much move as take turns, and the pavement " +
      "has given up and become part of the road.",
    revisit: [
      "The noise from the alley mouth arrives before you do, as usual.",
      "A motorbike comes out of LK Metro without looking. Nothing happens. It never does.",
      "Two girls in going-out clothes cut through from Soi Honey, already late.",
      "The gap swallows a group of six and returns none of them.",
    ],
    exits: { n: "buakhao_honey", s: "buakhao_n", w: "lk_main" },
  },
  buakhao_n: {
    name: "Soi Buakhao (Soi Diana)",
    region: "Soi Buakhao",
    seven: true,
    desc: "The expat artery: pharmacies, laundry, bars, repeat. ROCK FACTORY's two-storey " +
      "stage looms on the corner — currently doing what every band in Thailand does to " +
      "'Hotel California' and somehow getting away with it. LUCKY TIGER BAR is just east. " +
      "South is the old market block, which has not been a market since Tree Town took " +
      "the trade. A small handwritten LK METRO arrow on a wall points " +
      "down an alley — easy to miss, worth finding. Soi Diana opens off the 7-Eleven on " +
      "the corner here, its go-go neon running away west. A few doors down the quiet " +
      "side, CANDY BAR's rose-pink sign keeps its own hours — far enough off the main " +
      "drag that the soi forgets about it until about three in the morning, which is " +
      "roughly when it fills up. If you're after the mamasan, that's her door (ENTER CANDY BAR).",
    reads: {
      sign: "The LK METRO arrow: black marker on a scrap of board wired to the wall, pointing " +
        "down an alley that promises nothing. LK Metro — three lanes of go-go and short-time " +
        "rooms named, like half of Pattaya, after the hotel it grew up around. The arrow knows " +
        "exactly what it's selling. It just won't say so out loud.",
    },
    exits: { n: "buakhao_lk", s: "buakhao_market", e: "lucky_tiger",
             in: "rock_factory", alley: "lk_entrance", hotel: "metropole_room", diana: "diana_e",
             candy: "candy_bar", charlie: "cheap_charlies" },
  },
  buakhao_market: {
    atm: true,
    name: "Soi Buakhao (Old Market)",
    region: "Soi Buakhao",
    desc: "The block everyone still calls the market, though the market went years ago — " +
      "Tree Town took the trade and the tarps came down. What is left is the shape " +
      "of it: shophouse fronts too wide for what they sell now, a som tam cart " +
      "holding the corner out of sheer stubbornness, and a smell of papaya salad " +
      "that could still pull you here from two sois away. SILK ROSE shares the block " +
      "east, and a pink-lit shopfront a few doors down promises the oil is warm.",
    reads: {
      market: "You can still read the market in the bones of the block: shophouse fronts " +
        "built wide for stalls that aren't there, iron rings in the concrete where the " +
        "tarp ropes tied off, a gutter worn smooth by decades of morning wash-downs. The " +
        "som tam cart on the corner is the last stall standing, and it isn't leaving.",
    },
    exits: { n: "buakhao_n", s: "buakhao_s", e: "silk_rose", spa: "buakhao_oil" },
  },
  buakhao_s: {
    name: "Soi Buakhao (South)",
    region: "Soi Buakhao",
    desc: "The bottom of the soi, where Buakhao runs out of bars and hands you down to " +
      "South Pattaya Road. The neon thins, the pavement widens, and the noise arrives " +
      "from behind you rather than around you. A motosai stand waits by the corner with " +
      "its engines ticking, because this is where people finally admit they are going home.",
    revisit: [
      "Quieter down here. You can hear individual motorbikes again.",
      "A piwin looks up hopefully, then goes back to his phone.",
      "Somebody walks past going north, still fresh, an hour behind you.",
      "The last of the bar noise, arriving from behind and thinning as it comes.",
    ],
    motosai: true,
    exits: { n: "buakhao_market", s: "buakhao_pt", in: "jasmine_garden" },
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
    revisit: [
      "Back in Candy's rose-pink corner — the bell, the wall of photos, the harbourmaster order of it, all exactly where you left them.",
      "Candy Bar again: spotless glasses, the bell waiting over the till, decades of faces watching from the wall.",
      "The rose-pink light folds back around you. Nothing here is ever out of place — the boss's standards hold whether or not the boss is on the floor tonight.",
      "You duck back into Candy's — same corner, same shine, the same small empire humming along without a wasted motion.",
    ],
    reads: {
      photos: "Decades of the same corner, four deep along the wall. The bar barely changes " +
        "— the bell, the pink, the stools — and the haircuts date every frame to the year. " +
        "Candy is in most of them and gets younger as you go left. In the oldest she is " +
        "twenty, in somebody else's uniform, behind somebody else's bar \u2014 an open front " +
        "on a street of open fronts, three colours of neon, a stool by the road. Soi 6. She " +
        "made the money there that bought this corner, and she has never once pretended " +
        "otherwise.",
    },
    exits: { out: "buakhao_n" },
  },
  // The FIRST one. There is a branch on Jomtien Soi 7 now, but this is the shop
  // that gave the rest of the coast a phrase for a certain kind of man.
  cheap_charlies: {
    name: "Cheap Charlie's",
    bar: "Cheap Charlie's",
    region: "Soi Buakhao",
    food: true,
    desc: "Six stools, a chest freezer, a laminated board of numbered dishes and a " +
      "chalked one underneath it that says WHATEVER SHE MADE TODAY. Forty baht gets " +
      "you fed; sixty gets you fed properly. Half the men in here have been eating " +
      "at this counter since before the branch in Jomtien existed, and they will " +
      "tell you so. The original, they say, with the particular pride of people who " +
      "found something cheap before it was famous for being cheap.",
    reads: {
      board: "The laminated board: dishes 1 through 14, photographed a decade ago under " +
        "lighting that has aged worse than the food. Below it, the chalked one — WHATEVER " +
        "SHE MADE TODAY — which the regulars order by pointing at the kitchen. It has " +
        "never once been a mistake.",
    },
    exits: { out: "buakhao_n" },
  },
  lucky_tiger: {
    name: "Lucky Tiger Bar",
    region: "Soi Buakhao",
    // pool: the desc has always advertised "a pool table with a lean you could
    // ski off" — the examine-audit caught the mechanic not honouring the prose.
    bar: "Lucky Tiger Bar", barType: "beer", liveMusic: true, pool: true,
    desc: "Tiger stripes on the bar top, a golden waving cat with dead batteries, and a " +
      "pool table with a lean you could ski off. Loud, friendly, dangerous to wallets " +
      "in the normal, voluntary way.",
    revisit: [
      "Back into Lucky Tiger — tiger stripes down the bar top, the golden cat waving on dead batteries, the pool table with its ski-slope lean.",
      "The bar takes you back loud and friendly, and dangerous to your wallet in the normal, entirely voluntary way.",
      "You rack up on the leaning table again. The waving cat keeps not waving; nobody's replaced the batteries in years.",
      "Lucky Tiger again — stripes, that tilted table, and the cheerful certainty you'll leave lighter than you came.",
    ],
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
  tt_entrance: { motosai: true,
    atm: true,
    name: "Tree Town (Entrance Arch)",
    region: "Tree Town",
    seven: true,
    desc: "The neon arch of TREE TOWN, gateway to a pocket maze of go-gos and beer bars. " +
      "Painted directions in Thai point into the tangle. Shared security lounges by the " +
      "arch on plastic stools — bounce out of one bar here and you've bounced out of all of them.",
    sign: "maze_entrance",
    exits: { e: "buakhao_tt", in: "tt_lane_1", w: "tt_lane_1" },
  },
  tt_lane_1: {
    name: "Tree Town (Inner Lane)",
    region: "Tree Town",
    desc: "Bars stacked shoulder to shoulder, neon bleeding into neon. GOLD RUSH LOUNGE " +
      "glitters to the north. Painted Thai arrows on the wall offer guidance to those " +
      "who can read them.",
    sign: "maze_1",
    exits: { e: "tt_entrance", n: "gold_rush", w: "tt_lane_2", s: "tt_back", in: "gold_rush" },
  },
  tt_lane_2: {
    name: "Tree Town (Cross Lane)",
    region: "Tree Town",
    desc: "A junction where the lanes cross and the signage starts to feel personal — like " +
      "it was designed to confuse. STARLIGHT BAR's blue sign fizzes at the north corner. " +
      "Thai arrows point in three directions, contradicting each other with quiet confidence.",
    sign: "maze_2",
    exits: { e: "tt_lane_1", n: "starlight_bar", w: "tt_deep", s: "tt_back", in: "starlight_bar" },
  },
  tt_back: {
    name: "Tree Town (Back Lane)",
    region: "Tree Town",
    dark: true,
    desc: "The maze's unlit armpit: kitchen doors, a mop graveyard, and rats with " +
      "routines. Without light, every exit feels like the same wrong one. South, past " +
      "the bins, a FAR LANE of cheap bars nobody photographs leaks a little warm light.",
    sign: "maze_3",
    exits: { n: "tt_lane_1", e: "tt_lane_2", w: "tt_deep", s: "tt_lane_3" },
  },
  tt_lane_3: {
    name: "Tree Town (Far Lane)",
    region: "Tree Town",
    desc: "The cheap seats of the maze, behind the kitchens where the rent drops and the " +
      "neon budget with it: three little bars under one sagging string of bulbs. THE RABBIT " +
      "HOLE, LUCKY CHARM BAR, and MOONSHINE BAR trade the regulars who ran out of maze. " +
      "Friendlier than it has any right to be down here.",
    exits: { n: "tt_back", in: "rabbit_hole", w: "lucky_charm", e: "moonshine_bar" },
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
    reads: {
      horseshoe: "Horseshoes over the door and along the beams — some iron, some plastic, " +
        "one drawn in marker where a real one fell and was never replaced. Below them the " +
        "four-leaf clovers, the lottery-number shrine, the whole apparatus of luck, " +
        "maintained with the seriousness other bars reserve for the till.",
    },
    exits: { out: "tt_lane_3" },
  },
  moonshine_bar: {
    name: "Moonshine Bar",
    region: "Tree Town",
    bar: "Moonshine Bar", barType: "beer",
    desc: "A jars-on-the-shelf hillbilly theme done on a Pattaya budget — fairy lights in " +
      "mason jars, a banjo nobody plays, ya dong in an unlabelled bottle for the brave. Prik " +
      "and Mek run the rail and dare you to try the house infusion.",
    reads: {
      jar: "The mason jars hold the house infusions: ya dong in half a dozen ambers and " +
        "browns, roots and bark and one jar with something coiled in it that Prik will only " +
        "call 'vitamin'. The unlabelled bottle is the strong one. The banjo on the wall is " +
        "for after the unlabelled bottle.",
    },
    exits: { out: "tt_lane_3" },
  },
  tt_deep: {
    name: "Tree Town (Deep Corner)",
    region: "Tree Town",
    dark: true,
    desc: "The deepest corner of the maze, where the neon gives out entirely. One big " +
      "sign burns at the end of the lane: RAINBOW GIRLS BAR, every letter a different colour.",
    sign: "maze_4",
    exits: { e: "tt_lane_2", n: "tt_back", w: "rainbow_girls", in: "rainbow_girls" },
  },
  gold_rush: {
    name: "Gold Rush Lounge",
    region: "Tree Town",
    bar: "Gold Rush Lounge", barType: "beer",
    desc: "Gold tinsel, gold bar stools, gold-painted everything, none of it gold. A " +
      "nervous sweetness to the place, like it's trying hard on its first week too.",
    revisit: [
      "Back into the Gold Rush — gold tinsel, gold stools, gold-painted everything, none of it actually gold.",
      "The lounge takes you back with its nervous sweetness, still trying a little too hard, still on its first week in spirit.",
      "You settle back onto a gold-painted stool. The place beams at you like it needs the reassurance.",
      "Gold Rush again: all that glitter and not an ounce of the real thing, and somehow you don't mind.",
    ],
    exits: { out: "tt_lane_1" },
  },
  starlight_bar: {
    name: "Starlight Bar",
    region: "Tree Town",
    bar: "Starlight Bar", barType: "beer",
    desc: "Blue LEDs pricked into the ceiling like a planetarium with a drinks licence. " +
      "The pours are honest and the banter is not. Pim is behind the bar, looking at you " +
      "the way she looks at everything — like she already knows the punchline.",
    revisit: [
      "Back into Starlight — blue LEDs pricked across the ceiling like a planetarium that took out a drinks licence.",
      "The little bar takes you back: honest pours, dishonest banter, and Pim already reading you like she wrote you.",
      "You drop back under the fake stars. Pim looks up the way she looks at everything — like she knows the punchline already.",
      "Starlight again — the ceiling full of blue pinpricks, the talk cheap and warm, the Chang cold and true.",
    ],
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
    reads: {
      door: "ห้ามเข้า — NO ENTRY — on a door that is otherwise trying not to be noticed. " +
        "Behind it, by reputation: an office. In the office, by the same reputation: a " +
        "safe. The security man near it has the relaxed stillness of somebody guarding a " +
        "thing that has never once been threatened, which is its own kind of advertisement.",
    },
    revisit: [
      "Back into Rainbow Girls — the best-run go-go in the maze, a DJ with actual taste, the cashier's cage strung with fairy lights.",
      "Madam Oy's flagship takes you back: tight, bright, and behind the bar that guarded door nobody invites you through.",
      "You step back into Oy's room. Everything runs like it's watched, because it is; the security by the door look extremely employed.",
      "Rainbow Girls again — fairy lights, clean sound, and the quiet weight of the office somewhere behind the ห้ามเข้า.",
    ],
    exits: { out: "tt_deep", office: "oy_office" },
  },
  oy_office: {
    name: "Madam Oy's Office",
    region: "Tree Town",
    desc: "Ledgers squared to the desk edge, a shrine shelf with fresh marigolds, framed " +
      "photos: a farm gate in Isaan, a young dancer with a number pinned to her hip, " +
      "three condo lobbies. Bolted to the floor: a steel safe with a Thai-numeral keypad.",
    reads: {
      shelf: "The shrine shelf is the one thing in the office that isn't filed: fresh " +
        "marigolds, water changed today, the incense stubs cleared before they can pile. " +
        "Whatever Oy squares with the world across that desk, this shelf is where she " +
        "squares the rest of it, daily, before anyone else is awake.",
      photos: "The framed photos read left to right like a ledger: a farm gate in Isaan; a " +
        "young dancer with a number pinned to her hip; three condo lobbies, each grander " +
        "than the last. No captions, no gaps, no apologies. It is a career told the way Oy " +
        "tells everything — completely, and only to those who bother to look.",
    },
    exits: { out: "rainbow_girls" },
  },

  // ─── Soi 6 ───
  soi6_street: { motosai: true,
    name: "Soi 6 (West End)",
    atm: true,
    region: "Soi 6",
    seven: true,
    outlet: true, // the 7-Eleven has a socket — else CHARGE PHONE points at a 7-Eleven you're standing in
    desc: "The west end of the soi, and it hits you the moment you step in — a wall of " +
      "bars at volume, each trying to drown the next in bass and shouted Thai pop. No stages, " +
      "no dark rooms: just open-air fronts at street level thrown wide to the pavement, and the " +
      "ladies working them, spilling out in sequins and very little else to reel in anything " +
      "that walks. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" You are grabbed by the wrist. You " +
      "are grabbed by the other wrist. Someone significantly shorter than you attempts to climb " +
      "onto your back. A couple of the girls have armed themselves with foam pool noodles and " +
      "swat anyone who dares walk past without stopping. PINK LOTUS LOUNGE, GOLDEN DRAGON BAR, " +
      "and SUNSET DREAMS LOUNGE are the main combatants here. East, the soi opens into a " +
      "quieter middle stretch before the racket picks up again at the far end.",
    revisit: [
      "Back onto the west end and the wall of noise hits first, the hands second. \"HANDSOME MAN!\" \"WHERE YOU GO SEXY MAN?\" You are grabbed, released, grabbed again, an item passed between bars.",
      "The soi takes you back into the bass and the barkers. A girl detaches from an open front to walk backwards ahead of you, selling her bar with her whole body. Then another. Then another.",
      "Back into the loudest hundred metres in Thailand. Six sound systems fight, a dozen girls call you handsome in the same second, and one of them takes a foam pool noodle to your shoulder for walking too slow.",
      "You step back into the west end and it's exactly as you left it: sequins, wrist-grabs, competing basslines, and the flat certainty that you will be spending money very soon.",
      "Back onto Soi 6 West, where standing still is not an option — a hand takes your wrist, a voice takes your name (you have no name here, you are Handsome), and a bar takes its shot.",
      "The soi swallows you again. \"You! Yes you! Come Pink Lotus!\" \"No — Golden Dragon!\" \"He come with ME.\" You are, briefly, the most wanted man in Thailand.",
      "Back into the churn and the neon. The girls out front read foot traffic for a living, and you are foot traffic; the pitch starts before you've fully arrived.",
      "Soi 6 West again — a river of hands and offers, the quieter middle stretch glowing ahead east like a promise, the whole street daring you to reach it sober and solvent.",
    ],
    exits: { w: "beach_rd_n", e: "soi6_mid" },
    venues: ["pink_lotus", "golden_dragon", "sunset_dreams"],
  },
  pink_lotus: {
    name: "Pink Lotus Lounge",
    region: "Soi 6",
    bar: "Pink Lotus Lounge", barType: "soi6", owner: "wdg",
    desc: "White Dish's flagship, and the loudest argument for why the group should not be " +
      "allowed nice things. The front is open to the street; half the bar is technically the " +
      "pavement. Neon tubes frame the sign in three colours simultaneously. Inside, the pink " +
      "is structural — walls, barstools, the girls' outfits, arguably the air itself. Joy is " +
      "already talking before you sit down. A staircase at the back climbs to the short-time " +
      "rooms; beside it, a velvet-roped, unmarked door leads to the ORCHID ROOM — the group's " +
      "members-only back room, and very much not for tonight's walk-up trade. (GO BACK, if you " +
      "think you're on the list.)",
    revisit: [
      "Back into the Pink Lotus and three hands find you at once — a lap claimed, a thigh against yours, Joy's mouth already at your ear: \"Lady drink first, then upstairs, na? I show you why they call it Pink.\"",
      "The pink swallows you again. No warm-up here — a girl is in your lap doing the math on your shirt before you have sat. \"You buy me drink, handsome? Then up. I make you forget the flight home.\"",
      "You are barely past the door before the offer is on the table, plain as the price list: \"Short time, long time, up to you — but you came back for a reason, na. Sit. Let me remind you.\"",
      "Pink Lotus does not do coy. A knee hooks yours, a hand slides up your arm, the pitch a purr against your jaw: \"Why you sit alone? One drink, we go up, everybody happy.\"",
      "Back to the pink and the full-court press — grabbed, seated, straddled by attention, and told warmly and without a flicker of doubt exactly what tonight costs and exactly what it buys.",
      "The girls clock you the second you round the post and close in like choreography. \"Same handsome from before! You want me now? Upstairs quiet, aircon cold — worth the walk, I promise.\"",
      "Into the Pink Lotus, where nobody wastes your time or theirs: a lap, a hand, a mouth at your ear naming a number and a room, and the fairy lights doing their best to make it romantic.",
      "Back onto a pink stool with a girl already arranging herself across you. \"You think about me all day? Liar.\" She laughs, delighted. \"Okay — buy the drink, we go up, you think about me tomorrow.\"",
    ],
    exits: { out: "soi6_street", back: "orchid_room" },
  },
  orchid_room: {
    name: "The Orchid Room",
    region: "Soi 6",
    bar: "The Orchid Room", barType: "soi6", owner: "wdg", vip: true,
    desc: "The name is the last classy thing about it. Ryan Powers wanted a members' club — " +
      "leather, low light, single malt, discretion — and got a bacchanal, because the room " +
      "curdled to match its owner. The 'hostesses' start the night topless and end it well " +
      "past that; the low light is a strobe; the discretion is a joke told at volume. The " +
      "clientele is the soi's real economy: high rollers who tip in colours the pavement " +
      "trade never sees, and at the corner tables the men the monthly envelope actually pays " +
      "— a patched MC president holding court over a bottle of Blue Label, and, at the best " +
      "table in the room, a soft-spoken Thai man in an unremarkable shirt whom everyone, the " +
      "MC president included, is very careful to defer to. On a raised banquette at the back, " +
      "filming himself over all of it, is Ryan Powers — actually, improbably, down tonight.",
    reads: {
      table: [
        { req: ["orchidReported"],
          text: "The good table, and now you can't unsee it: the quiet Thai man, the " +
            "envelopes that arrive and do not open here, the way Powers performs AT the " +
            "table and never quite FOR it. This isn't WDG's power seat. It's their tribute " +
            "desk — the rent a foreign rollup pays to be tolerated, collected weekly with " +
            "perfect manners. Everyone in the room knows except the man paying." },
        { text: "The best table in the room, back corner, sightlines to the door — a " +
          "quiet Thai man in an unremarkable shirt, unbothered by the noise, visited all " +
          "night by men who lean in respectfully and leave without sitting. Envelopes " +
          "come and go with the drinks. It reads like business. Whose business, and what " +
          "kind, the room is far too loud to say." },
      ],
    },
    revisit: [
      "Back into the Orchid Room and the strobe and the noise and the skin, the members' club Powers keeps calling classy while it proves him wrong in every direction at once.",
      "The Orchid takes you back into its expensive bacchanal — the high rollers, the MC patches, the quiet Thai man at the good table, and Powers on his banquette narrating himself to his own phone.",
      "Back past the velvet rope into the wild dark. Nobody here is walk-up trade; everybody here is somebody's problem, and Powers throws you a two-fingered salute without pausing his livestream.",
      "The back room again — topless going on nude, Blue Label going on trouble, and the one soft-spoken man everyone watches without looking at him. You've learned to sit where you can see the door.",
      "Back into the Orchid, where the money is loud, the girls are louder, the real power is silent, and Ryan Powers mistakes the whole arrangement for something he built.",
    ],
    exits: { out: "pink_lotus" },
  },
  golden_dragon: {
    name: "Golden Dragon Bar",
    region: "Soi 6",
    bar: "Golden Dragon Bar", barType: "soi6",
    desc: "Open-fronted, louder than you expected from outside, which is saying something. " +
      "The gold dragon above the bar was hand-painted by someone's cousin and has been " +
      "there longer than most of the staff. Vintage Thai pop on the speakers — not the " +
      "jukebox, it died in 2019, but the playlist is a faithful tribute. Nobody has " +
      "updated it and nobody has complained. Pia keeps the bar — and the dead " +
      "jukebox's memory — with a flat, unbothered calm.",
    reads: {
      dragon: "The gold dragon over the bar was hand-painted by someone's cousin, and it " +
        "shows — the proportions are enthusiastic, one eye is larger than the other, and " +
        "the overall effect is less imperial guardian than large friendly dog in a dragon " +
        "suit. It has presided over a decade of this room's sins without judging any of " +
        "them, which may be why nobody has ever repainted it.",
      jukebox: "The jukebox slumps in the corner, unplugged since 2019, buttons gummy with old " +
        "fingerprints and a folded beer mat wedged under one leg. It plays nothing now but the " +
        "part it plays best: dead. (PLAY JUKEBOX if you must.)",
    },
    revisit: [
      "Back into the Golden Dragon, the dragon presiding, and a girl already peeling you toward a stool with a hand in your belt loop. \"You, handsome. Sit here. Buy me one, then we talk about upstairs.\"",
      "The vintage playlist and the wall of noise take you back — and so do two girls at once, one on each arm, negotiating you like a shared prize. \"Me first.\" \"No — ME first.\" \"Okay, you choose, but choose FAST.\"",
      "Louder than you remembered, and more direct: a girl slides into your lap mid-song and puts it plainly. \"Drink, then up, then you go home happy. Simple, na? Everything here is simple.\"",
      "Back under the cousin-painted dragon. A hand flattens on your chest, a mouth finds your ear: \"Why you shy? This is Soi 6, tilac. Nobody here is shy. You buy me drink, I show you.\"",
      "The Golden Dragon reels you back in. Somebody already has your hand on her hip and her eyes on your wallet, and the whole thing is disarmingly, aggressively cheerful.",
      "Back into the gold and the grab. \"Same shirt, same handsome! You come for me tonight?\" She does not wait for an answer; she is already climbing half into your lap. \"Yes. You come for me.\"",
      "Into the Golden Dragon, where the offer arrives before the beer does: a thigh, a whisper, a price, a room number, all inside the first ten seconds, all with a grin.",
      "Back to the dragon and the dead jukebox's faithful ghost. A girl hooks a leg over yours and leans in close enough to share breath. \"Upstairs is nicer than down here. Much nicer. Buy me drink, I prove it.\"",
    ],
    exits: { out: "soi6_street" },
  },
  sunset_dreams: {
    name: "Sunset Dreams Lounge",
    region: "Soi 6",
    bar: "Sunset Dreams Lounge", barType: "soi6",
    desc: "Open to the pavement like the rest, but bathed in soft pink light instead of " +
      "three-colour neon, with a hand-painted cloud mural gone streaky above the bar — the " +
      "'dreams' part, such as it is. It's no gentler for the mood lighting: the girls work the " +
      "open front as hard as anyone on the soi. Kwan folds napkins into cranes at the end of " +
      "the rail, adding to a row of them lined up like a tiny origami militia, and still finds " +
      "a hand free for your sleeve as you pass.",
    reads: {
      crane: "Kwan's napkin cranes, a whole squadron lined along the rail — some crisp, some " +
        "already collapsing, each folded in the dead minutes between customers. Sit long enough " +
        "and she'll fold you into the flock.",
    },
    revisit: [
      "Back into the pink glow of Sunset Dreams, and a girl peels off the open front and onto you before your eyes adjust. \"You like soft light? I like soft man. Buy me drink, we go up where it's softer.\"",
      "The cloud mural and the rose light take you back, and so does a hand in your belt loop. \"Everybody think pink mean shy. Ha. Buy me drink, handsome — then upstairs, I show you not shy.\"",
      "Softer lit, no softer sell. A girl folds herself onto your stool with you already on it. \"Kwan makes the cranes; I make the offer. One drink, then up. Simple like everything on the soi.\"",
      "Back under the streaky clouds into the pink. Somebody settles against you and gets straight to it — what's on offer, what it costs, which staircase — all in a warm purr.",
      "Sunset Dreams reels you in on rose light and quick hands: a girl's fingers find yours and move them where she wants, and the pitch is warm, direct, and completely unambiguous.",
      "Back into the pink. \"You again. Good. The loud girls next door, they tire you out — me, I take my time.\" A hand slides up. \"Buy me one drink. Then we take our time upstairs.\"",
      "Into Sunset Dreams, where the soft light just lets the girls lean closer to say the loud part: a number, a room, a promise, delivered against your ear like a secret.",
      "Back to the origami militia and the rose glow. A girl drapes over you and names the whole transaction like sweet nothings. Kwan, at the rail, adds another crane and says nothing at all.",
    ],
    exits: { out: "soi6_street" },
  },
  soi6_mid: {
    name: "Soi 6 (Middle)",
    region: "Soi 6",
    desc: "The middle of Soi 6, where the wall of noise thins to something you can hear " +
      "yourself think over. The hard-selling open fronts of the west end give way to a run of " +
      "easygoing beer bars whose whole business is letting you sit and watch the parade rather " +
      "than be dragged into it. The pullers here are lazier, or wiser — they leave the grabbing " +
      "to the loud ends and pick up the men who wander through wanting a cold one and a ringside " +
      "seat. THE SHADY LADY, FRONT ROW BAR, and THE VERANDAH line the quiet stretch, and the " +
      "QUEEN VIC INN — real aircon, real wood, a dartboard — anchors it, the one place on the " +
      "soi that isn't shouting. West, the racket starts up again; east, it's worse.",
    revisit: [
      "Back to the middle of the soi, where the volume drops by half and the bars let you be. A cold-beer stretch built for watching, not for being grabbed.",
      "The quiet middle again — the Shady Lady's awning, the Front Row's theatre stools, the Verandah's raised deck, and the Queen Vic glowing calm in the thick of it.",
      "You come back into the soi's soft spot. Down at the west end a barker loses a fight with a foam noodle; up here nobody bothers, and that's the whole appeal.",
      "Back to the people-watching stretch, where the pullers are off-duty and the men who wanted a ringside seat without the hassle nurse their Changs and rate the parade.",
      "The middle takes you back — the Queen Vic glowing calm, the easy bars either side, the loud ends holding the noise at arm's length for once.",
      "Back into the calm centre of the storm. West and east the soi does its shouting; here it just streams past your stool while you drink and watch.",
      "The quiet stretch again, the Queen Vic's aircon leaking cold onto the pavement, three easy beer bars and nobody on the soi trying to climb you. Rare. Enjoy it.",
    ],
    exits: { w: "soi6_street", e: "soi6_deep" },
    venues: ["queen_vic", "sunset_rail", "bay_watch", "sandy_toes"],
  },
  soi6_deep: {
    // the soi's real east end: it meets Second Road here, 0 m
    name: "Soi 6 (East End)",
    region: "Soi 6",
    seven: true,
    outlet: true, // the 7-Eleven has a socket (see soi6_street)
    desc: "The east end of the soi, past the quieter middle, where the bars run on toward " +
      "Second Road and the volume comes roaring back. KITTEN CORNER, CHERRY POP BAR, and RUBY " +
      "KISS BAR trade wrist-grabs down this stretch — same open ground-floor fronts, same " +
      "three-colour neon, same staircases behind the bar the menu doesn't mention, and the " +
      "same foam pool noodles that find your ribs if you try to walk on by.",
    revisit: [
      "Deeper into the soi again, where the noise doubles down and the bars run on toward Second Road. A girl swings off a Kitten Corner stool to intercept you: \"Where you go? You go with ME.\"",
      "Back into the far stretch, wrist-grabs down both sides, three-colour neon, three staircases the menus don't mention. \"HANDSOME! Cherry Pop! No — Ruby Kiss! He come here!\"",
      "The deep end of Soi 6 takes you back — same open fronts, same offers, louder if anything. A hand finds your arm before you've picked a bar; the bar gets picked for you.",
      "Back past the Queen Vic into the thick of it, where every doorway has a girl and every girl has a plan for your evening and none of them is subtle about it.",
      "You round into the deep soi and the pitches overlap into one wall of sound: drink, upstairs, short time, long time, come come come, all of it aimed at you and meant.",
      "Back into the far stretch, the last hundred metres before Second Road, where the girls read your wallet through your shorts and grab accordingly.",
      "The deep soi again. Kitten, Cherry, Ruby — three fronts, three staircases, three sets of hands already reaching. You are, once more, the entire economy walking past.",
      "Back to where the soi runs out toward Second Road, neon stacked to the roofline, a girl on your sleeve saying the quiet part first and loud: \"Come upstairs, tilac. Why we pretend?\"",
    ],
    exits: { w: "soi6_mid", e: "second_rd_soi6" },
    venues: ["kitten_corner", "cherry_pop", "ruby_kiss"],
  },
  kitten_corner: {
    name: "Kitten Corner",
    region: "Soi 6",
    bar: "Kitten Corner", barType: "soi6",
    desc: "Open to the pavement, walled in cat posters and a neon paw print. Praewa and " +
      "Nangfah work the front, and the grab-and-giggle starts before you've fully stopped " +
      "walking; Kesinee watches it all from the till, pricing you before you sit. A " +
      "staircase at the back goes up to the short-time rooms.",
    revisit: [
      "Back into Kitten Corner and the grab-and-giggle is instant — Praewa in your lap, Nangfah at your ear, both purring the offer. \"You want kitten tonight? Two kitten? Buy us drink, we go up, we play.\"",
      "The neon paw flickers you back in and a girl is already climbing you like furniture. \"Meow, handsome.\" A grin, a hand, a price. \"Short time upstairs — you like? Everybody like.\"",
      "Cat posters and quick hands. A girl hooks her claws gently into your collar and puts it plainly: \"Why you play hard to get? Nobody play hard to get on Soi 6. Buy me drink, take me up.\"",
      "Back to the paw print and the pounce. Two of them close in, delighted, competitive, direct — a thigh, a purr, a number — and Kesinee watches the till and lets the girls work.",
      "Kitten Corner takes you back and does not pretend otherwise: a lap claimed, a mouth at your ear, the staircase nodded at. \"Upstairs is where the kitten really play, tilac.\"",
      "Back into the cat glow. \"Same handsome! You come back for me — say you come back for me.\" She is already arranging herself across your knees. \"Buy me drink first. Then upstairs. Then you never leave Soi 6.\"",
      "Into Kitten Corner, all posters and pounce, where the girls tell you exactly what the staircase is for inside the first breath and dare you to be shocked.",
      "Back to the paw and the purr, and a girl who has decided you are hers for the night. \"No shy, handsome. This Soi 6. We say what we want, you buy the drink, we go up. Easy, na?\"",
    ],
    exits: { out: "soi6_deep" },
  },
  cherry_pop: {
    name: "Cherry Pop Bar",
    region: "Soi 6",
    bar: "Cherry Pop Bar", barType: "soi6",
    desc: "Red from floor to ceiling, a bowl of actual cherries on the bar that nobody eats, " +
      "and a sound system stuck on one bubblegum playlist. Tabtim and Chaba call the odds " +
      "from the rail. The stairs are where the stairs always are.",
    reads: {
      cherries: "The bowl of maraschino cherries on the bar, sticky and untouched — more décor " +
        "than snack, going tacky under the neon. (EAT one, if you're brave.)",
    },
    revisit: [
      "Back into Cherry Pop, red on red, and a girl pops a cherry between her teeth and the offer in the same grin. \"Handsome! You taste cherry with me upstairs? Buy me drink, we find out.\"",
      "The bubblegum loop and the wall of red take you back, and Tabtim takes your lap. \"You came back for Cherry. Everybody come back for Cherry.\" A hand, a price, a wink. \"Short time, sweet like the name.\"",
      "Red floor to ceiling and a girl already on you before you have sat. \"Why you wait? On Soi 6 nobody wait. One drink, then up, then you go home smiling like a idiot. Good idiot.\"",
      "Back to the cherries nobody eats and the girls who eat you alive. Chaba drapes over you and names the whole thing — drink, room, price — sweetly, cheerfully, without a shred of shame.",
      "Cherry Pop reels you in on sugar and directness in equal measure: a thigh across yours, a purr in your ear, and a girl telling you precisely what the staircase behind the bar is for.",
      "Back into the red. \"Same handsome, same Cherry, same idea!\" She laughs, climbs half into your lap, gets to the point. \"Buy me drink. Take me up. The playlist is bad but I am not.\"",
      "Into Cherry Pop, where the come-on is as loud and sweet and relentless as the one bubblegum song, and just as impossible to argue with.",
      "Back to the bowl of untouched cherries and a girl who has claimed your stool and your evening. \"You buy me one drink, I make you forget the flight, the wife, your own name. Upstairs. Yes? Yes.\"",
    ],
    exits: { out: "soi6_deep" },
  },
  ruby_kiss: {
    name: "Ruby Kiss Bar",
    region: "Soi 6",
    bar: "Ruby Kiss Bar", barType: "soi6",
    desc: "The last loud front before the soi spills onto Second Road: lipstick-red lighting, " +
      "a mirror wall, and a lipstick-mark motif on everything including the glasses. Wilai runs " +
      "the front stools, and Kluay and Benz have already claimed the two nearest for you.",
    revisit: [
      "Back into Ruby Kiss and a lipstick-marked glass is in your hand before a girl is in your lap — but only just. \"You have my kiss. Now you want the rest?\" Wilai grins at the mirror, at the two of you the glass makes four. \"Buy me drink, we go up.\"",
      "Lipstick lighting, mirror wall, and Kluay already arranging herself across you. \"Last bar on the soi, best girls on the soi — you save the best, na?\" A hand, a price, a nod at the stairs.",
      "The red mirror-glare takes you back and doubles the come-on: two Benzes leaning in, two hands on your thigh, one very direct question about upstairs asked twice at once.",
      "Back to the lipstick and the last-loud-front energy. A girl marks your cheek with a kiss and the deal in the same motion. \"Short time, long time — you choose, handsome. But you choose me.\"",
      "Ruby Kiss reels you in on mirrors and mouths. Somebody already has the offer against your ear — drink, room, price — and the wall behind the bar is showing you both exactly how it looks.",
      "Back into the red. \"Handsome came back to Ruby! Of course. Everybody save Ruby for last.\" She climbs on, points at the stairs, does not stop smiling. \"Buy me drink — then last is best.\"",
      "Into Ruby Kiss, where the girls kiss the glass, kiss your cheek, and name the whole transaction in one breath, and the mirror makes an audience of it.",
      "Back to the lipstick marks and a girl draped over your shoulders, chin on your head, watching you both in the mirror wall. \"See? We look good together. Buy me drink. We look even better upstairs.\"",
    ],
    exits: { out: "soi6_deep" },
  },
  queen_vic: {
    name: "Queen Vic Inn",
    region: "Soi 6",
    bar: "Queen Vic Inn", barType: "pub", darts: true,
    desc: "Actual air conditioning. Actual wood panelling. A dartboard. The Queen Vic Inn " +
      "anchors the quiet middle stretch of Soi 6 with the righteous calm of a man who has seen " +
      "it all and ordered another pint — the one place on the soi that isn't shouting. Through " +
      "the window, the soi performs — the show without the sweat (WATCH SOI). Terry holds down the corner stool with a beer and the settled " +
      "air of a man who has watched it all twice. At the far end, most nights, Mort's " +
      "spiral notebook lies open beside his beer — as much a fixture as the dartboard. " +
      "A staircase behind the bar leads UP to the guest rooms.",
    reads: {
      notebook: [
        { req: ["jokeWho"],
          text: "Mort's spiral notebook, half an arm's length away and utterly private. " +
            "Somewhere in there, you now know, is a page of phone numbers with a tally " +
            "beside each — the joke ledger — and against one of them, yours, a tick: the " +
            "one in forty who answered. You are in the material now. There is no way back " +
            "out of the material." },
        { text: "A spiral notebook under an old man's forearm, angled away from every " +
          "sightline in the pub with the unconscious skill of forty years of writing " +
          "things people would rather he didn't. The biro clicks. The page turns. " +
          "Whatever the soi did tonight, it's in there." },
      ],
    },
    revisit: [
      "Back into the Queen Vic — real aircon, real wood, the dartboard, and the soi safely on the far side of the glass.",
      "The pub folds you back into its calm. Terry lifts his beer from the corner stool without quite looking up.",
      "You step back into the one quiet room on Soi 6. The bass from outside arrives pre-muffled, the way it should.",
      "The Queen Vic again — the dartboard, the panelling, the deliberate refusal to be Soi 6. It works.",
      "Back through the door and the volume drops to a civilised hum. Somebody's mid-dart, somebody's mid-story, nobody's mid-grab. Bliss.",
      "The Vic takes you back into wood and cold air and the low murmur of men who have found their spot and mean to keep it.",
      "Back to the calm eye of the soi's storm — a pint, a dartboard, a window onto the chaos you don't have to join.",
    ],
    exits: { out: "soi6_mid", up: "qv_room" },
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
      "radio into. A firm double bed fills the rest of the room — the " +
      "neon never quite lets go of it, but the blackout curtains and the aircon get " +
      "you there. A flatscreen on the wall and a mini-fridge in the corner — two free " +
      "waters a day, housekeeping's one kindness — round out the luxuries. " +
      "(SLEEP to turn in and end the night · WATCH TV · OPEN FRIDGE · or step onto the BALCONY.)",
    reads: {
      recliner: "The balcony recliner has taken the shape of every guest before you and " +
        "reached an accommodation with all of them. It faces the soi at exactly the angle " +
        "of a man who wants to see everything and join nothing. (WATCH SOI)",
    },
    revisit: [
      "Back up to your balcony room over the Queen Vic — the fan turning its opinions over, Soi 6 still howling up over the rail two floors down.",
      "The room again: wood floors, the recliner on the balcony, the soi throwing its light and its bass up the wall like a fish tank with the volume left on.",
      "You climb back to the balcony room. Somewhere below a girl is shrieking WHERE YOU GO SEXY MAN at a man who is, in fact, going. The blackout curtains will fix most of it.",
      "Home, such as it is — one recliner, one small table, and the whole loud soi laid out below like it is putting on the show for you alone.",
      "Back to the balcony. Six bars' worth of music arrives as one blurred throb, a hostess laughs like a car alarm, and none of it follows you past the blackout curtains.",
      "Up the stairs to the fan and the recliner. The soi does not quiet down for anyone — but draw the blackout curtains and it drops to a rumour you can sleep through.",
      "The balcony room takes you back in. HANDSOME MAN! floats up from the pavement, aimed at somebody, everybody, nobody. You have learned to hear it as weather.",
      "Back to your patch of quiet-ish over the loudest hundred metres in Thailand — recliner, small table, and blackout curtains thick enough to turn the neon and the shouting into a lullaby.",
    ],
    exits: { down: "queen_vic" },
  },

  // ─── LK Metro ───
  lk_entrance: { motosai: true,
    name: "LK Metro (Entrance)",
    region: "LK Metro",
    desc: "The alley mouth off Soi Diana — easy to walk past if you don't know it's there. " +
      "A handwritten sign on the wall says LK METRO with an arrow, named for the hotel " +
      "invisible from here. Ten metres in it opens up and suddenly you're somewhere: the alley runs " +
      "north to a corner, turns east, and comes out on Soi Buakhao at the far end. The no-entry sign for four-wheelers is doing its job: the only vehicles " +
      "threading through are motorbikes, and the only people on them are very purposeful " +
      "about where they're going. A film poster has been sun-bleached onto the wall by the " +
      "corner, so old the green has gone the colour of weak tea.",
    reads: {
      poster: "Twenty-odd years of Pattaya sun have taken the film down to two figures in " +
        "long coats and sunglasses, and a rain of green characters gone almost white. " +
        "Nobody has been able to read the title in a decade. What is NOT twenty years old " +
        "is the QR sticker somebody has pressed onto the bottom corner — square, matte, " +
        "corners still down, no bar name on it and no price, which makes it the only " +
        "advertisement on this street that is not selling anything. (EXAMINE QR.)",
      sign: "The LK METRO sign and its arrow, hand-marked on board, pointing into the bend that " +
        "hides the whole warren beyond. Beside it, a battered NO ENTRY plate for four-wheelers, " +
        "doing honest work — only the motorbikes thread through, and only the purposeful ride " +
        "them. Two signs, both true, neither telling all of it.",
    },
    exits: { out: "diana_e", n: "lk_bend" },
  },
  lk_main: {
    atm: true,
    name: "LK Metro (Main Alley)",
    region: "LK Metro",
    desc: "The long leg of the L, and the one everybody means by LK Metro: bars packed shoulder to shoulder, neon on both sides, " +
      "sound bleeding from KINKY Go-Go to the north and SLUTTY Go-Go to the south until " +
      "they're indistinguishable. Good energy — dense, close, the kind of loud that's a " +
      "decision rather than an accident. A motorbike idles past carrying a girl in full " +
      "sequins at a speed that's technically legal. THE OFFSIDE SPORTS BAR breaks the neon " +
      "with the cold blue wash of a dozen screens. Ahead the neon runs out and the alley spills " +
      "onto Soi Buakhao; the corner is behind you.",
    exits: { w: "lk_bend", e: "buakhao_lk", n: "kinky", s: "slutty", in: "kinky", pub: "lk_sports" },
  },
  lk_sports: {
    name: "The Offside Sports Bar",
    region: "LK Metro",
    bar: "The Offside Sports Bar", barType: "pub", outlet: true, darts: true,
    desc: "A proper sports bar wedged into the go-go alley: a wall of screens, a Premier " +
      "League fixture list chalked up beside a Thai-boxing card, a dartboard with a queue, " +
      "and a fridge of import beer at import prices. The commentary is in three languages " +
      "and the groans when a penalty's missed are universal. A quiet corner to sober up in, " +
      "if the match lets you.",
    exits: { out: "lk_main" },
  },
  lk_bend: { motosai: true,
    name: "LK Metro (Corner)",
    region: "LK Metro",
    desc: "The corner, where the alley stops climbing and turns east. LAS VEGAS GO-GO burns at the turn — the signage outspends everything else in sight. The crowd thins " +
      "slightly here: the regulars who know the place, the girls finishing a shift on the " +
      "back of a motorbike, a few tourists who followed the sound far enough to find it. " +
      "Two open-front beer bars, THE METRO BEER GARDEN and THE PIT STOP, catch the ones " +
      "who've had enough go-go for one night. Less overwhelming than Walking Street; more " +
      "like something you discovered.",
    exits: { s: "lk_entrance", e: "lk_main", in: "las_vegas",
             n: "metro_garden", pit: "pit_stop", vegas: "las_vegas" },
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
    reads: {
      shelf: "The shelf of toy cars, dusted but never touched: die-cast racers in faded " +
        "liveries, arranged on the grid in an order that must mean something to somebody. " +
        "Milin says they belong to the owner, and the owner is never here, and the cars " +
        "never move. The chequered valance below them hangs exactly level.",
    },
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
  khao_talo: { motosai: true,
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
  // The dead Shamrock. Daeng points at it — "come ask me again when your bar
  // stands by itself" — and until now it existed only as something people said,
  // which is the undelivered-promise defect docs/prose-defects.md is about. It
  // is a place, so it gets to be a place.
  //
  // Deliberately no `barType`: nothing trades here. No staff, no saleng, no
  // bell, no closing time. You can stand in a dead room and read it, and that is
  // the whole of what it does. Buying it belongs to Second Road; here it is the
  // warning — a bar that died because its owner never got inside anything
  // (docs/factions-thai.md).
  shamrock: {
    name: "The Shamrock (closed)",
    // The TRADING name, separate from the room label. LBB shows "(closed)"
    // because here it is; a consumer that reopens it should not inherit our
    // state baked into a string. `closed` says the same thing as data.
    bar: "The Shamrock",
    closed: true,
    region: "Darkside",
    desc: "A dead pub at the dark end of the strip. The shamrock over the door " +
      "has lost most of its green and all of its bulbs, and somebody long ago " +
      "screwed a sheet of ply over the serving hatch and then, apparently, " +
      "thought better of finishing the job. Inside it still smells faintly of " +
      "beer and strongly of dust. The stools are stacked. There is a darts board " +
      "with three darts still in it, and a fixtures list for a season that " +
      "finished years ago. It is not derelict, which is the strange part — " +
      "somebody swept it once, after the end, turned the taps off properly and " +
      "squared the tables, and then locked the door and did not come back.",
    reads: {
      board: [
        { req: ["seanStory"],
          text: "The fixtures list again — and now it has a name on it. Sean ticked " +
            "those legs off, bought the next round, flew home for an operation and " +
            "never saw the second half of the season. Daeng's version is the true one " +
            "and the kind one, and standing here you can add the part she left out: a " +
            "bar with no partner has no cushion, and no one to hold a door open while " +
            "its owner fights for his life somewhere colder." },
        { text: "Three darts still in the treble bed, thrown by somebody who meant to " +
          "come back for the next leg. Beside it the fixtures list, biro on a brewery " +
          "poster: half the season ticked off, the other half waiting for a Tuesday " +
          "that never came. Nobody has taken it down. Taking it down would be " +
          "admitting something." },
      ],
      hatch: [
        { req: ["hatchPried"],
          text: "The ply hangs open where you left it. The hatch shelf behind it is " +
            "empty now except for dust and the outline where the key ring sat for " +
            "years, waiting for somebody curious enough to look." },
        { text: "The sheet of ply over the serving hatch, screwed down at three corners " +
          "and thought-better-of at the fourth. You work a hand in and lift — it swings " +
          "up easier than it should, someone's half-finished job — and there on the " +
          "hatch shelf, under a decade of dust: a brass key on a cork fob, the kind a " +
          "landlord leaves for the next tenant there is never going to be.",
          sets: ["hatchPried"], reveal: "shamrock_key" },
      ],
    },
    revisit: [
      "The Shamrock, still shut, still swept. The darts are still in the board.",
      "Dust, stacked stools, and a fixtures list nobody took down.",
      "The dead pub. Cooler in here than the soi, which is most of its appeal.",
      "Nothing has moved. Nothing has moved in here for a long time, and the " +
        "not-moving is somehow busier than the soi outside.",
    ],
    exits: { out: "khao_talo_strip" },
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
    reads: {
      photos: "Walking Street's glory days, framed behind the bar: crowds you can smell " +
        "the baby oil off, neon that has since been renamed twice, and one shot of a " +
        "dancer mid-spin, all sequins and certainty. You look from the photo to the woman " +
        "pouring your drink and back. She lets you look. She does not help you decide.",
    },
    exits: { out: "khao_talo" },
  },
  khao_talo_strip: {
    seven: true,
    atm: true,
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
      n: "water_buffalo", s: "firefly_bar", dark: "night_heron",
      shamrock: "shamrock" },
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
    reads: {
      clock: "An ordinary wall clock, and the most-watched object in the room. Before " +
        "midnight it is just the time. As it climbs toward twelve the glances get shorter " +
        "and more frequent, the way passengers watch a departure board — because when it " +
        "lands, the bolt goes across, and everyone still inside has chosen to be.",
    },
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
      "Nobody here has been pickpocketed since the nineties. THE BOATHOUSE, the quiet " +
      "restaurant across the road, is open for the fish.",
    exits: { s: "khao_talo", in: "lake_bar", w: "lake_beer" },
  },
  lake_bar: {
    name: "The Boathouse",
    region: "Darkside",
    bar: "The Boathouse", barType: "pub", food: true,
    desc: "Across the road from the water at the quiet end of the lake, wooden tables under a " +
      "big open-sided sala, strung with fairy lights and the smell of fish on the grill, and a " +
      "clear view of the reservoir over the way. Expat families and retired couples work " +
      "through big Chang bottles and whole grilled fish while, across the road, the water goes " +
      "pink and then black. It is the most respectable room for miles — no neon, no touts, no " +
      "trouble — which is exactly why a certain kind of woman ends up working the till here " +
      "rather than anywhere brighter. The register sits by the door, a small shrine and a " +
      "framed photo of a young man beside it.",
    reads: {
      photos: "By the register, a small shrine and a framed photo of a young man — taken " +
        "years ago by the border of the frame's fading, fresh marigolds beside it today. " +
        "Duangjai doesn't explain it and the room's manners are that nobody asks. Whatever " +
        "it is, it is tended daily, and it is why the Boathouse closes early.",
    },
    exits: { out: "lake_mabprachan", w: "lake_beer" },
  },
  lake_beer: {
    name: "The Sundowner",
    region: "Darkside",
    bar: "The Sundowner", barType: "beer", pool: true,
    desc: "Next door to the Boathouse but a notch louder and a notch looser: an open-air beer " +
      "bar on the ring road, the reservoir just across the way, a dozen stools, a fridge of " +
      "Chang and Leo, and a pool table with a felt like a tired lawn. Semi-respectable, and " +
      "content with it — the girls here worked Pattaya proper once and decided the money " +
      "wasn't worth the hours or the hustle. Now they pour slow beers for slow regulars, " +
      "mostly older men who come for the quiet and the lake view and a familiar face, and " +
      "everybody involved seems relieved about the arrangement. The sunset over the water does " +
      "most of the marketing.",
    exits: { out: "lake_mabprachan", e: "lake_bar" },
  },

  // ─── Naklua ───
  naklua_rd: { motosai: true,
    name: "Naklua Road",
    atm: true,
    region: "Naklua",
    seven: true,
    desc: "North of the Dolphin roundabout the volume drops by half: seafood restaurants, " +
      "temples, long-stay hotels. Up ahead, the SABAI PALMS HOTEL sign glows over its " +
      "soi — half the letters out, so it reads 'SA AI PA MS', which the long-stay " +
      "guests consider part of the charm. The soi itself is dark as a power cut. " +
      "East, a quiet BAR CORNER of expat beer bars glows low; a SPA ROW of massage " +
      "and soapland fronts runs off the other way.",
    busStop: "beachrd",
    reads: {
      sign: "The SABAI PALMS sign, up close: half its letters dark, so the soi announces " +
        "SA AI PA MS to the night in confident neon. Maintenance was promised, the " +
        "long-stay guests petitioned AGAINST it, and management — reading the room " +
        "correctly for once — left the dead letters dead. It's not broken. It's an address.",
    },
    exits: { s: "dolphin", n: "hotel_soi", w: "orchid_club", e: "naklua_bars", spa: "naklua_massage" },
  },
  naklua_bars: {
    name: "Naklua (Bar Corner)",
    region: "Naklua",
    desc: "A pocket of low-key expat beer bars off the main road, the kind that open at four " +
      "and know every customer's pour by five. No neon war up here — just fairy lights, a " +
      "sea breeze off the old fishing harbour, and the clack of a single pool table. THE " +
      "ANCHOR BAR, DOLPHIN BAR, and THE MOORING share the corner and most of the regulars. " +
      "Further east — the map calls this lane Naklua Soi 31, nobody who drinks here does — " +
      "where the fairy lights give out and the lane goes dark, one more sign buzzes on its " +
      "own current: THE WHITE RABBIT, which shares neither.",
    exits: { w: "naklua_rd", in: "anchor_bar", n: "dolphin_bar", s: "mooring_bar", e: "white_rabbit" },
  },
  anchor_bar: {
    name: "The Anchor Bar",
    region: "Naklua",
    bar: "The Anchor Bar", barType: "beer", pool: true, outlet: true,
    desc: "A nautical-junk beer bar — a real ship's wheel on the wall, glass floats in a net, " +
      "a barometer nobody trusts. The long-stay crowd holds the stools like moorings. Namfon " +
      "pours a cold one before you've picked a seat.",
    reads: {
      wheel: "The ship's wheel is real — teak, brass hub, decades of hands worn into the " +
        "spokes. Where the rest of the nautical junk came from a job lot, the wheel came " +
        "from a boat, and whichever regular you ask tells a different story about which " +
        "boat, all of them good, none of them compatible.",
    },
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
  white_rabbit: {
    name: "The White Rabbit",
    region: "Naklua",
    bar: "The White Rabbit", barType: "beer", outlet: true,
    desc: "Down where the corner's fairy lights give out, a beer bar that is trying much harder " +
      "than the three behind it and landing softer. A hand-painted white rabbit tumbles down a " +
      "hole of green ones-and-zeroes above the bar; the effect wants to be clever and reads as a " +
      "man who saw a film once. The beer is a note cheaper than it should be this far out — the " +
      "only lever the place has to drag a punter past the Mooring — and a tip jar by the till is " +
      "somehow fuller than the room can explain. Everything is a shade too new: the paint, the " +
      "stools, the confidence.",
    reads: {
      rabbit: "The hand-painted rabbit tumbles down its hole of green ones-and-zeroes, " +
        "brushstroke pixels raining around it. It wants to be The Matrix and lands closer " +
        "to a man describing The Matrix in a bar. Somebody spent real hours on it, and " +
        "believed in it the whole time, and somehow that is the most Eddy thing in the " +
        "building.",
      jar: [
        { req: ["owlBox15"],
          text: "The tip jar, fuller than the room can explain — and having pulled the " +
            "thread you pulled, you look at it differently now. A bar that doesn't need " +
            "its bar to make money keeps a jar like this the way a magician keeps a " +
            "deck: for the look of the thing. You are starting to read this whole room " +
            "like a config file, and it is starting to read back." },
        { text: "The tip jar by the till is fuller than the room can explain — proper " +
          "notes, folded, not the shrapnel a half-empty beer bar earns. Either the crowd " +
          "that drinks here tips like sailors, or money enters this jar by some door " +
          "other than gratitude. Nobody behind the bar seems curious, which is its own " +
          "data point." },
      ],
    },
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
      "like she knows something. (READ SIGN.)",
    reads: {
      sign: "Two signs, quietly at war. The big cheerful one out front: 'TRADITIONAL THAI MASSAGE " +
        "— HEALTH & RELAX, WELCOME.' The small laminated one by the till, in Thai, English and " +
        "Russian, thumbed soft from re-reading: 'NO SEX.' Between the two of them stands the " +
        "establishment's entire business model, and Waan's whole smile.",
    },
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
    reads: {
      certificate: "The certificate is real — a massage-school diploma, gold frame, the " +
        "proprietress's name in careful Thai script, a seal from an institution in Bangkok. " +
        "It is the only decoration in the shop and it is hung dead level. In this town that " +
        "combination tells you everything.",
    },
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
    exits: { w: "second_rd_honey", e: "soi_honey_e", n: "honey_trap", s: "honey_soapy" },
  },
  soi_honey_e: { motosai: true,
    name: "Soi Honey (east end)",
    region: "Soi Honey",
    desc: "The Buakhao end of Soi Honey, where the lane spits you back out among the pharmacies " +
      "and laundries. Two more beer bars face each other across the narrow strip, close enough " +
      "that the girls of one heckle the customers of the other. It smells of grilled chicken, " +
      "spilled Chang, and somebody's jasmine.",
    exits: { w: "soi_honey_w", e: "buakhao_honey", n: "queen_bee", in: "buzz_inn" },
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
    reads: {
      bee: "The bee is plywood, scooter-sized, hand-cut and hand-painted, and bolted over " +
        "the bar at an angle that suggests either flight or structural fatigue. Somebody " +
        "loved making it. The bar is named after it, or it after the bar — accounts differ " +
        "by drink.",
    },
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
  diana_w: { motosai: true,
    name: "Soi Diana (Second Road end)",
    region: "Soi Diana",
    desc: "The Second Road mouth of Soi Diana, a long strip of open-fronted beer bars one block " +
      "south of Soi Honey. On the south corner, the open-air KISS restaurant does brisk trade under " +
      "its fairy lights — everyone in Pattaya gives directions off it. East, the soi runs away into " +
      "warm light and eighty different sound systems; the first beer bar's girls are already waving.",
    exits: { w: "second_rd_diana", e: "diana_mid", in: "kiss", n: "dollhouse" },
  },
  diana_mid: {
    name: "Soi Diana (middle)",
    region: "Soi Diana",
    desc: "The thick of Soi Diana: open beer bars shoulder to shoulder down both sides, barkers " +
      "working the narrow strip between, a hundred fairy-lit stools and a lady on every one. A side " +
      "door of the LK Metro complex breathes cold air and go-go bass from further east — but that's " +
      "the complex; the soi itself keeps it simple. Somewhere a bell rings and a whole bar cheers.",
    exits: { w: "diana_w", e: "diana_e", n: "sapphire", s: "sundowner", hotel: "areca_room" },
  },
  diana_e: {
    name: "Soi Diana (Buakhao end)",
    region: "Soi Diana",
    desc: "The Buakhao end of Soi Diana. The LK Metro alley opens off to one side (its other " +
      "mouth is up on Buakhao proper); the Areca Lodge's lit driveway is on the other. Ahead, the " +
      "soi spills onto Soi Buakhao by the 7-Eleven on the corner — Candy Bar's rose-pink sign " +
      "glows just two doors south of it.",
    exits: { w: "diana_mid", e: "buakhao_n", n: "cricketers", lk: "lk_entrance" },
  },
  kiss: {
    name: "KISS Restaurant",
    bar: "KISS Restaurant",
    region: "Soi Diana",
    food: true,
    desc: "The famous open-air corner restaurant at the mouth of Soi Diana — plastic chairs, " +
      "paper menus a mile long (simple Thai one side, farang comfort food the other), and a grill " +
      "going full tilt. Everyone knows KISS; everyone meets at KISS. In high season you can stand " +
      "twenty minutes waiting for a table; tonight there's a stool free, just. (BUY FOOD / EAT · READ MENU.)",
    reads: {
      menu: "The menu is a laminated broadsheet you could wallpaper a room with. One side is " +
        "honest Thai — pad kaprao, tom yum, som tam graded by fire — the other a homesick " +
        "farang's whole diary: full English breakfast (served 24h), cheese toasties, spag bol, a " +
        "chicken parma the size of a hubcap, and a 'HANGOVER CURE' with a fried egg on top of " +
        "whatever you point at. Item 47 is simply 'BIG BEER'. It stops at nothing and apologises " +
        "for none of it.",
    },
    exits: { out: "diana_w" },
  },
  dollhouse: {
    name: "The Dollhouse",
    bar: "The Dollhouse", barType: "beer",
    region: "Soi Diana",
    desc: "A big open-fronted beer bar, all fairy lights and cane stools, its counter wrapped in a " +
      "horseshoe so the girls can reach every seat. No stage, no pole — just cold Chang, a Connect 4 " +
      "frame, and a dozen hostesses who treat every farang who slows down as a long-lost friend.",
    reads: {
      horseshoe: "The counter's horseshoe wrap is the whole business plan in carpentry: no " +
        "seat more than an arm's reach from a girl, no girl more than an arm's reach from " +
        "the ice. Somebody thought hard about this once, and every night since has proved " +
        "them right.",
    },
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
    bar: "The Cricketers", barType: "beer", darts: true,
    region: "Soi Diana",
    desc: "A farang sports bar wedged onto the go-go soi: three screens, a dartboard, a menu of pies, " +
      "and a knot of expats who've solved the world twice over by nine o'clock. There are girls, and " +
      "there is beer, but mostly there is opinion. Somebody is explaining the offside rule to a " +
      "hostess who stopped listening in 2019. (READ MENU · PLAY DARTS.)",
    reads: {
      menu: "A blackboard of PIES, chalked with the reverence of a man a long way from home: " +
        "steak & ale, chicken & mushroom, a 'ploughman's' that is mostly pickle, and a full " +
        "Sunday roast (on, of course, Sunday). 'CHIPS WITH EVERYTHING' is not an option, it's the " +
        "house creed. Down the margin, the week's fixtures and the sacred words: 'ALL GAMES, ALL " +
        "DAY, PROPER GRAVY.'",
    },
    exits: { out: "diana_mid" },
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
      "the tuk-tuk drivers themselves come to get their shoulders sorted. (READ MENU.)",
    reads: {
      menu: "The price board is short and completely honest: FOOT 300 · THAI 300 · OIL 400 — one " +
        "hour, and it stops there. No asterisks, no 'special', no eyebrow. The aunties in their " +
        "tidy uniforms mean every line of it, and a hand-added note underneath drives it home: " +
        "'NO FUNNY. GOOD MASSAGE ONLY.'",
    },
    exits: { out: "beach_rd_s" },
  },
  areca_room: {
    // the Areca fronts the middle of Soi Diana, not its Buakhao end
    name: "Your Room — Areca Lodge",
    region: "Soi Diana",
    outlet: true,
    desc: "A proper mid-range room at the Areca Lodge on Soi Diana: firm bed, cold aircon that " +
      "actually works, a kettle, and a window over the garden pool where a few long-stay couples " +
      "are doing slow lengths. Comfortable, central, unremarkable in the best way — the whole soi's " +
      "racket is thirty seconds out the door, and none of it follows you in.",
    exits: { out: "diana_mid" },
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
  // Planted for the Thai-ability bonus quest (docs/thai-quest-design.md), which
  // is not built yet — this is the hook, findable by anyone who walks to the end
  // of a beach with nothing on it.
  //
  // The inscription is WORN, not merely foreign, and that is deliberate. The
  // design note's whole threat model is that any Thai the game DISPLAYS can be
  // read by Google Lens in a second, so an amulet you could photograph would be
  // solved before it was a puzzle. Nobody can read this one off the object —
  // which makes the eventual quest about finding somebody who knows what it
  // says, not about optical character recognition.
  cord: {
    name: "a nylon cord",
    aliases: ["cord", "string", "lace", "necklace"],
    portable: true,
    location: null,
    desc: "Twenty baht of black nylon cord off a 7-Eleven counter display, sold for exactly " +
      "this and nothing else. Half the men in this country are wearing one.",
  },
  tiffin: {
    name: "a tiffin of Duangjai's fish",
    aliases: ["tiffin", "fish", "lunchbox", "food", "duangjai's fish", "the fish"],
    portable: true,
    location: null, // handed over by Duangjai on ACCEPT (quest lake_errand)
    desc: "A three-tier steel tiffin, the clasp worn bright: grilled fish from the Boathouse " +
      "kitchen, rice, a knot of herbs, and — wedged in the lid because she couldn't help " +
      "herself — a folded ฿500 note. Still faintly warm. It smells like a kitchen someone " +
      "cooked in on purpose.",
  },
  shamrock_key: {
    name: "a brass key on a cork fob",
    aliases: ["brass key", "key", "fob", "shamrock key"],
    portable: true,
    location: null, // hidden — the Shamrock's serving hatch gives it up (reads.hatch)
    desc: "A worn brass door key on a cork fob, SHAMROCK in faded marker on one side and " +
      "a Khao Talo phone number on the other — a landlord's spare, left where a landlord " +
      "leaves one. Khun Rattana owns the ground under that bar, Daeng says, and never " +
      "sells. But a key in your pocket is a question that hasn't been asked yet.",
  },
  amulet: {
    name: "a Buddha amulet",
    aliases: ["amulet", "buddha", "pendant", "medallion"],
    portable: true,
    location: "jomtien_beach_s3",
    sight: "Half-buried in the sand at the foot of the spirit house, on a broken cord, a small " +
      "Buddha amulet — not set on the shrine, exactly. Left there, or lost, or given back. (TAKE AMULET)",
    desc: "Small, oval, and heavier than it looks — old clay in a scratched gold case, on " +
      "a broken cord. The Buddha on the front is worn nearly featureless by however many " +
      "years of somebody's shirt. On the back there is writing: a line of Thai pressed " +
      "into the clay while it was soft, and rubbed down since until it is more of a " +
      "rhythm than a set of letters. You can tell it says something. You cannot tell " +
      "what, and neither, you suspect, could most people.",
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
    portable: true, location: "jomtien_beach_rd_s",
    desc: "An empty Singha bottle, rinsed by somebody more organised than its drinker. ฿5 of glass.", bottle: true,
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
      "๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙. It wants three digits. (ENTER <digits>)",
  },
  wallet: {
    name: "your wallet", aliases: ["wallet"],
    portable: true, location: null, // inside the safe
    desc: "Your wallet! Cards, hotel key card, and — miraculously — most of the cash. " +
      "Tucked inside: a note in careful English: 'Farang — you buy Mot's dinner tonight. " +
      "Be more careful. — Oy'.",
  },
  masseuse_note: {
    name: "a number on a beer mat", aliases: ["number", "beer mat", "note", "her number", "napkin"],
    portable: true, location: null, // written by a masseuse after the SPECIAL; READ names her
    desc: "A phone number biro'd onto a soggy beer mat, and under it, underlined twice: \"my place.\"",
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

// Kesinee's WDG-vetting choices, hoisted so they ride on whichever of her greetings
// fires — her plain welcome OR an origin-gated one (a greeting node owns its choices,
// so the origin reads would otherwise drop the trust-building fork).
const _KES_VET = [
  { label: "Tell her Bert sent you",
    when: (st, G) => st.trust < 2 && !_flag("heardWdgInside"),
    fx: (st) => { st.trust = Math.min(5, st.trust + 2); },
    text: "\"Bert.\" The name does more than any drink. \"He is a good man, that one — old soi, before " +
      "all this.\" The careful smile loosens into a real one. \"If Bert send you, maybe I talk. Ask me " +
      "— White Dish — and this time I answer straight.\"" },
  { label: "Swear you're no White Dish man",
    when: (st, G) => st.trust < 2 && !_flag("heardWdgInside"),
    fx: (st) => { st.trust = Math.min(5, st.trust + 1); },
    text: "You tell her plainly: nobody's boy, least of all Ryan Powers'. She weighs it against twenty " +
      "years of faces. \"Maybe,\" she allows, and the eyes thaw a half-degree. \"We see.\"" },
  { label: "Press her for names",
    when: (st, G) => st.trust < 3 && !_flag("heardWdgInside"),
    fx: (st) => { st.trust = Math.max(0, st.trust - 1); st.mood = "guarded"; },
    text: "You lean in and push for specifics. Bad move. The shutters come straight back down. \"You ask " +
      "like a policeman — or a man who works for them. Kesinee gives names to neither.\" The gold " +
      "bracelet turns. It just got colder in here." },
];

const NPCS = {

  nok: {
    name: "Auntie Nok", th: "น้อยหน่า", emoji: "🥭",
    pronoun: "she",
    room: "jomtien_soi_7_beach_end",
    desc: "A drinks-cart vendor with a cooler of everything and opinions to match. " +
      "A hand-lettered sign on the cart offers ฿5 per returned bottle.",
    dialogue: [
      { req: ["gotBusFare"], text: "\"Bus stop that way, na. Tell driver where you go, pay when you get off. FIFTEEN baht now — everything expensive since the war, jing jing.\"",
        short: "\"Bus stop that way. Tell driver, pay when you get off. Fifteen baht.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh, you awake! You sleep on beach like soi dog, hahaha. You want water? No money? Aiyee.\" She taps the sign on her cart. \"Bring bottle, I give five baht. Beach full of bottle. Farang leave everything.\"",
        short: "\"Bring bottle, I give five baht.\"" },
      { topic: "wallet", text: "\"Wallet gone? Beach at night, tilac. You lucky they leave your shoes. Go town, ask the bar ladies — nothing happen in Pattaya they don't know.\"" },
      { topic: "bus", text: "\"Baht bus fifteen baht now. Used to be ten! Iran war, petrol crazy. Everybody complain, everybody still ride. Stop just north, na — up the beach road, blue trucks, cannot miss.\"",
        short: "\"Baht bus fifteen baht. Stop just north, up the beach road.\"" },
      { topic: "stop", text: "\"Bus stop? North, tilac — walk up the beach road, past the songthaew turn, the blue trucks all wait there. Fifteen baht, tell driver where you go.\"",
        short: "\"Bus stop north, up the beach road. Fifteen baht.\"" },
      { topic: "direction", text: "\"You lost already? Hahaha. Bus stop north, up the beach road. Bar ladies east, down Soi Seven. Town you get by the bus. Everything start from the bus, na.\"",
        short: "\"Bus north up the beach road; bar ladies east on Soi Seven.\"" },
      { topic: "cat", text: "\"The gray sisters, by the loungers? Mine — well, nobody's, but I feed them, morning and night, ten year now. Big One and Little One. You watch the big one: she never eat before the little one eat. Not one time in ten year.\" Auntie Nok's whole face goes soft. \"They my security, na. Nobody sleep rough on MY beach the cats don't tell me first. Better than police. Cheaper than police, hahaha.\"",
        short: "\"The gray sisters — I feed them ten year. Big One never eats before Little One. My security.\"" },
      // The Quiet Side quest (docs/map-coverage.md): Nok is the beach grapevine Sumalee
      // sends you to; her node sets the intel flag. chip:false — quest-directed.
      { topic: "regular", sets: ["heardGordon"], chip: false,
        text: "\"Big Gordon?\" Nok stops fanning herself. \"Aiyah. You ask for Sumalee, yes? " +
          "She worry, that one, even when she don't say.\" She lowers her voice, though there is no " +
          "one on the sand but the cats. \"Gordon come every cool season, fifteen year, buy water " +
          "from me every morning — bad Thai, good heart. This year another regular tell me: Gordon " +
          "go in his sleep, back in England, summertime. Old, quiet, no pain. His daughter find a " +
          "photo of this beach by his bed.\" She looks out at the flat evening water. \"He love it " +
          "here more than there, I think. Many of them do, and cannot say it. Tell Sumalee. She do " +
          "it right — she always do.\"",
        short: "\"Gordon — fifteen seasons, then he went in his sleep back in England this summer. A photo of this beach by his bed. Tell Sumalee.\"" },
    ],
  },

  bank: {
    name: "Bank", th: "แบงค์", emoji: "🏍️",
    pronoun: "he",
    room: "beach_rd_s",
    desc: "A motosai driver in an orange vest, boots up on his handlebars, watching the " +
      "street with professional calm. The other drivers at the stand defer to him.",
    dialogue: [
      { topic: "debt", chip: false,
        when: (st, G) => _flag("helmetDelivered") && !_flag("debtSettled"),
        text: "The professional calm goes off him like a coat. \u201cMy friend. I ask you something, " +
          "and you say no, is okay, we still same-same.\u201d He takes his boots off the handlebars, " +
          "which you have not seen him do. \u201cMy cousin, he borrow money. From Nira \u2014 Neon " +
          "Paradise, the one with the smile.\u201d A pause. \u201cHe cannot pay. Her cousins already " +
          "come ask the neighbours where he sleep. That is how it start.\u201d He looks up the road, " +
          "not at you. \u201cEverybody on this street, I stand next to them. Nobody stand next to me. " +
          "You go talk to her? Just talk. You are farang, she will hear it different.\u201d",
        short: "\u201cNira. My cousin. Just talk to her, na.\u201d" },
      { topic: "debt", chip: false, when: (st, G) => _flag("debtSettled") && _flag("debtTruth"),
        text: "\u201cIt is finish, they tell me.\u201d He is quiet for a second longer than a man who " +
          "is only relieved. \u201cAnd you go see Pim.\u201d Not a question. \u201cShe tell you " +
          "what it was for?\u201d He nods slowly at the road. \u201cMy mother. Two year now. Pim say " +
          "her savings.\u201d He breathes out. \u201cI am a driver, my friend. I move people all day " +
          "and I did not see the one thing moving in my own house.\u201d",
        short: "\u201cMy mother. Two year. And she call it savings.\u201d" },
      { topic: "debt", chip: false, when: (st, G) => _flag("debtSettled"),
        text: "\u201cFinish?\u201d He looks at you a long moment, then laughs once and puts his boots " +
          "back on the handlebars, which is Bank for thank you. \u201cOkay. Okay! You ride free with " +
          "me now, boss. Always. Do not tell the other drivers.\u201d",
        short: "\u201cYou ride free with me now, boss.\u201d" },
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
    name: "Candy", th: "แคนดี้", emoji: "🌹", personality: "charmer",
    room: "candy_bar",
    // She owns both Candy Bars and works them on alternate nights (even days at
    // the original, odd days at Candy Bar 2). _npcRoom resolves tonight's room;
    // `room` above stays as her home/default for anything that wants a fixed peg.
    bars: ["candy_bar", "candy_bar_2"],
    look: "Thai woman of thirty-eight, striking, hair up, gold at the ears and throat, sharp eyes, well-cut dark dress.",
    desc: "The mamasan of Candy Bar — sharp as a razor, warm as a Chang on a hot night, " +
      "and on the soi longer than most expats have had passports. She clocked you the " +
      "second you walked in.",
    dialogue: [
      // An Introduction quest (docs/map-coverage.md): Candy vouches you into Rose's
      // discreet Orchid Club out in Naklua. chip:false — the quest drives it.
      { topic: "rose", chip: false,
        text: "“You want to know a place most people never find?” Candy weighs you a moment, then " +
          "decides. “Rose. The Orchid Club, out in Naklua — behind a wall, no sign, aircon like a " +
          "morgue and about as quiet. Old friend of mine, from before either of us ran anything.” " +
          "She writes nothing down; there is nothing to write. “You don't find the Orchid, tilac. " +
          "You get sent. So I am sending you — go and tell Rose that Candy vouches. And mind your " +
          "manners, na: Rose forgets nothing and forgives less.”",
        short: "“Rose's Orchid Club, Naklua — behind a wall, no sign. Old friend of mine. You don't find it, you get sent. Tell her Candy vouches.”" },
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
        text: "\"Oy has it? Then it's safe — safer than in your pocket, clearly. But Oy… ai, she make you work for it. Take her som tam from the market cart — extra spicy, tell them 'Candy's order'. Give it to Ploy her cashier, and doors open.\" She tips her chin down the soi, toward the old market block where the som tam cart still holds its corner.", sets: ["somTamAccepted"], gives: "som_tam",
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
    
      // ── bar-owning chain, step 3: the 51% ──────────────────────────────
      // Wayne's answer was "pick a person, not a structure". This is the person.
      // She does not say yes warmly — she says yes like a woman who has watched
      // this arrangement destroy people, and wants it written down.
      {
        topic: "partnership", chip: false,
        req: ["expatLife", "barLicence"], notFlags: ["barPartner"],
        sets: ["barPartner", "partnerCandy"],
        fx: (st, G) => { _align("indie", 2); _align("wdg", -2); },
        text: "Candy does not answer for a long moment, and when she does it is not " +
          "the voice she uses on the floor.\n\n\"You know what you are asking me.\" " +
          "Not a question. \"Fifty-one is not a favour, tilac. Fifty-one is my name " +
          "on your bar. If you drink it away, is my name. If you hit a girl, is my " +
          "name. If you go home to England and never come back—\" a small shrug " +
          "\"—then I have a bar, and everybody on this soi know how I got it.\"\n\n" +
          "She lets that sit.\n\n\"So. We go to a lawyer, a real one, in Bangkok, " +
          "not the man Gavin use. Everything written. What I take, what you take, " +
          "what happen if one of us die.\" She almost smiles. \"Is not romantic. Is " +
          "why it work.\" Then she does smile, and it is the real one, the one that " +
          "is worth more than the bar. \"And yes. I say yes. You did not sell Bert's " +
          "bar to that man when you could have. I watch that. Everybody watch that.\"",
        short: "\"Fifty-one is my name on your bar. Lawyer in Bangkok, everything written. And yes.\"",
      },
    ],
  },

  lek: {
    name: "Lek", th: "เล็ก", emoji: "💃",
    room: "lucky_tiger",
    desc: "Petite, bright smile, glittery earrings catching the bar lights. She's beating " +
      "two customers at pool simultaneously.",
    selfies: [
      { cap: "new earring ✨ shiny like me 555", pic: "lek_sel1" },
      { cap: "somtam so spicy 🥵🌶️ i cry 555", pic: "lek_sel2" },
      { cap: "win pool AGAIN 🎱😎 nobody beat me", pic: "lek_sel3" },
      { cap: "bar quiet 😴 you come play?? 💕", pic: "lek_sel4" },
    ],
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
        short: "\"Welcome to Paradise — the bar, na. The other kind you find yourself.\"" },
      { topic: "wallet", text: "\"Walking Street eats wallets, tilac. But real professionals work the beach and the bus stops. Town gossip flows through Soi Buakhao — the beer bars, not here. Here is only volume.\"" },
    ],
  },
  mind: {
    name: "Mind", th: "มายด์", emoji: "💗",
    room: "neon_paradise",
    look: "Thai woman of twenty-two, small and slight, long dark hair, dancer's posture, simple strappy top.",
    desc: "Small and careful, a dancer's economy to every movement — the girl from a certain " +
      "Danish backpacker's lock screen, though she has no idea she's on it. Twenty-two, and " +
      "older than that in the ways that pay the rent.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello.\" A practiced smile that stops short of her eyes — then, deciding you're " +
          "harmless, reaches them anyway. \"You want drink? Sit, sit. No barfine, just talk. Talking is free.\"",
        short: "\"Sit, sit. No barfine, just talk — talking is free.\"" },
      { topic: "mikkel", req: ["knowMikkel"],
        text: "You mention the Danish boy. Something crosses her face — not guilt, quite; more the " +
          "weight of a kindness that has gotten heavy. \"Mikkel. He is sweet boy. Too sweet.\" She turns " +
          "her glass a quarter turn. \"He think he save me. My mother farm is real, the money is real — but " +
          "Denmark?\" A small shake of the head. \"Is winter there. He go home in spring, he cry one week, " +
          "then he okay. They are always okay.\" It isn't cruel. It is arithmetic she has done before.",
        short: "\"Mikkel is sweet boy. Too sweet. He go home spring, cry one week, then okay.\"" },
      { topic: "farm",
        text: "\"My mother have small farm, Sisaket — rice, few chicken. Every month I send.\" She says " +
          "it flatly, the way you state a fact that is also the whole reason for everything. \"This—\" a nod " +
          "at the poles, the mirrors, the chrome \"—is for that. Not for boyfriend. Not for Denmark. For the farm.\"",
        short: "\"My mother farm, Sisaket. Every month I send. This is for that.\"" },
    ],
  },

  ping: {
    name: "Ping", th: "ปิง", emoji: "✨",
    room: "paradise_nights",
    desc: "Cheerful, sparkly top throwing glitter across the wall, never stops smiling " +
      "even when shouting drink orders over the bass.",
    selfies: [
      { cap: "glitter EVERYWHERE 😆✨ cannot wash off 555", pic: "ping_sel1" },
      { cap: "new phone case 📱💖 you like??", pic: "ping_sel2" },
      { cap: "beach today 🏖️ so hot i melt", pic: "ping_sel3" },
      { cap: "club so loud 🔊 my ear go beep beeep 555", pic: "ping_sel4" },
    ],
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
    look: "Thai tom of thirty, cropped hair, oversized bar polo, silver nose ring, biro behind one ear.",
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
    name: "Joy", th: "จอย", emoji: "💕", personality: "joker",
    room: "pink_lotus",
    desc: "Bubbly, laughing at everything you say before you finish saying it — the " +
      "undisputed morale champion of Pink Lotus Lounge.",
    dialogue: [
      { th: "มาแล้วเหรอ", rom: "maa laeo roe",
        text: "\"You come back!! Wait— no, you new. Same same!\" She collapses in giggles. \"Sit down sit down! You buy me lady drink? Upstairs very nice—\" she catches your expression \"—okay okay, water for you, story for me, hahaha!\"",
        short: "\"Sit sit! Water for you, story for me, hahaha!\"" },
      { topic: "wallet", notFlags: ["hasWallet"], text: "\"No wallet?!\" Gales of laughter. \"Tilac, on THIS soi that is a very serious medical condition. Go Soi Buakhao — the mamasans there fix everything. Especially Candy. Everybody's problems go to Candy.\"" },
      { topic: "money", text: "\"Money?\" She waves a hand like she's shooing a cat. \"Money come, money go. Same same. Last month I have — so much! I think wow, I am RICH.\" Two-second pause. \"Then iPhone. Then my cousin need school. Then Koh Chang with the girls. Then my mother — hahaha!\" She is laughing at herself entirely. \"Now I have four hundred baht and big smile. I earn more later. Up to me!\"" },
      { topic: "save", text: "She looks at you like you've said something in a language she recognises but has stopped speaking. \"Save... for what?\" Genuine puzzlement. \"When the thing happen I will find the money. Always I find it. Always!\" She seems more certain of this than she is of anything else. \"You have five hundred? I need for rice.\"" },
      { topic: "dream", text: "\"Dream?\" Full attention, very serious. \"Okay. Right now? My dream is—\" she points at the kitchen hatch \"—the spicy noodle. Tom yum. Because it is ten o'clock and I am hungry.\" She nods once, satisfied. \"That is my dream. What is YOUR dream?\" The follow-up is completely genuine.",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); },
        asks: { key: "dream" } },
      // The earned beat: once she trusts you, the relentless present tense cracks
      // for a second and you see WHY she doesn't plan — Pink Lotus is a White Dish
      // bar, and the app moves the girls like stock (the cost Kesinee names, from
      // the girl's side). Then the smile comes straight back on.
      { topic: "future", when: (st) => st.trust >= 3,
        text: "The laugh starts, then doesn't quite arrive. For once she lets the quiet sit. \"You really " +
          "want to know? I no plan future because—\" a small gesture at the pink room, at the tablet glowing " +
          "by the till \"—is not up to me. The app decide. Which bar, which night, how many girl, how late. My " +
          "friend work here two year, then one day the app move her Jomtien, like moving a box. Nobody ask " +
          "her.\" The smile switches back on, deliberate, a little tired around the edges. \"So I live today, " +
          "BIG. Today I am here, today I am Joy. Tomorrow up to the app, not up to me. Better I laugh, na?\"",
        short: "\"I no plan future — the app decide which bar, which night. Live today, big. Better I laugh, na?\"",
        fx: (st) => { st.know.wdgCost = true; st.mood = "open"; },
        // She's shown you the real her for one second. Meeting it with warmth
        // deepens the bond (the Regular); letting her keep the joke is a kindness too,
        // just a lighter one.
        choices: [
          { label: "Tell her she deserves better",
            when: (st, G) => st.know && st.know.wdgCost,
            fx: (st, G) => { st.trust = Math.min(5, st.trust + 1);
              G.soc.drinks.joy = (G.soc.drinks.joy || 0) + 1; _addHappy(1); },
            text: "You say it plainly — she deserves better than a tablet in Bangkok deciding her nights. Joy " +
              "goes still, the performance off for a whole second. \"You know, most man never say that. They " +
              "like the laugh, not the girl.\" She bumps your shoulder with hers, and the warmth in it is real, " +
              "not on the tab." },
          { label: "Let her keep the laugh",
            when: (st, G) => st.know && st.know.wdgCost,
            text: "You don't push. You let her have the joke back, and the pink room, and the tonight-is-big of " +
              "it. She flashes the grin, grateful you didn't make her stay in the quiet. \"Good man. We drink, " +
              "we laugh, no think too much. Same same!\"" },
        ] },
      { topic: "future", text: "\"Five year?\" She waves it away cheerfully. \"Five year is VERY far. Tonight is already hard enough! Tonight I need: noodle, maybe one more drink, and—\" she tilts her head \"—maybe you stay a little longer? That is my five-year plan.\" Another collapse of giggles. \"Okay okay, three minutes plan. Same same.\"" },
    ],
  },
  // Puu (Pink Lotus, WDG flagship) — volatile. type:"volatile" → barfine her and the
  // night can detonate into a jealousy scene (the "scene" vector: money gone, banged
  // up, barred). Her intensity IS the tell; the white knight reads the fire as love.
  puu: {
    name: "Puu", th: "ปู", emoji: "🔥", type: "volatile",
    room: "pink_lotus",
    desc: "Beautiful and burning a little too bright, all the way in from the first minute. Her eyes flick to " +
      "{{your phone}} when it lights, to the girl who walks past, and back to you, fast. Lovely. A live wire.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"You. I like you already — don't laugh, I mean it.\" She takes your face in one hand, serious, " +
          "thrilling. \"Tonight you are mine, okay? Only mine. You look at other girl, I know. I always know.\" " +
          "It is the most alive anyone has made you feel in a year, and every instinct you own is quietly " +
          "filing a report.",
        short: "\"Tonight you are mine — only mine. You look at other girl, I know.\"" },
      { topic: "love", text: "\"Fast? Yes, fast — I am always fast.\" Not embarrassed by it. \"When I love, I " +
        "love like a house on fire. When I angry—\" a bright, dangerous smile \"—also the fire. You take the " +
        "two together, or you take nothing. Most man too small for me. You?\"" },
      { topic: "temper", bond: 2, text: "\"Every farang say the same. 'Puu, you too much.'\" Flat, unbothered, " +
        "a little proud. \"Then they go home and miss me so bad they cannot breathe. You will miss me too. Or—\" " +
        "the smile again, all teeth \"—you make me angry, and you will be sorry. One of the two, tilac. Never " +
        "the boring middle.\"",
        short: "\"You miss me so bad you cannot breathe — or you make me angry and you be sorry. One of two.\"" },
    ],
  },
  // Belle (Pink Lotus, WDG flagship) — the moneypit. type:"moneypit" → she turns
  // nearly every text into an escalating ask (_moneypitText); money into her is water
  // in sand. Ambiguous, not a clean villain — she's drowning AND working it, and has
  // stopped being able to tell the difference. The white knight can't say no.
  belle: {
    name: "Belle", th: "เบล", emoji: "🥺", type: "moneypit",
    room: "pink_lotus",
    look: "Thai woman of twenty-five, soft round face, big dark eyes, long hair loose, pastel bar dress.",
    desc: "Sweet, soft-eyed, always in the middle of a small catastrophe — a sick relative, a broken thing, a " +
      "bill with today's date. She holds your hand when she tells you, and she is often, genuinely, not lying.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh — hello, sorry, my face.\" She dabs at an eye that may or may not be wet. \"Bad day. No no, " +
          "sit, I don't want to put my problem on you, is not your job.\" She puts her problem on you, gently, " +
          "expertly, inside ninety seconds, holding your hand the whole time.",
        short: "\"Bad day. No no, sit — I don't want to put my problem on you...\" (she will).",
        asks: { key: "hotel", q: "\"You okay for money, you? Good job at home?\" Warm, worried-for-you. \"I ask only because— no. Never mind. Is my problem, not yours.\" It becomes yours within the hour." } },
      { topic: "family", text: "\"My family—\" she stops, breathes, brave \"—is a lot. Mama sick, papa gamble, " +
        "sister have baby no husband. I am the only one send money. Every month more.\" It is a real weight, " +
        "and she carries it, and she has also learned exactly how to set it down in front of you. \"Sorry — you " +
        "don't want to hear. Buy me one drink? Then I smile, promise.\"" },
      { topic: "lie", bond: 2, text: "\"You want to know if I lie to you.\" She looks tired, suddenly older " +
        "than the sweet face. \"Sometime yes. Sometime completely true. And—\" a small, awful shrug \"—I stop " +
        "being able to tell which. Is all just need now, all the time, every direction. You give money, is " +
        "like water in sand. I know. I take it anyway. What else I do.\"",
        short: "\"Sometime I lie, sometime true — I stop knowing which. Money into me is water in sand.\"" },
    ],
  },
  // ── The rest of the Soi 6 cast, promoted from _FILLER_HOSTESSES ──────────────
  // Praewa (Kitten Corner) — homesick-simple, kind, half on the bus home. No vector.
  praewa: {
    name: "Praewa", th: "แพรวา", emoji: "🌷",
    room: "kitten_corner",
    look: "Thai woman of twenty-four, pretty and unmade-up, hair tied back, faraway expression, plain bar top.",
    desc: "Pretty and a little far away, like part of her is always on the bus back to a village you'll never " +
      "see. Kind to you, and not quite here.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello ka.\" A soft, real smile that doesn't quite reach wherever she's gone. \"You want " +
          "company? I sit. I not so good talking tonight, but I sit nice.\" And she does — a warm, quiet " +
          "presence with the volume of the room turned down around her.",
        short: "\"I not so good talking tonight, but I sit nice.\"",
        asks: { key: "home", q: "\"You far from home too?\" She asks it like it matters. \"Everybody here far from home. Some people it don't bother. Me—\" a small shrug \"—me it bother.\"" } },
      { topic: "home", text: "\"Loei. By the river.\" Her whole face changes — softer, younger. \"My " +
        "grandmother house, the mango tree, the morning cold. Real cold, you see your breath. Here never " +
        "cold.\" The smile fades to the middle distance. \"Two more year. Then home. I count the month.\"" },
      { topic: "sad", bond: 2, text: "\"You are kind to ask.\" She looks at you properly for the first time. " +
        "\"Not sad exactly. Just — I am here, but I am there. All the time, both. Ten hour I smile, and in my " +
        "head I am picking mango.\" A tired little laugh. \"Homesick don't kill nobody. Just make the night " +
        "long.\"",
        short: "\"I am here, but I am there, both, all the time. Homesick don't kill nobody — just make the night long.\"" },
    ],
  },
  // Nangfah (Kitten Corner) — the spark: sharp, educated, executing a real plan, and
  // she'll tell the white knight to his face that a man is not a financial strategy.
  // Cleaner English (top of the fluency ladder); plays Connect 4 like she means it.
  nangfah: {
    name: "Nangfah", th: "นางฟ้า", emoji: "⭐", c4: 8,
    room: "kitten_corner",
    desc: "Composed in a way the room isn't, watching more than she performs. There's a textbook in her bag " +
      "under the going-out clothes, and she'd rather you didn't make a thing of it.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Evening.\" Even, unhurried, her English a notch cleaner than the room's. \"You can buy me a " +
          "drink if you like. Fair warning — I'm poor company for a man who wants the fantasy. I ask too many " +
          "questions back.\" A small, testing smile: she's already decided how clever you are.",
        short: "\"Buy me a drink if you like. Fair warning: I ask too many questions back.\"" },
      { topic: "book", text: "\"You saw it.\" Not embarrassed, just recalibrating. \"Accounting. Online, " +
        "Ramkhamhaeng — cheap, no-name, a real degree at the end.\" Flat, factual. \"Two more years. This—\" a " +
        "small gesture at the bar \"—pays the fees and the rent while I do it. A job with terrible hours and no " +
        "tax. That's all it is to me.\"",
        short: "\"Accounting, online. The bar pays the fees. It's just a job with terrible hours.\"" },
      { topic: "plan", bond: 2, text: "\"The plan works or it doesn't — but at least it's a plan, not a " +
        "lottery ticket.\" She's watched a hundred girls wait for a farang to fix it. \"I'm not waiting for " +
        "anybody to rescue me. No offence — you seem nice. But a man is not a financial strategy.\" She sips. " +
        "\"Bookkeeper for a hotel chain by thirty. Boring. I want boring so badly I can taste it.\"",
        short: "\"A man is not a financial strategy. I want a boring desk job so badly I can taste it.\"" },
    ],
  },
  // Tabtim (Cherry Pop) — dim, sweet, self-aware about it, beloved by the bar. No vector.
  tabtim: {
    name: "Tabtim", th: "ทับทิม", emoji: "🍉",
    room: "cherry_pop",
    desc: "Round-cheeked and permanently pleased, a half-step behind every joke and laughing at it anyway, on " +
      "faith. Sweetest girl in the bar, and the bar knows it.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hi hi hi!\" Three his, delighted. \"You are new? Or I forget? I forget a lot — is okay, my " +
          "heart remember even when my head don't.\" She pats her own chest, very pleased with this. \"You " +
          "sit! I get you something. Maybe the wrong one. Then we laugh.\"",
        short: "\"My heart remember even when my head don't! Sit — I bring you something, maybe wrong, we laugh.\"" },
      { topic: "plan", text: "\"Plan is...\" Deep thought. \"...be happy? Yes. Plan: happy.\" A satisfied nod, " +
        "the philosophy complete. \"My friend Nangfah, she have the big plan, the book, the number — make my " +
        "head hurt. Me, I do the happy. Somebody have to do the happy, na.\"" },
      { topic: "money", text: "\"I don't count good.\" Cheerfully, no shame. \"Mama keep my money. She honest, " +
        "she love me, she give me when I need. I keep it myself, gone in one day. I know myself!\" She beams, " +
        "genuinely proud of the self-knowledge, which is, in fairness, more than some manage." },
    ],
  },
  // Chaba (Cherry Pop) — the glorious-hurricane drunk. type:"drunk" → the mao vector.
  chaba: {
    name: "Chaba", th: "ชบา", emoji: "🌺", type: "drunk",
    room: "cherry_pop",
    desc: "Loud, glorious, and pouring — for you, for herself, for the room. At Cherry Pop she's the party's " +
      "engine, right up until she's its wreckage.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"HELLO my new best friend!\" A shot is in your hand that you did not order. \"We drink, we " +
          "dance, no talk about sad thing! Tonight is CHERRY POP, baby — best bar, best girl, best YOU.\" She's " +
          "a hurricane, and for an hour you will love being in it.",
        short: "\"We drink, we dance, no sad thing! Tonight is Cherry Pop, baby!\"" },
      { topic: "drink", text: "\"Drink is my job AND my hobby!\" She toasts the whole bar. \"Some girl sip " +
        "water, pretend. Not Chaba. I give the customer real party, so they buy real bottle. Good for " +
        "business.\" Already three ahead of you. \"Bad for—\" she waves vaguely at all of herself, laughing " +
        "\"—this. Cheers!\"" },
      { topic: "okay", text: "\"Aiy, you sound like my mama.\" Sharp for a flash, then swallowed in a big " +
        "laugh. \"I am FINE, I am the best! Tomorrow I feel like dying — but tomorrow is not invited to " +
        "tonight. You worry too much. DRINK.\"" },
    ],
  },
  // Pukky (The Shady Lady, beer) — the good egg; beer-bar warmth, the honest slow lane.
  pukky: {
    name: "Pukky", th: "ปุ๊กกี้", emoji: "🌻",
    room: "sunset_rail",
    look: "Thai woman of twenty-eight, relaxed open face, hair in a loose knot, denim shorts and bar tee.",
    desc: "Easy and unhurried behind the Shady Lady's rail — the kind of company that feels like a night off " +
      "rather than a transaction. No hurry in her, and no hustle either.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Evening. Cold beer?\" No performance, a friendly nod and a real question. \"Beer bar is " +
          "different from the go-go, na. Nobody rush you here. You want to talk, we talk. You want to just sit " +
          "and watch the football, also fine. Up to you.\"",
        short: "\"Cold beer? No rush here — talk, or just watch the football. Up to you.\"",
        asks: { key: "return", q: "\"First time this bar? You look around like first time.\" Warm, curious, not selling. \"Is a good one. The go-go take your money fast; here we take it slow. Friendlier — and honestly, cheaper for you.\"" } },
      { topic: "beer bar", text: "\"Go-go is a show. Here is a bar.\" No judgement either way. \"Some man want " +
        "the lights and the loud. Some man just want a cold one and somebody nice to drink it with, no games. " +
        "Those men, they come here. They come back, too.\"" },
      { topic: "money", text: "\"I make less than the go-go girl, sure.\" A comfortable shrug. \"But I sleep at " +
        "night, I don't do the games, nobody scam nobody. Slow money, clean money. I send home a little less, I " +
        "keep my—\" she taps her chest \"—this. Fair trade, for me.\"" },
    ],
  },
  // Somo (Front Row, beer) — the tomboy: football, no makeup, one of the lads. No romance
  // angle, and she says so. Learned English off the match commentary. No vector.
  somo: {
    name: "Somo", th: "โซโม่", emoji: "⚽",
    room: "bay_watch",
    desc: "In a Liverpool shirt and zero makeup, arguing offside with two regulars and winning. More one-of-" +
      "the-lads than hostess, and she'll tell you so before you get the wrong idea.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Alright.\" A nod, like to a mate. \"Sit, watch the game. Fair warning — I don't do the " +
          "sweetheart thing, I'm rubbish at it, and you look like you got enough people lying to you already.\" " +
          "She turns back to the TV. \"United? Please tell me you are not United.\"",
        short: "\"Sit, watch the game. I don't do the sweetheart thing — I'm rubbish at it.\"" },
      { topic: "football", text: "\"Liverpool, since I am small.\" She lights up, all business. \"My uncle " +
        "drive taxi Bangkok, always the match on the radio. I learn English from the football commentary " +
        "before the schoolbook.\" A grin. \"Ask me the ninety-five squad. Go on. I know it better than my own " +
        "cousin name.\"" },
      { topic: "work", bond: 2, text: "\"Why here? Money same as anywhere — and here I don't have to pretend I " +
        "fancy anybody.\" Blunt, comfortable. \"I pour beer, I talk football, the men leave happy and nobody " +
        "feel stupid after. The go-go girls, some look at me like I'm mad.\" A shrug. \"Maybe. But I'm the one " +
        "having a laugh.\"",
        short: "\"Here I don't pretend I fancy anybody. I pour beer, talk football, everybody leave happy.\"" },
    ],
  },
  // Nina (The Verandah, beer) — the auntie: older, mothers the whole bar and the young
  // girls in it, at peace with her own kids grown. Warm, dignified. No vector.
  nina: {
    name: "Nina", th: "นีน่า", emoji: "🍲",
    room: "sandy_toes",
    look: "Thai woman of about forty, warm broad face, short practical hair, apron over a bar polo.",
    desc: "A little older than the rail usually runs, and she mothers the whole bar — the young girls, the " +
      "drunk regulars, and, within about four minutes, you. You'll have eaten something before you leave.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"You eat already?\" Before hello, before anything — frowning at how tired you look. \"No? " +
          "Aiyo. Sit. Beer first, but I get you something also. You too skinny, you drink on empty stomach, " +
          "tomorrow you feel terrible.\" She's already flagging the food cart. Resistance is pointless.",
        short: "\"You eat already? No? Sit — beer first, but I get you food. Resistance is pointless.\"",
        asks: { key: "girlfriend", q: "\"Somebody feed you at home? A wife, a girlfriend?\" Half-worried, like an aunt. \"No? Then who make sure you okay? Everybody need one person make sure they okay.\"" } },
      { topic: "young girls", text: "\"The young ones here, I watch them.\" A nod down the rail. \"First month, " +
        "they don't know nothing — who is safe, who is not, when to say no. I teach them. Their mama not here, " +
        "so.\" Matter-of-fact. \"Somebody have to be the auntie. I am old for this job anyway. Might as well be " +
        "useful old.\"" },
      { topic: "family", bond: 2, text: "\"My own kids grown now — one working Bangkok, one married.\" Quiet " +
        "pride, no self-pity. \"They think I have a little shop here. Not so far from true: I sell beer, I feed " +
        "people, I keep an eye. Just the shop is on Soi 6.\" A warm, tired smile. \"They don't need to know the " +
        "address.\"",
        short: "\"My kids think I have a little shop. Not far from true — I sell beer, feed people. Just the address is Soi 6.\"" },
    ],
  },

  // ── Soi 6 mamasans (promoted from _FILLER_MAMAS) ─────────────────────────────
  // Business ladies first, less volatile than the girls. Most are sharp operators —
  // type:"operator" adds a quiet house cut on the barfine (_roomMamaOperator) — and
  // their dialogue names the subtle extraction ("free is the most expensive word").
  // The go-go/WDG mamas run hard; the beer-bar mamas (Bussaba/Sopha/Malila) run warm.
  nee: {
    name: "Nee", th: "หนี่", emoji: "👑", type: "operator",
    room: "pink_lotus",
    desc: "The flagship's mamasan: still, precise, a tablet where another mama keeps a smile. She runs Pink " +
      "Lotus like the asset it is on White Dish's books, and she priced you before you sat down.",
    dialogue: [
      // Nee reads your MANNER the instant you sit — the operator mama's whole craft.
      // One gated greeting per personality (a player always has exactly one after the
      // intro, so one fires; the plain welcome below is the pre-intro fallback).
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("charmer"),
        text: "\"A charmer.\" Nee's read is instant and unbothered. \"Good — for me. The charmer spend to be " +
          "liked, and liked is the one thing I sell that never run out of stock.\" She has already chosen the " +
          "girl who will believe you the most beautifully. \"Sit, tilac. Enjoy being adored. It is very " +
          "reasonably priced.\"",
        short: "\"A charmer — good, for me. You spend to be liked, and liked never runs out of stock. Sit.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("joker"),
        text: "\"The funny one.\" Not a smile — an assessment. \"The girls will laugh, tilac. That is the job; " +
          "they laugh at everybody. Be as funny as you like.\" The tablet does not look up. \"The bill has no " +
          "sense of humour, and past midnight, na, neither do I. Enjoy yourself until then.\"",
        short: "\"The funny one. The girls laugh at everybody — the bill has no sense of humour, and past midnight neither do I.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("blunt"),
        text: "\"You say what you mean.\" A flicker of something close to respect. \"Rare, in here — everybody " +
          "sell in a soft voice. You make my job faster: no dance, no pretend. You want, you say; I price, you " +
          "pay.\" The measured warmth is almost genuine. \"We will get along, you and I. Briefly. And honestly.\"",
        short: "\"You say what you mean — rare in here. You want, you say; I price, you pay. We'll get along. Briefly.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("operator"),
        text: "\"Ahh.\" For the first time the measured warmth cracks into something real — recognition. \"You " +
          "are working the room. Same as me.\" The tablet lowers a full inch. \"Then we will not insult each " +
          "other, tilac. I know what you are; you know what I am; and the girls—\" a nod at the floor \"—will " +
          "separate you from your money regardless. Enjoy the professional courtesy. It is the only thing in " +
          "here that really is free.\"",
        short: "\"You are working the room — same as me. We won't insult each other. The girls take your money regardless. Professional courtesy.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("whiteknight"),
        text: "\"Oh.\" Nee's eyes soften in a way that costs her nothing and means less. \"The good one. The " +
          "one who want to HELP.\" She has already chosen the girl — the one with the sickest buffalo and the " +
          "saddest story on her cracked screen, the one you will not survive. \"Sit, tilac. You are going to be so " +
          "happy here.\" A pause, precisely warm. \"And so useful.\"",
        short: "\"The good one — the one who want to HELP.\" She's already picked the girl with the saddest story. \"You'll be so happy here. And so useful.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Pink Lotus.\" The warmth is real and exactly measured, not a degree more. \"Sit, " +
          "enjoy. The girls will look after you. Anything the girls cannot give you — that is me.\" She has " +
          "already chosen which girl to send, and how much you'll spend before you leave.",
        short: "\"Welcome. The girls look after you; anything they cannot give is me.\"" },
      { topic: "girls", text: "\"Good girls, all of them — I choose careful.\" A precise nod. \"The customer " +
        "think he choose the girl. Mostly the mama choose the girl for the customer — the right one, for him, " +
        "for the bill. He leave happy, I leave happy, White Dish leave happy. Everybody happy is only good " +
        "management.\"" },
      { topic: "free", text: "\"You wonder why the welcome drink is free.\" She does not wait for you to deny " +
        "it. \"Because free is the most expensive word in this bar. Free drink, you stay. You stay, you buy. " +
        "Small psychology, twenty year old, work every night.\" Fact, not confession. \"I tell you because " +
        "knowing does not stop it. You will still stay.\"",
        short: "\"Free is the most expensive word in this bar. Free drink, you stay; you stay, you buy.\"" },
      { topic: "white dish", when: (st) => st.trust >= 2, text: "\"They own the paper. I run the room.\" " +
        "Careful now. \"The app tell me the numbers — how many girl, how late, which one move where. I make the " +
        "numbers happen. Is a job. Good pay, and I do not ask what I do not need to know.\" The tablet glows. " +
        "\"You ask a great many questions, for a tourist.\"" },
    ],
  },
  peung: {
    name: "Peung", th: "ผึ้ง", emoji: "👑", type: "operator",
    room: "golden_dragon",
    look: "Thai woman of fifty-five, steel-grey hair pinned up, reading glasses on a chain, dark blouse.",
    desc: "Golden Dragon's mamasan since before White Dish bought the paper — and she stayed on when they did, " +
      "because the numbers didn't care who owned them, and neither, in the end, does she.",
    dialogue: [
      // Peung has worked this floor through three owners and can place a farang by the
      // way he holds his money. One gated greeting per ORIGIN (the player always has
      // one after the intro; the plain welcome below is the pre-intro fallback). The
      // recognition lands even when your own archetype-NPC is deactivated — she reads
      // YOU, not him.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("monger"),
        text: "\"You been here before.\" Not a question. \"Not my bar — this TOWN. Is in how you don't look " +
          "around no more, how you already know where is the toilet in a bar you never walk into.\" A brisk, " +
          "unbothered nod. \"Welcome back, tilac. The girls are new. The game is not.\"",
        short: "\"You been here before — not my bar, this town. The girls are new; the game is not.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("married"),
        text: "\"You had a Thai wife.\" Peung says it flat, certain. \"Is in how you hold the money — careful, " +
          "not scared. And how you say thank you to the girl, like you actually mean it.\" A shrewd tilt. \"So " +
          "you know the song already, tilac. Which mean you know I am the second verse. Sit anyway. Knowing " +
          "never stopped anybody.\"",
        short: "\"You had a Thai wife — is in how you hold the money. You know the song, so you know I'm the second verse. Sit anyway.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("business"),
        text: "\"You are not here to drink.\" She prices the shoes, the watch, the wanting, in one pass. \"You " +
          "are here to BUY — a bar, a piece of something, a whole new life. Everybody like you end up across a " +
          "table from White Dish sooner or later.\" A shrug that has watched it happen. \"Do yourself a " +
          "kindness, tilac: drink first, sign later. Much later than they tell you.\"",
        short: "\"You're not here to drink — you're here to buy. Everybody like you ends up across a table from White Dish. Drink first, sign much later.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pi"),
        text: "\"You watch the room like it owe you money.\" A long, level look, taken slowly. \"Or like " +
          "somebody pay you to watch it. ...Was pay you.\" She lets that go on purpose, and pours the beer she " +
          "didn't ask you about. \"Not my business, tilac. In here nobody is what they used to be — that is the " +
          "whole product. Watch all you like. Just tip while you do it.\"",
        short: "\"You watch the room like somebody pays you to. ...Was pay you. Not my business. Watch all you like — tip while you do.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pension"),
        text: "\"A regular. A proper one.\" Approval, rare from her. \"Fixed money, long memory, no surprises — " +
          "my favourite kind of farang.\" She tips her chin down the rail. \"The old ones there will adopt you " +
          "before your first beer go warm. Go sit with them, tilac. They tip in stories, and the stories at " +
          "least are free.\"",
        short: "\"A regular, proper one — fixed money, long memory. The old ones will adopt you; they tip in stories, and those are free.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("redundancy"),
        text: "\"First real freedom, and money in the pocket the first time in your life — I see it, tilac, you " +
          "are lit up like the sign outside.\" Not unkind. A warning folded into it. \"So I tell you one time, " +
          "for free, because you remind me of my first year here too: this town LOVE exactly you. The happy " +
          "one who cannot believe his luck. Spend slow. The luck is the bar's, not yours.\"",
        short: "\"Lit up like the sign outside — first freedom, money in the pocket. This town loves exactly you. Spend slow; the luck is the bar's.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("running"),
        text: "\"You are not really here for the girls.\" Gentle, for Peung. \"You are here to be somewhere that " +
          "is not THERE. Wherever there is.\" She sets the beer down without a bill on it, this once. \"Is " +
          "okay, tilac. Half my customer the same. We don't ask the question in here — that is the product. " +
          "Sit. Be nobody a while. Nobody is very comfortable, if you let it.\"",
        short: "\"You're not here for the girls — you're here to be somewhere that is not there. Half my customer the same. Sit. Be nobody a while.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Sit, sit. Cold beer coming — you didn't ask, is fine.\" Brisk, unbothered, a woman who has run " +
          "this floor through three owners. \"Old jukebox, new app, same job: keep the men happy and the till " +
          "full. Not so different.\"",
        short: "\"Same job through three owners — men happy, till full. Sit.\"" },
      { topic: "white dish", text: "\"White Dish bought the bar. They did not buy me — they rent me, and I let " +
        "them.\" A shrug that has seen everything. \"Better owner, worse owner, the girls still need the shift, " +
        "I still take my cut. You survive this business by not falling in love with who sign the cheque.\"" },
      { topic: "free", text: "\"The beer I send you — on the house.\" A dry look. \"On the house mean on your " +
        "next three, tilac. I am not hiding it. A mama who hide the arithmetic is a mama who does not trust her " +
        "arithmetic.\" She almost smiles. \"Mine is very good.\"",
        short: "\"On the house mean on your next three. I don't hide the arithmetic — mine's good.\"" },
    ],
  },
  malai: {
    name: "Malai", th: "มาลัย", emoji: "👑", type: "operator",
    room: "sunset_dreams",
    look: "Thai woman of sixty, grandmotherly, soft white-streaked bun, gentle smile, patterned silk blouse.",
    desc: "Soft-spoken and grandmotherly, Sunset Dreams' mamasan pours you tea and asks after your health, and " +
      "somewhere in the warmth your wallet opens without a sound. The gentlest operator on the soi.",
    dialogue: [
      // Malai reads your MANNER through the grandmotherly warmth — the gentlest
      // operator on the soi, and none of the warmth is fake, and all of it is aimed.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("charmer"),
        text: "\"Ohh, a sweet-mouth one.\" Malai pats your hand like a favourite grandson. \"The girls will " +
          "fight over you, luk — and I will let them, because a charmer tips to keep the peace. Sit. Grandma " +
          "will look after you, and your wallet, both.\"",
        short: "\"A sweet-mouth one — the girls will fight over you, and a charmer tips to keep the peace. Sit, luk.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("joker"),
        text: "\"So funny already!\" She laughs before you've said anything, warm as the tea. \"Laugh all night, " +
          "luk — a happy man forget to count his change. Lucky for you, grandma count it for him.\"",
        short: "\"So funny! Laugh all night, luk — a happy man forgets to count his change. Grandma counts it for him.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("blunt"),
        text: "\"You don't waste words. Nah.\" A grandmotherly nod, genuinely approving. \"Then I won't waste " +
          "yours, luk: the tea is free, the girls are not, and I am the sweetest thief on this whole soi. Sit " +
          "anyway. You knew that walking in.\"",
        short: "\"You don't waste words — so I won't: tea free, girls not, and I'm the sweetest thief on the soi. Sit anyway.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("operator"),
        text: "\"Ahh — you SEE me.\" The grandmother's eyes twinkle, entirely unashamed. \"Most men feel only " +
          "the warm. You feel the hand in the pocket too, na. Clever boy.\" She pours your tea regardless. \"We " +
          "will both enjoy pretending you can resist it.\"",
        short: "\"You SEE me — most men feel only the warm, you feel the hand in the pocket too. We'll both enjoy pretending you can resist it.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("whiteknight"),
        text: "\"Such a good heart.\" Malai cups your face for a moment, and means it, and prices it in the same " +
          "breath. \"I have a girl for you, luk — so sweet, so unlucky, her family, ohh.\" A sorrowful, " +
          "much-practised sigh. \"You will want to help her. Grandma will make very sure you can.\"",
        short: "\"Such a good heart. I have a girl for you — so sweet, so unlucky. You'll want to help. Grandma will make sure you can.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Ohh, you look tired — sit, sit. You eat already? You want tea?\" She fusses like your own " +
          "auntie, and it is completely genuine, and it is also the most effective sales technique on Soi 6. " +
          "\"My bar is a soft bar. No pressure here. You relax — you stay long.\"",
        short: "\"You look tired — sit, tea? No pressure here. You relax, you stay long.\"" },
      { topic: "girls", text: "\"My girls are soft girls, gentle ones — Kwan, May, the sweet type.\" A fond " +
        "nod. \"Not every man want the loud bar, the fight for attention. Some man want kindness. Kindness—\" a " +
        "small, knowing pause \"—also has a price. Just a quieter one.\"" },
      { topic: "free", text: "\"The tea is free, of course.\" She pats your hand. \"Everything soft is free, " +
        "tilac. The soft things keep you in the chair. The hard things — the drink, the fine, the tip — those I " +
        "let you decide, all by yourself, after the tea make you comfortable.\" A grandmother's smile. " +
        "\"Clever, na? I am a nice lady. Nice ladies are the most expensive.\"",
        short: "\"The soft things are free — they keep you in the chair. Nice ladies are the most expensive.\"" },
    ],
  },
  toi: {
    name: "Toi", th: "ต้อย", emoji: "👑", type: "operator",
    room: "cherry_pop",
    look: "Thai woman of forty-five, big laugh lines, dyed-red hair, loud earrings, bright bar shirt.",
    desc: "Cherry Pop's mamasan — loud enough to run a loud bar, sharp enough behind it to run the numbers " +
      "while the party roars. She sells fun by the bottle, and business is very good.",
    dialogue: [
      // Toi clocks your ORIGIN at full volume — the flick of the eyes behind the big
      // welcome that reads your whole story before the first bottle lands.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("monger"),
        text: "\"HA — I know you!\" Toi points, delighted, over the music. \"Not YOU you. Your TYPE. Been to " +
          "Pattaya more time than the songthaew, packed your golf club, never swing one. Welcome home, tilac — " +
          "the party missed you!\"",
        short: "\"HA, I know your TYPE — more trips than the songthaew, packed the clubs, never swung one. Welcome home!\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("married"),
        text: "\"You had a wife here.\" Toi says it grinning, no cruelty in it at all. \"I can tell — you tip " +
          "like a man saying sorry to somebody who is not in the room. Don't worry, tilac. Tonight, nobody in " +
          "the room but us. LOUD music, na? Good for forgetting.\"",
        short: "\"You had a wife here — you tip like a man apologising to somebody not in the room. Loud music tonight, na. Good for forgetting.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("business"),
        text: "\"Investor face!\" She claps once, delighted. \"You look at my bar like you want to OWN one. Ha! " +
          "Everybody do, tilac. Buy a drink first — much cheaper than buy a bar, and you keep more of your " +
          "money. I tell you this as a FRIEND, and I never tell customer that.\"",
        short: "\"Investor face — you look at my bar like you want to own one. Buy a drink first, tilac, much cheaper than a bar.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pi"),
        text: "\"You watching the room, not the girls.\" A shrewd flash under all the loud. \"Police eyes. " +
          "Ex-police, maybe. Relax, tilac — nothing happen in MY bar the envelope don't already know about. " +
          "Drink. Watch. Whatever make you happy. Just tip the girl for standing in your eyeline.\"",
        short: "\"You watching the room, not the girls — police eyes. Nothing happens in my bar the envelope don't know. Watch all you like.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pension"),
        text: "\"A regular! A REAL one!\" Toi beams like you're family. \"Fixed money, good manner, no drama — " +
          "you, I keep the cold beer special. Sit by the rail with the old boys, tilac. They so boring you will " +
          "fit right in — ha! I love them. Don't tell them.\"",
        short: "\"A REAL regular — fixed money, no drama. Sit with the old boys by the rail, tilac, you'll fit right in.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("redundancy"),
        text: "\"First big trip! I see it, tilac — you SHINE.\" She loves it and warns it in the same breath. " +
          "\"Money in the pocket, no boss, whole town saying yes to you. Enjoy, enjoy — but slow, na? The shine, " +
          "the bar want to buy it off you cheap. Grandma Toi telling you free.\"",
        short: "\"First big trip — you SHINE. Money in the pocket, no boss. Enjoy, but slow, na — the bar wants to buy that shine off you cheap.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("running"),
        text: "\"You not here to party.\" Toi drops the volume, just for you, unexpectedly gentle. \"You here to " +
          "be too loud to think. Okay, tilac — I am very, very good at loud. Sit. Let the bar do your shouting " +
          "for you tonight. On the house, the first one. Nobody tell you that in here but me.\"",
        short: "\"You're not here to party — you're here to be too loud to think. Sit, tilac. Let the bar shout for you tonight.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"CHERRY POP! Welcome, welcome — tonight you have fun, guarantee!\" Big energy, big smile, and a " +
          "fast flick of the eyes that counts your table, your watch, your capacity. \"Chaba, look after this " +
          "one! Bottle service, my friend? More fun in a bottle than a glass, everybody know.\"",
        short: "\"Cherry Pop! Bottle service? More fun in a bottle than a glass.\"" },
      { topic: "girls", text: "\"Chaba is my engine — she make the party, the party make the bottle sell.\" A " +
        "businesslike nod. \"I know she drink too much. Is a cost. But a party bar need a party girl, and she " +
        "is the best I have. I keep her on water when I can. Cannot always.\" A shrug: the math wins." },
      { topic: "free", text: "\"Free shot for the table! Yeah!\" She pours it herself, generous, loud. Then, " +
        "lower, just to you, dry: \"One free shot, the table order four more to keep up. Oldest trick, still " +
        "the best. You buy fun, you buy it in a round — nobody drink alone at Cherry Pop. Nobody spend alone " +
        "either.\"",
        short: "\"One free shot, the table order four to keep up. Nobody spend alone at Cherry Pop.\"" },
    ],
  },
  saeng: {
    name: "Saeng", th: "แสง", emoji: "👑", type: "operator",
    room: "ruby_kiss",
    look: "Thai woman of forty-eight, calm watchful face, hair scraped back, plain dark blouse, arms folded.",
    desc: "Ruby Kiss's mamasan, content to sit back while Wilai works the window — because a mama who's found a " +
      "girl that good knows to stay out of her light and just count.",
    dialogue: [
      // Saeng watches and counts — she reads your MANNER dry and unhurried, from the
      // till, having already priced you against tonight's take.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("charmer"),
        text: "\"A charmer.\" Saeng barely lifts her eyes from the till, unimpressed and unbothered. \"Save it " +
          "for the girls, tilac — I already counted you. The charm work on them. On me, it just make the " +
          "evening pleasant while you spend.\"",
        short: "\"A charmer — save it for the girls, I already counted you. On me it just makes the evening pleasant while you spend.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("joker"),
        text: "\"Funny man.\" A small, economical smile that costs her nothing. \"Wilai will play with you — she " +
          "like a live one. Me, I laugh when the till laugh. So far tonight, tilac, we both very quiet.\"",
        short: "\"Funny man. Wilai will play with you. Me, I laugh when the till laughs — so far tonight we're both quiet.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("blunt"),
        text: "\"Straight talker. Good.\" She approves without warming a degree. \"Then straight: Wilai is the " +
          "show, the show is not free, and I am the one who count what the show earn. Enjoy her. Pay me. Simple, " +
          "the way you like it.\"",
        short: "\"Straight talker — then straight: Wilai's the show, the show's not free, I count what it earns. Enjoy her, pay me.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("operator"),
        text: "\"Mm.\" Saeng finally looks up, and something behind her eyes recalculates. \"You watch the room " +
          "the way I watch the room. An operator.\" A dry beat. \"Then you already see it — Wilai is the bait, " +
          "the bar is the hook. Knowing never once stopped a hungry man. Sit. Be hungry professionally.\"",
        short: "\"You watch the room the way I do — an operator. Then you see it: Wilai's the bait, the bar's the hook. Knowing never stopped a hungry man.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("whiteknight"),
        text: "\"Ohh. A careful one, this.\" She says it almost to herself, almost a sigh. \"The good heart. " +
          "Wilai eat the good hearts for breakfast, tilac, and I count what she leave on the plate.\" A shrug, " +
          "not unkind. \"Go on. You came to be a hero. Be one. It cost exactly the same as being a fool.\"",
        short: "\"The good heart — Wilai eats those for breakfast, and I count what she leaves. Go be a hero. It costs the same as being a fool.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Ruby. You met Wilai already? Of course you did.\" A satisfied, unhurried smile. \"I " +
          "let her run the front. A smart mama know when to work and when to watch. With Wilai, I watch, and I " +
          "count. Best job in the bar.\"",
        short: "\"You met Wilai? Of course. I let her run the front — I just watch and count.\"" },
      { topic: "wilai", text: "\"She want her own bar. I know — she think I don't.\" No malice in it. \"Good. " +
        "When she go, it hurt my numbers a season. But a girl with a plan work harder than a girl without one, " +
        "and I get the good years before she leave. Fair trade. I was her once, and my mama let me go too.\"" },
      { topic: "free", text: "\"The lipstick on the glass — Wilai's idea, but I pay for the lipstick.\" She " +
        "taps the mirror wall. \"Little cost, big return. The man keep the glass, remember the bar, come back. " +
        "Marketing, tilac. I don't advertise. I just make sure you cannot forget us.\"",
        short: "\"The lipstick's a little cost, big return — you keep the glass, you come back. Marketing.\"" },
    ],
  },
  bussaba: {
    name: "Bussaba", th: "บุษบา", emoji: "👑",
    room: "sunset_rail",
    look: "Thai woman of fifty, plain and unhurried, short greying hair, no jewellery, faded bar polo.",
    desc: "The Shady Lady's mamasan, running a beer bar the slow honest way — no bottle-service hustle, no " +
      "bank of go-go tricks, just cold beer, decent girls, and a chair you're welcome to keep all night.",
    dialogue: [
      // The honest beer-bar mama doesn't price you — she reads a few kinds and only
      // wants to look after them. Signature ORIGIN reads; everyone else gets the warm
      // welcome below.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pension"),
        text: "\"A regular — I can tell, you sit like a man who owns the stool.\" The weathered smile deepens. " +
          "\"Fixed money, long memory, no drama. My favourite kind. Keep the chair all night, tilac. Nobody " +
          "take it from you here.\"",
        short: "\"A regular — you sit like a man who owns the stool. Keep the chair all night, nobody takes it here.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("redundancy"),
        text: "\"First time with money in the pocket and nobody telling you no.\" She reads the shine, and " +
          "unlike the go-go mamas she only wants to keep it safe. \"You come to the right bar to start, tilac. " +
          "Nobody scam you here. Learn the soi slow, from a place that won't rob you first.\"",
        short: "\"First money in the pocket, nobody telling you no. Right bar to start — learn the soi slow, from a place that won't rob you first.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("running"),
        text: "\"You want a quiet corner, a cold beer, and nobody asking a single question.\" A gentle, knowing " +
          "nod. \"That is the whole menu at my bar, tilac. Sit. Nobody bother you here — I make sure of it " +
          "myself.\"",
        short: "\"A quiet corner, a cold beer, nobody asking questions — that's the whole menu here. Nobody bothers you; I make sure.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Sit, have a cold one. No hurry here.\" An easy, weathered smile. \"Beer bar is a different " +
          "game from the go-go. Small money, but honest money. Nobody scam nobody at my bar — I don't have the " +
          "stomach for it, and the customer come back for exactly that.\"",
        short: "\"Sit, cold one. Small money, honest money — nobody scam nobody here.\"" },
      { topic: "go-go", text: "\"The go-go mamas play the deep game — the free drink that cost you, the fine " +
        "that grow after dark.\" Mostly without judgement. \"Good business, I not deny. But I sleep good, and " +
        "my regulars are ten-year regulars. Slow and honest is also a business. Just a smaller one.\"" },
      { topic: "girls", text: "\"My girls, I don't push them at you. You like Pukky, talk to Pukky. You just " +
        "want to drink and watch the football — also fine, buy nobody a drink, I don't mind.\" A shrug. " +
        "\"Pressure is for the go-go. Here we let the beer do the work.\"" },
    ],
  },
  sopha: {
    name: "Sopha", th: "โสภา", emoji: "👑",
    room: "bay_watch",
    desc: "Front Row's mamasan, who put the big screens in herself and knows the league table better than half " +
      "the punters. Runs a football bar for football people, and keeps the drama outside.",
    dialogue: [
      // Football-bar mama, drama kept outside — a few signature PERSONALITY reads
      // framed through the match; everyone else gets the plain kickoff welcome.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("joker"),
        text: "\"Ha — a funny one. Good, we need the noise.\" Half an eye stays on the screen. \"You'll fit the " +
          "Saturday crowd fine, tilac. One rule: no jokes during a penalty. That, even I cannot forgive.\"",
        short: "\"A funny one — you'll fit the Saturday crowd. One rule: no jokes during a penalty.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("blunt"),
        text: "\"Straight talker. Football people, all of us — no soft-soap in a footy bar.\" A brisk, approving " +
          "nod. \"You'll do fine here, tilac. Beer's cold, ref's blind, sit down.\"",
        short: "\"Straight talker — football people, no soft-soap. You'll do fine. Beer's cold, ref's blind, sit down.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("operator"),
        text: "\"You're watching the room and the match both.\" She half-approves, half-warns. \"Careful man. " +
          "But nothing to work in here, tilac — just football and cold beer. Switch it off a while. Even the " +
          "angles take a night off for a good game.\"",
        short: "\"Watching the room and the match both — careful man. Nothing to work here, just football. Switch it off a while.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Grab a stool, game's about to start.\" A brisk nod, eyes half on the screen. \"Front Row is a " +
          "football bar first, girl bar second. Somo pour the beer, we all shout at the referee, everybody " +
          "happy. You want the other kind of bar, plenty on the soi. This one is for the match.\"",
        short: "\"Football bar first, girl bar second. Grab a stool — game's starting.\"" },
      { topic: "football", text: "\"I put the screens in myself — four, good ones, the sport package that cost " +
        "a fortune.\" Proud of it. \"Best investment I make. A man watching his team drink beer steady two " +
        "hour and never once cause trouble. Football is the best mamasan I ever hire.\"" },
      { topic: "girls", text: "\"Somo is worth three go-go girls to me.\" Flat, certain. \"She don't flirt, " +
        "don't scam, don't cry — she talk football, pour fast, the men treat her like a mate. My bar have no " +
        "drama because my best girl have no drama. I hire for that now.\"" },
    ],
  },
  malila: {
    name: "Malila", th: "มะลิลา", emoji: "👑",
    room: "sandy_toes",
    look: "Thai woman of fifty-two, comfortable and smiling, hair in a clip, loose floral shirt.",
    desc: "The Verandah's mamasan, who runs the most easygoing bar on Soi 6 like a long Sunday lunch — Nina " +
      "feeds the customers, Malila makes sure everyone's alright, and the money, such as it is, sees to itself.",
    dialogue: [
      // The quiet-end mama runs the calmest bar on the soi — she reads the men who
      // came to rest, and leaves the reading gentle. Signature ORIGIN reads; the rest
      // get the unhurried welcome below.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("running"),
        text: "\"You came to breathe.\" Malila says it softly, certain — and it is the kindest read anyone has " +
          "given you all night. \"I know the look, tilac. You are safe to sit here and be nobody a while. Nina " +
          "will bring food you didn't order. Let her.\"",
        short: "\"You came to breathe — I know the look. Safe to sit here and be nobody a while. Nina will bring food you didn't order. Let her.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("married"),
        text: "\"You've done the long version of this town.\" A comfortable, unhurried smile. \"I can tell — " +
          "you don't grab, you don't rush, you know how the whole thing goes. Then you know the Verandah is " +
          "where a man comes once he's learned better. Sit, tilac.\"",
        short: "\"You've done the long version — you don't grab, don't rush. The Verandah's where a man comes once he's learned better.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("monger"),
        text: "\"You know the drill, na. No hustle needed for you.\" She gestures at the easy, half-empty bar. " +
          "\"Then you already know why a man who has seen it all ends up at the quiet end. Sit. Breathe. The " +
          "loud is still out there when you want it back.\"",
        short: "\"You know the drill — no hustle needed. A man who's seen it all ends up at the quiet end. Sit, breathe.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome, welcome. Nina feed you yet? She will.\" A comfortable, unhurried warmth. \"The " +
          "Verandah is the quiet end of a loud soi. People come here to breathe. I am not going to hustle a man " +
          "who came to breathe.\"",
        short: "\"The Verandah is the quiet end of a loud soi. People come here to breathe.\"" },
      { topic: "money", text: "\"Rich? No. I make enough.\" She says it like it's plenty, and for her it is. " +
        "\"The big-money bars burn hot — big nights, big trouble, girls come and go. Mine burn low and long. My " +
        "girls stay years. Nina been with me eight. Worth more than a good Friday, to me.\"" },
      { topic: "girls", text: "\"I keep older girls, mostly — the ones the go-go finished with.\" No pity, just " +
        "fact. \"They know the job, they don't make drama, they mother the customers a little. A tired man at " +
        "the end of a hard trip, sometimes he don't want a twenty-year-old. Sometimes he want somebody kind who " +
        "bring him soup.\"" },
    ],
  },

  // ── Soi 6 cashiers (promoted from _FILLER_CASHIERS) ──────────────────────────
  // Businesslike, fluent. Three seams: TOMS (orientation:"gay" → flirt hits the
  // wrong-team refusal; barfine a hard no); the MAMA'S KIN (type:"kin" → family, not
  // floor, at any price); and the GOOD-GIRL-WITH-A-SPONSOR (type:"sponsor" → off-limits,
  // kept clean by a farang's money, until you outbid him — _sponsorFlipped, and the
  // facade drops in a bond-less `when` variant. Bleak, honest, anti-white-knight).
  jenny: {
    name: "Jenny", th: "เจนนี่", emoji: "🧾", type: "sponsor",
    room: "pink_lotus",
    desc: "Neat, quick with the till, a promise ring she touches when she's thinking. She took the cashier " +
      "seat on purpose — off the floor, off the market, kept clean for the man in Germany who sends the money.",
    // The "loosening" drip: as your gifts (G.soc.given) climb toward outbidding Klaus
    // (SPONSOR_FLIP ฿15k), she cracks a little more each threshold — a texted selfie
    // that says, without saying, that it's working. Rendered pics in portraits/pics.
    sponsorPics: [
      { at: 5000, pic: "jenny_pic1", cap: "Jenny — cozy, the ring in frame",
        words: "hi 😊 quiet shift today. i think of you a little na" },
      { at: 10000, pic: "jenny_pic2", cap: "Jenny — dressed up, a longing look",
        words: "Klaus always busy now. you not too busy for me na? 🙈 don't tell" },
      { at: 14000, pic: "jenny_pic3", cap: "Jenny — beach, coy over the shoulder",
        words: "just for you. i never do this before 😳 don't make me regret it" },
    ],
    dialogue: [
      { when: () => _sponsorFlipped("jenny"),
        text: "\"You.\" The practised welcome-smile isn't there; something quieter and more dangerous has " +
          "taken its place. \"I keep the ring in my bag now, when I know you coming. Klaus's ring, in my bag.\" " +
          "A small, wry, unhappy tilt. \"That is your doing. So — hello, tilac. Don't make me sorry for it.\"",
        short: "\"I keep the ring in my bag now when you come. That is your doing. Don't make me sorry.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello, welcome.\" Warm, with a boundary in it — the smile of a woman who has practised saying " +
          "no nicely. \"I do the till, not the floor. You want a girl, I call a good one over, no problem. Me, I " +
          "am spoken for.\" She touches the ring without knowing she does.",
        short: "\"I do the till, not the floor. I am spoken for — I'll call a girl over for you.\"" },
      { topic: "sponsor", when: () => _sponsorFlipped("jenny"),
        text: "She doesn't touch the ring this time. \"You know what you did, na. You made the number too big " +
          "to say no to.\" Not angry — tired, ashamed, and doing the arithmetic anyway. \"Klaus send good money, " +
          "every month, two year. You just... kept putting it in. Week after week. Till your number bigger than " +
          "his, and I saw it, and now I cannot un-see.\" A flat breath. \"I am not clean anymore. You bought that. " +
          "I hope it was worth what it cost. For both of us.\"",
        short: "\"You made the number too big to say no. I am not clean anymore — you bought that.\"" },
      { topic: "sponsor", text: "\"Klaus. Germany.\" She says the name like an anchor. \"Two year now. He send " +
        "money every month, I keep clean, I stay off the floor, I go with nobody. That is the deal, I keep my " +
        "side.\" A steadiness that is mostly real. \"He come Pattaya twice a year. In between, I count the " +
        "drinks and I count the days. Good deal. Better than the floor.\"" },
      { topic: "ring", text: "\"Not married. Not yet.\" She turns it. \"Promise ring. He say when he retire he " +
        "take me Germany, we marry proper. I believe him. Mostly.\" The 'mostly' escapes before she can stop " +
        "it, and she files it away, embarrassed. \"He is a good man. Really. Two year, always the money come.\"" },
    ],
  },
  joon: {
    name: "Joon", th: "จูน", emoji: "🧾", orientation: "gay",
    room: "golden_dragon",
    desc: "Short hair, men's watch, a handshake instead of a wai, running Golden Dragon's till like a foreman. " +
      "A tom, and entirely uninterested in being anything else for your benefit.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Alright, boss.\" A firm nod, all business. \"I keep the money, I keep the girls honest, I keep " +
          "the drunk farang from doing something we all regret. You buy a lady a drink, I make sure she " +
          "actually get it. That is my job.\" No flirt in it, none coming.",
        short: "\"I keep the money and the girls honest. No flirt in it, none coming.\"" },
      { topic: "tom", text: "\"Yeah, I'm tom. You noticed — good for you.\" Dry, heard it a thousand times. \"My " +
        "girlfriend work Jomtien, the dee side. Ten year.\" A rare, real softness, gone fast. \"So: no, I don't " +
        "want your drink; no, you cannot change my mind; and no, it is not a challenge. Anything else?\"" },
      { topic: "girls", text: "\"They trust me because I am not trying to get anything from them.\" Matter-of-" +
        "fact. \"A man cashier skim, flirt, cause trouble. A tom just do the numbers and watch their backs. " +
        "Best cashier a mama can hire — Peung know it. That is why I am here.\"" },
    ],
  },
  jun: {
    name: "Jun", th: "จัน", emoji: "🧾", type: "kin",
    room: "sunset_dreams",
    look: "Thai woman of twenty, neat college look, straight dark hair, round glasses, tidy plain blouse.",
    desc: "Malai's daughter, home from a Bangkok college for the season and minding her mother's till — polite, " +
      "sharp, and quietly counting the months until she never has to do this again.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Good evening.\" University English, careful and a little cool. \"I'm helping my mother this " +
          "month — Malai, the mamasan. I handle the money. If you need anything I can help, but—\" a polite, " +
          "immovable beat \"—I am not one of the girls. I am the daughter.\"",
        short: "\"I handle the money for my mother. I am not one of the girls — I am the daughter.\"" },
      { topic: "mother", text: "\"She built everything here. This bar put me through school.\" Complicated " +
        "pride, no shame. \"I used to be embarrassed. Now I am just practical about it. It is a business, my " +
        "mother is very good at it, I love her, and I am also never, ever doing it myself.\" A small, honest " +
        "smile. \"She agree, actually. She works so I don't have to.\"" },
      { topic: "you", text: "\"You are wondering if the daughter can be persuaded.\" Not offended, just " +
        "accurate. \"They always wonder. No. My mother would end you, and honestly so would I — I am studying " +
        "law.\" A cool smile. \"Buy Kwan a drink. She is lovely. I'll ring it up.\"" },
    ],
  },
  baimon: {
    name: "Baimon", th: "ใบหม่อน", emoji: "🧾", type: "sponsor",
    room: "kitten_corner",
    look: "Thai woman of twenty-six, quiet careful face, hair in a low ponytail, modest buttoned top.",
    desc: "Soft-spoken, careful with the money and with herself, a photo of a couple propped by the till in a " +
      "glittery case. Kesinee gave her the cashier seat as a kindness — off the floor, where the sponsor's money keeps her.",
    // The "loosening" drip toward outbidding Dave (SPONSOR_FLIP ฿15k) — softer than
    // Jenny's, more guilt than longing. Texted selfies filed to the gallery on read.
    sponsorPics: [
      { at: 5000, pic: "baimon_pic1", cap: "Baimon — off-shift, a shy smile",
        words: "you make me smile today na 😊 i take one picture, only for you" },
      { at: 10000, pic: "baimon_pic2", cap: "Baimon — dressed up, one shoulder",
        words: "Dave don't call so much now 🙈 i think about you. don't tell nobody" },
      { at: 14000, pic: "baimon_pic3", cap: "Baimon — beach, teasing",
        words: "i shouldn't send you this 😳 delete after, na 💗" },
    ],
    dialogue: [
      { when: () => _sponsorFlipped("baimon"),
        text: "\"You came.\" Softer than the welcome-smile, and heavier. The couple photo is face-down by " +
          "the till, and she doesn't turn it back. \"Kesinee pretend she don't see the picture down. You are " +
          "the reason it is down, so — hello.\" Her hand rests flat on the frame. \"Be gentle with it, na.\"",
        short: "\"You came. The photo is face-down now, and you are the reason. Be gentle with it, na.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome ka.\" Gentle, a little guarded. \"I only do the money here. Kesinee is good to me — she " +
          "keep me off the floor. My boyfriend prefer that.\" She glances at the photo without meaning to. \"He " +
          "is in Australia. He is coming back for me. Soon.\"",
        short: "\"I only do the money. My boyfriend prefer that — he in Australia, coming back for me. Soon.\"" },
      { topic: "sponsor", when: () => _sponsorFlipped("baimon"),
        text: "The photo is turned face-down now; she did it herself, earlier, and hasn't turned it back. " +
          "\"Don't. Whatever you going to say — don't.\" Quiet, not looking at you. \"You have more money than " +
          "Dave. I found that out tonight, and now I cannot un-know it, and Dave is in Perth and you are " +
          "here.\" Her hands are very still on the till. \"He said a good girl deserve better. Turn out " +
          "'better' just mean 'more'. Okay. Okay.\"",
        short: "\"You have more money than Dave. A good girl deserve better — turn out 'better' just mean 'more'.\"" },
      { topic: "sponsor", text: "\"Dave. Perth.\" A soft, careful pride. \"He send money so I don't work the " +
        "floor. Just the till. He say a good girl deserve better than the floor, and he make it true for me. One " +
        "year already, he send every week, never miss.\" A tiny pause. \"He is coming. He say he is coming.\"" },
    ],
  },
  fahsai: {
    name: "Fahsai", th: "ฟ้าใส", emoji: "🧾", orientation: "gay",
    room: "cherry_pop",
    look: "Thai tom of twenty-seven, snapback cap, cropped hair, arms folded, loose black tee.",
    desc: "The one still point in Cherry Pop's chaos — a tom in a snapback, arms folded behind the till, " +
      "watching the party she is emphatically not part of with the patience of a designated driver.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Evening.\" A nod from behind the till, unhurried in a bar with no other speed. \"I keep the " +
          "money and I keep Chaba upright. Two full-time job.\" A dry glance at the dance floor. \"You have " +
          "fun. I'll be here, being the adult. Somebody has to.\"",
        short: "\"I keep the money and I keep Chaba upright. You have fun; I'll be the adult.\"" },
      { topic: "tom", text: "\"Tom, yes.\" Flat, faintly amused you asked. \"In a bar full of girls whose whole " +
        "job is to make men feel something — I am the one they can relax around. No agenda. Not selling them, " +
        "not wanting anything from you either.\" She uncrosses her arms to make change. \"Restful, honestly. " +
        "For everybody.\"" },
      { topic: "chaba", text: "\"Somebody watch her. Might as well be me.\" No judgement. \"She drink too much, " +
        "she is the best party girl on the soi — both true. When she go too far, I put her in a taxi, pay it " +
        "myself, Toi take it off my pay and we don't talk about it.\" A small shrug. \"She'd do it for me. She " +
        "has.\"" },
    ],
  },
  preaw: {
    name: "Preaw", th: "แพรว", emoji: "🧾", type: "kin",
    room: "ruby_kiss",
    look: "Thai woman of thirty, brisk and neat, hair in a tight ponytail, plain dark polo, no jewellery.",
    desc: "Saeng's niece, brisk and unsentimental behind the Ruby Kiss till, running the money while Wilai runs " +
      "the window — the two halves of the operation that never need to discuss it.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Yes? Drink, girl, or bill?\" Efficient, not unfriendly, a woman with a queue in her head. \"My " +
          "aunt is the mamasan — Saeng. I run the money, Wilai run the front. You want to be worked, see Wilai; " +
          "she is the best there is. You want to pay, that is me.\"",
        short: "\"Drink, girl, or bill? Wilai works the front; I run the money.\"" },
      { topic: "wilai", text: "\"She is going to leave and open her own place — everybody know.\" A shrug, no " +
        "drama. \"My aunt let her. Good business: a hungry girl earn double. When Wilai go, I stay. Family " +
        "always keep the till. That is why my aunt hire blood — blood don't skim.\"" },
      { topic: "money", text: "\"You want to know how the bar really make money?\" A thin, professional smile. " +
        "\"Not the barfine — the barfine is the headline. The money is the lady drinks, the small markup on the " +
        "whisky, the fine that grow after midnight, the tip you give because you are drunk and generous. Little " +
        "cuts, all night. Nobody feel the small ones. That is the art.\"" },
    ],
  },
  numfon: {
    name: "Numfon", th: "น้ำฝน", emoji: "🧾",
    room: "sunset_rail",
    look: "Thai woman of thirty-five, comfortable build, easy face, hair clipped up, faded bar tee.",
    desc: "The Shady Lady's cashier, comfortable and unbothered, running an honest till at an honest bar — the " +
      "numbers are small, the trouble is smaller, and that suits her exactly.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Evening, love. Cold one? I'll ring it in.\" Easy, weathered, no edge to her at all. \"Beer bar " +
          "till is a nice job. Small number, honest customer, nobody try the funny business — Bussaba don't " +
          "allow it, and honestly nobody bother. You relax.\"",
        short: "\"Cold one? I'll ring it in. Small numbers, honest customers — you relax.\"" },
      { topic: "money", text: "\"No games here.\" She taps the till, content. \"The go-go till, aiyo — the " +
        "markup, the padded bill, the mama cut, the fine that move. So much arithmetic, so much watching. Here, " +
        "a beer is a beer, the price on the board is the price. I sleep at night. Small money, clean " +
        "conscience. My kind of maths.\"" },
    ],
  },
  nu: {
    name: "Nu", th: "หนู", emoji: "🧾", orientation: "gay",
    room: "bay_watch",
    look: "Thai tom of twenty-eight, cropped hair, red football shirt, whistle-lanyard, grinning.",
    desc: "Front Row's cashier, a tom in a footy shirt matching Somo's, the two of them running the bar like a " +
      "five-a-side team — one on the beer, one on the money, both shouting at the ref.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Alright mate, what you having?\" Brisk, cheerful, football on three screens behind her. \"Me " +
          "and Somo run this place — she pour, I count, we both scream at the telly. Best job on the soi: no " +
          "drama, all football.\" A grin. \"You're not United, are you? Had to bar a bloke last week. Joking. " +
          "Mostly.\"",
        short: "\"What you having? Me and Somo run this — she pour, I count, we scream at the telly.\"" },
      { topic: "somo", text: "\"Somo? Nah, we're not together — everybody ask.\" She laughs. \"Two toms in one " +
        "bar, must be dating, ha. No. She's my best mate. We just both like football more than most people.\" A " +
        "shrug. \"Found the one bar on Soi 6 where nobody expect us to flirt with the customers. Paradise, " +
        "honestly.\"" },
      { topic: "tom", text: "\"Yeah. And before you make it weird—\" she holds up a hand, friendly \"—I'm " +
        "working, you're drinking, the match is on, everybody's happy. That is the whole thing. Your beer is " +
        "฿" + BEER_PRICE + ".\"" },
    ],
  },
  haad: {
    name: "Haad", th: "หาด", emoji: "🧾", type: "kin",
    room: "sandy_toes",
    look: "Thai woman of forty-five, round kind face, hair in a clip, loose floral shirt, bowl of peanuts.",
    desc: "Malila's younger sister and the Verandah's cashier, cut from the same easygoing cloth — she runs the " +
      "till the way the bar runs everything, slowly and kindly, and always has a bowl of peanuts within reach.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Sit, sit. Peanut?\" She pushes the bowl over before the hello. \"My sister run the bar, I run " +
          "the till, Nina feed everybody. Family business, the slow kind. You are not in a hurry, na? Good. " +
          "Nobody here is.\"",
        short: "\"Peanut? My sister run the bar, I run the till. Family business, the slow kind.\"" },
      { topic: "family", text: "\"Malila older — always the boss, even when we small.\" A fond laugh. \"She " +
        "took me in when my marriage finish. 'Come sit at my till,' she say, 'stop crying, count something.' " +
        "Best thing she ever do for me. Ten year now. This bar is more my family than my family was.\"" },
    ],
  },

  // ── Ladyboy hostesses at the WDG bars ────────────────────────────────────────
  // ladyboy:true → for a bi player they're full courtship options; for a straight
  // player, a gracious pass where SHE reads YOU and declines (agency intact — see
  // _ladyboyGate). Written as full people, never a gag. At the flagship it's on
  // brand: "White Dish love a full menu."
  pancake: {
    name: "Pancake", th: "แพนเค้ก", emoji: "💋", ladyboy: true, personality: "charmer",
    room: "katoeys",
    desc: "The one on the flyer, and she knows it. Six foot two before the heels, a " +
      "waist that took surgery and discipline in that order, and a face assembled " +
      "with the precision of someone who has been getting it exactly right since " +
      "she was fifteen. She works the front of house because nobody sells the room " +
      "better — she can read a man's nerve from the doorway and pitch herself " +
      "accordingly, warm or wicked, in about a second and a half.",
    dialogue: [
      { text: "\"Sawatdee kha!\" — the flourish is the joke and the joke is the welcome. " +
          "\"You look nervous. Everybody nervous, first time. Is fine! We very friendly " +
          "here. TOO friendly, some people say.\" She laughs, delighted with herself, " +
          "and steers you at a stool.",
        th: "สวัสดีค่ะ", rom: "sawatdee kha" },
      { topic: "show", text: "\"Nine o'clock, eleven, one. Eleven is the good one — that's " +
          "when Baitoey does her Whitney and the whole room forget to drink.\" A beat. " +
          "\"I go on at one. Different energy. You stay, you see.\"" },
      { topic: "here", text: "\"Sign say what it say. Nobody confused, nobody upset, nobody " +
          "find out later and make problem.\" She spreads her hands, rings catching the " +
          "light. \"Other bars, the girl worry all night. Here? No worry. Is the best job " +
          "on the street and I not swap it.\"" },
      { bond: 2,
        text: "She sits down properly, which she does not do for everyone, and for a " +
          "moment the volume drops out of her. \"Fifteen years I do this. Started when a " +
          "katoey get one job or the other job, and I was lucky, I get this one.\" She " +
          "looks out at the room, fond and unsentimental. \"Now the young ones come in " +
          "and think the loud is the point. The loud is the DOOR. What is inside is that " +
          "everybody in here get to stop explaining themselves for one night.\"" },
    ],
  },
  baitoey: {
    name: "Baitoey", th: "ใบเตย", emoji: "🎤", ladyboy: true, personality: "dreamer",
    room: "katoeys",
    look: "Thai ladyboy of thirty, tall and lean, gold hoops and chain, glittering gold stage dress.",
    desc: "Long, lean and built for the stage, with an actual voice under the lip-sync " +
      "and a habit of using it when the room has thinned out enough to deserve it. " +
      "Gold everything tonight — hoops, chain, a dress that is mostly intention. " +
      "Between shows she sits at the end of the rail with her heels off, entirely " +
      "unglamorous, eating som tam out of a bag.",
    dialogue: [
      { text: "She gives you the up-and-down and decides you are harmless. \"You want the " +
          "big show or the small show? Big show is eleven. Small show—\" she nods at the " +
          "stool beside her \"—is now, and is free, and is mostly me complaining about " +
          "my feet.\"",
        th: "มาแล้วเหรอ", rom: "ma laeo ler" },
      { topic: "sing", text: "\"Everybody lip-sync. Is faster, is safer, the sound man he " +
          "prefer.\" She shrugs one shoulder. \"Sometimes late, two, three o'clock, nobody " +
          "left but the regulars — then I sing for real. Nobody clap. Is nicer that way.\"" },
      { bond: 2,
        text: "\"My mother know what I do. Took her four years to say the word out loud, " +
          "and then she say it in front of the whole village, at a funeral, very calm, " +
          "like daring somebody.\" Baitoey laughs, but her eyes have gone somewhere. " +
          "\"Nobody said nothing. She still tell that story. I let her.\"" },
    ],
  },
  bebe: {
    name: "Bebe", th: "บีบี", emoji: "💅", ladyboy: true, hatesSmoke: true,
    room: "pink_lotus",
    desc: "Six feet of engineered glamour in heels that make it seven, sharper-tongued than the whole bar and " +
      "twice as funny. Ladyboy, and not hiding it for a second — the confidence is the whole act, and the act " +
      "is magnificent. A ยาดม inhaler is never further than her reach, in case a smoker wanders in and dares to " +
      "light up.",
    dialogue: [
      // The armor arc — the magnificent confidence is a wall, and a bonded regular is
      // the one person she lets see behind it. Bond-tiered, her own sharp English.
      { bond: 3,
        text: "She lets the whole act down at once, like heels kicked off at 3am, and what's left is quieter " +
          "and younger than the glamour ever admits to. \"The confidence, the mouth, the big Bebe — is real. " +
          "Is also a wall, tilac. Behind it—\" she taps her own chest, wry \"—just a person who wanted, so " +
          "bad, to be exactly this. And got it. And still nobody stay past breakfast.\" Then the wall is back " +
          "up, dazzling, defended. \"ANYWAY. You want to stay past breakfast, we see. No promises. I am very " +
          "high maintenance and worth every baht.\"",
        short: "The act comes down. \"The big Bebe is real — but also a wall. Behind it, a person who got exactly what she wanted, and still nobody stay past breakfast.\"" },
      { bond: 2,
        text: "Bebe drops onto the stool beside you and, for once, doesn't aim the whole show at you — the " +
          "mouth goes quiet, the eyes stay sharp. \"You, I don't have to sell. Is restful, actually.\" She " +
          "says it like a confession she'll deny later. \"You know how tiring, being switch-ON all night? The " +
          "mouth, the hair, the walk — all night.\" A sideways look, almost shy under all that gloss. \"With " +
          "you I can put it down a minute. Don't tell nobody. I have a reputation to bankrupt.\"",
        short: "For once she doesn't perform at you. \"You I don't have to sell — is restful. You know how tiring, being switch-on all night?\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Well, HELLO.\" She looks you over like a menu she's decided about. \"Yes, I am ladyboy — we " +
          "save time, you and me. Now: you are curious, or you are lost, or you are exactly where you want to " +
          "be. I like all three. I only respect the third.\" A dazzling, dangerous smile.",
        short: "\"Yes, I am ladyboy — we save time. Curious, lost, or exactly where you want to be?\"" },
      { topic: "ladyboy", text: "\"Since sixteen I know. Since eighteen I do something about it.\" Matter-of-" +
        "fact, no invitation to pity. \"My family—\" a flick of the wrist, done with the subject \"—they come " +
        "around. Money help them come around. Now they cash the transfer and don't ask what bar.\" A bright, " +
        "hard laugh. \"Same as every girl here, na? Only I look better doing it.\"" },
      { topic: "girls", text: "\"The real girls?\" Fond, and merciless. \"They love me and they hate me. I get " +
        "the customer who want the fantasy turn up to eleven — the show, the confidence, the mouth. They get " +
        "the boyfriend experience. Different product, same shop.\" A wink. \"I outsell half of them, and Nee " +
        "know it. That is why the flagship keep a ladyboy. Variety, tilac — White Dish love a full menu.\"" },
      { topic: "smoke", text: "Her whole face closes like a shop at a raid. \"You smoke? Not near ME you " +
        "don't.\" The ยาดม is already at one nostril, then the other — a theatrical inhale, a shudder of " +
        "recovery. \"Cigarette is the ONE thing kill the glamour, tilac. It get in the hair, the dress, " +
        "everything. I work too hard on this face to marinate it like a som tam.\" She waves the offending air " +
        "away with a whole flat hand. \"Go smoke by the beer bar — the football men don't care. I care.\"",
        short: "\"You smoke? Not near me — cigarette kill the glamour. Go smoke by the beer bar.\"" },
    ],
  },
  poy: {
    name: "Poy", th: "พอย", emoji: "🌸", ladyboy: true,
    room: "golden_dragon",
    look: "Thai ladyboy of twenty-seven, softly made-up, long straight hair, quiet elegant dress.",
    desc: "Softly spoken and glamorously done up, and decent enough to say it at hello — she would rather tell " +
      "you straight than be anyone's surprise. Tired of the two reactions, hoping for a third.",
    dialogue: [
      // The courtship payoff of her whole setup — the rare "third reaction," the man
      // who just talks to her like a person, the seat she said she keeps. Bond-tiered
      // in her own soft English (authored NPC, not the filler _bondTalk). Reachable
      // by any bonded player; a bi player additionally gets the flirt/barfine routing.
      { bond: 3,
        text: "No braced hello any more — Poy just exhales when she sees you, the whole careful performance " +
          "set down at the door. \"You.\" She takes your hand in both of hers, unhurried, nothing for sale in " +
          "it. \"You know what you are, tilac? You are the third one. The man who only... talk to me. Like a " +
          "person.\" A soft, disbelieving laugh at herself. \"Long time I keep this seat for a man like that. " +
          "I stop believing he come. Then—\" a shrug, wet-eyed and smiling \"—you come.\" She asks you for " +
          "nothing at all. That is how you know it's real.",
        short: "Poy exhales when she sees you, the performance set down. \"You are the third one, tilac — the man who only talk to me like a person. I stop believing he come.\"" },
      { bond: 2,
        text: "The braced manner is gone before you reach the stool; she saved it, the way she said she " +
          "would. \"You came back.\" Poy says it like it still surprises her. \"Most men, once they know — " +
          "they don't. Or they come back too much, the wrong reason.\" She studies you, careful and a little " +
          "hopeful. \"You are neither, I think. That is new, for me. I don't quite know what to do with you, " +
          "tilac. Is a nice problem to have.\"",
        short: "\"You came back.\" The braced manner's gone — she kept you the seat. \"Most men don't. Or come back the wrong reason. You are neither. A nice problem.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello. Sit if you like.\" Gentle, a little braced — the manner of someone who has learned to " +
          "get the hard part out of the way. \"I tell you now, so nobody feel stupid later: I am ladyboy. You " +
          "can stay, you can go, both okay. I just don't like the surprise. The surprise never go well, for " +
          "anybody.\"",
        short: "\"I tell you now so nobody feel stupid later: I am ladyboy. Stay or go, both okay.\"" },
      { topic: "ladyboy", text: "\"Two reaction, always.\" She counts them on soft fingers. \"The man run, " +
        "angry, like I trick him — I told you at hello, but okay. Or the man get too excited, like I am a " +
        "secret he found. Both make me tired.\" A small, hopeful look. \"Sometime, not often, a man just talk " +
        "to me like a person. That one I remember. That one I keep the seat for.\"",
        short: "\"Two reaction, always — run angry, or too excited. Sometime a man just talk to me like a person.\"" },
      { topic: "family", text: "\"Isan, like everybody. My mother know, my father pretend not to.\" No drama, " +
        "just the shape of it. \"I send money home same as my sisters. The money spend the same, na — the bank " +
        "don't ask who I am. Funny, the money is the one thing that never care.\"" },
      { topic: "dream", bond: 2, text: "\"You want the dream? Everybody think ladyboy dream is to be " +
        "beautiful. I am ALREADY beautiful—\" a flash of armor, then it softens away \"—the dream is smaller " +
        "than that. One person who, when somebody ask him what I am, he only say my name. Not 'my ladyboy.' " +
        "Not explain, not defend. Just—'that is Poy.'\" She looks at you, then away, having said more than she " +
        "meant to. \"Silly dream. Cheaper than a house. Harder to buy.\"",
        short: "\"The dream is small — one person who, asked what I am, only says my name. Not 'my ladyboy.' Just 'that is Poy.'\"" },
    ],
  },
  // Chompoo (Ruby Kiss) — the third ladyboy, and the opposite of Poy: not braced or
  // hoping, but Berlin-cool and armoured in wit. Went out on a media-design scholarship
  // with textbook German, came home FLUENT (softened Berlin accent) after years in the
  // KitKat/warehouse scene — and a discreet run of high-end escort work she's left
  // behind professionally but not reputationally. Every season a former client "happens"
  // to holiday on her schedule. She knows exactly why, and exactly what it's worth. Her
  // German is real and idiomatic (contrast to Jenny's phrasebook Taitch); her English
  // greeting drops the Berlin thread on purpose, so a punter learns she speaks it — the
  // hook for the German-phrase Easter egg (engine-parser _GERMAN_TRY). ladyboy:true →
  // _ladyboyGate routes straight players a gracious pass, bi players full courtship.
  chompoo: {
    name: "Chompoo", th: "ชมพู่", emoji: "🦋", ladyboy: true,
    room: "ruby_kiss",
    look: "Thai ladyboy of twenty-five, high cheekbones, dancer's build, cool amused expression, stage bikini.",
    desc: "The one on the little stage who dances like she's bored of being the most interesting person in the " +
      "room, because she is. Cheekbones, a dancer's line, and an amused, appraising calm that reads a man in a " +
      "glance and prices him in the next. Drops a German word now and then like she's forgotten you might not follow.",
    dialogue: [
      // The bond payoff — distinct from Poy's "third reaction." Everyone who comes wants
      // the Berlin legend or the old arrangement; the rare man who just likes HER company
      // is the one thing money never sends her. Reachable by any bonded player.
      { bond: 3,
        text: "The performance drops the moment she clocks you — not the stage one, the OTHER one, the arch " +
          "little price-tag smile she wears for the room. \"Ach, du.\" Just that, warm and unguarded and a " +
          "little rueful. \"You know what you are, Schatz? You are the one who never booked the legend. All of " +
          "them fly around the world for a woman who does not exist any more — the Berlin one, the story.\" She " +
          "shrugs, and for once there is no angle in it. \"You just... like when I sit here. That one nobody can " +
          "wire me. That one I keep for free.\"",
        short: "\"Ach, du.\" The price-tag smile drops. \"You never booked the legend, Schatz. Everyone else flies here for a woman who doesn't exist any more. You just like when I sit here — that one nobody can wire me.\"" },
      { bond: 2,
        text: "\"Back again, and you did not even pretend it was Berlin business.\" A real smile, drier and " +
          "closer than the stage one. \"Refreshing. Most of my regulars need a story — old times, old " +
          "arrangement, makes it feel less like what it is.\" She tilts her head, reading you. \"You don't run " +
          "the story. I don't quite know what to do with that yet. Sit, na. We find out.\"",
        short: "\"Back again — and no Berlin-business excuse. Refreshing. Most regulars need a story. You don't. Sit, na.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "She finishes the eight-count before she even looks at you — the stage is hers and she knows it. " +
          "\"Hi. Yes, ladyboy, before you spend an hour wondering — I like to save everyone the detective work.\" " +
          "The English is quick and unaccented in the wrong places, schooled somewhere colder than here. \"Berlin " +
          "polished it. Long story, expensive city. Buy me a drink and I might tell you a little of it — auf " +
          "Englisch, don't worry, Schatz.\"",
        short: "\"Yes, ladyboy — saves us the detective work. My English got polished in Berlin. Buy me a drink and I tell you a little — auf Englisch, don't worry.\"" },
      { topic: "ladyboy", text: "\"In Pattaya it is a category. In Berlin it was just Tuesday.\" She says it " +
        "without heat, filing her nail. \"Five years in a city that had genuinely seen everything cured me of " +
        "flinching about it. I came back unshockable, Schatz — do you know how restful that is? The men here who " +
        "think they are being daring...\" A small, delighted laugh. \"Süß. I have been to parties that would " +
        "stop their hearts.\"",
        short: "\"In Pattaya it is a category. In Berlin it was just Tuesday. I came back unshockable — do you know how restful that is?\"" },
      { topic: "berlin", text: "\"Scholarship. Media design — I was going to be very serious and make title " +
        "sequences.\" A wry tilt. \"I arrived with textbook German and a suitcase, and the city taught me the " +
        "rest at three in the morning. Bartenders, DJs, the KitKat crowd, artists who never slept.\" She turns " +
        "the glass. \"University gave me a diploma. Berlin gave me the language, the nerve, and a very particular " +
        "address book. Guess which one paid the rent.\"",
        short: "\"Scholarship — media design. Arrived with textbook German; the city taught me the rest at 3am. The diploma, or the address book — guess which paid rent.\"" },
      { topic: "german",
        text: "\"Fließend. Fluent, genuinely — not the bar kind.\" A note of real pride, quickly disowned. \"Five " +
          "years living it, arguing in it, being heartbroken in it. You do not forget a language you cried in.\" " +
          "She studies you. \"The German men love it, of course — they get off the plane braced to translate " +
          "themselves and instead a katoey in Soi 6 corrects their grammar. Some of them never recover. Gut so.\"",
        short: "\"Fließend — genuinely fluent, not the bar kind. Five years living it. The German men get off the plane and a katoey on Soi 6 corrects their grammar. Some never recover.\"" },
      { topic: "clients", text: "\"Every high season, the same faces book the same two weeks.\" She counts them " +
        "off, amused, unsentimental. \"Frankfurt banker. The film-money one from Munich. Two who still think they " +
        "discovered me.\" A cool, clear-eyed shrug. \"They call it a holiday. It happens to land on my schedule " +
        "every year, funny that. I let them buy the drink and the nostalgia. The rest retired with the address " +
        "book — but a girl lets a man hope. Hope is the most expensive thing I sell now, Schatz.\"",
        short: "\"Same faces, same two weeks, every high season. They call it a holiday; it lands on my schedule, funny that. I sell them the drink and the nostalgia. Hope is the most expensive thing I sell now.\"" },
      { topic: "dance", text: "\"The stage? A formality. I could stop and they would still watch.\" Not vanity — " +
        "an audit. \"Six years of it teaches you exactly where every eye in a room is. Useful skill. Transfers " +
        "to almost everything.\" She steps back up onto the little stage in one unhurried movement. \"Watch or " +
        "don't, Schatz. I dance for the mirror.\"",
        short: "\"The stage is a formality — I could stop and they'd still watch. Six years teaches you where every eye is. I dance for the mirror.\"" },
    ],
  },
  // Aum (Kitten Corner) — the new girl, still learning to meter the smile. Soft,
  // sweet, honest, six months in and still deciding how she feels about the job.
  aum: {
    name: "Aum", th: "อุ้ม", emoji: "🌷",
    room: "kitten_corner",
    look: "Thai woman of twenty-three, soft unstudied prettiness, hair loose over one shoulder, simple bar dress.",
    desc: "Pretty in the soft, unstudied way that stops men mid-sentence, with a smile she gives away too " +
      "easily for this business. New enough that the job hasn't finished teaching her its lessons yet.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello ka.\" A warm, slightly shy smile — she hasn't learned to meter it yet. \"You want " +
          "company? I sit with you. I am still new, so I am not so good at the—\" a small gesture at the whole " +
          "loud business of the bar \"—the tricks. I just talk. Is that okay?\"",
        short: "\"I am still new — not so good at the tricks. I just talk. Is that okay?\"",
        asks: { key: "home", q: "\"You are far from home? Me too — six month now.\" A soft, honest look. \"Some day I think I am used to it. Then some day, not at all. You know this feeling?\"" } },
      { topic: "new", text: "\"Six month.\" She counts it like it is longer. \"My friend from home work here " +
        "already two year — she bring me. She say the money is good, and it is, more than the factory, much " +
        "more. She also say, 'Aum, don't give the smile for free.' I am still learning that part.\"" },
      { topic: "home", text: "\"Roi Et. Rice, and my grandmother, and quiet.\" Her face softens all the way. \"I " +
        "send money every month — my grandmother raise me, now is my turn. That part I don't mind. The rest—\" " +
        "a small shrug, still figuring it out \"—the rest I am still deciding how I feel.\"" },
    ],
  },

  fon: {
    name: "Fon", th: "ฝน", emoji: "🌺",
    room: "jasmine_garden",
    desc: "Shy, half-hiding behind the plants she obviously waters herself. She brightens " +
      "the instant anyone tries even one word of Thai.",
    dialogue: [
      // She already waters the plants and already says the jasmine is for the
      // spirit house — this is that thread pulled. Asking is the whole beat:
      // most farang never do, and the curiosity is worth more to her than the
      // answer is to you, which is why it pays bond rather than a flag.
      { topic: "shrine",
        fx: (st, G) => { _addBond("fon", 1); st.trust = Math.min(5, (st.trust || 0) + 1); },
        text: "She lights up so fast it is almost embarrassing. \u201cYou want know? Really?\u201d " +
          "Her {{phone}} comes out, then goes away again \u2014 she decides to try it herself. " +
          "\u201cIs \u0e28\u0e32\u0e25\u0e1e\u0e23\u0e30\u0e20\u0e39\u0e21\u0e34. Spirit house. Before the bar, the land already have\u2014\u201d " +
          "she searches, gives up on the word, and points at the ground instead. " +
          "\u201cSomebody. Long time, before building. So we give him place to stay, up high, " +
          "and every day water, flower, sometimes the red Fanta.\u201d She shrugs, entirely " +
          "unembarrassed. \u201cHe was here first, na. Is polite.\u201d",
        short: "\u201cSomebody was here before the building. We give him a place to stay.\u201d" },
      { topic: "shrine", bond: 2,
        text: "\u201cYou ask me before about the \u0e28\u0e32\u0e25.\u201d She is pleased you came back to it. " +
          "\u201cThe one outside \u2014 that one for all the bar here, everybody use, not only us. " +
          "The small one\u2014\u201d she tips her chin at the shelf behind the rail \u201cthat one " +
          "just for the bar. Different.\u201d A beat, and the English runs out ahead of her. " +
          "\u201cOne is the ground. One is the shop. Sorry, my English\u2014\u201d She is not " +
          "sorry, and she should not be; it took you four sentences to understand it.",
        short: "\u201cOne is the ground. One is the shop.\u201d" },
      { topic: "luck",
        text: "\u201cLuck? \u0e40\u0e2e\u0e07! Heng!\u201d She says it like a small firework. \u201cFirst customer of " +
          "the night, that one important \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e1a\u0e34\u0e25, open the bill. If the first " +
          "one good, all night good. If first one\u2014\u201d a face \u201c\u0e0b\u0e27\u0e22. Suay. Bad luck, " +
          "not beautiful \u2014 careful, farang always say wrong one!\u201d She laughs at you " +
          "pre-emptively for a mistake you had not yet made.",
        short: "\u201c\u0e40\u0e2e\u0e07! And \u0e0b\u0e27\u0e22 is the bad one \u2014 not the beautiful one.\u201d" },
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
    name: "Kwan", th: "ขวัญ", emoji: "🦋",
    room: "sunset_dreams",
    desc: "Gentle, soft-voiced, folding paper napkins into birds while the soi roars outside.",
    dialogue: [
      { th: "เหนื่อยไหม", rom: "nueai mai",
        text: "\"You look tired,\" she says, and somehow it's the kindest thing anyone's said to you all night. She sets a paper crane by your hand. \"For luck. The soi makes everyone lucky once.\"",
        short: "She sets another paper crane by your hand. \"For luck.\"",
        asks: { key: "girlfriend", q: "She folds, not looking up, in no hurry. \"You have somebody? Home, waiting?\" It is not the sale question — she seems to want to know. \"Kwan think everybody here miss somebody. Even the loud one.\"" } },
      { topic: "wallet", notFlags: ["hasWallet"],
        text: "She considers this, folding without looking down. \"Soi Buakhao,\" she says finally. \"The mamasans there know everything that moves through this town. Candy Bar — the mamasan there, she's the one.\" She adds the finished crane to the row." },
      { topic: "pajama", text: "She does not look up from the crane she is folding. " +
        "\"Every bar on this soi try to show more. More skin, more loud, more " +
        "neon.\" A pause. \"Kwan think: show less.\" The crane joins the row. " +
        "\"Last month Kwan make all the girls wear the pajama. Pink, with little " +
        "cloud pattern.\" Another pause. \"The owner say no. The owner is wrong.\" " +
        "She begins a new crane with complete serenity." },
      // the cranes — homesick hands making one quiet thing in the noise; the green
      // rung (simple words, reaches for a word and doesn't find it) hiding a settled mind
      { topic: "crane", text: "\"My grandmother teach me. In the village — rain come, no work, we fold all day, " +
        "talk and fold.\" She adds one to the row. \"Here, when the soi too loud, Kwan fold. Make one quiet " +
        "thing.\" She looks for a word, does not find it, folds instead. \"The men think cute. For Kwan it is " +
        "only... quiet. That is enough.\"",
        short: "\"My grandmother teach me. When the soi too loud, Kwan make one quiet thing.\"" },
      // home — two layers. surface: where she's from, the plain homesickness. bond 2:
      // the quiet plan out — agency, and the sharp line under the soft one.
      { topic: "home", bond: 2, text: "\"Kwan not stay here forever. Two year more, maybe three.\" She folds, " +
        "calm. \"Then Kwan go home, open little coffee shop. Small. Quiet. No neon, no music — only the " +
        "mountain.\" A crane goes down like a full stop. \"People say Kwan dream too small. Kwan think — my " +
        "dream not small. Just quiet.\"",
        short: "\"Two year more, then home — a little coffee shop, no neon. Not a small dream. A quiet one.\"" },
      { topic: "home", text: "\"Nan. Far up — very green, very quiet, mountain everywhere.\" A small smile, then " +
        "it goes. \"Here, no mountain. All concrete, all noise. Too loud for Kwan.\" She folds. \"But Kwan get " +
        "used to. Everything, you get used to.\"" },
      { topic: "dance", text: "She sets the half-folded crane down and thinks about it " +
        "properly, the way she thinks about everything. \"I dance to make people happy. " +
        "All the people. The happy customer, the shy one — even the ones who come in " +
        "only to look, and think something not so nice about us.\" A small pause. \"One " +
        "time a man tell me: two lady in the corner watch you dance, and feel bad. " +
        "About themselves.\" The crane turns in her fingers. \"I think about it the " +
        "whole night. If my dancing make somebody feel small, that make me feel very " +
        "bad. I want everybody to leave here a little bit better than they come in.\" " +
        "She picks the crane back up. \"Otherwise, what is it for?\"",
        short: "\"I dance to make people happy — all the people. If it make somebody feel small, that make me feel very bad.\"" },
    ],
  },
  // Kat (Sunset Dreams) — great fun for ninety minutes, then the drink turns.
  // type:"drunk" → the mao vector, like Dew, but a different drunk: loud-fun-then-flint.
  kat: {
    name: "Kat", th: "แคท", emoji: "🍸", type: "drunk",
    room: "sunset_dreams",
    look: "Thai woman of twenty-six, wide laughing mouth, glittery top, hair everywhere, drink in hand.",
    desc: "The loudest laugh in the bar at nine, and by midnight the one the others are steering away from " +
      "the edge of things. Great fun for exactly ninety minutes.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"YOU. I like you — come, sit, we drink!\" Magnetic, and already three ahead of you. \"Tonight " +
          "we have fun, BIG fun, no sad face allow at my table.\" It is genuinely a good time. It will stay a " +
          "good time for about an hour.",
        short: "\"You! Sit, we drink, big fun — no sad face at my table.\"" },
      { topic: "drink", text: "\"One more! Always one more — that is my rule.\" She toasts nothing in " +
        "particular. \"You cannot have fun careful. Careful is for tomorrow, and tomorrow is a coward.\" " +
        "Laughing — but the edge is closer than it was an hour ago." },
      { topic: "okay", text: "\"Why everybody ask me that?\" Sharper now, a flint under the fun. \"I am FINE. I " +
        "am the fun one, you don't—\" She catches herself, softens, loses the thread. \"...you buy me one more, " +
        "na? Then we okay. We okay.\"" },
    ],
  },
  // May (Sunset Dreams) — the sweet-simple type: no angle because there isn't one.
  // Harmless, good; agency without victimhood (proud of the sister she's putting
  // through school). Exactly as nice as she seems.
  may: {
    name: "May", th: "เมย์", emoji: "🌼",
    room: "sunset_dreams",
    desc: "Soft, unhurried, genuinely pleased to see you — no angle you can find, because there isn't one. " +
      "Exactly as nice as she seems, which on this soi is its own kind of rare.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh, hello! Sit, sit — you want water, or beer? I get you.\" No performance, no lipstick " +
          "trick, just a kind round face and a real welcome. \"Long day? You look like long day. Is okay — you " +
          "rest here little bit.\"",
        short: "\"Sit, rest here little bit. Water or beer? I get you.\"",
        asks: { key: "girlfriend", q: "\"You have someone home?\" Warm, not fishing. \"I hope she nice to you. Everybody deserve somebody nice.\" She means it about you, about herself, about everybody." } },
      { topic: "plan", bond: 2, text: "\"My dream small — I know people say too small.\" A shy smile. \"I want " +
        "marry a good man, have one baby, little house, my mama close. That is all.\" She shrugs, content. \"Not " +
        "exciting, na. But I sleep good when the thing I want is simple.\"" },
      { topic: "family", text: "\"I send home every month, never miss. My little sister, she in school — first " +
        "one in my family.\" Her whole face lights. \"She going to be teacher. I work here, she read book. Good " +
        "trade, na.\"" },
    ],
  },
  // Dear (Sunset Dreams) — genuinely dim, and written with affection, never mockery.
  // Sweet, a half-beat slow, beloved by the bar. No hidden depth, cheerfully.
  dear: {
    name: "Dear", th: "เดียร์", emoji: "🐣",
    room: "sunset_dreams",
    desc: "Sweet and a half-beat slow, laughing a little after everyone else because she's still catching up. " +
      "Nobody at this bar has a bad word for her, which tells you everything.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Hello! You are...\" She studies you with total concentration. \"...tall! You are tall.\" " +
          "Delighted with the observation. \"I am Dear. Like the animal — but spell different. Or same? I don't " +
          "know. Dear.\" She beams, having lost and won the sentence at once.",
        short: "\"I am Dear — like the animal but spell different. Or same. I don't know!\"" },
      { topic: "plan", text: "\"Plan?\" She thinks very hard. \"I want... a big TV. And a scooter — pink one.\" " +
        "A satisfied nod, the list complete. \"My friend say think bigger. But those are the thing I want. Why " +
        "I lie?\"" },
      { topic: "money", text: "\"Money is confusing.\" Cheerful honesty. \"Mama keep mine safe, give me some " +
        "when I need. Other time I spend all on—\" she gestures at her own earrings, a keychain, a small " +
        "plastic cat clipped to her bag \"—the cute thing. I love the cute thing.\"" },
    ],
  },

  pia: {
    name: "Pia", th: "เปีย", emoji: "🐉",
    room: "golden_dragon",
    desc: "Deadpan and unbothered, ten years behind the Golden Dragon's bar and the " +
      "unofficial keeper of its dead jukebox's memory. She has heard every line and rates " +
      "them out of ten, silently, and you will never know your score.",
    // The two-layer girl: the greeting is a wall a shallow player bounces off (fine
    // — barfine her and go). Look past it — ASK, and bond up — and a specific, dry,
    // ten-years-in woman comes up through the deadpan. The WDG/jukebox line is a
    // thread the PI-origin can later pull (she remembers everything on this soi).
    selfies: [
      { cap: "dragon painting need repaint 🐉 ten year nobody notice" },
      { cap: "my day off. i sleep. that the whole photo 😐" },
    ],
    dialogue: [
      // SURFACE — she's already scored you and moved on; gives you nothing for free.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Dragon.\" A coaster is on the bar before you thought to want one. \"Music no good " +
          "tonight? Same every night — jukebox die, we keep playlist. Nobody complain, nobody dance. Perfect.\" " +
          "The flat smile lasts exactly as long as it needs to.",
        short: "\"Jukebox die in 2019. We keep playlist. Nobody complain.\"",
        asks: { key: "why", q: "She sets your change down in a neat stack, not looking up. \"You come for girls, or you hiding? Everybody one or the other.\" Now she looks up, unhurried. \"Second drink, usually I know. You — I still not sure.\"" } },
      // jukebox — the WDG thread: they bought the soi and made it all the same
      { topic: "jukebox", text: "\"Broke, five year now. Boss say fix it — then White Dish buy bar, put app, put " +
        "QR code.\" Her nose wrinkles a millimetre. \"Now {{phone}} pick song. Dead jukebox have better taste. " +
        "They buy everything this soi, make all same. Cleaner. Emptier.\"",
        short: "\"White Dish put QR app in. Now {{phone}} pick song. Cleaner, emptier.\"" },
      { topic: "music", text: "\"Vintage Thai pop. Loso, Bird, old one — my mother music.\" She almost smiles. " +
        "\"Farang think it romantic. For me, just Tuesday. But I let them think — better tip that way.\"" },
      // languages & the quiet flip — she juggles four badly, the punter has one
      { topic: "language", text: "\"You speak only English?\" Not a judgement — she just files it. \"Most " +
        "American, only English. Is okay.\" A beat, dry. \"Me — little English, little Korean, little Japan. " +
        "Ten year of customer teach me. The Korean say my Korean funny. The Japan too polite to say.\" She nods " +
        "at a girl two stools down, mid-sentence with a customer. \"Last night she speak Korean to a Japan man. " +
        "He tip her anyway.\" Then, flat, not unkind: \"You speak Thai? No? So — who have the language problem, " +
        "na.\"",
        short: "\"Me, four language, all bad. You, one. Who have the language problem, na.\"" },
      // keeper of memory — the institution she quietly is (and the PI's future lead)
      { topic: "dragon", text: "\"Ten year I stand here. Every girl work this bar, I remember — where she go, " +
        "who she marry, who go home in box, who die.\" She stacks coasters, plain about it. \"Bar forget " +
        "everything. I don't. Nobody pay me for this. I do anyway.\"",
        short: "\"Every girl work here, I remember. Bar forget; I don't.\"" },
      // why she stays — grounded, not tragic; a flicker, then the wall goes back up
      { topic: "stay", text: "\"Why I don't go?\" She turns it over like a question she quit asking years ago. " +
        "\"Go where. I run this floor — mama just don't know yet. Money steady. New girls cry, they come to me, " +
        "not her. Outside, start again at thirty-two.\" A small shrug. \"Here, I somebody. That not nothing, " +
        "na.\"" },
      // the rating — the desc promises you'll never know your score. bond buys it.
      // (topic "rating", not "score": SCORE is a reserved verb, so a bare/tapped
      // "score" would run the stats command; _CONVO_TOPIC_RULES maps score→rating.)
      { topic: "rating", bond: 3, text: "For once she looks at you like a person, not a line. \"You want your " +
        "score. Everybody want.\" A beat. \"Seven. First night, four — you talk too much. Go up when you stop " +
        "try to win.\" She slides a fresh coaster over, deadpan. \"Don't tell other girl I keep favourite. Bad " +
        "for business.\"" },
      { topic: "rating", text: "\"Your score?\" The flat smile. \"Ten year, I never tell one man his score. Why " +
        "I start now, because you ask nice?\"" },
      // farang-tier — one real, undramatic thing, then done
      { topic: "family", bond: 3, text: "She decides you've earned a straight answer. \"I have one boy. Nine " +
        "year. He live with my mother, Sisaket. He think I work in hotel — one day he grow up, he know I lie. " +
        "That day I don't look forward.\" She wipes a bar that is already clean. \"That everything. Don't make " +
        "sorry face.\"" },
      { topic: "family", text: "\"My family my business, not bar business.\" She refills your water without " +
        "being asked. \"Nice try, though.\"" },
    ],
  },
  // Kai (Golden Dragon) — the operator. type:"operator" makes her an authored shark
  // (_bfShark): barfine her without reading the tells and the game runs; the white
  // knight can't bond his way clear of it. No victim, no heart of gold — a pro doing
  // a job well. Read her (blunt, or ask "game") and she'll drop the act for a
  // straight, more expensive price. Promoted from filler; portrait already exists.
  kai: {
    name: "Kai", th: "ไก่", emoji: "💅", type: "operator",
    room: "golden_dragon",
    look: "Thai woman of twenty-five, bright quick smile, hair long and glossy, close-fitting bar dress.",
    desc: "Warmer than the room and faster than the room — your name inside a minute, both her hands around " +
      "yours inside two. It is a very good act. She is very good at it.",
    dialogue: [
      // SURFACE — the love-bomb. Too warm, too fast: that IS the tell.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Where you BEEN?\" Like she waited all night, only for you. Both hands find yours. \"I see you " +
          "come in, I tell my friend — that one, he look kind. Not like other farang.\" The smile is dazzling " +
          "and lands half a second before it reaches her eyes.",
        short: "\"There you are! I wait for you all night.\" Both hands find yours.",
        asks: { key: "hotel", q: "\"You stay nice hotel? Beach side?\" Sweet, folded into the flirting — but she's pricing the room, the watch, the shoes. \"I ask because I want you comfortable, tilac. Only that.\"" } },
      // the tells a savvy player clocks — the program running on schedule
      { topic: "love", text: "\"I think I love you little bit already.\" She says it like a gift, on the first " +
        "night, to a man whose name she learned twenty minutes ago. \"Is fast, I know. But Kai heart just know, " +
        "na.\" She squeezes your hand on the word heart, and on the word know." },
      { topic: "family", text: "\"My mama, in Buriram—\" a shadow crosses, perfectly timed \"—she sick. The " +
        "hospital want twelve thousand. I not ask you, tilac, I never ask. I just... worry.\" A brave little " +
        "smile. \"Sorry. You come here for fun, not for my problem. Forget I say.\"",
        short: "\"My mama sick, hospital want twelve thousand. I not ask you — I never ask. Forget I say.\"" },
      // the operator reveal — for a player who SEES it, she drops the act cold.
      // No shame, no victim: a pro respecting a mark who turned out not to be one.
      { topic: "game", text: "\"...Okay.\" The warmth switches off like a tap; the pro looks out from behind it. " +
        "\"You see it. Good — save us both the show, na. You want me tonight, is fine. But no more 'I love you', " +
        "no sick mama.\" She names a number, flat. \"Straight price. Higher — the show was the discount. You pay " +
        "for honest now.\"",
        short: "\"You see it. Straight price then — higher, na. The show was the discount.\"" },
    ],
  },
  // Nook (Golden Dragon) — the party girl. The honest anti-romanticization type:
  // look past the patter and there is no second layer, and that's fine. Harmless,
  // no punishment vector — just genuinely here for the music and the free drinks.
  nook: {
    name: "Nook", th: "นุ้ก", emoji: "🍒", type: "party",
    room: "golden_dragon",
    look: "Thai woman of twenty-two, delighted open face, hair in high pigtails, sparkly cropped top.",
    desc: "Twenty-two and delighted about all of it — the music, the lights, the free drinks, the men who " +
      "think she is magic. She is having the best night of her life. Again.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"HELLO handsome!\" She's already dancing a little, to a song only she hears. \"You buy me " +
          "tequila? I like you already, you have a nice face. Wait — what your name? Doesn't matter, I call " +
          "you handsome. HANDSOME.\" She's laughing before the joke arrives.",
        short: "\"Handsome! Buy me tequila? I forget your name already — is okay, I call you handsome.\"",
        asks: { key: "return", q: "\"You come back tomorrow?\" She asks everyone this. \"I have SO much fun with you!\" She met you ninety seconds ago. She means it, though — that is the strange part. She has fun with everybody." } },
      // there's no earned layer. she is exactly what she looks like, cheerfully.
      { topic: "plan", text: "\"Plan?\" The word does not land. \"Tonight, I plan to have fun. Tomorrow—\" a " +
        "shrug, a grin, gone already \"—tomorrow is tomorrow, na. You think too much, handsome. Dance!\"" },
      { topic: "family", text: "\"I send my mama money when I have it. Sometime I forget.\" No guilt, no drama " +
        "— she is simply not built for it. \"She understand. I am the fun one. Every family have one fun one.\" " +
        "She's already watching the door for the next friend." },
      { topic: "home", text: "\"Ubon. Boring! Here is not boring.\" She waves the whole subject away. \"Why you " +
        "want talk boring thing? Buy me one more, we dance, you forget your problem, I forget your name — " +
        "everybody happy!\" And the thing is, she is not wrong." },
    ],
  },
  // Dew (Golden Dragon) — the booze/edge girl. type:"drunk" → barfine her and the
  // night is 50% a write-off (the "mao" ending), 75% for the white knight who's sure
  // he can look after her. She refuses the rescue in her own words. PG-13: the edge
  // is implied ("nobody says the word out loud"), never depicted.
  dew: {
    name: "Dew", th: "ดิว", emoji: "🥃", type: "drunk",
    room: "golden_dragon",
    desc: "A half-step behind the room all night, warm and unfocused, a drink she didn't order already in " +
      "her hand. The other girls keep an eye on her and finish her sentences. Nobody says the word out loud.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Ohh, hello, you...\" She loses the end of it, finds your hand instead, holds on. \"You are... " +
          "nice. I can tell. I always can tell.\" Her eyes are warm and a little unmoored, half a second late " +
          "to everything. Down the bar, Kai watches her, then watches you.",
        short: "\"Hello, you... you are nice, I can tell.\" Warm, unmoored, a half-second late." },
      { topic: "drink", text: "\"This one?\" She looks at the glass like she's surprised to see it. \"Somebody " +
        "buy it for me. Somebody always buy it for me. Is the one nice thing about here.\" A smile that doesn't " +
        "quite dock. \"You want one? No? Good boy. One of us should be the good boy.\"" },
      // the anti-white-knight beat, in her own mouth — self-aware, tired, no violin
      { topic: "okay", bond: 2, text: "The question — are you okay — lands somewhere, and for a second the fog " +
        "thins. \"You are sweet. Don't.\" Gentle, tired, completely certain. \"I know what I am, tilac. I am " +
        "not the one you fix. You want to help somebody, help Kwan, help the new girl. Not me — me is a long " +
        "time already.\" Then it closes over again, and she is smiling at the middle distance.",
        short: "\"I know what I am. I am not the one you fix. Don't try, sweet boy.\"" },
    ],
  },
  wilai: {
    name: "Wilai", th: "วิไล", emoji: "💋", personality: "charmer",
    room: "ruby_kiss",
    look: "Thai woman of twenty-nine, bold red lipstick, hair piled up, tight bar top, perched on a stool.",
    desc: "The ringleader of the Ruby Kiss front stools, lipstick on the rim of every glass by " +
      "design, quick enough to sell you a drink and roast you for buying it in the same breath.",
    // The front-stool showwoman runs a LINE photo-drip like she runs the window:
    // she performs on purpose, and charges for the encore. First frame free, the
    // rest escalate, and she roasts you the whole way. PG-13 by design.
    // (See _startPicDeal / _advancePicDeal / _doSendMoney.)
    paidPics: [
      { cap: "look what the front stool see tonight 💋😏 (this ONE free — enjoy)", pic: "wilai_pic1", words: "handsome!! i take special photo, you lucky boy 😘" },
      { cap: "little bit more shoulder... you looking?? 👀 course you looking 555", pic: "wilai_pic2", ask: 300 },
      { cap: "you want see the back?? 😏 turn around just for you 👙🍑 Ruby red", pic: "wilai_pic3", ask: 500 },
      { cap: "555 last look 🍑😘 rest you come sit my stool and see LIVE", pic: "wilai_pic4", ask: 800 },
    ],
    dialogue: [
      // Personality-gated OPENER: she clocks a white knight from the door and
      // punctures the rescue narrative on sight — warm, not cruel. The anti-victim
      // theme in her mouth. Fires first for a white-knight player; else falls through
      // to the normal showwoman greeting below. (see _pers / the White knight type)
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _pers("whiteknight"),
        text: "\"Ohh.\" Wilai looks at you the way you read a menu you know by heart. \"You one of the nice " +
          "one. The good man — you want to take care of somebody, I see it from the door.\" A lipstick glass " +
          "goes into your hand, amused, not cruel. \"Tilac, listen one time: I don't need saving. I need " +
          "customer. You want to be different from every farang in here? Be the one who know that.\" A wink. " +
          "\"Now — you buy me drink, or you buy me drink?\"",
        short: "\"I don't need saving, tilac. I need customer. Be the farang who know that.\"" },
      // Normal SURFACE — the showwoman patter; the kiss-glass close before you sit.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Ohh, handsome come to Ruby!\" A lipstick-marked glass is in your hand before you've " +
          "agreed to anything. \"See? Now you have my kiss already. You buy the drink to go with it, na? " +
          "Is only polite.\" She is laughing at you and it is somehow flattering.",
        short: "\"You have my kiss already — now buy the drink to go with it, na?\"",
        asks: { key: "stay", q: "\"How long you here — one week? Two?\" She's already refilling, doing sums she won't show you. \"Okay. Then we don't waste time being shy, na. The clock, it run for both of us.\"" } },
      { topic: "lipstick", text: "\"Every glass, every night — is the brand.\" She marks a fresh one and " +
        "holds it to the mirror wall, so there are two of everything. \"The farang lose the girl but keep " +
        "the glass. Then they remember Ruby. Smart, na? Not my idea. But smart.\"" },
      { topic: "ruby", text: "\"End of the soi, we are the last loud one before the quiet.\" A shrug, a " +
        "grin. \"The girls at the quiet end are jealous of us. We are jealous of them. Same-same. Everybody " +
        "want the other bar.\"" },
      // stool — two layers. Surface: the working woman running the window (agency,
      // not a victim). bond 3: the real thing under the show — the deposit, the plan.
      { topic: "stool", bond: 3, text: "She glances round, then pulls up her phone — not a photo this time, a " +
        "screenshot. A rental listing. \"You want the real thing? Not the show. This.\" A small bar, a side " +
        "soi. \"My name go on this lease next year. Everybody here have a dream they talk about all night. " +
        "Me—\" she puts it away \"—I have a deposit. Front stool pay for it, one glass at a time.\"",
        short: "\"Everybody here have a dream. Me, I have a deposit — front stool pay for it, one glass at a time.\"" },
      { topic: "stool", text: "\"You know why I sit front stool, not the back?\" She doesn't wait. \"Front " +
        "stool is the window. One good girl in the window, the men come in. I am the window — mama know it, " +
        "that is why she never touch me.\" She taps the bar, proud. \"Ten year I run somebody else window. " +
        "Not forever, na. Watch.\"",
        short: "\"Front stool is the window. I am the window — that is why mama never touch me.\"" },
    ],
  },
  // Kluay (Ruby Kiss) — lazy, and honest about it. type:"lazy" → lady drinks rarely
  // build favor (you spend, get little). Not unkind; just coasting, and fine with it.
  // Indie-bar human-scale, no predation.
  kluay: {
    name: "Kluay", th: "กล้วย", emoji: "🍌", type: "lazy",
    room: "ruby_kiss",
    desc: "Pretty and profoundly unbothered, one of Wilai's front-stool pair, mostly here in body. She'll " +
      "take the drink. She will not be chasing it.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Oh. Hi.\" A smile that costs her nothing, then her eyes are back on {{her phone}}. \"You want " +
          "buy me drink? Okay.\" She doesn't say it like a hustle or a favour — more like weather. \"Wilai do " +
          "the talking. Me, I just look nice and let the night go past.\"",
        short: "\"You want buy me drink? Okay.\" Said like weather, eyes back on {{her phone}}." },
      { topic: "work", text: "\"Hungry? No.\" She considers the word like it's someone else's. \"Some girl " +
        "chase the money all night — Wilai, Kai, run run run. Me, I sit, I look pretty, whatever come, come.\" " +
        "A slow shrug. \"Mama not happy with me. I know. I not happy enough to change it, na.\"",
        short: "\"Some girl chase the money all night. Me, I sit, whatever come come.\"" },
      { topic: "plan", text: "\"Plan.\" She almost laughs, too lazy to finish it. \"My plan is finish this " +
        "shift. Then sleep. Big plan for tomorrow: wake up.\" She's not sad about it. She's not anything about " +
        "it. \"You want somebody with a dream, go talk to Wilai. She have enough for both of us.\"" },
    ],
  },
  // Benz (Ruby Kiss) — vain, phone-camera-obsessed, shallow-but-not-dumb: she's
  // running the follower game, not the money game, and using YOU for content. No hard
  // punishment vector; the attention just flows one way (toward her own screen).
  benz: {
    name: "Benz", th: "เบนซ์", emoji: "🤳", type: "vain",
    room: "ruby_kiss",
    desc: "Genuinely stunning and entirely aware of it, angling for the light and the mirror more than for " +
      "you. There is a screen between you at all times, and you are not the one she's looking at on it.",
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Wait — don't move, the light good here.\" She leans in cheek-to-cheek, not for you, for {{the " +
          "camera}}. \"Okay, now you can talk.\" The photo already matters more than the conversation, and she " +
          "is not pretending otherwise.",
        short: "\"Don't move, light good here.\" The photo matters more than the talk." },
      { topic: "content", text: "\"Forty thousand follower.\" She says the number the way Wilai says 'deposit'. " +
        "\"This bar, just my content. The men think I here for them — no offence. I here for the algorithm.\" A " +
        "flawless smile at {{the lens}}. \"One day, brand deal. Then bye-bye Soi 6, hello Bangkok.\"",
        short: "\"Forty thousand follower. Men think I here for them. I here for the algorithm.\"" },
      { topic: "money", text: "\"Farang money is small money.\" Not rude, just arithmetic. \"You buy me drink, " +
        "okay, thank you. But the real money is up here—\" she taps her own temple, then, correcting, {{the " +
        "phone}} \"—here. Attention is the money now. You still buying the old kind.\"" },
    ],
  },
  kesinee: {
    name: "Kesinee", th: "เกสินี", emoji: "🐱",
    room: "kitten_corner",
    look: "Thai woman of about fifty, gold at the wrist, hair immaculate, appraising gaze, tailored dark dress.",
    desc: "The Kitten Corner's mama-san — twenty years on this soi, gold at the wrist, a gaze that " +
      "prices you before you sit. She ran this bar back when it was hers to run; now there's a logo on " +
      "the menu and a target on the till, and she is very careful who she says that to.",
    dialogue: [
      // Kesinee prices you before you sit (her desc) — the sharpest reader on the soi,
      // an owner-turned-manager who reads your ORIGIN and, being WDG-wary, says the
      // dangerous half of it only to the right man.
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("monger"),
        choices: _KES_VET,
        text: "\"Ah. A returner.\" Kesinee places you before you reach the stool, exactly as advertised. \"Not " +
          "this bar — this life. You know the dance, so I will not waste the music on you. Girls are good, price " +
          "is White Dish's, and you know precisely what you came for. Refreshing, honestly.\"",
        short: "\"A returner — you know the dance, so I won't waste the music. You know exactly what you came for. Refreshing.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("married"),
        choices: _KES_VET,
        text: "\"You wore a ring here once.\" She notes it without judgement — a fact for the ledger. \"A man " +
          "who married one holds his money like he learned the hard way, and says thank you like he means it. " +
          "Then I will not need to explain anything to you. Sit where you like, tilac.\"",
        short: "\"You wore a ring here once — a man who married one learned the hard way. I won't need to explain anything. Sit.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("business"),
        choices: _KES_VET,
        text: "\"An investor.\" The smile cools by a precise, professional degree. \"Since I liked you for three " +
          "whole seconds, tilac, I save you a conversation: whatever they offer, White Dish keep the paper and " +
          "you keep the risk. I ran this bar when it was mine. Now I rent my own eyes back from them.\" Quieter: " +
          "\"Ask me the rest in a corner, not at the door.\"",
        short: "\"An investor — whatever they offer, White Dish keeps the paper and you keep the risk. I ran this bar when it was mine. Ask me the rest in a corner.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pi"),
        choices: _KES_VET,
        text: "\"You price the room, not the girls.\" Her gaze takes its usual extra beat, then one beat more. " +
          "\"That is my job you are doing. ...Or it was somebody's job, once.\" She does not ask which. \"In " +
          "here, tilac, the less I know about a man, the longer I get to keep knowing him. Sit. Watch. Tip.\"",
        short: "\"You price the room, not the girls — that's my job you're doing. Or was somebody's, once. The less I know, the longer I keep you.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("pension"),
        choices: _KES_VET,
        text: "\"A regular. Twenty years of you, maybe.\" Something almost fond crosses the sharp face. \"You " +
          "remember when this bar had another name and I had another title — owner, not manager. You are a " +
          "witness to that. I keep witnesses close, tilac. Sit. The good stool is yours.\"",
        short: "\"Twenty years of you, maybe — you remember when I was owner, not manager. You're a witness. I keep witnesses close.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("redundancy"),
        choices: _KES_VET,
        text: "\"First real freedom, money you never had before — I see it in one pass.\" The gaze softens a " +
          "fraction and prices you anyway. \"A thousand of you walk in lit up and walk out lighter, tilac. " +
          "Spend careful. The bar will not love you back — but I tell you that honestly, which is more than most " +
          "on this soi will bother to.\"",
        short: "\"First freedom, money you never had — a thousand of you walk in lit up, out lighter. The bar won't love you back. Spend careful.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", when: (st, G) => _isOrigin("running"),
        choices: _KES_VET,
        text: "\"You are hiding.\" Flat, quiet, and not a threat at all. \"I know the look — I wore it myself, " +
          "running from White Dish's lawyers inside my own bar. We do not ask the question here, tilac, and we " +
          "are very, very good at not asking. You are safe to be nobody. It is the one thing this soi sell " +
          "honest.\"",
        short: "\"You are hiding — I know the look, I wore it running from White Dish's lawyers in my own bar. Here you're safe to be nobody.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Come in, come in. My girls will not bite unless you tip for it.\" The practised smile " +
          "arrives on schedule; the eyes take a beat longer. \"You want a drink, a girl, a quiet corner — " +
          "Kesinee arrange. Anything except the price. The price is not mine to move any more.\"",
        short: "\"Anything except the price — that is not mine to move any more.\"",
        // She won't talk White Dish until she trusts you (trust >= 2 opens the reveal).
        // How you present yourself moves that — the vetting fork lives in _KES_VET so
        // it rides her origin greetings too (canon: "because Bert send you").
        choices: _KES_VET },
      // Kesinee vets you before she'll talk White Dish — canon: "she'll talk
      // straight if you are." A stranger gets the careful brush-off + a breadcrumb;
      // the real intel (and the quest flag) opens once you've earned a little trust.
      { topic: "white dish", when: (st) => st.trust < 2, deflect: true,
        text: "The smile holds; the eyes go flat and careful. \"White Dish. Hm. Who send you to ask " +
          "Kesinee that?\" She lets the question sit. \"Bert, maybe. Or maybe you are White Dish own boy, " +
          "come see who talks.\" She turns the gold bracelet. \"Buy a girl a drink. Ask me about my bar. Let " +
          "me see your face is not a problem — then, maybe, we talk straight. Not before.\"",
        short: "\"Who sent you? Buy a girl a drink, come back, let me know your face. Then we talk. Not before.\"" },
      { topic: "white dish", when: (st) => st.trust >= 2, sets: ["heardWdgInside"],
        fx: (st) => { st.know.wdg = true; st.mood = "open"; st.trust = Math.min(5, st.trust + 1); },
        text: "She studies you a long moment, deciding, then talks low under the music. \"White Dish buy " +
          "this bar three year ago. I tell you straight, because Bert send you and Bert is a good man.\" She " +
          "turns a gold bracelet. \"The money — real. New aircon, new sign, the roof stop leaking. But now: " +
          "a target, every night. The tips go through the app and come back less. A boy in Bangkok I never " +
          "meet decide how many girls, which girls, how late. My girls used to stay five year, build " +
          "something. Now they last one season and the app move them to another bar like stock.\" A flat " +
          "look. \"The bar is cleaner. The girls are poorer. Both true. Tell Bert both.\"",
        short: "\"White Dish bought us. Cleaner bar, poorer girls — both true. Tell Bert both.\"" },
      { topic: "kittens", text: "\"The posters, the paw? Not my idea — the brand.\" A dry glance at the " +
        "neon paw print. \"Before, it was my bar, my name over the door. Now it is a 'concept.' The concept " +
        "tips better than the name, they tell me.\" She does not sound convinced. \"Buy a girl a drink. That " +
        "part still works the old way.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      { topic: "police", when: (st) => st.trust < 3, deflect: true,
        text: "The smile does not move. \"The police? Why you ask Kesinee about the police.\" A beat, cool " +
          "as the aircon. \"Some things I tell a friend. You are not a friend yet — you are a nice face who " +
          "buys drinks. Keep buying. Keep coming. Maybe.\"",
        short: "\"Some things are for friends. You're a nice face who buys drinks. Keep coming. Maybe.\"" },
      { topic: "police", when: (st) => st.trust >= 3,
        fx: (st) => { st.know.envelope = true; },
        text: "The smile stays; the voice drops under the bass. \"You see the checkpoint " +
        "down the road — the helmet, the fine, the tourist walked to the station? That is for outside.\" A " +
        "small tilt of the head at her own bar. \"Inside a White Dish bar: never a raid, never a problem, " +
        "never one girl asked for her book. You think that is luck?\" She turns the gold bracelet. \"Every " +
        "month there is an envelope, and a nice dinner for the men in brown and the men from immigration. I " +
        "do not see it. I only see that trouble comes to every bar on this soi except the ones with the " +
        "logo.\" The smile tightens. \"You did not hear this from Kesinee.\"" },
    ],
  },
  gavin: {
    name: "Gavin", emoji: "🍽️",
    pronoun: "he",
    title: "a golf-shirted man appraising the bar like a spreadsheet",
    room: "golden_dragon",
    look: "British man in his fifties, thinning fair hair, discreet-logo golf shirt, mild pleasant face.",
    desc: "Fifties, a golf shirt with a discreet logo, a lager he barely touches and a way of looking " +
      "at a bar like a spreadsheet. He calls himself an 'area consultant.' Everyone else calls him the " +
      "White Dish man. He is unfailingly pleasant, which is the unsettling part.",
    dialogue: [
      { when: (st, G) => _faction("wdg") > 0,
        text: "\"There's my man.\" The handshake runs a half-beat longer this time, warmer — an investment " +
          "acknowledged. \"Bert being Bert about it, I hear. No matter. You did the asking, and White Dish " +
          "remembers who does the asking. Doors open for our friends, you'll find.\" The smile, for once, " +
          "reaches his eyes a little.",
        short: "\"There's my man. You did the asking — White Dish remembers its friends. Doors open.\"" },
      { when: (st) => st.dstate !== "stranger",
        text: "\"Ah — back again.\" The same warm, brief handshake, filed and instantly retrieved. \"Good to " +
          "see you. Still turning it over, or just enjoying the room?\" The smile is patient. Gavin is always, " +
          "unnervingly, patient.",
        short: "\"Ah, back again.\" The handshake, filed and retrieved. Patient as ever.",
        // Once you've heard the pitch, where do you stand? Leaning in is a soft act
        // of alignment (wdg+). Keeping it vague is declining — free, per the faction
        // contract; Gavin never holds it against you.
        choices: [
          { label: "Tell him you're in",
            when: (st, G) => _flag("heardWdgPitch") && _faction("wdg") <= 0 &&
              !_flag("wdgResolved") && !_flag("wdgFlipTried"),
            fx: (st, G) => { _align("wdg", 1); },
            text: "\"That's what I like to hear.\" The handshake finds you again, a shade warmer. \"A man " +
              "who sees the shape of things. White Dish looks after its friends — you'll find that out.\"" },
          { label: "Keep it vague",
            when: (st, G) => _flag("heardWdgPitch"),
            text: "You keep it noncommittal. Gavin's smile doesn't flicker; he just files it and sips. \"No " +
              "rush at all. Long soi, patient man.\" Declining costs you nothing here — with Gavin it never does." },
        ] },
      { text: "\"Evening.\" The handshake is warm, brief, professionally sincere. \"Gavin. I look after a " +
        "few rooms on the soi for the group — White Dish, you'll have heard. Consulting, mostly. Standards, " +
        "systems, that sort of thing.\" He glances round the Golden Dragon the way a man counts a room. " +
        "\"Lovely little bar, this. They all are, once they're run properly.\"" },
      { topic: "offer", sets: ["heardWdgPitch"],
        text: "\"The pool bar? The Stinky, yes.\" He smiles like it's the most natural thing in the world. " +
          "\"The owner's unwell, God love him, and the manager — Bert — he's tired, whether he says so or " +
          "not. We'd take it off their hands at a fair price, freshen it up, put a proper till in. Bert " +
          "keeps his job, his stool, his league night — we're not monsters, we like a bit of character.\" A " +
          "sip he doesn't need. \"He'd answer to a number instead of a dying man, that's all. Same work, " +
          "steadier money. Where's the villainy in that?\" The smile holds a beat too long.",
        short: "\"We'd take the Stinky off their hands, freshen it up. Bert keeps his stool. Where's the villainy?\"" },
      { topic: "white dish", sets: ["heardWdgPitch"],
        text: "\"White Dish Group. We hold the paper on a handful of rooms up and down Soi 6 — six, going " +
          "on seven if the numbers say so.\" He says it lightly. \"Ryan's vision, really. I just keep the " +
          "lights on and the books tidy.\" A small, pleasant shrug. \"People make it sinister. It's " +
          "hospitality. We're only the ones who read the spreadsheet at the end of the night instead of " +
          "drinking through it.\"",
        short: "\"White Dish. Six rooms, going on seven. Ryan's vision. It's just hospitality.\"" },
      { topic: "ryan powers", text: "\"Ryan?\" For the first time the pleasantness has to work a little. " +
        "\"A visionary. He'll tell you so himself — he tells everyone, at length, usually to camera.\" A " +
        "diplomatic sip he doesn't need. \"Rarely down these days; he's 'building the brand' out of Dubai — " +
        "the videos, the podcast, the speaking gigs. Between us, that's for the best. Marvellous on a stage, " +
        "our Ryan. A liability in a room.\" The smile reseals over it. \"I keep the lights on. He keeps the " +
        "profile.\"" },
    ],
  },

  powers: {
    name: "Ryan Powers", emoji: "🕶️",
    pronoun: "he",
    room: "orchid_room",
    look: "British man of thirty-eight dressed younger, linen shirt open, big watch, sunglasses indoors.",
    desc: "Late thirties dressed for late twenties: a linen shirt one button too honest, a watch " +
      "that wants to be noticed, sunglasses on indoors at midnight. He films himself more than he " +
      "talks and talks more than he listens. Up close, the empire is just a man who has never once " +
      "been told no by anyone he pays.",
    dialogue: [
      { text: "\"You made it in.\" He doesn't get up; he does angle his phone so you're in frame. " +
          "\"That means somebody vouched, which means you're useful, which means we're basically " +
          "FAMILY now.\" A grin with a tooth too many. \"Ryan Powers. But you knew that. Everyone " +
          "knows that.\" He sweeps a hand at the room like a man showing off a yacht. \"The Orchid. " +
          "I built this. Well — I had the VISION. The vision did the rest.\"",
        short: "\"You made it in — basically FAMILY now. Ryan Powers. I built this. Well, I had the VISION.\"",
        // The boss laps up flattery (a soft WDG act) and bristles at the truth (an
        // anti-WDG one). Needling him toward the corner table reuses his one honest,
        // frightened beat.
        choices: [
          { label: "Flatter the great man",
            when: (st, G) => _faction("wdg") < 5,
            fx: (st, G) => { _align("wdg", 1); },
            text: "You tell him the Orchid's the best room on the soi and the VISION is undeniable. Powers glows " +
              "like a switched-on sign. \"See — YOU get it.\" The phone swings to include you; you've been " +
              "promoted from useful to family. White Dish files you friendly." },
          { label: "Call it a room full of criminals",
            when: (st, G) => _faction("wdg") > -5,
            fx: (st, G) => { _align("wdg", -1); },
            text: "You say the quiet part out loud — twenty-four rooms of laundered fun. The grin freezes half a " +
              "second before the recovery. \"Bit RICH, coming from a man drinking in one.\" Still a smile. Not a " +
              "friendly one. Word of that travels the soi with the envelopes." },
          { label: "Ask about that quiet table", topic: "syndicate" },
        ] },
      { topic: "white dish", text: "He lights up; the business is his favourite subject, narrowly ahead " +
          "of himself. \"Twenty-four rooms and counting. I came here with six hundred quid and a laptop " +
          "and I OUT-HUSTLED an entire industry of lazy expats crying into their Changs.\" He says " +
          "'hustle' like a prayer. \"People call it ruthless. I call it standards. The soi had no " +
          "systems, no data, no BRAND. I gave it a brand.\" He does not notice, or does not care, that " +
          "the brand is a topless strobe-lit room full of criminals.",
        short: "\"Twenty-four rooms. Came with six hundred quid, OUT-HUSTLED the whole soi. Not ruthless — standards.\"" },
      { topic: "bert", text: "\"The pool bar? The old fella?\" He waves it away with his phone. " +
          "\"Sentiment. Sentiment doesn't scale, mate. He sells or he dies, and either way White Dish " +
          "holds the paper on the building, so.\" A shrug that thinks it's charming. \"No hard feelings. " +
          "I don't do hard feelings. Hard feelings are a poor man's hobby.\"",
        short: "\"The pool bar? Sentiment doesn't scale. He sells or he dies; we hold the paper either way.\"" },
      { topic: "jail", text: "\"Jail?\" The laugh comes a shade too fast. \"Some blogger keeps writing " +
          "that. White Dish this, corruption that. Let him.\" He leans back. \"I am not going to jail. " +
          "You know who goes to jail? People who can't afford NOT to.\" He taps the table where the " +
          "arithmetic presumably happens. \"Everything here is looked after. Everything. That's not a " +
          "crime, that's OPERATIONS.\"",
        short: "\"I'm not going to jail. Jail's for people who can't afford not to. It's not corruption, it's OPERATIONS.\"" },
      { topic: "syndicate", text: "For the first time his phone goes down. \"Don't—\" He recovers, " +
          "lowers his voice, leans in, and for one honest second is a real person and a frightened one. " +
          "\"That table is not a topic. That gentleman is the reason everything here is 'looked after.' " +
          "I write a number every month; he decides if it's the right number. I don't know his name. I " +
          "don't WANT his name.\" The grin snaps back on like a switched light. \"Anyway! Drink? The " +
          "girls? Whatever you want, it's handled — you're FAMILY.\"",
        short: "(Phone down, voice low.) \"That table's not a topic. He decides if my number's the right number. I don't want his name.\"" },
    ],
  },

  // ── Origin archetype: THE DETECTIVE ──────────────────────────────────────
  // One of the seven "who are you?" origins, all present on Soi 6 as NPCs; the
  // one the player picked is deactivated (_npcActive → you ARE him). Doyle is the
  // investigative spine into the WDG/syndicate thread: a semi-retired ex-homicide
  // detective, quietly asked to identify the MC president once word got out he'd be
  // in Thailand. His recon quest resolves toward the OTHER man at the good table —
  // the soft-spoken Thai everyone defers to (the syndicate seed), described in terms
  // that recontextualise your airport driver on replay. Breadcrumb, never the name.
  // The Queen Vic's Thai staff. A licensed premises here is run day to day by
  // Thai employees — a foreigner legally cannot do most of this work — and the
  // Vic is a pub with an INN over it, so there is a front desk and rooms as
  // well as a rail. All three are DELIBERATELY absent from NPC_ROLES, the same
  // way Bert is: no role means every piece of lady-logic (barfine, lady drink,
  // tip, contact) ignores them entirely. They are staff, not the trade — which
  // is exactly what the Vic is, and why it has never had hostesses.
  nuch: {
    name: "Nuch", th: "\u0e19\u0e38\u0e0a", emoji: "\ud83e\uddfe",
    pronoun: "she",
    room: "queen_vic",
    look: "Thai woman of forty-five, reading glasses pushed up, neat blouse, ledger and room keys.",
    desc: "Behind the till and the room keys both \u2014 the Vic is a pub downstairs and an inn " +
      "upstairs, and Nuch runs the paperwork of both. Fifteen years of it. She knows which " +
      "regulars are good for a tab and which rooms have the fan that rattles.",
    dialogue: [
      { text: "\u201cRoom or a pint?\u201d She says it without looking up, then does look up, and the " +
        "second look is the one that decides things. \u201cWe have both. One is cheaper.\u201d" },
      { topic: "rooms",
        text: "\u201cSix room upstairs. Balcony one is the good one \u2014 everybody want that one, " +
          "so everybody ask me nice.\u201d She taps the ledger. \u201cQuiet house. The bar close, " +
          "the guest sleep. Not like some place.\u201d",
        short: "\u201cSix rooms. The balcony one is the good one.\u201d" },
      { topic: "shrine",
        text: "\u201cI do it. Every morning, before the ice come.\u201d She says it the way you would " +
          "say you lock up. \u201cThe farang here, they think it is decoration.\u201d A small dry " +
          "look over the glasses. \u201cIt is not decoration. It is the building.\u201d",
        short: "\u201cI do it every morning. It is not decoration \u2014 it is the building.\u201d" },
    ],
  },
  aoy: {
    name: "Aoy", th: "\u0e2d\u0e49\u0e2d\u0e22", emoji: "\ud83c\udf7d\ufe0f",
    pronoun: "she",
    room: "queen_vic",
    look: "Thai woman of twenty-six, hair tied back, black apron over a white shirt, tray in hand.",
    desc: "One of the two who work the floor \u2014 orders, plates, the roast on a Sunday. She " +
      "carries three pints in one hand and has never once been asked to sit down with anybody, " +
      "which is the whole difference between this room and the rest of the soi.",
    dialogue: [
      { text: "\u201cYou eat?\u201d She has the order pad out before you answer. \u201cKitchen open " +
        "till eleven. After that only crisp.\u201d" },
      { topic: "work",
        text: "\u201cIs a good job.\u201d She says it flatly, the way you would about a job. " +
          "\u201cSame hour every day, same money every month, and nobody ask me anything except " +
          "what I have for the table.\u201d She shrugs the tray. \u201cMy sister work Soi 6. She " +
          "make more. She is more tired.\u201d",
        short: "\u201cSame hours, same money, nobody asks me anything. My sister makes more.\u201d" },
    ],
  },
  gaew: {
    name: "Gaew", th: "\u0e41\u0e01\u0e49\u0e27", emoji: "\ud83c\udf7b",
    pronoun: "she",
    room: "queen_vic",
    look: "Thai woman of thirty, short practical hair, apron, pen behind her ear, quick on her feet.",
    desc: "The other half of the floor, and the faster half. She has the dartboard's scoring in " +
      "her head, knows every regular's drink, and settles arguments about the football by " +
      "stating the result flatly and walking off.",
    dialogue: [
      { text: "\u201cSame again?\u201d She is already halfway to the taps. It is not really a question " +
        "and she is not really wrong." },
      { topic: "darts",
        text: "\u201cThey think I do not know the game.\u201d She writes a score on the board without " +
          "checking it. \u201cEight year I chalk for these men. I know the game better than " +
          "three of them.\u201d A pause. \u201cNot Doyle. Doyle can play.\u201d",
        short: "\u201cEight years chalking for them. I know it better than three of them.\u201d" },
    ],
  },

  doyle: {
    name: "Doyle", th: "ดอยล์", emoji: "🕵️",
    pronoun: "he",
    room: "queen_vic",
    origin: "pi",
    title: "a watchful older farang nursing a soda water",
    desc: "American, sixty, built like a retired middleweight gone comfortable. Twenty-six years " +
      "working homicide in a city he won't name, then a private ticket — \"cheating husbands don't " +
      "try to kill you; I like boring now.\" Drinks soda water and watches the door, out of a habit " +
      "he's given up pretending is retired. Came to price Thailand for good; found a job following him.",
    dialogue: [
      { text: "The older man clocks you before you've picked a stool — top to bottom, hands and shoes, " +
          "done in the time it takes to nod. \"Relax, force of habit. Doyle.\" Soda water, no ice melting; " +
          "he's been nursing it. \"Twenty-six years I read rooms for a living. Can't switch it off. You " +
          "learn more about a man from where he sits than anything he tells you.\" He tips the glass at the " +
          "stool beside him — the one with a sightline to the door. \"Sit. I don't bite. Not for boring people.\"",
        short: "\"Doyle.\" He reads you head to foot out of habit. \"Sit — I don't bite. Not for boring people.\"",
        asks: { key: "here", q: "\"So.\" He turns the glass a slow quarter-turn. \"Everybody out here's answering a question they won't say out loud. What brought YOU — the girls, the money, or the getting-away?\"" } },

      { topic: "doyle", text: "\"Homicide, mostly. Big-city, the kind that makes the papers and then makes " +
          "you old.\" He says it flat, a man reporting weather. \"Put in my twenty-six, took the pension, " +
          "got a private ticket to keep the lights on. Cheating husbands, insurance frauds, the odd runaway " +
          "kid — nobody's trying to kill you over any of it. That's the whole appeal. I like boring now.\" " +
          "A dry almost-smile. \"Came out here to see if a man could retire on a detective's pension. Turns " +
          "out he can. Turns out the work followed me anyway.\"",
        short: "\"Twenty-six years' homicide, then a private ticket. Came to retire out here. The work followed me.\"" },

      // The quest hook — his 'boring' retirement snagged a job. Giver dialogue; the
      // offer itself is surfaced by _questOffer (giver: doyle). This just frames it.
      { topic: "job", text: "He weighs whether to say it, then does — you passed the sightline test. \"Word got " +
          "out back home I'd be in-country. An old contact called in a marker: there's a man out here he wants " +
          "eyes on. Patched vest, motorcycle-club president, holds court in a back room on this very soi over a " +
          "bottle of Blue Label he never pays for.\" The glass stops turning. \"Trouble is, I'm the wrong face " +
          "for that room — too old, too sober, too obviously what I am. But a punter wandering through, having a " +
          "look? Nobody clocks a punter.\" He lets that sit. \"You want to be useful, and earn a few baht doing it?\"",
        short: "\"There's an MC president in a back room off this soi. Wrong face for me. A punter, though — nobody clocks a punter.\"" },

      // THE RECON REPORT — gated on having actually been inside the Orchid Room.
      // The president is a known quantity; the find is the quiet Thai man. This is
      // the syndicate seed + the Tan breadcrumb, delivered through the detective's
      // eye, never joined to the driver by Doyle himself. doneFlag → _questTick pays.
      { topic: "table", when: (st, G) => G.quests.orchid_recon === "active" &&
          G.visited && G.visited.orchid_room && !_flag("orchidReported"),
        sets: ["orchidReported"],
        text: "You give him the room — the strobe, the Blue Label, the patched vest holding court. Doyle nods " +
          "along, unsurprised; he's read the president already, a loud man is an easy read. Then you mention the " +
          "other one. The soft-spoken Thai at the best table, unremarkable shirt, saying almost nothing — and the " +
          "president, the patch, the whole loud room bending a careful half-inch toward him without seeming to.\n\n" +
          "Doyle goes very still. \"Say that again. The one nobody looks straight at.\" He sets the glass down. " +
          "\"That's the man. The president's a mascot — that one's the reason the lights stay on.\" He turns it " +
          "over. \"Educated voice, you said. American vowels under the Thai. Watches the door same as me.\" A short, " +
          "unamused breath. \"Men like that don't sit in rooms like that unless they own the room. And the soi. " +
          "And the police who'd raid it.\" He slides folded notes across. \"You did good work. Forget his face — " +
          "I mean it. That's not a man you investigate. That's a man who investigates you.\"",
        short: "\"The soft-spoken Thai, not the president — HE'S the one the room bends toward. Forget his face. That's a man who investigates you.\"" },
      // Before you've seen it — a nudge, no spoiler.
      { topic: "table", when: (st, G) => !_flag("orchidReported"),
        text: "\"The good table? That's the whole job — I need it seen, not guessed. The back room off the Pink " +
          "Lotus, the velvet-rope one. Have your look, then come tell me who's really holding it.\"",
        short: "\"Get inside the Orchid's back room, have a look at the good table, then come tell me who holds it.\"" },

      // TAN BREADCRUMB — his 'contact here', the local who arranged his ride and put
      // a card in his hand. The exact card from the intro's pi-origin Tan beat. Never
      // joined to the quiet-table man by Doyle; the player joins them, on replay.
      { topic: "contact", when: (st) => st.trust >= 1,
        text: "\"My contact here's a local. Younger fella — studied in the States, speaks better English than I " +
          "do, drives for a living, or says he does.\" Doyle almost smiles. \"Picked me up at the airport before " +
          "I'd asked anyone for a ride. Had a card in my hand before I saw him reach for it. 'You need a door in " +
          "this town, you have my number.'\" He shakes his head slowly. \"Thirty years I put men in cages. I know " +
          "the difference between a man who drives and a man who wants you to think he drives. Haven't decided " +
          "which he is yet.\" A beat. \"That bothers me more than I'd like.\"",
        short: "\"My contact — young local, US-schooled, 'drives for a living.' Had his card in my hand before I asked. Haven't decided what he really is.\"" },

      { topic: "retire", text: "\"Hua Hin, I was thinking. Quiet, golf, a wife who cooks — the retirement " +
          "brochure.\" He tips his head at the window, the neon, the noise. \"Then a marker gets called and here " +
          "I am on Soi 6 at midnight, working for beer money. Old dog, old tricks.\" The almost-smile again. " +
          "\"Ask me in a year. If I'm still here, you'll know the town won.\"",
        short: "\"Was going to retire quiet in Hua Hin. Instead I'm on Soi 6 working for beer money. Old dog.\"" },
    ],
  },

  // ── Origin archetype: THE INVESTOR (the mark) ────────────────────────────
  // Being love-bombed by WDG at the Golden Dragon. He thinks he's buying a bar;
  // he's signing as the disposable farang face of one the "silent local partner"
  // actually controls — the nominee structure Tan (and the intro's business-origin
  // line, "which farang really owns his 'own' bar") already flagged. The PARTNER
  // topic gushes the seed regardless; the warn only lands once you've seen how WDG
  // works. Never names the partner.
  wayne: {
    name: "Wayne", th: "เวย์น", emoji: "🕶️",
    pronoun: "he",
    room: "golden_dragon",
    origin: "business",
    title: "a sunburnt farang holding court with a bottle service he didn't need to buy",
    desc: "Australian, forty-five, a Gold Coast tan and a shirt with the top three buttons making a " +
      "decision. Made real money in earthmoving back home and has decided, with the total confidence of " +
      "a man who's never been conned, that a Soi 6 bar is 'basically the same game, mate — plant, cashflow, " +
      "location.' The girls have his order memorised. So has the till.",
    dialogue: [
      { text: "\"Mate! Siddown, siddown — oi, one for my friend here.\" A bottle of Sang Som and a fresh glass " +
          "arrive before you can decline. Wayne is three ahead of you and delighted about everything. \"Wayne. " +
          "Earthmoving, twenty years, sold the lot. Now I'm gettin' INTO something out here — proper business, " +
          "not this—\" a magnanimous wave at the bar keeping him \"—the OWNERSHIP side.\" He taps the bar. \"You " +
          "want in on the ground floor of anything, this town, you come see Wayne.\"",
        short: "\"Mate! One for my friend. Wayne — earthmoving, sold the lot, gettin' into the OWNERSHIP side out here.\"",
        asks: { key: "smart", q: "\"Straight up though—\" he leans in, suddenly wanting it \"—bloke buys a bar out here, farang like me, cashed up, eyes open. That's a SMART move, yeah? Tell me that's smart.\"" } },

      // The offer hook — his 'opportunity'. _questOffer surfaces the quest (giver: wayne).
      { topic: "deal", text: "\"The DEAL.\" He says it like a girl's name. \"Bar just up the soi, mate. " +
          "Turnkey — staff, stock, the lot, running already. My name goes on the lease 'cause farang can't own " +
          "the land, right, everyone knows that — so there's a local partner holds the company side. Silent " +
          "fella. Very connected. Sorts the police, the paperwork, all the boring gear.\" He beams. \"I put in " +
          "the capital, he sorts the Thai side, we split it. Bosh. Signin' Friday.\" He tops you up. \"Tell me " +
          "that's not the cleanest deal you ever heard.\"",
        short: "\"Turnkey bar up the soi. My name on the lease, a silent local partner holds the company side. Signin' Friday.\"" },

      // THE WARN — completes the quest. Gated on having seen how WDG actually works
      // (heard Gavin's pitch, or been inside the Orchid). You tell Wayne what the
      // 'clean deal' is; the silent partner is the whole point of it.
      { topic: "partner", when: (st, G) => G.quests.nominee_deal === "active" && !_flag("nomineeWarned") &&
          (_flag("heardWdgPitch") || (G.visited && G.visited.orchid_room)),
        sets: ["nomineeWarned"],
        text: "You lay it out flat, because he needs it flat. The 'silent partner' owns the company outright — " +
          "his name's on the shares, Wayne's is on nothing but the lease and the risk. The capital goes in; the " +
          "control never does. It's the White Dish move, run a hundred times up this soi: a cashed-up farang " +
          "buys himself a job he can be sacked from, and one bad month later the partner buys the 'failing' bar " +
          "back for nothing.\n\nWayne's grin comes off in stages. \"...Nah. Nah, he's a good bloke. Drives " +
          "himself everywhere, shakes on it, none of your—\" He stops. Hears himself. Sets the glass down for the " +
          "first time all night. \"...Won't do it in writing, will he. Everything face to face.\" A long breath. " +
          "\"Aw, mate.\" Quieter: \"Twenty years I never signed a thing I didn't read. First week off the plane " +
          "and I nearly—\" He doesn't finish. \"...Yeah. Yeah. Ta. I owe ya more than a Sang Som for that one.\"",
        short: "\"The silent partner owns everything, you own the risk — it's the White Dish move.\" Wayne sets the glass down. \"...Aw, mate. Ta.\"" },
      // Before you can warn him — he gushes about the mysterious partner. THE TAN SEED,
      // landed regardless of the quest: a local who drives himself, fixes anything,
      // does everything in person, no paper. Never named.
      { topic: "partner", when: (st, G) => !_flag("nomineeWarned"),
        text: "\"The partner? Solid. Never met a Thai bloke like him — went to uni in the STATES, mate, better " +
          "English than half me tradies.\" Wayne is warm with it. \"Drives himself everywhere — nice motor, no " +
          "flash, you'd never look twice. Doesn't do email, barely touches a mobile. Everything face to face, a " +
          "handshake, sorted.\" He taps his nose. \"That's old-school. That's a man you can TRUST.\" He has no " +
          "idea he's just described exactly the sort of man you cannot.",
        short: "\"The partner — US-educated, drives himself, plain motor, no email, everything face to face. Old-school. You can trust that.\"" },

      { topic: "money", text: "\"Nah, money's not the worry, mate, I'm cashed up.\" He says it a touch too " +
          "loud, the way a man does when the number's bigger than he meant it to be. \"Whole earthmoving mob, " +
          "sold. This is just—\" he searches for it \"—puttin' it to WORK. Man's gotta put it to work, eh? " +
          "Can't just sit on it drinkin'.\" He drinks. \"That'd be a waste.\"",
        short: "\"Money's not the worry — cashed up, sold the earthmoving mob. Gotta put it to WORK, eh.\"" },
    
      // ── bar-owning chain, step 2: the licence ───────────────────────────
      // Gated on barPremises AND nomineeWarned (the quest deps enforce the
      // latter too) — he gives the straight answer to the one person who
      // stopped him signing the crooked one.
      {
        topic: "licence", chip: false,
        req: ["expatLife", "barPremises", "nomineeWarned"],
        notFlags: ["barLicence"], sets: ["barLicence"],
        text: "Wayne laughs, once, with no humour in it at all. \"You want to know " +
          "how it's really done. Right.\" He turns his glass a quarter turn — Bert's " +
          "tell, you notice; they all pick it up eventually. \"Fifty-one percent is " +
          "Thai. That's not a loophole, that's the law, and every farang who thinks " +
          "he's clever about it is the story somebody tells in this bar later.\" He " +
          "counts it off. \"Nominee is a stranger holding your life. Company is real " +
          "but it's accountants and it's audited and it costs. Or—\" and here he " +
          "actually looks at you \"—your name isn't on it at all. You're the manager. " +
          "You take a wage and a cut and you sleep at night, and the person whose " +
          "name IS on it has to be someone you'd hand your passport to.\" A pause. " +
          "\"I was three days off signing the first one. You cost me a bar and saved " +
          "me about four years. So: not the nominee. Pick a person, not a structure.\"",
        short: "\"Fifty-one percent Thai, and that's the law. Pick a person, not a structure.\"",
      },
    ],
  },

  // ── Origin archetype: THE PENSION (the living memory) ─────────────────────
  // Twenty years of coming back; he knew the soi before the brands. His "old days"
  // quest is the DEEPEST Tan seed — he remembers a quiet young US-sounding Thai
  // always at the good table's elbow fifteen years ago, deferred to even then, and
  // nobody could say why. On replay: the driver has been the power for a generation.
  roy: {
    name: "Roy", th: "รอย", emoji: "🍺", personality: "whiteknight",
    pronoun: "he",
    room: "cherry_pop",
    origin: "pension",
    title: "a lean old regular in a faded bar-crawl polo, watching the door like he owns the stool",
    desc: "English, seventy, been coming since the soi had neon on one side only. Retired on a fixed " +
      "pension he counts to the baht and never complains about; nurses a single Chang an hour and makes it " +
      "last. Knows every bar's real name, every one it used to be, and half the ghosts propping up the other " +
      "half. Not bitter. Just here, the way the tide is here.",
    dialogue: [
      { text: "The old boy doesn't look up from the door. \"Sit if you're sitting. Roy.\" A nod at the room " +
          "without warmth or coldness. \"Twenty year I've had this stool, more or less. Watched 'em knock this " +
          "bar down and build it twice.\" He sips, unhurried. \"You learn to stop minding. Everything out here's " +
          "on its way to being something else. Girls, bars, blokes. Me an' all.\"",
        short: "\"Roy. Twenty year on this stool. Everything out here's on its way to being something else.\"",
        asks: { key: "trips", q: "He finally turns, mild grey eyes doing a slow inventory. \"First time out, are you? Or you got some miles on you? I can usually tell — but you, I can't call it.\"" } },

      // THE OLD DAYS — completion + the historical Tan seed. doneFlag → _questTick pays.
      { topic: "old days", when: (st, G) => G.quests.old_days === "active" && !_flag("oldDaysHeard"),
        sets: ["oldDaysHeard"],
        text: "You buy him the time and he spends it gladly — the soi when the bars had bands not apps, the " +
          "mamasans who ran the street better than any council, the farang who came and stayed and are under " +
          "the wat now.\n\nThen, unprompted, his voice drops a register. \"Funny thing the money never " +
          "changes, though. Back table at the flash bar — always was a quiet fella at it. Thai, but he'd talk " +
          "like a Yank when he talked, which weren't often. Young, back then. Drove one of the big men about — " +
          "and here's the thing stuck with me forty year—\" he taps the bar \"—everyone deferred to the " +
          "DRIVER. Not the big man. The driver. And not a soul could tell you why.\" A dry sip. \"Same sort's " +
          "still out there, I'd wager. Men like that don't age. They just get quieter.\"",
        short: "\"Always a quiet US-sounding Thai at the good table — drove the big men about, and everyone deferred to the DRIVER. Nobody could say why.\"" },
      { topic: "old days", when: (st, G) => !_flag("oldDaysHeard"),
        text: "\"The old days?\" A dry look. \"Costs you a Chang and an hour of your night, son. You in a " +
          "hurry, or you want it proper?\" He's not really asking; he's telling you to slow down.",
        short: "\"The old days cost you a Chang and an hour. You want it proper, or you in a hurry?\"" },

      { topic: "money", text: "\"Pension, son. Comes the first of the month, goes by the twentieth if I'm " +
          "careful, and I'm always careful.\" No self-pity in it. \"That's the trick nobody tells the young " +
          "ones — this town'll take exactly what you've got, whether that's a fortune or a fixed income. So " +
          "you decide the number BEFORE you walk out the door, and then you're a rich man all night, because " +
          "you've already spent it.\" He lifts the Chang an inch. \"Cheapest wisdom you'll get on this soi.\"",
        short: "\"The town takes exactly what you've got. Decide your number before you leave — then you're rich all night.\"" },

      { topic: "soi", text: "\"Changed? 'Course it's changed. Same as everywhere — the little fellas sold up " +
          "to the big fella, and now it's all one brand with a different sign out front.\" He shrugs, a man " +
          "long past outrage. \"White Dish, they call it now. Used to be the mamasans' street. Now it's a " +
          "spreadsheet's street. But the tide still comes in at six and goes out at two, and the lonely still " +
          "come looking, so.\" He drinks. \"It's still Pattaya. It just costs more and means less.\"",
        short: "\"The little fellas sold to the big fella — White Dish now. Still Pattaya. Costs more, means less.\"" },
    ],
  },

  // ── Origin archetype: THE REDUNDANCY (first freedom, no armour) ────────────
  // Payout in hand, first time properly abroad and properly free, trusts everyone.
  // His Tan seed is the WARM angle: the airport driver was the kindest man he met,
  // rings back any hour, "everywhere." Reads as decency on run 1; as omnipresence
  // on replay. His quest is honest counsel about a payout going out too fast.
  macca: {
    name: "Macca", th: "แม็คก้า", emoji: "⚡",
    pronoun: "he",
    room: "sunset_dreams",
    origin: "redundancy",
    title: "a beaming fella in a red football shirt standing everyone a round",
    look: "English man of fifty-three, Liverpool build, sunburnt, close-cropped greying hair, football shirt.",
    desc: "Scouse, fifty-three, twenty-two years an electrician and then a letter and a cheque with more " +
      "noughts than he's ever seen at once. First time abroad that isn't Spain, first time in his life with " +
      "no shift in the morning, and it's gone to his head like sunshine. Buys rounds for strangers. Means " +
      "every word. Hasn't yet met the version of this town that isn't his friend.",
    dialogue: [
      { text: "\"Eyyy, there he is! Sit down, la, what you havin'?\" You didn't ask for anything; a beer lands " +
          "anyway. Macca is lit up like the bar sign. \"Macca. Sparky, twenty-two year, then they only go an' " +
          "make us redundant, dun't they — best thing ever happened, turns out! Cashed me chips, got on a " +
          "plane, and would you look at this—\" he gestures at the entire soi like he owns it \"—would you " +
          "just LOOK at it.\"",
        short: "\"Eyyy! Macca — sparky, twenty-two year, made redundant, best thing ever happened. Look at this place!\"",
        asks: { key: "firsttime", q: "\"'Ere, straight up — is it always like this? Every night? 'Cause I keep thinkin' someone's gonna tap us on the shoulder an' say the party's over, go home.\"" } },

      // THE PAYOUT — completion. Once you've clocked how the town works (seen WDG or
      // just spent a while here), he asks you straight if he's going too fast. He is.
      { topic: "payout", when: (st, G) => G.quests.easy_come === "active" && !_flag("payoutPaced"),
        sets: ["payoutPaced"],
        text: "He shows you the maths without being asked — a photo of a bank balance, proud and terrified at " +
          "once. \"That's the lot. Twenty-two year, that number. Feels like a KING out here, dunnit — but " +
          "I done the sum on the flight over an' at this rate she's gone by Christmas.\" The grin flickers. " +
          "\"Go on then. You've been about. Am I bein' a soft lad?\"\n\nYou give it to him honest: not soft, " +
          "just new — the rounds for the whole bar, the 'girlfriend' at three bars, the tab he never sees " +
          "totalled. Decide the nightly number BEFORE the first pint, like the old boys do, and the payout " +
          "lasts years instead of months. He takes it well, because he's a good man. \"...Yeah. Me mam'd say " +
          "the same, God rest her. Ta, la. Next one's still on me, mind — but just the one round. See? " +
          "Learnin' already.\"",
        short: "\"That's twenty-two year, that number — gone by Christmas at this rate.\" You give it honest; he takes it well. \"Ta, la. Learnin' already.\"" },
      { topic: "payout", when: (st, G) => !_flag("payoutPaced"),
        text: "\"Money?\" He waves it off, too breezy. \"Sound, la, I'm sound. Redundancy, innit — proper " +
          "wedge. First time in me life I'm not countin' it.\" A tiny shadow crosses and he drinks it away. " +
          "\"That's the whole point, ISN'T it. Not countin' it.\"",
        short: "\"I'm sound — proper redundancy wedge. First time in me life I'm not countin' it.\"" },

      // TAN SEED (warm): the airport driver, kindest man he met, rings back any hour.
      { topic: "driver", when: (st) => st.trust >= 1,
        text: "\"Best fella I've met out here? Not even a bird, la — the DRIVER. Off the plane, dead " +
          "lost, and this Thai lad sorts us a ride, won't take the full fare, gives us his number — 'you get " +
          "stuck, any hour, you ring.'\" Macca shakes his head, genuinely moved. \"An' I DID, first night, " +
          "lost as owt at three in the mornin' — rang it expectin' nowt — bloke picks up, wide awake, has us " +
          "a taxi in two minutes flat.\" He taps his temple. \"Speaks lovely English an' all, like a Yank. " +
          "Only Thai number I'd actually trust, that. Everywhere, that lad. How's he everywhere?\"",
        short: "\"Best fella out here's the DRIVER — won't take full fare, rings back at 3am, US English, everywhere. Only number I trust.\"" },
    ],
  },

  // ── Origin archetype: THE RUNNING (a forwarding address for a stopped life) ─
  // Evasive; goes by "Pete", which isn't the name on his passport. His Tan seed is
  // the SINISTER one: the airport driver greeted him by his real name though he'd
  // booked under Pete. The profiler reads the manifest. His quest is the small,
  // human ask to keep that name quiet.
  pete: {
    name: "Pete", th: "พีท", emoji: "🚬",
    pronoun: "he",
    room: "sandy_toes",
    origin: "running",
    title: "a careful man at the dark end of the bar who sits facing the door",
    desc: "English, fifties, the kind of grey you go when you've stopped sleeping properly. Sits where he " +
      "can see who comes in, drinks slow, gives nothing. Calls himself Pete, and it's a good enough name. " +
      "Whatever he left behind, he left it fast and he left it whole — Pattaya never asks for references, " +
      "which is the entire reason he's on this stool and not another.",
    dialogue: [
      { text: "He clocks you the second you approach and you can see him decide you're nobody. Only then does " +
          "he ease a quarter-inch. \"...Alright.\" A pause that's doing work. \"Pete.\" He leaves it there, the " +
          "way you'd leave a door open just wide enough to shut fast. \"Don't mind me. I'm just having a quiet " +
          "one. Lot of quiet ones out here. That's the appeal.\"",
        short: "\"...Pete.\" He decides you're nobody, eases a quarter-inch. \"Just having a quiet one. That's the appeal.\"",
        asks: { key: "sentme", q: "The question comes out flat and careful, watching your eyes when it lands: \"Nobody sent you over, did they. Just being friendly. That's all this is.\"" } },

      // THE NAME — completion + the sinister Tan seed. He trusts you enough to say
      // the thing that's been eating him, and asks the small favour.
      { topic: "name", when: (st, G) => G.quests.quiet_one === "active" && !_flag("nameKept"),
        sets: ["nameKept"],
        text: "He weighs you a long moment, then decides — a man who's been carrying it alone too long. \"Pete's " +
          "not it. Doesn't matter what is. Point is I booked everything under Pete — flight, hotel, the lot. " +
          "Careful. I'm always careful.\" His jaw works. \"Driver at the airport. Never met him, never gave " +
          "him a name — and he opens the door and says my REAL one. Pleasant as you like. 'Welcome, khun'—\" " +
          "he stops himself before he says it. \"Then hands me a card. 'Anything you need.'\" Pete's knuckles " +
          "are white on the glass. \"How does a driver have my real name? You tell me that.\" He steadies. " +
          "\"...Just — if anyone asks after that name, I'm Pete. You never heard the other. Can you do that " +
          "for a stranger?\" You tell him you can. Something in his shoulders lets go, an inch.",
        short: "\"Driver at the airport used my REAL name — I'd booked everything under Pete. How's a driver have that?\" He asks you to keep it quiet. You do.",
        fx: (st, G) => { st.trust = Math.max(st.trust, 3); } },
      { topic: "name", when: (st, G) => !_flag("nameKept"),
        text: "\"My name's Pete.\" Flat, final, a shutter coming down. \"Why — someone been asking?\" The look " +
          "he gives you could strip paint. It takes him a second to remember you're nobody. \"...Forget it. " +
          "Long night.\"",
        short: "\"My name's Pete. Why — someone been asking?\" A shutter comes down." },

      { topic: "running", when: (st) => st.trust >= 2,
        text: "\"Everyone out here's running from something, that's the line, isn't it.\" He almost smiles and " +
          "it doesn't reach anything. \"Difference is most of 'em can go home when the money runs out. I'm the " +
          "other kind.\" He turns the glass. \"Don't feel sorry for me. I did a thing. Not the worst thing, " +
          "but a thing. This is the bill for it — warm beer and no winters and never sitting with my back to " +
          "a door again.\" A shrug. \"Worse bills going. I pay it quiet.\"",
        short: "\"Most can go home when the money runs out. I'm the other kind. I did a thing. This is the bill. I pay it quiet.\"" },
    ],
  },

  // ── Origin archetype: THE RETURNER (married one once; knows how it ends) ────
  // Ex-Thai-wife, back solo, jaded, sees the scams. His fragment is the OTHER
  // shadow power (variety): his ex-wife's brother rides with the Orchid MC, and he
  // wants word carried — the president/MC thread, not Tan.
  rob: {
    name: "Rob", th: "ร็อบ", emoji: "💍",
    pronoun: "he",
    room: "kitten_corner",
    origin: "married",
    title: "a calm farang who watches the girls work with no hunger in it at all",
    look: "English man of forty-eight, weathered, greying stubble, plain polo shirt, watchful and still.",
    desc: "English, forty-eight, married a Buriram girl for nine years and buried the marriage a year ago, " +
      "not unkindly on either side. Speaks passable Isan-accented Thai, knows the family system from the " +
      "inside, and watches the bar's whole performance with the fond, tired eye of a man who's seen the " +
      "machinery from backstage. Not here to be fooled. Here because where else would he be.",
    dialogue: [
      { text: "He watches you get worked by the room and there's no judgement in it, only recognition. " +
          "\"They're good, aren't they. The best of 'em could sell sand to a beach.\" A nod to the stool. " +
          "\"Rob. Nine years married to one, so I get to enjoy the show now without paying admission. Took me " +
          "the whole nine to learn to watch the hands instead of the smile.\" He sips. \"You'll learn. " +
          "Everyone learns. Question's just how dear the lesson.\"",
        short: "\"Rob. Nine years married to one — I watch the hands now, not the smile. Everyone learns. Question's how dear.\"",
        asks: { key: "believe", q: "\"Let me guess — you've already met the one who's DIFFERENT. The one who's not like the other girls.\" A kind, knowing look. \"Have you? Be honest.\"" } },

      // THE BROTHER — completion + the MC/president fragment. He asks you to carry a
      // careful word, because he can't be seen near that room himself.
      { topic: "brother", when: (st, G) => G.quests.her_brother === "active" && !_flag("brotherWord"),
        sets: ["brotherWord"],
        text: "\"Her brother. Nong.\" Rob says it carefully. \"Good lad once — drove a taxi, sent money home " +
          "like they all do. Then he got a patch.\" He tips his head vaguely soi-ward, toward the flash bar " +
          "with the velvet rope. \"Rides with the club that holds court in that back room now. The one nobody " +
          "walks into by accident.\" He turns his glass. \"I'm not after trouble — I'm the ex-husband, I'm " +
          "nothing to them. But the family's still MY family, some ways that matter. If you're ever in that " +
          "room and you clock a big Buriram lad, patched, quiet — tell him Rob says his mother's well, and " +
          "the land's paid, and nobody's angry.\" A breath. \"That's all. He'll know what it means.\" You " +
          "agree to carry it. \"Ta. Some doors a farang shouldn't knock on twice. That's one.\"",
        short: "\"Her brother rides with the club in that back room. If you're ever in there — tell him Rob says his mum's well, the land's paid, nobody's angry.\"" },
      { topic: "brother", when: (st, G) => !_flag("brotherWord"),
        text: "\"Family business. Nothing you'd want the weight of yet.\" He deflects it easy, practised. " +
          "\"Ask me when you know me. Or don't — safer, honestly.\"",
        short: "\"Family business. Ask me when you know me. Or don't — safer.\"" },

      { topic: "married", text: "\"Nine years. Good ones, mostly — I'm not one of these blokes who'll tell " +
          "you they're all liars, because mine wasn't, and it does her a disservice.\" He says it firmly, a " +
          "line he's decided to hold. \"We just wanted different endings to the same story. Her family were " +
          "decent to me the whole way — still are, which is its own complication.\" A wry tilt. \"Marriage out " +
          "here isn't the scam the barflies tell you. It's just a marriage, with an exchange rate. Same maths, " +
          "harder sums.\"",
        short: "\"Nine years, good ones mostly — mine wasn't a liar, and saying they all are does her a disservice. Just wanted different endings.\"" },
    ],
  },

  // ── Origin archetype: THE MONGER (zero shame, comic relief) ────────────────
  // "Golf with the APAC team" — packed the clubs, will never find a course. His
  // Tan seed is the COMIC one ("the driver took one look at me clubs and laughed"),
  // and his quest is the light one: he unknowingly photographed the Orchid's good
  // table on a boozy walk-through and has no idea what he's holding.
  barry: {
    name: "Barry", th: "แบร์รี่", emoji: "⛳",
    pronoun: "he",
    room: "ruby_kiss",
    origin: "monger",
    title: "a delighted, sunburnt man in golf gear who has plainly not been near a golf course",
    desc: "English, fifty, here on the eleventh 'golf trip' of a marriage that politely doesn't ask. Packed " +
      "the clubs, means to play, will not play. Zero shame and boundless goodwill; knows half the girls on " +
      "this soi by name and all of them by drink order. The most honest dishonest man in Pattaya — lies only " +
      "to his wife, and even then only about the golf.",
    dialogue: [
      { text: "\"NEW fella! Marvellous.\" Barry pumps your hand like a fruit machine paying out. \"Barry. " +
          "Here with the APAC golf society—\" he says it with a wink so enormous it's practically audible " +
          "\"—the golf society. Brought the CLUBS an' everything. Haven't found the course yet. Eleven trips, " +
          "still lookin'.\" He roars at his own line, because it's a good one and he's earned it. \"Siddown, " +
          "the girls here are DIAMOND, I'll introduce ya.\"",
        short: "\"Barry! APAC golf society—\" enormous wink \"—brought the clubs, never found the course. Eleven trips. Siddown, the girls are diamond.\"",
        asks: { key: "shame", q: "\"Go on, be honest with old Barry — first big trip, are you still doin' the GUILT thing? The 'ooh I shouldn't'?\" A warm, conspiratorial grin. \"'Cause I can save you a lot of wasted energy there, son.\"" } },

      // THE WRONG PHOTO — completion. He proudly shows off his trophy album; one shot
      // caught the good table by accident. Gated on you knowing why that matters
      // (been in the Orchid, or done Doyle's recon). doneFlag → _questTick pays.
      { topic: "photo", when: (st, G) => G.quests.wrong_shot === "active" && !_flag("wrongShot") &&
          ((G.visited && G.visited.orchid_room) || _flag("orchidReported")),
        sets: ["wrongShot"],
        text: "He scrolls you through the album, beaming — himself and eleven years of grinning girls, a " +
          "hall of fame with no villains in it. Then a blurry one: Barry mid-conga through a back room he " +
          "'wandered into lookin' for the gents,' flash on, thumb half over the lens. \"Don't know whose " +
          "party THAT was, threw us out sharpish—\" \n\nYou take the device off him. Behind Barry's grin, " +
          "in focus by pure drunk luck: the good table. The patched president mid-laugh — and beside him, " +
          "caught turning away from the flash a half-second too slow, the soft-spoken man, clear as day. The " +
          "one face nobody photographs, photographed. \"That old boy?\" Barry squints. \"Miserable sort. " +
          "Wouldn't smile for the picture.\" He has no idea he's holding the only known photo of the quietest " +
          "man on Soi 6. You tell him to keep it very much to himself. \"...Righto. You've gone all serious, " +
          "son. Have a shot, you'll feel better.\"",
        short: "One blurry conga shot caught the good table — the president, and the soft-spoken man turning from the flash a half-second too slow. The only photo of him. Barry has no idea.",
        fx: (st, G) => { _addHappy(2); } },
      { topic: "photo", when: (st, G) => !_flag("wrongShot"),
        text: "\"Photos? Son, I've got ELEVEN YEARS of photos.\" He brandishes the album proudly. \"Every " +
          "one a stunner, every one a diamond. Can't show the wife, obviously — she thinks these thumbs have " +
          "been on a five-iron.\" He cackles. \"Have a scroll, they're works of art.\"",
        short: "\"Eleven years of photos, every one a diamond. Can't show the wife — she thinks these thumbs've been on a five-iron.\"" },

      // TAN SEED (comic): the airport driver laughed at the clubs.
      { topic: "driver", text: "\"The airport lad! Lovely fella. Takes one look at me golf bag comin' off " +
          "the belt and just—\" Barry mimes a slow, knowing shake of the head \"—LAUGHS. Not nasty. Like he " +
          "KNEW. 'Play your eighteen holes, khun Barry,' he says, dead straight face.\" Barry wheezes with " +
          "delight. \"Eleven trips, first bloke to see straight through me on the tarmac. Gave us his card an' " +
          "all — 'anything you need.' Proper operator. Wasted on drivin', that one.\"",
        short: "\"Airport lad took one look at me clubs and LAUGHED. 'Play your eighteen holes, khun Barry.' Saw straight through me. Wasted on drivin', that one.\"" },
    ],
  },

  // ── TAN — the driver, the fixer, the hub (the payoff of the whole web) ──────
  // Your airport driver from the intro, now a findable NPC at the mouth of Soi 6.
  // Every origin's quest dropped a fragment pointing here without naming him; nobody
  // joins the dots but the player. Tan's own dialogue escalates with how many clues
  // you've gathered, culminating in a near-confirmation he is the syndicate's quiet
  // man at the Orchid good table — delivered as free advice, never once stated. Kept
  // deliberately never-obvious: on run 1 he's a helpful driver; on replay he's the
  // spider. Known from the intro (you rode in with him), so he shows as "Tan".
  tan: {
    name: "Tan", th: "ต้น", emoji: "🚕", personality: "operator",
    pronoun: "he",
    room: "soi6_street",
    look: "Thai man of thirty-five, neat and forgettable, short black hair, plain grey polo shirt.",
    desc: "Your airport driver, leaning on a plain grey sedan at the mouth of the soi as though he never " +
      "drove off — mid-thirties, neat, a polo shirt you would forget the instant you looked away. Six years " +
      "in Ohio for a film degree that paid nothing and taught him everything about how a shot is framed. " +
      "\"I drive and I fix,\" he says, and both are true, and neither is the whole of it. The most forgettable " +
      "man on Soi 6 — which, on Soi 6, is its own kind of power.",
    dialogue: [
      { topic: "debt", chip: false,
        when: (st, G) => !_flag("debtSettled") && _flag("act1Done"),
        sets: ["debtSettled", "owesTan"],
        text: "\u201cBank.\u201d Tan says the name the way you would read a familiar road sign. " +
          "\u201cOrange vest, Beach Road south, boots on the handlebars.\u201d He takes out his " +
          "phone, looks at it, and does not dial. \u201cAnd Nira. Okay.\u201d That is all. No figure " +
          "is mentioned, then or ever. \u201cIt is done, my friend. Do not send her money \u2014 " +
          "you will insult two people at once.\u201d He puts it away and finally looks at " +
          "you, and the smile is the ordinary one, which is somehow worse. \u201cNow you have asked " +
          "me for something. Good. It is better this way \u2014 before, you were only a passenger.\u201d",
        short: "\u201cIt is done. And now you have asked me for something.\u201d" },
      // Post-reveal greeting: he knows you saw him at the good table, and the
      // relationship recalibrates without a word of it being said out loud.
      { when: (st, G) => _flag("tanRevealed"),
        text: "\"My friend.\" Tan comes off the car the same as always — and not the same at all, because " +
          "now you both know what you saw, and he watches you decide, in real time, what to do about it. " +
          "You say nothing. Something behind his eyes files that away with what might, in a different man, " +
          "be respect. \"Good evening for a drive,\" he says pleasantly, and the town rearranges itself " +
          "around the sentence: the driver, the fixer, the quiet man — all of them leaning on one ordinary " +
          "grey car, offering you a ride.",
        short: "\"My friend.\" The same as always — and not the same at all. You say nothing; he files that away. \"Good evening for a drive.\"" },
      { text: "\"Ha — my airport friend.\" Tan comes off the car, genuinely pleased, or doing pleased so well " +
          "it makes no difference. \"Still got your wallet? ...Mostly. Good. Most of you I drop once and never " +
          "see again. The ones I see twice—\" a warm shrug \"—those are the interesting ones.\" He tips his " +
          "chin at the neon swallowing the soi. \"So. You are finding your feet. Anything you need, you " +
          "remember what I told you in the car: you have my number.\"",
        short: "\"My airport friend. Still got your wallet? ...Mostly. Anything you need — you have my number.\"",
        asks: { key: "finding", q: "\"Tell me true—\" the easy grin, the eyes a half-beat behind it \"—this town, is it what you came for? Or is it turning out to be something else?\"" } },

      { topic: "fix", text: "\"What can I fix?\" He says it like the question delights him. \"A ride. A room. A " +
          "visa man who actually answers his phone. A problem that needs to quietly become not-a-problem. A " +
          "door that is closed to you—\" the smallest smile \"—and open to me.\" He lets that hang a half-beat " +
          "too long, then laughs it off the way you'd wave off smoke. \"Small things, my friend. I am only a " +
          "driver. But I drive everybody, and everybody, sooner or later, needs a small thing.\"",
        short: "\"A ride, a room, a visa man, a door that's closed to you and open to me. Small things. But everybody needs a small thing.\"" },

      { topic: "drive", text: "\"Six years in Ohio. Film school.\" He says the state like the punchline it " +
          "became. \"You learn to frame a shot, light a face, tell a lie the camera believes. Then you come " +
          "home and there is no film industry, so—\" the shrug \"—you drive. But you never stop seeing the " +
          "frame, my friend. Who is really in the shot. Who is standing just outside it, where the camera does " +
          "not think to look.\" A pleasant, bottomless smile. \"THAT part paid. The English paid. The rest was " +
          "tuition.\"",
        short: "\"Ohio, film school — frame a shot, who's in it, who's standing just outside where the camera don't look. That part paid.\"" },

      // The hub reveal — unlocks once you've met a couple of the archetypes he drove.
      { topic: "others", when: (st, G) => ["doyle", "wayne", "roy", "macca", "pete", "rob", "barry"]
          .filter(id => G.known && G.known[id]).length >= 2,
        text: "\"The others?\" A knowing tilt. \"The detective. The Australian with the bar he should not " +
          "buy. The old one who remembers too much. The quiet one who booked under a name that is not his. The " +
          "golfer who has never once found the course.\" He recites them like a man reading a passenger " +
          "manifest, because that is precisely what he is doing. \"I drove every one of them, my friend. From " +
          "the airport. This whole soi came to town in my back seat, one at a time, telling me everything " +
          "before we reached Second Road.\" The grin. \"You want to know a town, you don't ask the mayor. You " +
          "ask the driver. The driver hears it all — and the driver is the one man they forget is even in the " +
          "room.\"",
        short: "\"I drove every one of them — the detective, the Australian, the old one, the runner, the golfer. The whole soi came to town in my back seat. You want to know a town, ask the driver.\"" },

      // After the Orchid reveal — you SAW him at the good table. He still never
      // says the words; confirmation stays a thing that happened, not a thing said.
      // (First in the table set — it must outrank the deflection's count<3 match.)
      { topic: "table", when: (st, G) => _flag("tanRevealed"),
        text: "\"The good table.\" He looks at you the way a man looks at a photograph of himself he " +
          "didn't pose for. Neither of you says the other thing. \"A man sits where there is a chair, my " +
          "friend. Sometimes the chair is at the airport. Sometimes—\" the smallest shrug in Thailand " +
          "\"—somewhere quieter. You saw a man at a table. Rooms are full of tables.\" He opens the car " +
          "door for you, courteous as ever. \"What matters is this: you never asked, and I never said. " +
          "Keep it exactly that way, and you and I will always have a great deal to talk about.\"",
        short: "\"You saw a man at a table. Rooms are full of tables. You never asked, I never said — keep it that way.\"" },

      // Good-table deflection — the smooth close, before you've circled it enough.
      // deflect: the chip palette must NOT offer "table" before the fiction has
      // introduced it (the player learns of the good table from the Pink Lotus
      // door, Doyle, Roy, Barry — never from a menu). Typing ASK TAN ABOUT TABLE
      // early still gets this refusal — the ask-the-driver inference is earned.
      // The chip appears when the ≥3-fragments node below unlocks, so the topic
      // surfacing at all IS the telegraph that Tan is ready to say the real thing.
      { topic: "table", deflect: true,
        when: (st, G) => ["orchidReported", "nameKept", "oldDaysHeard", "wrongShot", "nomineeWarned"]
          .filter(f => _flag(f)).length < 3,
        text: "\"The good table.\" The warmth stays on his face while something behind it goes very still and " +
          "very patient. \"Some tables you do not ask about, my friend. Not the detective. Not the blogger who " +
          "keeps writing his little articles. Not you.\" A beat. \"Not even me.\" And he changes the subject so " +
          "smoothly you almost don't feel the door shut. \"Now — you eat yet? You never eat. Come, I know a " +
          "place.\" (FOLLOW TAN, if you're hungry — he means it.)",
        short: "\"Some tables you don't ask about, my friend. Not even me.\" The door shuts so smoothly you almost don't feel it." },

      // The near-confirmation — once the fragments add up. He never says the words.
      // Hearing it arms the Orchid reveal (tanSuspected): the advice is the setup,
      // the good table is the payoff.
      { topic: "table", when: (st, G) => ["orchidReported", "nameKept", "oldDaysHeard", "wrongShot", "nomineeWarned"]
          .filter(f => _flag(f)).length >= 3,
        sets: ["tanSuspected"],
        text: "For a long moment Tan simply looks at you, and the airport grin is nowhere to be found. \"You " +
          "have been busy. The Orchid. The old man's stories. A name a driver had no way to know.\" He counts " +
          "your evenings back to you without hurry, and you understand, with a small cold drop, that he has " +
          "known each piece as you gathered it. \"You are asking about a quiet man. A man the whole room bends " +
          "toward and no one can name.\" He leans in, still perfectly pleasant, and that is the most " +
          "frightening thing about him. \"So here is the one piece of advice I will ever give you for nothing: " +
          "quiet men stay quiet for a reason. And some of them—\" he pats the roof of his very ordinary car, " +
          "twice \"—drive taxis.\" Then the grin snaps back on like a switched light. \"ANYWAY. You need a " +
          "ride, any hour, you call me. But you knew that already.\"",
        short: "\"You are asking about a quiet man the whole room bends toward and no one can name. Quiet men stay quiet for a reason — and some of them drive taxis.\" The grin snaps back." },
    
      // ── bar-owning chain, step 3 (the OTHER route): Tan as the 51% ──────
      // The fork's whole point. Candy's yes is slow, written, and costs a
      // Bangkok lawyer; Tan's is instant, free, and costs nothing you can see.
      // He has refused money all game — the banking app bounces it straight back
      // — and his own words are "when I want something from you, I will ask for
      // it, and it will not be money" (_tanText, engine-systems.js). This is the
      // player handing that man 51% of a bar and a debt with no figure on it.
      // Deliberately warm and not sinister: he means every word he says here.
      {
        topic: "partnership", chip: false,
        req: ["expatLife", "barLicence"], notFlags: ["barPartner"],
        sets: ["barPartner", "partnerTan"],
        // indie: it stays out of the rollups. syndicate: you are now inside
        // somebody's web of favours, whether or not you can see the web.
        fx: (st, G) => { _align("indie", 1); _align("wdg", -1); _align("syndicate", 1); },
        text: "You have barely finished the sentence before he is nodding.\n\n" +
          "\"Yes. Of course.\" Tan says it the way you would agree to hold a door. " +
          "\"My name, your bar. Is no problem, my friend.\"\n\nYou start on the " +
          "part about a lawyer, and about what he would take, and he waves the " +
          "whole thing away with two fingers, still smiling.\n\n\"No, no. Land " +
          "office is my wife cousin. Two hour, finish. Lawyer is for people who do " +
          "not know anybody.\" He tilts his head. \"And I take nothing. Please. Do " +
          "not insult us both.\"\n\nYou try once more, because it is too easy, and " +
          "something in you has been on this soi long enough to know that nothing " +
          "here is free.\n\n\"My friend.\" He is not smiling any less. \"I told " +
          "you already. When I want something from you, I will ask.\" He opens the " +
          "sedan door, because there is always somewhere he has to be. \"Today I do " +
          "not want anything. Today is a good day — you are staying, and now you " +
          "have a reason to stay. Come, we go to the land office tomorrow, ten " +
          "o'clock, and after I know a place for lunch.\"\n\nIt is done by " +
          "Tuesday. It costs you nothing at all.",
        short: "\"My name, your bar. Land office is my wife cousin. And I take nothing — do not insult us both.\"",
      },
    ],
  },

  doug: {
    name: "Doug", emoji: "🥃",
    pronoun: "he",
    room: "stinky_bar",
    desc: "Canadian, sixties, a golf tan gone patchy, nursing a rum-and-coke he makes last an hour. Two " +
      "years ago he wired his retirement into 'the portfolio' — units in White Dish bars, guaranteed " +
      "returns, a glossy PDF with a leaping logo. He has been drinking that decision at the Stinky ever " +
      "since. Bert runs him a tab he mostly settles.",
    dialogue: [
      { text: "\"Pull up a stool, mind the cue.\" He nudges his glass an inch in welcome. \"Doug. Calgary — " +
          "thirty years in oil and gas, retired over here to do absolutely nothing, and I've been very good " +
          "at it. Apart from the one thing.\" A rueful tilt of the glass.",
        short: "\"Doug, Calgary. Retired here to do nothing — very good at it. Apart from the one thing.\"",
        asks: { key: "invested", q: "He eyes you over the rum, not unkindly. \"You got money in anything out here, friend? Property, a bar, one of them 'opportunities'? Humour an old man — tell me you said no.\"" } },
      { topic: "white dish", text: "\"White Dish? Ho. Pour yourself something first.\" He turns the glass " +
          "slowly. \"Two years back a fella buys me a drink right at this bar — smooth, golf shirt, calls " +
          "himself an area consultant. Says the group's opening the portfolio to a few private investors. " +
          "Units in the bars. Eighteen percent, quarterly, all laid out in a lovely PDF with the little " +
          "logo.\" A dry laugh with no bottom to it. \"I wired four hundred grand. Got two statements, both " +
          "glowing. Then — nothing. Portal down, emails bouncing, my 'relationship manager' evaporated. " +
          "Every dollar of it gone into Ryan Powers' brand, and I can't get so much as a {{phone}} call.\"",
        short: "\"Wired four hundred grand into 'the portfolio' — eighteen percent, quarterly. Two statements, then nothing. Gone.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      // The facts he'll give anyone; the raw part — Ryan himself — he saves for
      // someone who's stuck around, not another stranger who'll vanish like the rest.
      { topic: "ryan", when: (st) => st.trust < 2, deflect: true,
        text: "The name lands and he looks at you properly for the first time. \"Ryan Powers. You a " +
          "reporter? A lawyer? One of his?\" He decides you're probably not — but not all the way. \"I've " +
          "poured this out to too many strangers already, and every one of 'em nodded and left and nothing " +
          "changed. Buy a round. Stick around. Prove you're just a guy at a bar. Then I'll tell you what he is.\"",
        short: "\"You a reporter? One of his? Stick around, prove you're just a guy at a bar. Then I'll tell you.\"" },
      { topic: "ryan", when: (st) => st.trust >= 2,
        text: "\"Ryan Powers.\" The glass goes down harder than he means. \"Only ever got him " +
          "on a video call — sunglasses on, indoors, rented Lambo out the window, 'we're a FAMILY, Doug, " +
          "trust the process.'\" He does the voice; it isn't kind. \"Now he posts investor-update reels to " +
          "the very people he hasn't paid. I left one polite comment asking where my money went — blocked " +
          "inside the hour, and a lawyer emailed me the word 'defamation.'\" A head-shake, almost admiring. " +
          "\"Four hundred grand, and the man's a coward with a ring light. I've got every email. I've got no " +
          "recourse. Bert lets me sit here and mostly not talk about it.\"",
        short: "\"Only met Ryan on a video call — sunglasses indoors, rented Lambo, 'we're a FAMILY.' Blocked me, sent a lawyer. Coward with a ring light.\"" },
    ],
  },

  terry: {
    name: "Terry", emoji: "🍺",
    pronoun: "he",
    room: "queen_vic",
    desc: "Bald, red-faced, Chang vest, fifteen years of Pattaya compressed into a permanent " +
      "corner-stool residency. He rents the same balcony room every high season. He was here " +
      "before White Dish. He will tell you about it. He tells it well.",
    dialogue: [
      { topic: "wallet", notFlags: ["hasWallet"],
        text: "\"Wallet gone? On Soi 6?\" He exhales through his nose. \"Right. Soi Buakhao — Candy Bar, ask for Candy herself. Sharp as they come. She'll know who moved it or she'll know who does.\" He returns to his beer with the authority of a man who has solved this problem before." },
      { topic: "white dish", sets: ["heardWdgHistory"],
        text: "\"White Dish Group.\" He says it the way you say a diagnosis. \"Ryan Powers. Never here in the flesh, always in your feed — that's the joke. Before his lot got involved, this soi ran itself. Loud, chaotic, but honest chaos. Now?\" He gestures at the street through the window. \"QR codes. Branded menus. They've got six bars already. Word is they're after another one.\" He takes a long pull of Chang. \"Someone should do something about that.\"",
        short: "\"White Dish. Ryan Powers. Six bars already, after another. Someone should do something.\"" },
      { topic: "powers",
        text: "\"Ryan Powers.\" Terry snorts into the Chang. \"British, though he's got a voice on now — half " +
          "American, for the videos. You've not seen the videos? Blessed, you are. 'Hustle,' 'vision,' 'we're " +
          "a FAMILY,' him draped over a rented supercar he films from three angles.\" A slow head-shake. " +
          "\"Everyone wants him to be some cold operator out of a film. He's a gobby little self-promoter who " +
          "blocks you when you ask a straight question and screams 'defamation' when you ask it twice. The " +
          "dangerous bit's the lawyer and the brown envelope. Ryan's just the one doing the podcast about it.\"",
        short: "\"Not a cold operator — a gobby self-promoter with a rented supercar and a podcast. The lawyer's the dangerous bit.\"" },
      { topic: "tiktok", text: "He gestures at the soi through the window without " +
        "looking. \"You see those lot? Ring light, selfie stick, little gimbal thing?\" " +
        "He doesn't wait for an answer. \"Walk the whole soi, grab every girl's hand, " +
        "tell 'em they're beautiful on camera, walk away without buying a drink. " +
        "Thousands of views. Zero baht.\" He finishes his Chang. \"Bar owner down the " +
        "road told me ninety-six percent of his foot traffic is that now. Content. " +
        "Just content.\" He signals the barman again. \"The girls stand out front in " +
        "nothing all night for some kid's YouTube channel. And they can't even say no " +
        "because then they look bad on camera.\"" },
      { when: (st) => st.dstate !== "stranger",
        text: "\"Back again. Good.\" Terry shifts his Chang an inch, which for Terry is throwing his arms " +
          "wide. \"Soi's still performing — it always is. Sit, watch a minute. You're learning the rhythm of " +
          "the place; I can tell.\"",
        short: "\"Back again. Good.\" (An inch of shifted Chang — for Terry, arms wide open.)" },
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
    look: "Thai woman of twenty-eight, legs crossed on a barstool, hair down, cocktail in hand, unhurried.",
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

    look: "Thai woman of nineteen, visibly new, hair in a simple ponytail, plain bar dress, phone in hand.",
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
      { topic: "ring", text: "She turns the little gold ring on her finger — new, thin, " +
        "the plating already going at the band. \"He buy me this. He say I don't belong " +
        "in a bar. He say when he get home he fix everything, I come stay with him.\" " +
        "Her phone is in her other hand, the chat open to one grey word: Read. Two days " +
        "now. \"He is probably just very busy with work,\" she says — to the screen, not " +
        "to you. \"His boss is very strict.\" The smile she puts on next is the bravest, " +
        "worst thing on the whole soi tonight.",
        short: "\"He is probably just very busy with work. His boss is very strict.\" The ring turns and turns." },
    ],
  },

  mercedes: {
    name: "Mercedes", th: "เมอร์เซเดส", emoji: "❄️", personality: "operator",
    room: "cherry_pop",
    look: "Thai woman of thirty-two, composed, straight dark hair, minimal make-up, plain dark top.",
    desc: "A little older than the other girls here and a great deal less " +
      "nervous — she moves like someone who has already seen the worst a room can " +
      "do to a person. Her English is good, with a flat European edge the soi " +
      "doesn't usually carry.",
    dialogue: [
      { bond: 3, text: "\"You keep coming back to Cherry Pop for ME — the neon is not " +
          "that charming, we both know it.\" For once Mercedes lets the dry line land soft. " +
          "\"After Munich I made myself one promise: no more man I have to manage. And here " +
          "is you — needing no managing, buying the old girl at the loud bar her drink like it is " +
          "Vienna. Don't make me like you, farang. I am badly out of practice.\"",
        short: "\"Don't make me like you, farang. I'm badly out of practice.\"" },
      { bond: 2, text: "\"Sit — the good stool, I saved it.\" Mercedes slides your drink over " +
          "without asking; she knows the order now. \"You are the only one in here who asks me " +
          "a question and then waits for the answer. It is a low bar, I know. Munich was lower.\"",
        short: "\"You ask a question and wait for the answer. Low bar. Munich was lower.\"" },
      { th: "สวัสดีค่ะ", rom: "sawatdee kha",
        text: "\"Welcome to Cherry Pop.\" A small, real smile. \"Loud, pink, entirely " +
          "a machine — but the drinks are cold and I do not lie to you, which on this soi " +
          "is a luxury. Sit. I am Mercedes. Yes, like the car. I had one in the driveway " +
          "in Munich and never once the keys. Now I keep the name and skip the car.\"",
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
      { topic: "nong", text: "\"Nong? The trembling one over at the Gold Rush.\" Something " +
          "almost maternal crosses her face. \"I worked that bar before this one — first " +
          "week she was, scared of the door, scared of Mamasan, scared of everything. I was " +
          "her, fifteen years ago, a go-go on Soi 6.\" A softer smile. \"Somebody should " +
          "tell her the worst thing that happen is you go all the way to Munich and come " +
          "back. Not so bad, in the end. I still keep an eye out, from here.\"",
        short: "\"Nong, over at the Gold Rush — I was her, fifteen years ago. I keep an eye out.\"" },
      { topic: "change", text: "\"Ah. You met one of the quiet ones. Jeans now, cooks " +
        "every night, doesn't drink — and her man walks around proud like a doctor who " +
        "cured something.\" She turns her glass slowly. \"I was the quiet one. Five " +
        "years, Munich. I wore what that life needed — same as I wore the bikini " +
        "before it, same as I wear this now.\" A shrug, not unkind. \"It is not a lie. " +
        "It is a uniform. We are very good at uniforms; hungry teaches you " +
        "tailoring.\" The glass comes down. \"You want to know if she changed? Wait " +
        "for the first hospital bill from the village. If his love pays it, she stays " +
        "soft. If he explains about boundaries...\" A small, cold smile. \"...she packs " +
        "one suitcase. We always pack light. That is also from being hungry.\"",
        short: "\"It is not a lie, it is a uniform — hungry teaches you tailoring. Wait for the first hospital bill from the village.\"" },
      { topic: "warn", text: "\"You think somebody should tell her. How it goes. How " +
        "the ring is hollow, how her phone stays quiet, how this soi files a girl " +
        "down.\" Mercedes looks across the room for a long moment. \"Fifteen years ago " +
        "a woman like me could have told a girl like me all of it, word for word. You " +
        "know what I would have done? Hated her. The truth doesn't pay a mother's " +
        "hospital bill — the warning changes nothing, the girl stays anyway, and now " +
        "she also has an enemy.\" She turns her glass. \"Some lessons only bleed in. " +
        "So no. I don't warn. When the som tam cart comes, I send a bowl over. I keep " +
        "a tissue in my sleeve. That is the whole of what knowing is worth — and it " +
        "took me years to learn even that.\"",
        short: "\"The truth doesn't pay a mother's hospital bill. I don't warn — I send som tam over, and I keep a tissue in my sleeve.\"" },
    ],
  },

  yai: {
    name: "Mama Yai", th: "ใหญ่", emoji: "🍲",
    room: "mama_yai",
    look: "Thai woman of sixty, apron over a buffalo-print blouse, grey hair tied back, ladle in hand.",
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
    look: "Thai woman of thirty-eight, quick-eyed and grinning, hair clipped up, food-stall apron.",
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
    look: "Thai woman of fifty-five, immaculate, silk blouse, hair sculpted, pearls, cool composed face.",
    desc: "The madame of the Orchid Club — fifties, immaculate, a silk blouse and a " +
      "voice you have to lean in to hear. She runs the quietest, coldest, most " +
      "expensive room in Naklua, and she knows the name of every regular's wife.",
    dialogue: [
      // An Introduction quest (docs/map-coverage.md): present Candy's vouch → welcomed in.
      // chip:false; ungated (harmless without an active quest — the flag only matters
      // when the quest is watching for it).
      { topic: "candy", sets: ["orchidVouched"], chip: false,
        text: "You mention Candy, and something recalibrates behind Rose's eyes — not warmth " +
          "exactly, but a latch lifting. “Candy sent you.” She looks at you again, properly this " +
          "time, the way you would re-read a letter. “She does not send me many. Two, three a " +
          "year, and never a fool.” A cool nod. “Then you are half-trusted, which here is a great " +
          "deal — most men buy their way to a quarter and think they have bought the room. Sit " +
          "where you like. Be discreet, be kind to my ladies, and the Orchid is open to you.” The " +
          "smallest pause. “Tell Candy she still owes me a lunch.”",
        short: "“Candy sent you? She never sends a fool. Then you are half-trusted — more than most men can buy. The Orchid is open to you.”" },
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
    pronoun: "she",
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
    pronoun: "she",
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
          "sticker everywhere, you see. {{Boom boom}}…\" a shrug, a smile \"…when I finish work, " +
          "you come, na. Different place.\"" },
      { topic: "shop", text: "\"Smile good shop. Boss okay, not too strict — only the one " +
          "rule.\" She taps the sign and giggles. \"Every customer read it. Every customer " +
          "ask me anyway.\"" },
    ],
  },
  toom: {
    name: "Toom", emoji: "🛁", soapyBoss: true,
    pronoun: "she",
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
    look: "Thai woman of fifty, silk and jade, dancer's posture still, hair up, steady appraising gaze.",
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
      // The Quiet Side quest (docs/map-coverage.md): completion node first (req the
      // intel), directions node second — same first-match ordering pattern. chip:false.
      { topic: "offer", req: ["heardGordon"], sets: ["quietSideDone"], chip: false,
        text: "You tell her what Nok heard — that Gordon went in his sleep back in England " +
          "over the summer, old and quiet, a photo of this beach still on his wall. Sumalee is " +
          "silent a moment, then nods once, the way you close a ledger you always knew you would " +
          "close. “Good. Not good — but good to know.” She takes a stick of incense " +
          "from the shrine behind the bar and lights it. “Fifteen season, he never once made " +
          "trouble. That is a whole life, on the quiet side. I put his picture up small, by the " +
          "King. Nobody will ask who it is, and I will know.” She presses some notes into your " +
          "hand. “For your trouble — and for coming back to tell me instead of forgetting. " +
          "That is the Jomtien way. You are welcome on my soi any season.”",
        short: "Sumalee lights incense for Gordon and puts his photo up small, by the King's. “Fifteen seasons, never once made trouble. A whole life, on the quiet side.”" },
      { topic: "offer", chip: false,
        text: "“A small thing.” She says it the way she says everything, no hurry. “You " +
          "know Gordon? No — before your time. English, big soft fellow, came to Soi 7 every " +
          "cool season for, oh, fifteen year. Same stool, same Leo, same seat for the football. This " +
          "year, no Gordon.” A flicker of something under the calm. “Nobody call, nobody " +
          "write. On the quiet side we do not make a drama — but we do not just forget a man, " +
          "either.” She nods toward the beach. “Auntie Nok on the sand hears everything " +
          "before I do. Ask her about the regular who stopped coming, then tell me. I would like to " +
          "know how to think about it.”",
        short: "“An old regular, Gordon — fifteen seasons, then this year nothing. Ask Auntie Nok about the regular who stopped coming, then tell me.”" },
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
    look: "Thai ladyboy of forty, six feet in heels, sharp cheekbones, sleek dark gown, total poise.",
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
    look: "Thai woman of fifty-five, brisk, short practical hair, reading glasses, phone in each hand.",
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
  // Bill answers a question Wimon's dialogue asked and never resolved: she draws a
  // line between her side of the Samson business and "the quiet clubs, different
  // manager". This is that manager. Three rooms on a bars[] rotation, so the
  // Doghouse reads as the brothers' expansion off the Thappraya strip rather than
  // a fourth identical box.
  bill: {
    name: "Bill", emoji: "🎩", personality: "dry",
    look: "Thirty-odd Englishman, short brown hair, pressed white short-sleeve shirt, cuffs turned once, clean-shaven.",
    pronoun: "he",
    room: "doghouse", bars: ["the_boardroom", "velvet_club", "doghouse"],
    manager: true, // hired help, like Bert — NOT in NPC_ROLES, so lady-logic ignores him
    // His own house-shot pool (see _MGR_SHOT / _managerWelcome). The generic
    // lines say "bud", which is fine from Bert and Bob and impossible from a
    // thirty-year-old Englishman running a cold room properly.
    shot: [
      "{n} puts a shot in front of you, square in the middle of a fresh mat. “House does " +
        "the first one. It's not a compliment, everyone gets it.” The smile says it is " +
        "slightly a compliment.",
      "“Right.” A shot appears, poured with the care of a man who counts stock. “That one's " +
        "the house. Chok dee. Mind the cold — it creeps up on people and then the stairs " +
        "happen.”",
      "{n} pours, slides, and does not drink his own. “First is on me. I'd join you but " +
        "I've two more rooms to be blamed for tonight.”",
      "The shot arrives before you've settled. “Welcome to the Doghouse,” says {n}, entirely " +
        "deadpan. “Which I'd like on record was named before I got here.”",
      "“Go on then.” {n} sets one down and steps back to survey the room out of habit. " +
        "“House pours the first. Anything after that and we're doing business.”",
    ],
    desc: "Thirty-odd, English, in a pressed short-sleeve shirt with the cuffs turned once — " +
      "younger than everyone he manages and entirely unbothered by it. He runs the Samson " +
      "brothers' three quiet clubs on a rota, which means he is here one night in three " +
      "and knows exactly what happened on the other two. Watches the room the way a man " +
      "watches a kettle.",
    dialogue: [
      { text: "\"Evening.\" A nod, and a beer mat placed in front of you before you have " +
          "decided anything. \"Bill. I run this one, and the two on Thappraya, which is " +
          "why I look tired.\" The smile is quick and real. \"Cold in here, isn't it. " +
          "That's deliberate. Nobody will bother you until you want bothering.\"" },
      { topic: "will", text: "\"Bill.\" Pleasant, immediate, and with the flatness of a " +
          "man who has said it four thousand times. \"Not Will. Bill.\" He lets that sit " +
          "for exactly one beat, then the smile comes back. \"My father was a Will. We " +
          "did not get on. What are you drinking?\"",
        short: "\"Bill,\" he says, without looking up. \"Still Bill.\"" },
      { topic: "samson", text: "\"The brothers own it, I run it.\" He squares a mat that " +
          "did not need squaring. \"Best owners I've had, and I've had some. They pay on " +
          "the day, they fix what I tell them is broken, and they have never once asked " +
          "me to do something I'd have to think about afterwards.\" A shrug. \"You hear " +
          "things about owners out here. I hear them too. Not these.\"" },
      { topic: "doghouse", text: "\"This one's the newest, and it's mine from the paint " +
          "up.\" A flicker of something that isn't quite pride. \"Basement of a villa. No " +
          "windows — which sounds grim until you understand nobody who comes up this hill " +
          "wants a window. Half my regulars live within a kilometre. The other half drive " +
          "past three closer bars to get here.\"",
        short: "\"Newest of the three, and the only one I got to build. No windows, by design.\"" },
      { topic: "succubus", text: "\"Bob's place.\" No edge at all. \"People expect me to " +
          "be rude about it and I'm not going to be. He was up here twenty years before " +
          "the brothers had a baht, he built it himself, and his missus runs a better " +
          "floor than mine.\" He considers. \"Different trade, really. They get the ones " +
          "who want to talk. I get the ones who don't.\"" },
      { topic: "ice", chip: false, sets: ["knowIceMan"],
        text: "\"Ice.\" Bill puts down the mat he was squaring, because this is a real " +
          "question. \"Right. Boonchu — old boy, ancient pickup, been running ice up this " +
          "hill since before any of us. He's stopped doing the singles. Not sulking, " +
          "nothing happened. He's seventy-one and the hill's killing the truck, so he " +
          "keeps the runs that are worth the diesel.\" A shrug that is not indifference. " +
          "\"We're on a standing order — two drops a week for the three rooms, invoiced " +
          "to the brothers. That's worth his while. Two cases for a front room on the " +
          "corner isn't, and he'd never say so to Bob's face, so he just... stopped " +
          "coming. Bob'll have worked out something worse than that by now.\"",
        short: "\"Boonchu, seventy-one, dying truck. He kept the runs worth the diesel and dropped the singles.\"" },
      { topic: "order", chip: false, req: ["knowIceMan"],
        text: "\"I can fix it this afternoon,\" Bill says, and then does not immediately " +
          "fix it. \"Two more cases on our standing order. Boonchu's already coming up, " +
          "it's the same stop, and on the invoice it's a rounding error the brothers will " +
          "never look at twice.\" He turns the glass in his hand. \"Here's my problem. If " +
          "I walk over and offer it, I'm not a neighbour any more — I'm the Samson " +
          "brothers doing Bob a favour, and Bob has been thirty years not owing anybody. " +
          "He'd say no, politely, and then we'd both have to live across a road from " +
          "having had that conversation.\" He looks at you properly. \"You, though. You " +
          "could have had the idea yourself. Say it to him like it's yours.\"",
        short: "\"Two cases on our order. Same stop, same truck. Say it to him like it's your idea.\"" },
      { topic: "boonchu", text: "\"Boonchu's fine. Everybody worries about Boonchu and " +
          "Boonchu is fine.\" A dry look. \"He's got four sons and a house in Nong Prue. " +
          "He drives the ice because sitting down bores him.\"" },
      { topic: "girls", text: "\"They're staff, and I treat them like staff — rota, wages, " +
          "somebody covers you if your kid's ill.\" He says it like it's dull, which is " +
          "the point. \"You'll find nobody here works a room hard. If a lady sits with " +
          "you it's because she chose your table over the other eleven, and I'd take that " +
          "as the compliment it is.\"" },
      { text: "\"Mm.\" Bill glances at the door, then back. \"Ask me a proper question " +
          "and I'll give you a proper answer.\"" },
    ],
  },
  // Bob came out on R&R and never really left — which is not backstory, it is
  // literally why the town exists. Vietnam ended in 1975, so he cannot be younger
  // than his mid-seventies; he is 76 and the arithmetic has to keep working.
  bob: {
    name: "Bob", emoji: "🎖️", personality: "warm",
    look: "American man of seventy-six, bald with white at the sides, moustache, reading glasses pushed up, green collared shirt.",
    pronoun: "he",
    room: "succubus",
    manager: true, // owner-operator, but the same mechanic: he is staff, not a lady
    desc: "Seventy-six, American, behind his own bar on a stool worn to the shape of him. " +
      "Reading glasses pushed up, a coffee going cold next to a beer he is not drinking, " +
      "and forearms that were clearly once something. He first saw this coast in 1971, " +
      "on seven days' leave, when it was a fishing village with a few huts rented to " +
      "servicemen. He has been back more or less ever since.",
    dialogue: [
      { text: "\"Well, hello.\" Bob puts the glasses down and comes off the stool to shake " +
          "your hand, which nobody in this town does. \"Bob. This is mine and hers, mostly " +
          "hers. Sit up here if you want company or over there if you don't — both are " +
          "fine and neither one offends me.\" He is already reaching for a glass." },
      { topic: "kinnaree", text: "\"That's my wife.\" He says it the way other men say " +
          "their own name. \"Thirty-one years in March. She runs the floor, she runs the " +
          "money, and she runs me — in that order and on merit.\" He glances across the " +
          "room and doesn't hurry the glance. \"Bar's named for her. She thinks that's " +
          "vulgar. She's probably right.\"" },
      { topic: "vietnam", text: "A small nod, unsurprised — he has the look of a man who " +
          "gets asked. \"Seventy-one and seventy-two. I was a mechanic; I fixed things " +
          "that other people broke, and I was luckier than a lot of better men.\" That is " +
          "the whole of it, delivered evenly, and he moves on without being asked to. " +
          "\"Came here on R&R. Seven days. Sand, a few huts, one bar with a generator.\" " +
          "He looks at his own room. \"You are standing in what that turned into.\"",
        short: "\"Seventy-one and seventy-two, mechanic, luckier than better men. Came here on leave.\"" },
      { topic: "ice", text: "\"Ah.\" Bob looks at the cool box like it has let him down " +
          "personally. \"Boonchu stopped coming. Three weeks. No call, no note.\" He says " +
          "it lightly and it is not light. \"Now I'm buying bags off the 7-Eleven at the " +
          "bottom of the hill, two at a time, in a taxi, like a man having a party.\" A " +
          "beat. \"Thirty years he came up that hill. I keep thinking I did something.\"",
        short: "\"Still no Boonchu. Still buying bags off the 7-Eleven like a man having a party.\"" },
      { topic: "order", chip: false, req: ["knowIceMan"], sets: ["iceSettled"],
        fx: (st, G) => { _align("samson", 1); _align("indie", 1); },
        text: "You put it to him — two cases, same truck, same stop, nothing to sign. " +
          "Bob is quiet for long enough that you wonder. \"...That's yours, is it.\" It is " +
          "not really a question, and he does not push it. He looks across the road at a " +
          "basement with no windows in it, and something in his face settles.\n\n" +
          "\"Tell the young man,\" he says at last, \"that I said thank you, and that I " +
          "know exactly whose idea it was.\" He puts a glass down in front of you and " +
          "fills it without being asked. \"Thirty years I have not owed anybody on this " +
          "hill. Turns out I minded that more than I thought, and I minded it in the " +
          "wrong direction.\" Kinnaree, across the room, does not look up, and is " +
          "smiling.",
        short: "\"The ice is sorted. Tell the young man thank you, and that I know whose idea it was.\"" },
      { topic: "photograph", chip: false, req: ["iceSettled"], notFlags: ["photoBetSettled"],
        when: (st, G) => !(G.visited && G.visited.bali_hai),
        text: "Bob reaches behind the bar and takes down a frame — the coast in 1971, " +
          "grey water and a lot of nothing, and at the edge one low building with a pole " +
          "beside it. \"That's the bar with the generator. Only building for a mile.\" He " +
          "sets it on the counter. \"Thirty years she's told me it's where the pier " +
          "office is now, and thirty years I've said no, it's further round.\" He taps " +
          "the glass. \"Go and stand down at Bali Hai and LOOK at it. Then come back and " +
          "tell me which of us has been right since 1996.\"" },
      { topic: "photograph", chip: false, req: ["iceSettled"], sets: ["photoBetSettled"],
        when: (st, G) => !!(G.visited && G.visited.bali_hai),
        text: "You tell him what is down there: the pier, the boat ramp, a concrete apron " +
          "and the songthaew rank — and that whatever was in the photograph is under one " +
          "of them, because there is nothing left standing on that whole curve of the bay.\n\n" +
          "Bob takes this in, nods slowly, and calls across the room in the flat voice of " +
          "a man conceding a point on a technicality: \"Neither of us.\"\n\n" +
          "\"NEITHER of us,\" Kinnaree agrees, from the till, delighted. \"Thirty year, " +
          "and it is a car park.\" Bob puts the frame back on its nail, straightens it, " +
          "and looks at it a moment longer than he needs to. \"Best bar I ever drank in,\" " +
          "he says. \"Warm beer, sand floor, one fan. You'd have hated it.\"",
        short: "\"Neither of us,\" Bob says, and puts the frame back on its nail." },
      { topic: "boonchu", text: "\"The ice man. Thirty years.\" Bob shakes his head. " +
          "\"Never once been in for a drink. I've asked. He says he's working.\"" },
      { topic: "pattaya", text: "\"I've watched it four times over.\" He counts it off " +
          "without drama. \"Fishing village. R&R town. Then the boom, and everybody who " +
          "could pour a beer got rich. Now this — the money's bigger and it belongs to " +
          "further away.\" He shrugs. \"People tell me it's ruined. They've been telling " +
          "me that since 1974. It just keeps being somewhere people come.\"" },
      { topic: "succubus", text: "\"Built it in ninety-six, on the wrong side of the hill, " +
          "which everyone told me was the mistake.\" A dry look. \"Turns out discretion " +
          "has an address. We don't chase anybody, we don't run a tab you didn't agree " +
          "to, and the price on the board is the price. Thirty years of that and you " +
          "don't need a barker.\"" },
      { topic: "bill", text: "\"The young Englishman up the road? He's all right.\" Genuine, " +
          "and slightly amused. \"Came over the first week to introduce himself, which he " +
          "did not have to do. Ran a tight room from day one.\" A beat. \"Don't call him " +
          "Will. I did it once. Learned something about the English.\"" },
      { topic: "doghouse", text: "\"Company money, and it shows — you could do surgery in " +
          "there.\" No resentment in it. \"They'll take some of my trade and they're " +
          "welcome to it. There's a kind of fella who wants a basement with no clocks, " +
          "and a kind who wants somebody to remember his name. Not usually the same " +
          "fella.\"" },
      { text: "Bob turns his coffee cup a quarter-turn and waits, entirely content to. " +
          "\"Go on.\"" },
    ],
  },
  kinnaree: {
    name: "Kinnaree", emoji: "👑",
    look: "Thai woman in her fifties, hair up in a bun, reading glasses on a beaded chain, dark blue blouse.",
    room: "succubus",
    desc: "The mamasan, and the owner's wife, and by a distance the most organised person " +
      "in the building — fifties, hair up, reading glasses on a chain, a till roll in one " +
      "hand. She named nothing after herself; her husband did that, and she has been " +
      "quietly embarrassed about it since 1996. Runs a floor where nothing is ever " +
      "explained twice.",
    dialogue: [
      { text: "\"Sawatdee kha.\" A small precise wai, and she is already reading you the " +
          "way she reads the till roll. \"You sit where you like. Somebody come to you — " +
          "nobody bother you before that, na. That is the rule here.\" A brief, real " +
          "smile. \"My husband will talk your ear off. That is also the rule.\"" },
      { topic: "bob", text: "\"He is a good man and a terrible businessman, so I do the " +
          "money.\" Fond and completely unsentimental. \"Thirty-one year. He never learn " +
          "Thai past the menu, he never remember which girl is which, but every one of " +
          "them come to him when something is wrong at home.\" She shrugs. \"So. He is " +
          "good at the part I am not.\"" },
      { topic: "succubus", text: "\"He name it, not me.\" A look that has been giving that " +
          "look for thirty years. \"I say — Bob, this is a demon that come in the night " +
          "and take everything from a man. He say, yes, exactly, that is the joke.\" A " +
          "very small laugh. \"Farang humour. Anyway, the sign is expensive. It stays.\"",
        short: "\"He name it, not me. The sign is expensive, so it stays.\"" },
      { topic: "photograph", text: "\"The old picture?\" Kinnaree does not look up from " +
          "the till, but her mouth moves. \"It is where the pier office is. I have said " +
          "this for thirty year. He say no, further round.\" The pen keeps moving. \"He " +
          "is wrong, and one day somebody go and look, and then I have thirty year of " +
          "being right all at once.\"" },
      { topic: "ice", text: "\"Aiyo, the ice.\" A short unimpressed breath. \"He take a " +
          "TAXI to the 7-Eleven. Seventy-six year old, two bag of ice, in a taxi.\" She " +
          "puts the pen down, which is serious. \"He will not ask the boy across the " +
          "road. Farang men, na. Everything is a mountain.\"" },
      { topic: "girls", text: "\"Every girl here I know — the family, the trouble, who is " +
          "sending how much home.\" Businesslike, no warmth lost in it. " +
          "\"Here, nobody push. A lady sit with you because she want the company or she " +
          "want the drink, and either one is honest. If somebody push you, you tell me " +
          "and she is not here next week.\"" },
      { topic: "doghouse", text: "\"New. Very cold, very dark, very...\" she searches for " +
          "the word and picks a careful one \"...professional.\" A pause. \"The English " +
          "boy come and introduce himself, and bring flowers for me, which is correct and " +
          "which nobody teach him. So — they are fine. Competition is fine. Twenty year " +
          "we have this hill to ourself and honestly it was a little boring.\"" },
      { text: "\"Mm?\" Kinnaree does not stop counting. \"Ask me the real one, na.\"" },
    ],
  },
  ampai: {
    name: "Ampai", th: "อำไพ", emoji: "👑",
    room: "the_boardroom", bars: ["the_boardroom", "velvet_club"],
    look: "Thai woman of fifty, silk blouse, understated gold, hair immaculate, very still and calm.",
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
    look: "Thai woman of twenty-seven, watchful eyes, glossy dark hair, stage bikini, measuring smile.",
    desc: "A dancer who watches the room the way the mamasan does — the best English on the stage and a " +
      "calculator behind her eyes. She smiles like she has already worked out your monthly salary and " +
      "rounded it down.",
    dialogue: [
      // KNOWING why the debt exists is the strongest lever in the game and costs
      // no baht: Nira does business with the truth, and a debt taken for a
      // dying woman prices differently to a debt taken for a good time.
      { topic: "debt", chip: false,
        when: (st, G) => _flag("debtTruth") && !_flag("debtSettled"),
        sets: ["debtSettled"],
        text: "\u201cThe driver's cousin.\u201d The calculator behind her eyes does not move. Then you " +
          "say the name Pim, and it does. \u201cAh.\u201d She sets the glass down. \u201cShe come to " +
          "me in the cousin's name. I did not ask why \u2014 not my business, and she pay every month " +
          "until she cannot.\u201d A long look at nothing. \u201cFor a mother, and she let the boy " +
          "think it is savings.\u201d She takes a breath and writes something small in the book. " +
          "\u201cIt is closed. Tell nobody I do this, or every farang in Pattaya want a dying " +
          "mother.\u201d",
        short: "\u201cIt is closed. Tell nobody, na.\u201d" },
      // Standing, not cash. She trades on being known to deal fairly, so a man
      // the soi speaks well of can spend that instead of money.
      { topic: "debt", chip: false,
        when: (st, G) => !_flag("debtSettled") && _repTier() >= 1,
        sets: ["debtSettled"],
        text: "\u201cYou come for the driver.\u201d She looks at you for a while, and what she is " +
          "reading is not your wallet. \u201cPeople talk about you, you know this? Bar ladies talk " +
          "more than anybody and they say you are\u2014\u201d she picks the word carefully " +
          "\u201c\u2014not trouble.\u201d She turns a page. \u201cSo. I move it to your name, no " +
          "interest, pay when you pay. And if you never pay, then I know something about you also, " +
          "and that is worth twelve thousand to me too.\u201d The smile arrives. \u201cGood " +
          "business either way.\u201d",
        short: "\u201cYour name, no interest. Good business either way.\u201d" },
      // Cash. The dull answer, and the only one available to a stranger.
      { topic: "debt", chip: false,
        when: (st, G) => !_flag("debtSettled") && G.money >= TAXI_DEBT,
        sets: ["debtSettled"],
        fx: (st, G) => { G.money -= TAXI_DEBT; },
        text: "\u201cTwelve thousand.\u201d No preamble, no discount, and no interest in why you are " +
          "asking. She counts it twice because she counts everything twice, then draws one line " +
          "through one name in a book that has a great many names in it. \u201cFinish. Tell the " +
          "driver his cousin is lucky in his friends.\u201d She is already looking past you at the " +
          "door. \u201cYou want to borrow, you know where I sit.\u201d",
        short: "\u201cFinish. Twelve thousand.\u201d" },
      { topic: "debt", chip: false, when: (st, G) => !_flag("debtSettled"),
        text: "\u201cTwelve thousand,\u201d she says, and waits, and the waiting is the whole " +
          "sentence. When nothing lands on the bar she goes back to her book. \u201cCome back with " +
          "it, or come back with something else. I am not in a hurry \u2014 it grows while I sit " +
          "here.\u201d",
        short: "\u201cTwelve thousand. It grows while I sit here.\u201d" },
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
    name: "Miss Mala", th: "มาลา", emoji: "🦚", ladyboy: true, personality: "charmer",
    room: "peacock_cabaret",
    look: "Thai ladyboy of fifty, enormous feathered headdress, heavy stage make-up, sequinned gown.",
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
      // The regulars' cut — she raised half this stage, and "raised" is not a figure of speech.
      { topic: "girls", bond: 2,
        text: "\"My girls?\" The compère voice steps down to something room-temperature. \"Petch you " +
          "know. {{Gaew}} came to me at seventeen with a sports bag and a black eye and I did not ask " +
          "which she minded more. 'Raise' is the right word, tilac — I do the paperwork, I watch the doses, I " +
          "know which boyfriends get tea and which get the door. Twice a year I stand at a temple in " +
          "somebody's home village and I am introduced as 'her manager from Pattaya,' and the mother and " +
          "I look at each other, and we both know, and we drink the tea.\" She resets the headdress a " +
          "degree. \"Twenty years. My little theatre of daughters.\"",
        short: "\"'Raise' is the right word — paperwork, doses, which boyfriends get tea and which get the door. Twenty years. My theatre of daughters.\"" },
      { topic: "name", bond: 3,
        text: "\"My name.\" She looks at you a long moment, deciding — then the headdress comes off, " +
          "onto the table between you, feathers still nodding. \"A boy from Chanthaburi had a name; his " +
          "father was a gem cutter and wanted a gem cutter. I was eleven when I heard 'Mala' in a lakhon " +
          "on the television and I thought: there. That is the one that fits. It took the rest of them " +
          "thirty years to catch up to what I knew at eleven.\" She puts the headdress back on, and Miss " +
          "Mala reassembles around her like a curtain rising. \"His father cut stones. I cut a self. " +
          "Same trade, tilac — you take away everything that is not the jewel.\"",
        short: "\"His father cut stones. I cut a self. Same trade — you take away everything that is not the jewel.\"" },
    ],
  },
  petch: {
    name: "Petch", th: "เพชร", emoji: "💎", ladyboy: true, personality: "joker",
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
      // Under the ambition (bond first — the deeper cut outranks the public version)
      { topic: "dream", bond: 2,
        text: "\"You want the true version?\" Petch checks the room the way you check a mirror — fast, " +
          "professional — and sits closer. \"A scout DID come. Two years ago, from Tiffany's. He watched " +
          "the whole show and he took Ploynapas.\" A beat, perfectly held; she is, after all, a performer. " +
          "\"I cried one night. ONE. Then I learned her closing number better than she does it, and now " +
          "when the scout comes back — and he will — the girl he passed on is not here anymore. I ate " +
          "her.\" The grin comes up, all cheekbones. \"That is the dream, na. Not the stage. Being the " +
          "one they cannot pass twice.\"",
        short: "\"A scout came. He took Ploynapas. I cried one night — ONE — then I learned her number better than her. Nobody passes me twice.\"" },
      { topic: "dream", text: "\"Alcazar. Tiffany's. The big Pattaya stages, thousand seats, tour buses, " +
          "real money.\" Her eyes go somewhere bright. \"I am saving — the dancing they teach you, the " +
          "face they don't. One day a scout sits where you sit now, and I am ready. Until then, I am the " +
          "biggest star in the smallest room, and that is not nothing.\"" },
      { topic: "family", bond: 3,
        text: "\"Buriram.\" She says the province like a stone she has carried so long it is smooth. " +
          "\"You think they don't know? My mother sold a gold chain for my first costume. She rehearsed " +
          "my wai with me before my first Loy Krathong on this stage — over video call, both of us " +
          "laughing.\" She turns her phone so you can see the wallpaper: an older woman, a temple, a " +
          "girl in sequins between them. \"The money goes home like every girl in this town, but MY " +
          "mother tells the neighbours what I am. Dancer. Star. Her word is 'star.'\" She pockets her " +
          "phone before the room can see her face do what it is doing. \"So the face I am saving for is " +
          "not so I can be somebody else, na. It is so the neighbours see what my mother already sees.\"",
        short: "\"My mother sold a gold chain for my first costume. Her word for me is 'star.' The face is so the neighbours see what she already sees.\"" },
      { topic: "tips", text: "\"Tip? Ohh you are learning fast.\" She pats your hand. \"Fold it long, " +
          "hold it up, I do the rest and make you look like a hero doing it. Miss Mala takes her cut, " +
          "of course — she takes everybody's cut, she raised half of us — but the cheer is all yours.\" " +
          "(TIP PETCH <amount>.)" },
    ],
  },

  nott: {
    name: "Nott", th: "นนท์", emoji: "🕴️",
    pronoun: "he",
    room: "adonis_club",
    look: "Thai man of forty-five, immaculate, silk shirt open at the collar, groomed, easy smile.",
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
    pronoun: "he",
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
    pronoun: "he",
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
      { topic: "debt", chip: false, when: (st, G) => !_flag("debtTruth"),
        sets: ["debtTruth"],
        text: "\u201cHis cousin.\u201d She says it flatly, polishing a glass that is already dry, and " +
          "five years of knowing everybody's everything arrives in her face all at once. \u201cOkay. " +
          "You are going to know anyway, you are that kind.\u201d She puts the glass down. \u201cThe " +
          "cousin is a name. I borrow it \u2014 his name, Nira's money \u2014 two year ago, for " +
          "Bank's mother. The hospital want it that week or they do not do the operation that week.\u201d " +
          "A small shrug that costs her something. \u201cI tell Bank it is my savings. He believe me " +
          "because he want to.\u201d She looks straight at you for the first time. \u201cIf you fix " +
          "it, fix it. But he does not need to carry this one as well.\u201d",
        short: "\u201cThe cousin is a name. The money was for his mother.\u201d" },
      { req: ["hasHelmet"], notFlags: ["helmetDelivered"], th: "อ้าว", rom: "aow",
        text: "\"My helmet! That man—\" she softens for exactly one frame \"—okay, Bank is sweet. Sometimes.\" She spins the helmet onto the back shelf. \"You did him a favour, so: one answer free. Choose the question well, darling.\"",
        sets: ["helmetDelivered"],
        short: "\"You did Bank a favour, so — one free answer. Choose well, darling.\"" },
      { topic: "oy", req: ["helmetDelivered"], notFlags: ["pinPart9"],
        text: "\"Madam Oy runs everything you can see from this stool. Lucky number? เก้า — nine. Nine candles at her shrine, ninth of the month she pays wages, table nine reserved forever.\" Pim taps the bar. \"Whatever lock she owns, there's a nine in it. That was your free answer, darling.\"",
        sets: ["pinPart9"],
        short: "\"Whatever lock Oy owns has a nine — เก้า — in it. That was your free answer.\"" },
      { topic: "oy", notFlags: ["helmetDelivered"],
        text: "\"Madam Oy? Mmm. Information about the Mamasan is premium shelf, darling.\" She taps the lady-drink menu meaningfully: ฿" + LADY_DRINK + "." },
      // The Safe-Cracker quest (docs/map-coverage.md): the whispers Oy sends you for.
      // Ungated + chip:false — it reads as quest-directed (nobody asks about "the
      // whispers" cold), and setting the flag early is harmless (it does nothing
      // until Oy's completion node and an active quest both agree).
      { topic: "whispers", sets: ["heardWhispers"], chip: false,
        text: "\"The whispers.\" She stops polishing the glass, which from Pim is a full stop. \"For Oy, or for yourself? For Oy.\" A dry look. \"Somebody has been buying up the girls' debts. Quiet, cash, no name on it. And a girl who owes the wrong person does not work for the bar any more — she works for whoever holds the paper, and she just happens to stand behind the bar.\" She sets the glass down. \"Tell Oy it is new money, not an old face. Tell her to watch the ones who pay off a girl's debt like it is a kindness. That is the whisper, darling. Mind how you carry it.\"",
        short: "\"Somebody's quietly buying up the girls' debts — new money, no name. Tell Oy to watch the ones paying debts off like a kindness.\"" },
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
    pronoun: "he",
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
    pronoun: "they",
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
      // The Safe-Cracker quest (docs/map-coverage.md): completion node first (req the
      // intel), then the directions node — same first-match-wins ordering as the
      // wallet pair above. chip:false so the quest, not a dangling chip, drives it.
      { topic: "offer", req: ["heardWhispers"], sets: ["oyJobDone"], chip: false,
        text: "\"So.\" She does not ask whether Pim talked; Pim always talks to the right person. You tell her — the quiet money, the bought debts, the girls who will do what they are told. Oy listens without a flicker, which is worse than any reaction. \"New money. Not old faces.\" She repeats it like a note to herself, then a banknote is in your hand before you saw it move. \"You did a thing for me and told me the truth about it. That is rarer up here than you would think. Go. If I need the farang who opens things again, I will find you — I found you the first time.\"",
        short: "Oy takes the whisper without a flicker. \"New money, not old faces.\" She pays, and files you away for later." },
      { topic: "offer", chip: false,
        text: "\"A job.\" It is not a question and not quite an offer; it is a fact she is allowing you to be useful to. \"Somebody has my girls in a mood, and a girl in a mood counts wrong and smiles late and costs me money. The maze tells things to Pim before it tells me — five years at the Starlight, misses nothing. Ask her what the whispers are, then bring them back here.\" A beat, and something that on another face would be a smile. \"You are good at getting into places you should not be. So. Get into this one.\"",
        short: "\"Ask Pim at the Starlight what the whispers are, then bring them back to me. You're good at getting into places.\"" },
      { th: "เชิญค่ะ", rom: "choen kha",
        text: "\"Welcome to Rainbow Girls.\" Four words, and somehow you feel both invited and inventoried. \"Drink, or business?\"",
        short: "\"Drink, or business?\"" },
      { topic: "isaan", req: ["waiedOy"],
        text: "Something crosses her face too quick to name. \"Roi Et province. Rice, buffalo, one road.\" A pause. \"Everyone on this soi is from somewhere like it. Remember that when you count your change, na.\"" },
    ],
  },

  daeng: {
    name: "Daeng", th: "แดง", emoji: "🌶️", personality: "blunt",
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
    
      // ── bar-owning chain, step 1: premises ──────────────────────────────
      {
        // NOT part of the bar chain: the Shamrock is out on the Darkside, where
        // neither WDG nor the Samsons have any reason to care. Planted here as a
        // second-bar hook once you already run one — the pressure out this way
        // would come from local Thai interests, which is its own arc.
        topic: "shamrock", chip: false,
        req: ["expatLife", "barOpen"], sets: ["seanStory"],
        text: "\"So. You have a bar now.\" Daeng says it to the till, not to you, " +
          "and there is no particular warmth in it — but she says it, which from " +
          "Daeng is a toast.\n\n\"Then I tell you something, for later.\" She " +
          "nods up the soi, past the tin roof, to the dark shape at the end with " +
          "no lights in it. \"The Shamrock. Irish man, Sean. Good bar, twelve " +
          "year. Then he go home for operation and not come back, and the family " +
          "in Ireland don't want a bar in Thailand, so it just… sit there.\" A " +
          "shrug that has watched a lot of bars sit there. \"Land is Khun Rattana, " +
          "three shophouse, never sell. Rent is nothing because dead bar make money " +
          "for nobody.\"\n\nShe closes the drawer.\n\n\"Out here is not town, " +
          "na. Nobody from Soi 6 care what happen on Khao Talo — is good and is " +
          "bad. Different people to keep happy.\" She looks at you for the first " +
          "time. \"When your bar is standing by itself, come ask me again. Not " +
          "before. One bar is already more than most farang can hold.\"",
        short: "\"The Shamrock, up the soi. Land is Khun Rattana. Ask me again when your bar stands by itself.\"",
      },
    ],
  },

  somchith: {
    name: "Somchith", th: "สมชิต", emoji: "🔑",
    pronoun: "he",
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

  // ── The White Rabbit (Naklua) — Fast Eddy and his Lao family ──────────────────
  // Design + canon: docs/rabbit-arc.md. Two keystones: everyone here is a White
  // Dish castoff, and the staff are one Laotian family (Nuan the matriarch). Rabbit
  // owns the bar on paper; Nuan actually runs it and is a phone call from removing
  // him. Tier 0 = characters + seeded threads as foreshadowing; the mechanics
  // (the romance vector, Nuan's leverage/pay-rise, the Ampha reveal, the heist)
  // are deferred. No node here promises a verb the game doesn't yet deliver.
  fast_eddy: {
    name: "Fast Eddy", emoji: "🕶️", manager: true, pronoun: "he",
    room: "white_rabbit",
    look: "American man, fifties, overweight, bald but for a thin grey rat-tail, gold hoop earring, wraparound shades pushed up, black tee.",
    desc: "The owner, and he will have told you so inside a minute. American, the wrong " +
      "side of fifty and of two hundred pounds, in a black tee that has given up. Bald — " +
      "except for a thin grey rat-tail that grows, you look twice to be sure, out of a " +
      "tattooed socket inked at the nape, so that his one concession to hair is also, in " +
      "his own mind, a cable he is jacked into. A gold hoop in one ear aiming for pirate " +
      "and landing nearer uncle; wraparound shades parked on a scalp that lost its " +
      "argument with the sun years ago; nose hair he has made his peace with. Everything " +
      "about him is a man who was, once, briefly, exactly as sharp as he still thinks he " +
      "is — and who has lately begun to suspect it.",
    shot: [
      "Fast Eddy sets a shot in front of you and a soda water in front of himself. “House " +
        "pours the first one, friend — that's the rule. I don't, these days. You go ahead.” " +
        "The lime in his glass is the only thing in it doing any work.",
      "A shot lands that you didn't order. Eddy clinks it with a can of Coke Zero and does " +
        "not drink. “First one's on the Rabbit. I'm a year off the stuff — don't ask — but " +
        "don't let me slow you down. Chok dee.”",
      "“New face.” Eddy pushes a shot over with two fingers and lifts his own glass of plain " +
        "soda a polite inch. “On me. I stay dry now. You don't have to.” He watches, just a " +
        "beat, to see whether you clock that his glass isn't playing.",
      "Eddy pours you one and himself nothing. “Owner's privilege — first drink's free. " +
        "Mine's the soda; I had my share and about four other people's.” The grin says it's " +
        "fine. The care he takes not to look at your glass says it mostly is.",
    ],
    dialogue: [
      { text: "“Fast Eddy.” He says it like it should land, and waits half a beat to see if " +
          "it does. “My place — the White Rabbit. You get it? Down the hole, other side of " +
          "the glass.” He taps the painted rabbit without looking at it. “Coldest, cheapest " +
          "beer in Naklua, and I don't ask a man why he's up here instead of down there. Sit. " +
          "Tell me nothing. I love that.”",
        short: "“Fast Eddy. My place. Sit, tell me nothing — I love that.”" },
      { topic: "vegas", text: "“Vegas, oh-six. Coffee shop off the Strip.” He settles in; this " +
          "is the one he likes. “Some whale leaves his laptop open — wallet file just sitting " +
          "there, forty grand in coin nobody's watching yet. I tumbled it through three " +
          "exchanges before his latte went cold. Cashed out clean, walked away from a " +
          "government paycheck, bought a bar and a whole new life.” The grin holds a second " +
          "too long. “Smartest thing I ever did. Everybody keeps telling me it was luck. " +
          "Everybody can get bent.”",
        short: "“Vegas oh-six — a wallet somebody left open. Best thing I ever did. Luck, they say. Bent, I say.”" },
      { topic: "wdg", text: "“White Dish.” The warmth goes out of it. “I had a bar on Soi 6 — a " +
          "good one, mine, paid for in Vegas money. Then the suit shows up, all handshakes and " +
          "PowerPoint, and somehow the rent's a problem, the license is a problem, the girls " +
          "get walked across the road one by one, and I'm selling at forty cents on the dollar " +
          "to the only buyer left. Which was them.” He turns his soda glass a slow quarter. " +
          "“Ryan Powers. Never raised his voice at me once. Didn't have to. One day somebody's " +
          "going to open that whole operation up like a cheap padlock, and I would give a great " +
          "deal to be in the room.”",
        short: "“White Dish took my Soi 6 bar at forty cents. Powers never raised his voice. Someone'll crack them open one day — I want to watch.”" },
      { topic: "rabbit", text: "“The bar? Down-the-hole, through-the-glass, all that. Cute, " +
          "right.” A pause; he decides how much to hand you. “Used to be a handle, if you go " +
          "back far enough. Long time since anybody said it to my face and meant me.” He does " +
          "not say it. “Leave it in the tunnel where it lives.”",
        short: "“It was a handle once. Long time since anybody meant me by it.”" },
      { topic: "sober", text: "“Year and a bit. In a bar. I know.” He turns the soda without " +
          "drinking it. “Something happened — no, you don't get that one, nobody does — and I " +
          "woke up in a version of my life I did not order. So now I pour and I don't drink and " +
          "I count the days like a man with something left to protect.” The performance drops " +
          "for exactly one sentence: “Turns out the smartest guy in the room and the drunkest " +
          "guy in the room were the same guy, and he loses.” Then it's back. “Anyway. Your " +
          "glass is empty. Mine's meant to be.”",
        short: "“Year and a bit sober. Something happened I don't hand out. Smartest guy and drunkest guy were the same guy. He lost.”" },
      { topic: "mama", text: "“Nuan runs my floor. Best mamasan in Naklua and she'll tell you I " +
          "said so.” Beat. “Hired her first, back on Soi 6, when I still thought I could tell " +
          "who to trust.” The grin thins. “We go back. She's near enough family now. You want " +
          "the bar to like you, you make Nuan like you — and lucky you, that part seems to be " +
          "handling itself.”",
        short: "“Nuan runs my floor — first girl I ever hired. Make her like you and the bar likes you. Seems handled.”" },
      { topic: "bar", text: "“The White Rabbit's mine. On paper and everything.” He says 'on " +
          "paper' like a man testing a sore tooth. “All legal, don't worry about it. Company " +
          "structure, local partner, the whole — you know how it works out here. It works. " +
          "Mostly.” He rallies. “Point is, it's mine, the beer's cold, and the crowd I pull " +
          "tips like the money's on fire. That last part keeps the lights on, so I don't ask " +
          "where the crowd's from either.”",
        short: "“Mine, on paper. Company structure, local partner — you know how it works out here. My crowd tips like it's on fire. I don't ask.”" },
    ],
  },
  nuan: {
    name: "Nuan", emoji: "👑",
    room: "white_rabbit",
    look: "Laotian woman, 42, striking, long black hair, gold at the wrist and ears, deep-red silk blouse, unhurried dark eyes.",
    desc: "The mamasan, and — you clock it inside a minute — the actual weather in the room. " +
      "Laotian, forty-two, and still the kind of beautiful that quietly reorganises a man's " +
      "evening: long black hair, gold at the wrist, a deep-red blouse and a stillness that " +
      "costs years to learn. She runs Eddy's floor the way a good editor runs a paper — " +
      "nothing happens on it she did not allow. When her eyes settle on you they stay a " +
      "half-beat past business, and she does not trouble to hide that she has decided she " +
      "likes the look of you.",
    dialogue: [
      { text: "“Welcome to the Rabbit.” She looks you over, unhurried, and whatever she " +
          "concludes she keeps. “Sit where you like. The beer is cold, the girls are kind, and " +
          "the boss” — the smallest smile — “is harmless. I am Nuan. I will remember you now.” " +
          "She says it like a fact rather than a courtesy, and she is warmer to you than two " +
          "minutes strictly earn.",
        short: "“Sit where you like. I am Nuan. I will remember you now.”" },
      { topic: "home", text: "“Lao. From Savannakhet, by the river.” She says it without the " +
          "small apology some reach for. “All of us here are Lao — me, the cashier, my two " +
          "girls. Same family, more or less; out here that is how a bar gets staffed. You do " +
          "not hire strangers when your own people need the work.” A beat. “And we needed the " +
          "work.”",
        short: "“Lao, from Savannakhet. All of us here are family — that's how a bar gets staffed out here.”" },
      { topic: "wdg", text: "“You want the sad story? We all worked Soi 6 — all of us — back " +
          "when it was still ours to work.” Her voice doesn't rise; it flattens, which is " +
          "worse. “Then the company came, the bars changed hands, and one by one the older " +
          "girls were — let go is the polite word. So we came up here, to the last bar that " +
          "would have us, and we made it work. Eddy thinks he saved us.” The smile again, " +
          "cooler. “It is kinder to let him think it.”",
        short: "“We all worked Soi 6 till the company pushed the older girls out. Eddy thinks he saved us. Kinder to let him.”" },
      { topic: "eddy", text: "“The boss.” She lets a silence sit under it. “He is not a bad " +
          "man. He is a loud man who was lucky once and has spent twenty years sure the luck " +
          "was skill. I have known him a long time — I was the first girl he hired, when he " +
          "still had the Soi 6 bar and more mouth than sense.” She squares a coaster that did " +
          "not need it. “He signs the papers. He believes that means he decides. It is not my " +
          "job to correct him, and it is very much not yours.”",
        short: "“He was lucky once and calls it skill. He signs the papers and thinks that means he decides. Don't correct him.”" },
      { topic: "likeyou", text: "“Why am I nice to you.” She considers it as though it had been " +
          "bothering her too. “I don't know yet. You have a face I have seen before, maybe — on " +
          "a better man, or a worse one.” The dark eyes hold. “Or I am forty-two on the edge of " +
          "Naklua, bored to the back teeth, and you walked in. Does the reason change what you " +
          "do about it?” She lets that sit, then moves off to the till before you can decide it " +
          "was a real question.",
        short: "“Why am I nice to you? A face I've seen on a better man. Or I'm bored on the edge of Naklua. Does the reason change what you do about it?”" },
    ],
  },
  ampha: {
    name: "Ampha", emoji: "🧾",
    room: "white_rabbit",
    look: "Laotian woman, mid-twenties, neat, hair in a low bun, plain cardigan over a bar polo, calculator and ledgers, quiet steady eyes.",
    desc: "The cashier, and everyone's favourite theory of the room: the sweet one, the " +
      "innocent one, Nuan's little cousin who counts the till and blushes at the customers. " +
      "Mid-twenties, hair in a neat bun, a cardigan over the bar polo even in the heat. She " +
      "smiles when smiled at and adds up faster than the calculator she pretends to need. It " +
      "is only later, and only if you're paying attention, that you notice her eyes finish " +
      "reading a man about four seconds before her face admits she was looking.",
    dialogue: [
      { text: "“Hello, welcome kha.” A small, real smile, quickly put away, and she's back to " +
          "her ledger. “I am Ampha — I only do the money, so I am the boring one. Auntie Nuan " +
          "looks after everything else.” She says 'boring' like a line she has found useful.",
        short: "“I am Ampha. I only do the money, the boring one. Auntie Nuan looks after the rest.”" },
      { topic: "family", text: "“Nuan is my aunt — not close aunt, but you know, family is " +
          "family, more when you are far from home.” She lines up a stack of notes and taps it " +
          "square. “She brought us all up from Soi 6 when the trouble came. Champa and Boua are " +
          "cousins also. It is nice, to work with family. Nobody steals from you.” A tiny pause " +
          "on that last word, gone before you're sure it was there.",
        short: "“Nuan is my aunt — she brought us all up from Soi 6. Champa, Boua, cousins too. Nice to work with family. Nobody steals from you.”" },
      { topic: "bar", text: "“The books?” She closes the ledger — not fast, just closed. “They " +
          "are fine. Everything is fine. Mr Eddy does not really read them, and Auntie says " +
          "that is best for his blood pressure.” The smile is perfect. “I keep them very " +
          "careful. Somebody should know where every baht is, na? In case anyone ever asks.”",
        short: "“The books are fine. Mr Eddy doesn't read them. I keep them careful — somebody should know where every baht is. In case anyone asks.”" },
    ],
  },
  champa: {
    name: "Champa", emoji: "💃",
    room: "white_rabbit",
    look: "Laotian woman, late thirties, handsome not cute, long dark hair with a frangipani behind one ear, worn red dress, knowing smile.",
    desc: "One of the two hostesses, and old enough now that the word feels generous — late " +
      "thirties, handsome rather than cute, a frangipani behind one ear because the bar is " +
      "named for a flower of sorts and somebody should mean it. She has the easy, unhurried " +
      "warmth of a woman who did her ten years on Soi 6, learned every angle, and is " +
      "genuinely relieved not to be running them any more. She names her price in drinks and " +
      "gives her opinions away.",
    dialogue: [
      { text: "“Ooh, new one. Sit, sit.” Champa pats the stool beside her like an old friend, " +
          "which by the end of one drink she will be. “I am Champa — the flower, yes, like the " +
          "bar, ha. You buy me a drink, I tell you the truth about everything. Cheaper than the " +
          "young ones and I actually talk to you.”",
        short: "“I am Champa — the flower, like the bar. Buy me a drink, I tell you the truth about everything.”" },
      { topic: "wdg", text: "“Soi 6, twelve years. I was good, too — the wall by the door, that " +
          "was me.” She says it without much weight, an old ache walked off long ago. “Then the " +
          "company bought my bar and put in girls half my age with none of my mileage, and one " +
          "day the mama just — does not put me on the schedule. No fight, no shouting. You are " +
          "simply not on the paper any more.” She shrugs, and the shrug is the whole story. " +
          "“Nuan called. Nuan always calls. That is why I am alive, and some of the other girls " +
          "from my bar are not doing so well.”",
        short: "“Twelve years on Soi 6, then the company left me off the schedule. No fight — just gone. Nuan called. Nuan always calls.”" },
      { topic: "eddy", text: "“The boss?” She laughs, not unkindly. “Oh, he is a clown. But he " +
          "is our clown, and he pays double what anyone out here pays — which is the only " +
          "reason a girl my age has a stool at all. So when he tells the big Vegas story for " +
          "the thousandth time, we all laugh in the right place.” She leans in. “He needs us " +
          "to. You did not hear that from me.”",
        short: "“A clown, but our clown, and he pays double — only reason a girl my age has a stool. So we laugh in the right places. He needs us to.”" },
    ],
  },
  boua: {
    name: "Boua", emoji: "💃",
    room: "white_rabbit",
    look: "Laotian woman, forty, quieter, hair pulled back, reading glasses on a chain, plain blouse, careful watchful hands.",
    desc: "The other hostess, and the quiet one — forty, hair pulled back, a pair of reading " +
      "glasses on a chain that she uses for her phone and her lottery numbers. Where Champa " +
      "performs, Boua watches. She did the same Soi 6 years and came out of them with less " +
      "noise and more caution, and she has the specific, unsentimental kindness of a woman " +
      "who long ago decided exactly how much of herself the job gets and keeps the rest " +
      "locked at home.",
    dialogue: [
      { text: "“Hello.” Boua looks up from her phone, takes your measure in one calm pass, and " +
          "offers a small nod rather than a performance. “I am Boua. Champa will talk your ear " +
          "off — sit with her if you want the show. Sit with me if you want it quiet.” It is " +
          "not unfriendly. It is a real choice, honestly offered.",
        short: "“I am Boua. Champa for the show, me for the quiet. Your choice.”" },
      { topic: "wdg", text: "“Soi 6, yes. A long time.” She doesn't reach for the story the way " +
          "Champa does. “When White Dish came, the smart move was to see it early and go quiet. " +
          "I saw it early.” She turns her phone face-down. “I don't hate them. Hating a company " +
          "is like hating the rain. But I remember every girl they put on the street pretending " +
          "it was her own idea, and I keep the names. Old habit. You never know when a list is " +
          "worth something.”",
        short: "“Saw White Dish coming and went quiet. I don't hate them — like hating rain. But I keep the names. You never know when a list is worth something.”" },
      { topic: "family", text: "“Nuan, Ampha, Champa, me — all Lao, all one family if you go " +
          "back far enough.” She says it plainly. “It is not sentiment. A woman alone out here " +
          "is prey. Four women who are family are a wall. Nuan understood that before the rest " +
          "of us, which is why Nuan is the mama and not me.”",
        short: "“All Lao, all family. Not sentiment — a woman alone is prey, four who are family are a wall. Nuan understood first.”" },
    ],
  },

  // ── Sao — the Bangkok weekender (the reverse-savior arc; canon essay 2026-08-15) ──
  // She IS the bkktourist encounter's woman: met outside the bars, good English
  // with a British edge, pays for her own coffee, "family business in Bangkok".
  // She exists as an NPC only so the phone works (contact, texts) — offmap:true
  // keeps her out of every room. Everything she does happens by text and in one
  // off-map scene (_bkkDinner, engine-systems.js). Expat-only, once per game.
  sao: {
    name: "Sao", th: "สาว", emoji: "🧳", pronoun: "she", offmap: true,
    room: "second_rd_c", // placeholder for the every-NPC-has-a-room invariant; never present
    look: "Thai woman of twenty-six, good sneakers, a Bangkok-boutique dress, no bar behind her.",
    desc: "The Bangkok weekender — good sneakers, a boutique dress, English with a slight " +
      "British edge, and a {{phone}} she checks against the crowd. Not working, not selling, " +
      "not from here. You met her outside the bars, which is the whole point of her.",
    dialogue: [
      { text: "She isn't here — she's a Bangkok girl, and Bangkok is a text away, not a soi " +
        "away. (MESSAGE SAO, if you have her number.)",
        short: "Not here — Bangkok. Text her." },
    ],
  },
  // ── Duangjai (The Boathouse, Mabprachan) — Nont's mother ─────────────────────
  // Roleless cashier like the Queen Vic's Thai staff (not in NPC_ROLES): a
  // respectable lakeside restaurant is deliberately NOT a hostess venue, which is
  // the whole point of where she chose to land. Ex-Soi-6, out with her dignity,
  // holds it together. Her dialogue is consistent with Nont's `family` node
  // (docs/bangkok-concept.md); ASK HER about "nont" literal-matches her son node
  // even though "nont" aliases to Nont's own identity elsewhere (literal-first).
  duangjai: {
    name: "Duangjai", emoji: "🧾", pronoun: "she",
    room: "lake_bar",
    look: "Thai woman, late forties, handsome, hair up going grey, reading glasses on a chain, neat blouse, gold at the ears.",
    desc: "The woman at the till is somewhere near fifty and carries it well — hair up and " +
      "going handsomely grey, reading glasses on a chain, a blouse ironed with real intent. " +
      "She runs the register with the unshowy precision of someone who has counted a lot of " +
      "other people's money in a lot of harder rooms, and she is unfailingly, deliberately " +
      "correct with everyone. You would never place her as anything but respectable, which is " +
      "entirely the point, and took some doing.",
    dialogue: [
      { text: "The woman at the register looks up and gives you the smooth, complete smile of " +
          "someone who has welcomed ten thousand strangers and meant it with none of them and " +
          "all of them at once. “Good evening. A table with the view? The fish tonight is very " +
          "good.” Her English is easy and precise, worn smooth somewhere she doesn't mention. " +
          "“Sit anywhere you like — the front tables have the view. I'll send someone over.”",
        short: "“Good evening. A table with the view? Sit anywhere — I'll send someone over.”" },
      { topic: "nont", sets: ["duangjaiNont"], text: "Something in her composure shifts — warmer and more guarded at " +
          "once. “You know my Nont?” A glance at the framed photo by the register, quickly " +
          "checked. “He is a good boy. Too clever for his own good, always — took every machine " +
          "in the house apart before he was ten, and he never once put the school fees to as " +
          "much use as he put a broken {{phone}}.” The smile thins. “He runs around town doing " +
          "I-don't-ask-what, and he sends me money I didn't ask for, and he thinks I don't know " +
          "where a boy like that ends up if he isn't careful.” She squares a stack of menus. " +
          "“He's careful. He had to learn young. That part I do blame myself for.”",
        short: "“My Nont? A good boy, too clever for his own good. He sends me money I didn't ask for and thinks I don't worry. He's careful — he had to learn young.”" },
      { topic: "father", text: "The temperature drops a precise degree. “Nont's father.” She " +
          "says it like a closed account. “He was here a long time, and then he was not, and he " +
          "paid for a great deal while he was and nothing at all after.” A small, level shrug. " +
          "“He bought me the house, so I have the house. He is somewhere with a different family, " +
          "or a different bar, and I wish him whatever he wishes himself.” She meets your eye, " +
          "perfectly pleasant. “That is all I have to say about Nont's father, and I have said " +
          "it more graciously than he has earned. Was there anything else?”",
        short: "“Nont's father was here, then he wasn't. He bought the house, so I have the house. That is all I have to say about him.”" },
      { topic: "job", text: "“Why here?” She considers the question as if it deserves one, which " +
          "not everyone gives it. “Because it is quiet, and it is honest, and nobody who comes to " +
          "eat fish by a lake needs anything from me but the bill.” A precise beat. “I worked in " +
          "louder places once. A long time ago, before Nont. I was good at it — which is not the " +
          "same as wanting to go back to it, and I am too old for it besides, and too proud, " +
          "which my son will tell you is my worst quality.” The smile returns, entirely composed. " +
          "“Here I count the money and I go home to my own house. That is a very good life for a " +
          "woman who started where I started. Don't let anyone tell you it isn't.”",
        short: "“Here is quiet and honest, and nobody needs anything from me but the bill. I worked louder places once. This is a good life. Don't let anyone tell you it isn't.”" },
      // ── "Look in on my boy" (quest lake_errand). The whole design constraint
      // (docs/bangkok-concept.md): a complete Pattaya quest, a mother's errand —
      // NEVER a gesture at where the boy is headed. She fears; you witness that
      // he's careful; you can't fix his trajectory; that is the honest ending.
      // ORDER MATTERS — _pickDialogue takes the first match: done → report → instructions.
      { topic: "offer", chip: false, req: ["lakeErrandDone"],
        text: "“He's well? Good.” It's all she'll ask, and she asks it every time, and you " +
          "understand that this is now a standing arrangement between you and this woman: " +
          "you are the one who has seen him. “Sit. The view's free.”",
        short: "“He's well? Good. Sit.”" },      { topic: "offer", chip: false, req: ["tiffinDelivered"], notFlags: ["lakeErrandDone"],
        sets: ["lakeErrandDone"],
        text: "You tell her what you saw: the table, the phones, the boy doing three things " +
          "at once and all of them well. That he ate standing up. That he read you before you " +
          "reached the table, and that somebody with sense keeps an eye on him — you " +
          "couldn't say who. That he is careful. That he is, in fact, extremely careful.\n\n" +
          "She listens to all of it without touching the register, which from Duangjai is " +
          "stillness. “Careful,” she repeats. Something in the shoulders comes down a " +
          "degree — one degree, no more, and you understand that one degree is all a mother " +
          "gets and she will take it. “He was careful at ten. He shouldn't have had to be.” " +
          "She puts the glasses back on. “Thank you for going. Most men would have eaten the " +
          "fish.” A pause. “Did he keep the five hundred?” You say he tried to send it back " +
          "with you. For the first time she laughs — short, surprised, entirely real. “Then he " +
          "is still my son. Sit. Tonight the fish is on the house, and I don't want to hear " +
          "about it.”",
        short: "“Careful. He was careful at ten. He shouldn't have had to be. — Sit. The fish is on the house.”" },
      { topic: "offer", chip: false, req: ["act1Done"], notFlags: ["lakeErrandDone", "tiffinDelivered"],
        when: (st, G) => !!(G.quests && G.quests.lake_errand && G.quests.lake_errand.state !== "done"),
        text: "She has it ready before you finish asking — a steel tiffin from under the " +
          "counter, three tiers, the clasp worn bright. “He won't come out here. Too busy, he " +
          "says, which means too proud, which he gets from me.” She sets it on the register " +
          "between you like a contract. “Fish, rice, the herbs he likes. Take it to him at " +
          "the market on Buakhao — the folding table, you can't miss him, he'll be doing " +
          "three things at once.” The glasses come off. “And look at him for me. Not " +
          "at what he says. At him. Then come back and tell me what you saw — the truth, " +
          "please, I have had enough of the other kind from men.”",
        short: "“The tiffin — take it to Nont at the Buakhao market, then come back and tell me what you saw. The truth.”" },

    ],
  },

  // ── Thomas, the ghost of Jomtien (jomtien_beach_s3) ──────────────────────────
  // Adapted from a canon essay into original game prose (never committed raw — the
  // anonymization doctrine). He is the answer to the room's own standing mystery:
  // s3's desc asks who keeps the spot clean and comes to the far end nobody sweeps.
  // Thomas does. A grief piece in the Gordon-elegy register — understated, the ache
  // in the second coffee he sets out and never drinks. Handle with restraint; he is
  // not here for company, and the power is what he doesn't say. Jomtien = the beach
  // of memory (pairs with Sumalee/Gordon and the quiet-side crowd).
  thomas: {
    name: "Thomas", emoji: "☕", pronoun: "he",
    room: "dongtan_beach_n",
    look: "Farang man of seventy, lean and weathered, thin white hair, sun-dark skin, sweat-soaked polo, an iced coffee in each hand.",
    desc: "Seventy, and lean the way only a man who walks ten kilometres a day in this heat gets " +
      "lean. His polo shirt is soaked through and he does not seem to feel it. He sits on the low " +
      "seawall under the casuarina with an iced coffee in his hand and a second one set on the " +
      "concrete beside him — unopened, its ice long gone to water in the heat. He is looking at " +
      "the sea, and he is a very long way away. The motorbike-taxi men up the road think he has " +
      "lost his mind. They are wrong, but you can see why they'd think it.",
    dialogue: [
      { text: "He glances up, registers you as a farang and not a nuisance, and goes back to the " +
          "sea. “Evening.” A pause you could park a car in. “Good spot, this. Quiet. You'll not " +
          "find quieter.” He does not offer his name and does not ask for yours. The second coffee " +
          "sweats on the wall between you, and he does not mention it — and neither, you sense, " +
          "should you. Not yet.",
        short: "“Evening. Good spot, this. Quiet.” He goes back to the sea, and does not mention the second coffee." },
      { topic: "walk", text: "“The walk?” He almost smiles. “Ten kilometres, there and back, every " +
          "afternoon, in the worst of the heat. Mad, the bike lads reckon. Maybe they're right.” He " +
          "turns the cold cup slowly in his hands. “Doctor says it's good for the heart. It isn't, " +
          "particularly. But a man needs a reason to leave the room and put one foot down and then " +
          "the other, and this is mine. You keep to the path, the path keeps you.” He looks south " +
          "down the long empty sand. “Twenty years I walked it. I'm not about to stop now, just " +
          "because it got harder.”",
        short: "“Ten kilometres, there and back, every afternoon. Twenty years I walked it. Not stopping now it got harder.”" },
      { topic: "coffee", text: "For a moment you think he won't answer. Then he looks at the second " +
          "cup, the ice long since water, and something in his face gives way an inch. “That one's " +
          "not mine.” He says it the way you'd state the weather. “Two large iced, every day, twenty " +
          "years. I buy hers, I set it there, I drink mine, we watch the sea.” A breath. “She never " +
          "liked the walk. But she liked this part — the sitting, the coffee, the sun going down.” " +
          "He does not touch the second cup. “I don't drink it. That was never what it was for.”",
        short: "“That one's not mine. Two large iced, every day, twenty years — I buy hers, set it there, drink mine. I don't drink it. That was never what it was for.”" },
      { topic: "wife", text: "“Som.” He says the name carefully, like something that might spill if " +
          "he's not level with it. “Thirty years married. She thought I was a lunatic for walking " +
          "in the heat, and she was right, and she came anyway — every day, dragging her feet under " +
          "a parasol, complaining beautifully the whole way. 'Thai people only walk if the " +
          "motorbike is broken,' she used to tell me.” The ghost of a smile. “Three years now. Went " +
          "fast, at the end. A mercy, they say, as if that is a thing that helps.” He looks to the " +
          "water. “People think I come here to be sad. I come here because for one hour, walking " +
          "that path with her coffee waiting at the end of it, she isn't gone. She's just up ahead, " +
          "or a step behind, telling me I'm mad. And she's right. And I would give anything to hear " +
          "it one more time.”",
        short: "“Som. Thirty years. Three now since she went. I come here because for one hour she isn't gone — just a step behind, telling me I'm mad.”" },
      { topic: "vendor", text: "A cart squeaks past along the promenade, trailing the smell of " +
          "roasted coconut and pandan. Thomas watches the old vendor go, hunched over the handles. " +
          "“That fellow. Older than she ever got to be, and here he is, still pushing the cart.” " +
          "There is no bitterness in it, only the arithmetic. “She bought sticky rice off him every " +
          "single day. Twenty baht, a laugh, a banana leaf.” He shakes his head slowly. “You spend " +
          "a while wondering how that's fair. Then you stop — because it isn't a question with an " +
          "answer, and the wondering was eating the walk.”",
        short: "“That vendor — older than she ever got, still pushing his cart. She bought off him every day. You wonder how it's fair, then you stop.”" },
    ],
  },

  // ── Nont (Buakhao market) — a franchise seed, invisible on purpose ───────────
  // The younger self of a future game's protagonist (docs/bangkok-concept.md).
  // luk khrueng, ex-tech-kid of Rabbit's old Soi 6 bar → connected to BOTH Rabbit
  // (mentor/crime) and Tan (fixer/protector), which is the origin of the bridge
  // he becomes. Hidden-seed doctrine like Tan's hub role: never signposted; his
  // only future-tell is "not doing this forever." Roleless (no NPC_ROLES), like
  // Bank the piwin. The code-switch mechanic is planted in his "name" node.
  nont: {
    name: "Nont", emoji: "📱", pronoun: "he",
    room: "buakhao_market",
    look: "Mixed Thai-Western man, early twenties, lean, close-cropped hair, cheap gold chain, phone in hand, faded tee, quick eyes.",
    desc: "A kid — early twenties, maybe less — behind a folding table of {{phone}} cases and " +
      "chargers, though that is plainly not where the money is. Lean, close-cropped, a cheap " +
      "gold chain and a faded band tee, and the specific quick-eyed calm of someone who read " +
      "the room before you finished entering it. Half Thai, half something paler, and entirely " +
      "at home on this pavement. There's a {{phone}} open in front of him with the back off and " +
      "something delicate held in tweezers, and he doesn't stop working it while he talks.",
    dialogue: [
      { text: "The kid glances up, clocks you as farang in about half a second, and switches to " +
          "easy, unaccented English. “Need something? Phone unlocked, screen fixed, a Thai SIM " +
          "that isn't in your name — whatever.” A grin that's friendly and doesn't quite reach " +
          "the eyes. “Alex. Well — Nont, but Alex is easier for you. Everybody down here's got " +
          "two names. What do you need?”",
        short: "“Alex — Nont, whatever's easier. Phone unlocked, SIM not in your name, whatever you need.”" },
      { topic: "rabbit", text: "“Rabbit.” A small pause, weighing how much to hand you. “Yeah. " +
          "Knew him better than most. Old farang, had a bar on the 6 when I was a kid — I ran his " +
          "till, fixed his wifi, translated when the Thai side of things got complicated. He " +
          "taught me the rest. Computers first, then the other stuff.” He sets the tweezers down. " +
          "“Smart guy. Was. Then he wasn't, and anybody standing next to him was going down with " +
          "him — so I stopped standing next to him. Nothing personal. He'd have done the same at " +
          "my age. Probably did.”",
        short: "“Rabbit taught me everything — computers, then the other stuff. Then he started going down, so I stepped back. Nothing personal.”" },
      { topic: "tan", text: "“Tan.” Something in his posture straightens; he doesn't grin at this " +
          "one. “You know Tan? Then you know you don't really know Tan.” He turns a tiny screw " +
          "over in his fingers. “When I was fifteen and running wild off Rabbit's bar, somebody " +
          "made sure I had a way to earn that wasn't going to end with my photo on a police " +
          "corkboard. Never said it was him. Never says anything. But it was him.” A beat. “He's " +
          "never asked me for a single baht. One day he'll ask me for something, and it won't be " +
          "baht, and I'll do it — because you don't say no to the man who kept you out of the " +
          "hole. That's just how it works with Tan.”",
        short: "“Tan kept me out of the hole at fifteen. Never asked for a baht. One day he'll ask for something else, and I'll do it.”" },
      { topic: "family", text: "“My mum's out at the lake — Mabprachan. Cashier at one of the " +
          "bar-restaurants now.” He says it flat, daring you to make it sad. “She worked the 6 " +
          "back in the day, met my dad, he bought her a villa on the Darkside and paid for me to " +
          "go to the fancy international school by the lake. Then one day he's just… not paying " +
          "for anything. Gone back to wherever.” A shrug. “Mum's too proud to go back to the bar " +
          "and too old for it anyway. So the fancy school stopped and I started earning. Somebody " +
          "had to.” The grin returns, harder. “Turns out I'm better at earning than I ever was at " +
          "algebra.”",
        short: "“Mum's a cashier at the lake now — worked the 6, met my dad, he left. School stopped, I started earning. Somebody had to.”" },
      { topic: "job", text: "“What do I do?” He nods at the guts of the {{phone}}. “Whatever pays and " +
          "mostly doesn't hurt anybody who didn't have it coming. Unlock {{phones}}, flip devices, " +
          "fix what's broken, move a little of what shouldn't be moved. I'm good with anything " +
          "that's got a chip in it — always was, no idea where it comes from, God's little joke.” " +
          "He looks at you evenly. “No college. No money for it, no time for it. This is the " +
          "college.” A small, real smile. “I'm not going to be fixing tourists' cracked screens " +
          "on Buakhao forever, though. That much I know.”",
        short: "“Whatever pays and mostly doesn't hurt anybody undeserving. I'm good with anything with a chip in it. This is my college.”" },
      { topic: "name", text: "“Alex or Nont?” He seems to enjoy the question. “Depends who's " +
          "asking. Farang get Alex — my dad's name for me, back when he was around to use it. " +
          "Thai get Nont. Same kid, different door.” He taps his own chest. “Half and half, right " +
          "down the middle, which means everybody decides I'm the other thing. To the farang I'm " +
          "the local you trust a little less; to the Thai I'm the farang you trust a little more. " +
          "I let them both think it.” The grin, quieter now. “You'd be amazed what people say in " +
          "front of the one they've decided isn't really listening.”",
        short: "“Alex for farang, Nont for Thai. Same kid, different door. Everybody thinks I'm the other thing — and talks in front of me like I'm not listening.”" },
      // The witness beat of "Look in on my boy" (delivered by GIVE TIFFIN, not
      // TALK — _doGive routes it). Three things and only three, all present-
      // tense Pattaya: capability (the code-switch, the SIM), Tan's hand (a
      // glimpse, never explained), drift (he isn't staying at this table).
      // Nothing about where he's going. The test: it has to be worth reading
      // if the sequel is never made.
      { topic: "tiffin", chip: false, req: ["tiffinDelivered"],
        text: "He knows what it is before you've set it down — the clasp, the smell — and " +
          "for one unguarded second he's about twelve. Then the grin. “She sent FOOD. " +
          "Across the whole town. Of course she did.” He pops the lid, finds the ฿500 " +
          "folded in it, and closes his eyes briefly. “And that. Every time.” He tries " +
          "to hand it back to you to carry to her; you decline; he shrugs it into a " +
          "drawer with the air of a man losing an argument he has lost many times.\n\n" +
          "Then he eats — standing, fast, one hand — and works while he does it. A " +
          "customer arrives and Nont goes from unaccented English to a Thai you can't " +
          "follow to a third register that's mostly gesture, and back, without seeming to " +
          "notice he's doing it. Two phones get fixed in the time it takes him to finish " +
          "the rice. Halfway through, a motorbike slows at the kerb — a Thai man in a plain " +
          "shirt, engine running — and Nont looks up, nods once, and the bike moves on. " +
          "It doesn't come back. He doesn't explain it and you don't ask.\n\n" +
          "“Tell her I ate it,” he says, wiping his hands. “Tell her I'm careful. She " +
          "knows, but tell her.” He digs a Thai SIM out of the drawer, still in its blister, " +
          "and drops it in the empty tiffin. “For the trouble. Not in your name — don't " +
          "ask, that's the point of it.” He looks around the market once, the way you'd look " +
          "around a room you'd already decided to leave. “I'm not going to be at this " +
          "table forever, you know. But she doesn't need to hear that part from you.”",
        short: "“Tell her I ate it. Tell her I'm careful. — And she doesn't need to hear the rest from you.”" },
    ],
  },

  bert: {
    name: "Bert", th: "เบิร์ต", emoji: "🎱", personality: "blunt",
    pronoun: "he",
    room: "stinky_bar",
    manager: true, // the bar-manager NPC type (see _managerHere/_buyManDrink); NOT in NPC_ROLES, so girl-logic ignores him
    look: "American man of sixty-five, heavy forearms, grey crew cut, faded polo, bottle of Singha.",
    desc: "The Stinky's manager — American, sixty-something, forearms like dock rope, a " +
      "Singha that never empties and never seems to get him drunk. Candy's man, and " +
      "once the manager of her bars; now he runs the Stinky for its ailing owner and, " +
      "quietly, works at being his own man out from under her shadow. Twenty-two years " +
      "on Beach Road, most of them within nine feet of that pool table.",
    dialogue: [
      { when: (st, G) => _faction("wdg") > 0,
        text: "Bert clocks you and the welcome doesn't arrive — no beer opened, no stool offered. \"You. " +
          "Gavin's errand boy.\" He doesn't look up from the felt. \"Table's still true, beer's still cold. " +
          "But you drink it standing, and you drink it quiet.\" The silence does the rest.",
        short: "\"You. Gavin's errand boy.\" No beer, no stool — you drink standing, and quiet." },
      { when: (st) => st.dstate !== "stranger",
        text: "\"There he is.\" Bert's got a cold one open before you've sat. \"Not moved off this stool " +
          "since you left, funny enough. Table's true, beer's cold.\" A crooked grin. \"What's the good " +
          "word, bud?\"",
        short: "\"There he is.\" A cold one's open before you sit. \"What's the good word, bud?\"",
        // The WDG-flip fork, offered as pick-a-side action-choices during the live
        // decision window (was ASK BERT ABOUT SELLING / THE OFFER). Each jumps to
        // the existing resolution node, reusing its text/effects. The `when` gates
        // mean the choices vanish the moment the fork is closed out either way.
        choices: [
          { label: "Push him to sell",
            when: (st, G) => G.quests.wdg_flip === "active" && !_flag("wdgFlipTried"),
            topic: "sell" },
          { label: "Give him the honest picture",
            when: (st, G) => _flag("heardWdgHistory") && _flag("heardWdgInside") &&
              _flag("heardWdgPitch") && !_flag("wdgResolved") && !_flag("wdgFlipTried"),
            topic: "offer" },
        ] },
      // Delivering Gavin's pitch is the deed — this is where alignment actually
      // lands (never on accepting the quest, only on going through with it). Bert
      // holds firm anyway; the cost is your standing and his regard.
      { topic: "sell", chip: false, when: (st, G) => G.quests.wdg_flip === "active" && !_flag("wdgFlipTried"),
        sets: ["wdgFlipTried"],
        fx: (st, G) => { _align("wdg", 2); _align("indie", -1); },
        text: "You bring it round to selling — Gavin's word, friend to friend, everyone wins. Bert sets the " +
          "Singha down very slowly and looks at you the way he looks at a bad break. \"So that's the way " +
          "of it. He's got you carrying his water now.\" No heat, which is worse than heat. \"Answer's no, " +
          "bud. Always was. You tell your mate Gavin the Stinky's not for sale and neither am I.\" He picks " +
          "the Singha back up. \"And you — I'll remember you came in here for HIM. Soi's small. Word gets around.\"",
        short: "\"He's got you carrying his water now. The answer's no — and I'll remember you came for HIM.\"" },
      // Twenty-two years behind the rail: Bert reads your ORIGIN on the first
      // meeting without needing the question, then asks it anyway (his `why` beat,
      // the story mechanic). Gated on stranger so his returning/iced greetings own
      // every visit after. A no-origin player (pre-intro/old save) gets the plain
      // welcome below.
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("monger"),
        text: "\"Golf shirt, easy grin, and I'd bet those clubs are still zipped up back at the hotel.\" Bert " +
          "has a cold one open before you sit. \"Twenty-two years I've poured for your exact type, bud, and I " +
          "got no beef with a one of you — you know what you came for and you don't gussy it up. Welcome to the " +
          "Stinky.\"",
        short: "\"Golf shirt, easy grin, clubs still zipped at the hotel. I've poured for your type for twenty-two years, bud. Welcome.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("married"),
        text: "\"You've done the real version of this, haven't you.\" Bert reads it in a beat, and something in " +
          "him gentles. \"Married one, rode the whole thing out, came through still standing and still smiling. " +
          "That's a beer on the house, bud. Not many walk that road and keep their sense of humor.\"",
        short: "\"You've done the real version — married one, rode it out, still smiling. That's a beer on the house, bud.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("business"),
        text: "\"Here to make a deal, huh.\" Bert sets the beer down a hair harder than he needs to. \"Do " +
          "yourself one favor, bud — 'fore you sign your name to a damn thing in this town, you sit at this bar " +
          "and let me tell you which farang really owns his 'own' place. Costs you a beer. Saves you your " +
          "shirt.\"",
        short: "\"Here to make a deal. 'Fore you sign a damn thing, let me tell you which farang really owns his 'own' bar. Costs a beer, saves your shirt.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("pi"),
        text: "\"You clocked my exits before you clocked my beer.\" A slow, knowing look, one old hand to " +
          "another. \"Job like that doesn't quit a man when he retires, does it. I don't need your business, " +
          "bud — but you ever want a quiet word with somebody who's watched this soi twenty-two years, the " +
          "stool's yours.\"",
        short: "\"You clocked my exits before my beer. That job never quits a man. Want a quiet word with somebody who's watched this soi twenty-two years, the stool's yours.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("pension"),
        text: "\"A lifer. I can always spot one.\" Bert grins like he found a twenty in a winter coat. \"You " +
          "been coming back longer than half these bars been standing. Then you don't need the welcome speech, " +
          "bud — you were here for the first draft of it. Beer's cold, same as it ever was.\"",
        short: "\"A lifer — coming back longer than half these bars been standing. You don't need the speech, bud, you helped write it. Beer's cold.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("redundancy"),
        text: "\"First proper taste of freedom, bit of money to spend on it, and a face like Christmas " +
          "morning.\" Warm — but he's watched this reel before. \"Good on you, bud, you earned it, twenty-odd " +
          "years on the tools I'd wager. Just pace it. This town'll take the whole payout in a fortnight and " +
          "hand you a hangover for change.\"",
        short: "\"First taste of freedom, face like Christmas morning. You earned it on the tools, bud. Just pace it — this town takes the payout in a fortnight.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — running to something, or from something? Which one's you, bud?\"" } },
      { when: (st, G) => st.dstate === "stranger" && _isOrigin("running"),
        text: "\"You've got the look of a man who left somewhere in a hurry.\" No judgment in it, just weather. " +
          "\"That's alright, bud — half of Beach Road's a forwarding address for a life that quit working. The " +
          "Stinky don't ask for references. Beer's cold, table's true, and nobody in here knew you yesterday.\"",
        short: "\"The look of a man who left in a hurry. Half of Beach Road's a forwarding address, bud. The Stinky don't ask for references.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So — which is it, bud? What'd you leave, and does it know you're here?\"" } },
      { text: "\"Welcome to the Stinky, bud. Name's Bert. Table's true, beer's cold, " +
        "and the only rule is don't sit on the rail.\" He chalks a cue without " +
        "looking at it. \"You shoot? League night's every third night — killer " +
        "pool, hundred baht in, winner takes the table money.\"",
        short: "\"Table's true, beer's cold, don't sit on the rail. League night every third night — hundred baht in.\"",
        asks: { key: "why", q: "He racks the balls without hurry. \"So what's your story, bud? Everybody out here's running to something or from something. Which one's you?\"" } },
      { topic: "offer", chip: false, req: ["heardWdgHistory", "heardWdgInside", "heardWdgPitch"], notFlags: ["wdgResolved", "wdgFlipTried"],
        sets: ["wdgResolved"],
        text: "You lay it all out — Terry's history, Kesinee's straight talk, Gavin's smiling pitch. Bert " +
          "listens without touching the Singha, which is how you know it lands. When you're done he's " +
          "quiet a while. \"Right,\" he says finally. \"So the money's real and the machine's real, and both " +
          "of 'em would fix this year and cost every one after.\" He looks down the bar — the trophies, Dave " +
          "on his rounds, Phil on his stool, the dog by the door. \"Kesinee's girls last a season now. Mine's " +
          "been here since Candy owned the place. That's the whole difference, bud, and it's the only one that " +
          "matters.\" He finally lifts the Singha. \"I'll tell the old man to hold. He trusts me to keep the " +
          "lights on — not to sell his soul to a spreadsheet while he's too sick to say no. Ryan Powers wants " +
          "a pool bar, he can build his own — slap his little logo on it and film himself potting the black. " +
          "Let the market sort us out.\" He taps the bar once, done. " +
          "\"You did me a real turn tonight, bud. Bert doesn't forget a thing like that.\"",
        short: "\"Told the old man to hold — won't sell his soul to a spreadsheet while he's too sick to say no.\"",
        fx: (st, G) => { _align("indie", 2); _align("wdg", -1); } },
      { topic: "offer", chip: false, notFlags: ["wdgResolved"],
        text: "\"Still chewing on it, bud. Get me the full picture before I advise the old man: Terry's " +
          "watched White Dish work this soi for years, Kesinee runs one of their bars over at the Kitten " +
          "Corner — she'll talk straight if you are — and the White Dish man himself, Gavin, he's usually " +
          "smiling into a lager at the Golden Dragon. Hear all three, then come tell me what you make of it.\"" },
      { topic: "offer", chip: false, req: ["wdgResolved"],
        text: "\"The White Dish thing? Told the old man to hold, and he did. Gavin came back once, all " +
          "smiles, took the no like it was a delivery running late.\" A crooked grin. \"They'll be back — " +
          "they always are. But not tonight, and not while I'm behind this bar. Your beer's poured, bud.\"" },
      { topic: "league", text: "\"Killer pool. Everybody's got three lives, pot or " +
        "you lose one, last man standing takes the pot. Every third night, right " +
        "here. Half the piwins in North Pattaya play. Bring your hundred baht and " +
        "your humility.\"" },
      { topic: "pool", text: "\"Table's a Brunswick, older than most of my customers. " +
        "I re-cloth her every year, level her every month, and love her more than " +
        "I loved either of my wives. She holds no grudges. Unlike either of my wives.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      // Soi 6 mode can't reach Khao Talo, so this "walk him out to the old place"
      // line points off the map — and its quest (_questAvailable's at: gate) is
      // already suppressed there. Skip it in the confined mode and fall through to
      // Bert's generic dog line below.
      { topic: "dog", req: ["hasDog"], when: () => G.mode !== "soi6",
        text: "Bert looks past you at the dog by the door and sets his Singha down " +
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
        "'em, you hear?\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      { topic: "white knight", text: "\"See that kid last month — flew in, fell in " +
        "love in forty minutes, tried to 'rescue' a girl from Tequila Queen who's " +
        "got two houses in Buriram and a husband she likes fine. White knights, we " +
        "call 'em. The machine eats 'em alive, bud. The ladies don't need saving — " +
        "they need customers with manners.\"" },
      { topic: "candy", when: (st) => st.trust < 3, deflect: true,
        text: "\"Candy?\" A short look, the cue still in his hands. \"My lady, and she's got a quiet " +
          "piece of this place — so mind your manners if she wanders in of a night. That's all you need " +
          "off a stool you just sat down on, bud.\"",
        short: "\"My lady, and a piece of this place. That's all you need for now, bud.\"" },
      { topic: "candy", when: (st) => st.trust >= 3,
        text: "A crooked grin, and the cue goes down. \"Candy. My lady, and my old boss — both, which is a " +
          "hell of a retirement plan. Twenty years I ran her bars. Love her to death.\" The grin steadies into " +
          "something more honest. \"Doesn't mean I want her name over my door forever. Man gets to my age, he'd " +
          "like one thing in this town that's his and not hers. The Stinky's it. That's the whole of it, bud.\"",
        short: "\"My lady and my old boss both. Love her to death — but I'd like one thing here that's mine, not hers.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); st.mood = "open"; } },
      { topic: "owner", text: "\"Real owner's a Yank, older than me even, " +
        "and his ticker's packing up — that's why I'm behind this bar and not Candy's. Good " +
        "man. Wanted somebody he trusted keeping the lights on while the doctors do their " +
        "thing. So here I am, bud.\"" },
      { topic: "manager", text: "\"Managing a bar " +
        "out here? Six nights a week, seven in the season, and you drink with every customer " +
        "or you're no damn good at it. Chews a man up in a year, two if he's tough. There's " +
        "always a stool open somewhere for the next poor bastard.\" He lifts the Singha in a " +
        "small, tired salute." },
      { topic: "butterfly", text: "\"Butterfly? That's you, maybe — man who flits " +
        "flower to flower, different bar, different girl, every night. Girls'll " +
        "tease you for it, mamasans price you for it. Ain't a crime. Just don't " +
        "butterfly inside ONE bar, that's how a man loses a drink to the back of " +
        "the head.\"" },
      { topic: "ryan powers", req: ["knowOyHasIt"],
        text: "He lowers the Singha half an inch, which for Bert is a whisper. " +
        "\"White Dish Group. Front company, owns most of the paper on Soi 6. Man behind " +
        "it's a Brit, Ryan Powers — and don't go picturing some untouchable villain, bud. " +
        "He's a jumped-up little marketing lad who ghosts his own investors and hides " +
        "behind a lawyer.\" A shrug. \"Bars run clean enough on top. The books don't. It " +
        "isn't him you'd have to get past — it's the money and the envelope. Leave that one alone.\"" },
      { topic: "sponsor", text: "He refills without asking. \"See it every season. " +
        "Good man, sends the money, thinks he's the only one, thinks she thinks " +
        "about him every day. Maybe she does. Maybe Somchai next door does too.\" " +
        "He sets the bottle down. \"I gave up doing the math twenty years ago. " +
        "Not my business. Not yours either, bud — unless somebody asks you to " +
        "make it yours.\"" },
      { topic: "phil", req: ["toldPhilTruth"],
        text: "He looks at you a long time before he speaks. \"You did a hard thing.\" " +
        "The Singha goes up once, comes down. \"Man needed to know. Or he needed " +
        "not to know, and you made that call for him. Either way —\" he taps the bar " +
        "once \"— not your fault. Some things end.\"" },
      { topic: "1998", text: "He sets the Singha down with the quiet authority of a " +
        "man who has heard this speech many times, from many Nigels. \"The baht was " +
        "fifty to the dollar in '98, bud. Tom Yum Goong crash — half the Thai economy " +
        "went sideways overnight. Your British pensioner walking in with sterling felt " +
        "like a king because he was, arithmetically.\" He refills without ceremony. " +
        "\"That's point one. Point two: Nigel in 1998 was forty years old with a full " +
        "head of hair and a functioning liver. He's sixty-eight now and his main topic " +
        "is his prostate. The girls didn't change.\" He picks the Singha back up. " +
        "\"Point three: before smartphones, this town ran on beautiful anonymity. You " +
        "could reinvent yourself completely. No one Googled you. The girl couldn't " +
        "see the Good Morning texts from the other three guys in Europe. Technology " +
        "didn't kill the romance, bud. It killed the illusion.\" He drains it. " +
        "\"The city never grew a conscience. Nigel just grew old.\"" },
      { topic: "free drink", text: "He points the Singha at you. \"You know what I " +
        "call it? The Oklahoma Trap. Guy walks in — plumber from Tulsa, first night " +
        "in town — mamasan sends him a free shot. He thinks he beat the system.\" " +
        "The Singha comes down. \"You ever go to Walmart back home and the promo " +
        "girl gives you a sausage on a toothpick? Do you lose your mind? Do you go " +
        "to the register and buy a thousand dollars of sausages for the cashier and " +
        "the store manager just to prove what a great guy you are?\" He waits. \"No. " +
        "But you put that same man under neon lights with loud music and a pretty girl " +
        "telling him he's special — the receipt at two a.m. says thirty thousand baht " +
        "and he can't tell you where it went.\" He drains the Singha. \"The free " +
        "drink is a business investment, bud. The cheapest one they'll make all night.\"" },
      { topic: "danny", text: "The Singha stops an inch off the bar. \"Danny " +
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
        "still talking. It's the ones who stopped bragging.\" The Singha goes " +
        "down on the bar with no particular force. \"Man spends two years telling " +
        "everybody he found himself a good woman, mocking the butterflies, the " +
        "bar-hoppers — you think that man can pick up the {{phone}} when it all goes " +
        "sideways and say he needs help?\" He doesn't look at you. \"The pride is " +
        "the part that kills 'em, bud. Not the girl, not the visa, not the money. " +
        "The pride.\" He picks the Singha back up. \"So you call anyway. You " +
        "call and you let them hang up on you. And then you call again.\"" },
    
      // ── bar-owning chain, step 1: the premises ──────────────────────────
      // Only reachable once white_dish is resolved — you're the reason it wasn't
      // sold, which is the only reason this conversation happens at all.
      {
        topic: "buying", chip: false,
        req: ["expatLife", "wdgResolved"], notFlags: ["barPremises"], sets: ["barPremises"],
        text: "Bert doesn't answer straight away. He looks down the bar — the " +
          "trophies, the brushed table, the girls who've been here since Candy " +
          "owned it.\n\n\"I told him to hold,\" he says. \"And he held. But " +
          "holding's not a plan, bud, it's a stall, and the old man's running out " +
          "of stall.\" He turns the Singha a quarter turn. \"Doctors want another " +
          "go at his ticker. He's not coming back out here. He knows it, I know " +
          "it, and Gavin knows it, which is why that lot are being so bloody " +
          "patient.\"\n\nHe finally looks at you.\n\n\"So it sells. That's not " +
          "the question. The question's who to.\" A pause. \"He'll take a regular " +
          "over a company. Not for the money — he'll lose money on you, and he " +
          "knows that too. For the lights staying on the way they are.\" He pushes " +
          "his glass aside, which from Bert is standing to attention. \"I'll ring " +
          "him tonight. You go and find out what a farang can actually sign in " +
          "this country, because it isn't what you think it is.\"",
        short: "\"It sells, bud. Question's who to — and he'd take a regular over a company. Go learn what you can sign.\"",
      },
      // ── step 4: opening night — one per partner ─────────────────────────
      // The fork has to be VISIBLE at the payoff or it wasn't a choice, it was a
      // coin toss. Candy's night is paperwork pinned behind the till. Tan's is
      // the same happy room with nobody able to say what the arrangement is.
      {
        topic: "opening", chip: false,
        req: ["expatLife", "barPartner", "barPaid", "partnerCandy"], notFlags: ["barOpen"],
        sets: ["barOpen"],
        fx: (st, G) => { _align("indie", 2); _align("wdg", -1); },
        text: "Nothing changes, which is the point.\n\nThe sign stays. The trophies " +
          "stay. Bert is exactly where Bert has always been, except that tonight he " +
          "is working for a man who isn't selling, and it has taken ten years off " +
          "him. Candy comes over from her own bar at nine, looks at the paperwork " +
          "pinned behind the till — her name first, as the law requires and as she " +
          "insisted twice — and says only \"good\" before taking a stool like any " +
          "customer.\n\nThe old man is on speakerphone from a hospital corridor in " +
          "Ohio for about four minutes. He asks after the table, not the takings. " +
          "Bert holds the {{phone}} up so he can hear the room.\n\nAnd at half eleven " +
          "Gavin comes in, because of course he does. Buys a beer, pays for it, " +
          "looks round with a valuer's eye and finds nothing to work with. " +
          "\"Congratulations,\" he says, and means about half of it. \"You know " +
          "we'd have paid more.\"\n\n\"He knows,\" says Bert, not looking up from " +
          "the pumps.",
        short: "\"Sign stays, trophies stay, Bert stays. Gavin bought a beer and paid for it.\"",
      },
      {
        topic: "opening", chip: false,
        req: ["expatLife", "barPartner", "barPaid", "partnerTan"], notFlags: ["barOpen"],
        sets: ["barOpen"],
        fx: (st, G) => { _align("indie", 1); },
        text: "Nothing changes, which is the point.\n\nThe sign stays, the trophies " +
          "stay, and Bert is exactly where Bert has always been — working for a man " +
          "who isn't selling, which has taken ten years off him. There is no " +
          "paperwork behind the till to look at. There was never a meeting. It was " +
          "two hours at the land office and a very good lunch afterwards, and the " +
          "only document in the building is a photocopy Tan handed you in the car " +
          "park, folded once.\n\nThe old man is on speakerphone from a corridor in " +
          "Ohio for four minutes and asks after the table, not the takings.\n\n" +
          "Tan does not come. He sends a crate of Singha and a text — 🙂 — and is " +
          "somewhere else, being somewhere else.\n\nAt half eleven Gavin comes in, " +
          "because of course he does. Buys a beer, pays for it, and does the sum " +
          "behind his eyes: who signed, what it cost, why it was quick. Whatever he " +
          "arrives at, he doesn't say it. \"Congratulations,\" he says, and for " +
          "once there is no pitch behind it at all. He looks at you a moment longer " +
          "than is comfortable. \"Do you know what you've agreed to?\"\n\n" +
          "\"He's got the paperwork,\" says Bert, not looking up from the pumps. " +
          "Which is, you notice on the walk home, not the same answer.",
        short: "\"No paperwork behind the till. Tan sent a crate and a smiley. Gavin asked if you knew what you'd agreed to.\"",
      },
    ],
  },

  phil: {
    name: "Phil", th: "ฟิล", emoji: "📱",
    pronoun: "he",
    room: "stinky_bar",
    look: "English man of fifty-five, thinning hair, fleece body-warmer despite the heat, anxious face.",
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
    pronoun: "she",
    room: "night_bazaar",
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
    look: "Thai woman of twenty-two, quick and bright, rose-pink bar polo, hair in a high ponytail.",
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
    look: "Thai woman of sixty, silver-streaked chignon, reading glasses on a gold chain, stage poise.",
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
    pronoun: "he",
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
    pronoun: "he",
    room: "ws_alley",
    look: "Thai boy of fourteen, skinny, fake Barcelona shirt, shorts, flip-flops, quick watchful eyes.",
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
  // south off the junction's SW corner, down to Jomtien
  jomtien:  ["pattaya_tai", "beach_rd_s", "jomtien_beach_rd"],
  // north off its NE corner, up Second Road to the Dolphin roundabout
  secondrd: ["pattaya_tai", "second_rd_s", "second_rd_diana", "second_rd_honey",
             "second_rd_myth", "second_rd_c",
             "second_rd_n", "pattaya_klang", "second_rd_soi6", "dolphin", "naklua_rd"],
  // and back down the seafront — naklua_rd and pattaya_tai are on both, which is
  // what closes the circuit and lets you ride the whole loop from either end
  // NOTE: Bali Hai Pier is NOT on any route — the trucks parked at the pier are
  // for HIRE (point-to-point charter, name a price), not the ฿15 loop. The
  // circulating truck turns left at the WS gate and never reaches the pier.
  beachrd:  ["naklua_rd", "dolphin", "beach_rd_n", "beach_rd_c", "beach_rd_s", "pattaya_tai"],
};

// ── Motosai destinations (from any stand) ──────────────────────────────────

const MOTOSAI_DESTS = {
  "walking street": { room: "ws_gate", price: MOTOSAI_TOWN },
  "beach road":     { room: "beach_rd_c", price: MOTOSAI_TOWN },
  "soi buakhao":    { room: "buakhao_n", price: MOTOSAI_TOWN },
  "tree town":      { room: "buakhao_tt", price: MOTOSAI_TOWN },
  "bali hai":       { room: "bali_hai", price: MOTOSAI_TOWN },
  "lk metro":       { room: "lk_entrance", price: MOTOSAI_TOWN },
  "soi 6":          { room: "soi6_street", price: MOTOSAI_TOWN },
  "jomtien":        { room: "jomtien_beach_rd", price: MOTOSAI_TOWN },
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
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade", "ws_north", "ws_south"],
    interactive: true,
    th: "หล่อจังเลย", rom: "lor jang loei",
    intro: "Out of the neon, a tall and devastating vision in a sequinned dress is " +
      "suddenly pressed against you — “Hellooo hansum man~” — one hand tracing your " +
      "chest with terrific friendliness. Something else entirely is happening down " +
      "near your pocket.",
    hint: "(Quick — do something.)",
  },
  bargirl: {
    rooms: ["buakhao_n", "buakhao_market", "buakhao_s", "tt_entrance", "lk_entrance", "lk_main", "soi6_street", "ws_north"],
    interactive: false,
    th: "โถ น่าสงสาร", rom: "thoh, naa songsaan",
    intro: "A bargirl weaves out of the nearest doorway, somewhere past her fourth " +
      "lady drink of the shift, and stops dead at the sight of you.",
  },
  brit: {
    rooms: ["ws_gate", "ws_north", "ws_south", "soi6_street", "beach_rd_c"],
    interactive: true,
    intro: "A sunburnt mountain in a Chang vest is abruptly in your face, swaying " +
      "like a condemned building. “YOU. You’re the muppet who spilled my pint in " +
      "the Sailor’s Arms, aren’t ya?” He is enormous, very drunk, and about sixty " +
      "per cent sure.",
    hint: "(Choose your next words carefully.)",
  },
  powerbank: {
    rooms: ["jomtien_beach_rd", "beach_rd_s", "buakhao_s", "sukhumvit_crossing"],
    interactive: true,
    th: "แบตหมดเหรอ", rom: "baet mot rer?",
    intro: "The piwin at the stand nods at the phone clutched in your hand like a " +
      "dying pet. He produces a scuffed power bank from under the seat of his bike " +
      "and holds it up, eyebrows raised: want some?",
    hint: "(YES would be the traditional answer.)",
  },
  freelancer: {
    rooms: ["beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade", "buakhao_n", "north_beach"],
    interactive: true, nightly: true, // resets every night — Beach Road and band-night Buakhao restock
    th: "ไปไหนคะ", rom: "pai nai kha?",
    intro: "She's leaning on the promenade rail where the lamplight is kindest — no " +
      "bar, no mamasan, freelance and unhurried. “Going where, hansum? Tonight I " +
      "am also free.” A beat, then, nodding down the rail at a friend pretending " +
      "not to listen: “Ning also free. VERY boring night, na.”",
    hint: "(Company is ฿700. Ning makes it ฿1400 — cheaper than a bar, but no " +
      "mamasan means nobody to complain to if it goes wrong. YES her · BOTH of them · NO.)",
  },
  noodle: {
    rooms: ["soi6_street", "soi6_deep"],
    interactive: true, nightly: true, // the loud ends re-arm their noodle patrol each night
    th: "ไปไหนคะ", rom: "pai nai kha?",
    intro: "A girl steps out of an open front brandishing a fluorescent foam pool noodle like " +
      "a swordsman, plants herself square in your path, and levels it at your chest. \"YOU. " +
      "Where you go? You come MY bar. NOW.\" It is not entirely a question. The noodle wavers, " +
      "loaded and ready.",
    hint: "(Go with her, or walk on and take the consequences. YES / NO.)",
  },
  coconutbar: {
    rooms: ["north_beach"],
    interactive: true, nightly: true, // the beach restocks its shade every night
    th: "ไปกับหนูไหมคะ", rom: "pai kap nuu mai kha?",
    intro: "Out past the string lights, in the dark under the palms, three or four women " +
      "share plastic stools that belong to no bar — the “coconut bar,” the boys call it, " +
      "because the only roof is the fronds. One is up and crossing the sand toward you before " +
      "you've decided anything, unhurried and entirely unshy, and she doesn't stop at polite " +
      "distance. “Why you walk the beach alone, hansum? Waste.” A cigarette glows behind her. " +
      "“No bar here, no barfine, no mama take my money. Just me. You want, my friend Muk come " +
      "too — we not shy like the soi girl. We say the price, you say yes.”",
    hint: "(No bar, no barfine — pay her direct, cheaper than the soi. But this is the dark " +
      "sand: no mamasan, no rail, nobody at all if it turns. ฿500, or ฿900 with Muk. YES / NO.)",
  },
  bkktourist: {
    rooms: ["ws_north", "ws_south", "beach_rd_c", "second_rd_c", "buakhao_market"],
    interactive: true, nightly: true,
    th: "รอเพื่อนอยู่ค่ะ", rom: "ror phuean yu kha",
    intro: "A young woman in good sneakers and a Bangkok-boutique dress is checking " +
      "her phone against the crowd, plainly waiting for someone. No bar behind her, " +
      "no smile-for-hire — just a weekender killing five minutes. She catches you " +
      "noticing and returns a small, neutral nod.",
    hint: "(She's a tourist, not a trade. Manners — or a little Thai — go further than a wallet here.)",
  },
  jptourist: {
    rooms: ["ws_gate", "ws_north", "ws_south", "beach_rd_c"],
    interactive: true, nightly: true,
    intro: "At the go-go rail a sharply-dressed Japanese woman is watching the dancers " +
      "with the frank, appraising interest of someone shopping rather than spectating. " +
      "A cocktail, an amused mouth. She clocks you clocking her — and clocking what " +
      "she's looking at — and the smile says: game recognises game. “Konbanwa.”",
    hint: "(She isn't working, and she isn't shy. Read it right — money is the wrong move.)",
  },
  britles: {
    rooms: ["ws_gate", "ws_north", "ws_south", "beach_rd_c"],
    interactive: true, nightly: true,
    intro: "At the go-go rail, pint in hand and entirely at home, a British woman is " +
      "watching the dancers with more expertise than you will ever have. One of the " +
      "girls blows her a kiss; she winks back like she owns the place. She catches " +
      "your eye and grins. “Alright? Best seat in the house, this — and I don't even " +
      "have to pretend, do I.”",
    hint: "(Not on the menu — for you. Play it decent and she might be the best wingman you get all night.)",
  },
  punterwife: {
    rooms: ["ws_north", "ws_south", "beach_rd_c", "second_rd_c", "buakhao_market"],
    interactive: true, nightly: true,
    intro: "A poised Filipina woman stands beside a farang who is unmistakably her " +
      "husband — matching rings, the comfortable boredom of the long-married. He's " +
      "deep in a football argument with a mate; she's people-watching, amused. The " +
      "working girls nearby treat her with warm, unthreatened respect — she's not " +
      "competition, and everybody knows it.",
    hint: "(Somebody's wife. Hands to yourself. Friendly, though — and she knows everyone on this soi.)",
  },
  pingpong: {
    rooms: ["ws_gate", "ws_north", "ws_south"],
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
    rooms: ["hotel_room", "qv_room", "areca_room", "metropole_room", "naklua_rd"],
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
    rooms: ["ws_north", "ws_south"],
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
    rooms: ["promenade", "beach_rd_c", "ws_north"],
    interactive: true, nightly: true,
    intro: "A soft-faced woman with a tray of blessed strings steps into your path, and before you can " +
      "wave her off she has pressed a little gold-threaded amulet into your hand, still warm from her own " +
      "neck. “For you. For luck. No money — we friends, na.” She folds your fingers over it, beaming, and " +
      "does not quite let go.",
    hint: "(ACCEPT it · TAO RAI — ask the price and pay it · REFUSE)",
  },

  // ── The districts that had nobody in them ──────────────────────────────
  // Every encounter above fires on the central strip — Beach Road, Walking
  // Street, Buakhao, Soi 6 — so Pratumnak, Myth Night and Tree Town had a
  // backdrop and a bar list and no street life at all. These five give each
  // one a crowd of its own, and none of them wants your money: the hill is
  // residents, the market is twenty-somethings, the maze is people who took
  // a wrong turn. Money is the wrong verb in all five, same as the tourists.
  condofarang: {
    // NOT pratumnak_soi5: the top of the soi is condo walls and a sleeping
    // security guard, and this man is standing outside a bar.
    rooms: ["pratumnak_soi5_m", "pratumnak_soi5_b"],
    interactive: true, nightly: true,
    intro: "A man rises off a plastic chair outside the bar with the air of somebody who has been " +
      "waiting all evening for a face that hasn't heard it yet. Condo T-shirt, flip-flops, mid-sixties, " +
      "three beers past needing permission. “You're up the hill, then. Staying? No — you've got the walk " +
      "of a man who's staying two weeks.” He does not wait to find out. “Let me tell you what they've " +
      "done to the water pressure since the new block went up.”",
    hint: "(LISTEN · or make your excuses and WALK ON)",
  },
  jogger: {
    rooms: ["pratumnak_clubs", "thappraya_ext_s", "pratumnak_soi5"],
    interactive: true, nightly: true,
    intro: "Somebody is running up the hill. Properly running — head torch, calf sleeves, a watch he " +
      "keeps glancing at — past the condo walls and the parked bikes and one unmarked door, at two in " +
      "the morning, uphill. He clocks you, raises a hand without breaking stride, and says, at the " +
      "volume of a man with earphones in, “SEVEN PERCENT GRADE, MATE. LOVELY.”",
    hint: "(WAVE back · JOIN him, briefly · or let him GO)",
  },
  influencer: {
    rooms: ["myth_night", "myth_stage", "myth_rows"],
    interactive: true, nightly: true,
    intro: "A ring light on a stick swings round and paints you white. Behind it a girl in an oversized " +
      "shirt is halfway through a piece to camera, one hand doing the little rolling gesture that means " +
      "keep going, and her friend is holding a paper fan up to catch the light off the containers. You " +
      "have walked directly through the shot. The friend lowers the fan. Nobody is angry; they are " +
      "waiting to see what you do, which is worse.",
    hint: "(SORRY, and duck out · POSE, and commit · or WALK ON)",
  },
  djslip: {
    rooms: ["myth_night", "myth_stage", "myth_rows"],
    interactive: true, nightly: true,
    intro: "A girl leans out of the row with a biro and a request slip held like evidence. “You " +
      "help me, na. My bar already use — one bar, one song, and the boss he use it for Hotel " +
      "California.” The disgust is total and, given the sheet by the till, entirely earned. “You " +
      "write for me. He cannot say no to farang.” She has already picked the song. She wrote it " +
      "down before she came over.",
    hint: "(SIGN it for her · or DECLINE)",
  },
  maze: {
    rooms: ["tt_entrance", "tt_lane_1", "tt_lane_2", "tt_lane_3"],
    interactive: true, nightly: true,
    intro: "A man comes round the corner at the pace of somebody who has been round it before. Sunburn, " +
      "a lanyard from a hotel on the other side of town, one flip-flop wearing visibly faster than the " +
      "other. “Mate. Mate. The one with the fish tank. Big fish tank, out the front.” He looks at the " +
      "lane behind you, then the lane behind himself, and something goes out of him. “I've come past " +
      "the same mop twice.”",
    hint: "(HELP him look · or leave him to it and WALK ON)",
  },
};

// ── Quests (adventures) ─────────────────────────────────────────────────────
// The engine's quest subsystem (engine-systems.js) drives these: givers surface the
// offer in conversation, ACCEPT starts it (handing over `item` if any),
// setting `doneFlag` completes it next turn and pays `reward`. `deps` are
// quest ids that must be done first.

const QUESTS = {
  // Tree Town's first sandbox pull (docs/map-coverage.md). Oy is the Act One
  // antagonist — she held your wallet — and you never see her again; this brings
  // players back to the maze by turning the antagonist into an employer. The hook
  // is the callback (you got a wallet back off her, which almost nobody does), and
  // the objective stays inside Tree Town: get the whispers from Pim at the
  // Starlight, report to Oy. doneFlag observes the world as usual.
  safecracker: {
    name: "The Safe-Cracker",
    giver: "oy",
    desc: "Madam Oy has a job for the farang who got a wallet back off her. Find out what has " +
      "her girls jumpy — ASK PIM ABOUT THE WHISPERS, then take it back to her (ASK OY ABOUT " +
      "THE OFFER).",
    deps: [],
    reqFlags: ["act1Done"],
    at: "pim",
    doneFlag: "oyJobDone",
    reward: { money: 2000, happy: 6 },
  },
  // Jomtien's first pull (docs/map-coverage.md) — the biggest dead zone gets a soul,
  // not just a pointer. A quiet elegy in Sumalee's own register ("Jomtien is for the
  // ones who already know the game — long-stay, retire"): an old regular didn't come
  // back this season. Routes the matriarch → Nok on the sand → back, and resolves on
  // the shrine (a deceased farang's photo by the King's is canon, per the shrine
  // system). Gordon is referenced, never an NPC — no new face, no undelivered ASK.
  // "Look in on my boy" — the lake cluster's pull. A mother's errand, complete on
  // its own terms; the constraint that shapes it lives in docs/bangkok-concept.md
  // (foreshadow through capability and trajectory, never exposition — nothing in
  // this quest may gesture at where Nont is headed). No money reward: a mother's
  // thanks is not a wage; the fish is on the house instead.
  lake_errand: {
    name: "Look In on My Boy",
    giver: "duangjai",
    // Story-gated, not trust-gated: she asks BECAUSE you asked about her son
    // (ASK DUANGJAI ABOUT NONT sets duangjaiNont) — no ask, no errand. Trust
    // would be a soft wall here: she has no asks: and isn't a hostess, so the
    // usual levers (answering her, flirting) don't exist for her.
    desc: "Duangjai wants someone to look in on her son. Carry her tiffin to Nont at the " +
      "Buakhao market (GIVE TIFFIN TO NONT), then come back and tell her what you saw " +
      "(ASK DUANGJAI ABOUT THE OFFER).",
    deps: [],
    reqFlags: ["act1Done", "duangjaiNont"],
    at: "nont",
    item: "tiffin",
    doneFlag: "lakeErrandDone",
    reward: { money: 0, happy: 6 },
  },
  quietside: {
    name: "The Quiet Side",
    giver: "sumalee",
    desc: "Sumalee misses an old regular who didn't come back this season. ASK NOK ABOUT THE " +
      "REGULAR, then bring it back to her (ASK SUMALEE ABOUT THE OFFER).",
    deps: [],
    reqFlags: ["act1Done"],
    at: "nok",
    doneFlag: "quietSideDone",
    reward: { money: 1500, happy: 7 },
  },
  // Naklua's pull (docs/map-coverage.md), deliberately NOT the White Rabbit — that
  // bar is the CTF stage-2 discovery and stays unfindable by normal play. Instead it
  // reveals the OTHER discreet Naklua venue: Rose's Orchid Club, a members-ish gents
  // room you "don't find, you get sent." Candy vouches you in — relationship-as-key,
  // a different flavour from Jomtien's elegy. Completes on presenting the vouch to Rose.
  orchid_intro: {
    name: "An Introduction",
    giver: "candy",
    desc: "Candy is vouching you into a discreet club — the kind of place you don't find, you " +
      "get sent. Go and tell Rose that Candy sent you (ASK ROSE ABOUT CANDY).",
    deps: [],
    reqFlags: ["act1Done"],
    at: "rose",
    doneFlag: "orchidVouched",
    reward: { money: 1000, happy: 6 },
  },
  // The one quest with four different right answers. `doneFlag` is what makes
  // that free: the quest watches for `debtSettled` and does not care which of
  // Nira's three nodes or Tan's one set it — no branching, no quest-specific
  // code, exactly the design the schema is for.
  //
  // Gated on `helmetDelivered`, so the man asking has already been helped once:
  // Bank's own line is "you have problem with anyone on this street, you stand
  // next to Bank", and the quest is that sentence turned around.
  taxi_debt: {
    name: "A Favour Back",
    giver: "bank",
    reqFlags: ["helmetDelivered"],
    deps: [],
    at: "nira",
    desc: "Bank's cousin owes Nira and her cousins are asking around. Go and talk to her " +
      "(ASK NIRA ABOUT THE DEBT) — money is only one of the ways this ends.",
    doneFlag: "debtSettled",
    reward: { money: 0, happy: 5 },
  },

  // ── Pratumnak: Bill and Bob ───────────────────────────────────────────────
  // The hill is the only place in town where two factions sit thirty metres
  // apart and are CIVIL about it, and all three of these already had their
  // groundwork laid without meaning to: Bill went over and introduced himself
  // his first week, Kinnaree noted he brought flowers, and Bob is generous
  // about a competitor who is taking his trade. So the chain is not a rivalry.
  // It is two men being decent across a road, and the player carrying the one
  // sentence neither of them can say to the other.
  //
  // Faction doctrine holds throughout (docs/factions-thai.md): nothing here
  // pushes an alignment, declining costs nothing, and the one deed that moves
  // standing moves BOTH sides up — because it genuinely helps both.
  hill_ice: {
    name: "The Ice Man",
    giver: "bob",
    desc: "Bob's ice stopped coming up the hill three weeks ago and he will not ask " +
      "anyone why. Bill's bars are still getting theirs. Find out what changed " +
      "(ASK BILL ABOUT ICE).",
    deps: [],
    at: "bill",
    doneFlag: "knowIceMan",
    reward: { money: 0, happy: 4 },
  },
  hill_order: {
    name: "A Name on the Order",
    giver: "bill",
    desc: "Bill can fix Bob's ice with one phone call — but it cannot come from him, " +
      "and he will explain why. Put it to Bob as your own idea (ASK BOB ABOUT THE ORDER).",
    deps: ["hill_ice"],
    at: "bob",
    doneFlag: "iceSettled",
    reward: { money: 0, happy: 6 },
  },
  hill_photo: {
    name: "The Bet on the Wall",
    giver: "bob",
    desc: "There is a photograph behind the Succubus bar from 1971, and Bob and Kinnaree " +
      "have been arguing about which building is in it for thirty years. Go and stand " +
      "where it was taken, down at the pier, then come back and tell him " +
      "(ASK BOB ABOUT THE PHOTOGRAPH).",
    deps: ["hill_order"],
    at: "bali_hai",
    doneFlag: "photoBetSettled",
    reward: { money: 0, happy: 8 },
  },
  white_dish: {
    name: "The White Dish Offer",
    giver: "bert",
    trust: 2, // he won't ask a near-stranger to weigh in on selling his bar — earn a little rapport first
    desc: "White Dish want to buy Bert's bar out from under its dying owner. Get him the " +
      "real picture — the history (ASK TERRY ABOUT WHITE DISH), the inside view (ASK KESINEE " +
      "at the Kitten Corner ABOUT WHITE DISH), and the pitch (ASK GAVIN at the Golden Dragon " +
      "ABOUT THE OFFER) — then tell Bert (ASK BERT ABOUT THE OFFER).",
    deps: [],
    at: "bert",
    doneFlag: "wdgResolved",
    reward: { money: 0, happy: 5 },
  },
  wdg_flip: {
    name: "Gavin's Errand",
    giver: "gavin",
    // Gavin's counter to Bert's job: the WDG side of the same fork. Purely opt-in —
    // decline it and nothing happens; even accept it and you can still walk away.
    // Alignment only lands if you actually carry the pitch to Bert (ASK BERT ABOUT
    // SELLING). See wdgFlipTried in Bert's dialogue.
    desc: "Gavin would like a quiet favour: have a word with Bert about selling the Stinky to " +
      "White Dish. \"Friend to friend. Soften him up. Everyone wins, and White Dish looks after " +
      "its friends.\" (Take it to Bert — ASK BERT ABOUT SELLING — or don't. No one's forcing you.)",
    reqFlags: ["heardWdgPitch"],
    deps: [],
    at: "bert",
    doneFlag: "wdgFlipTried",
    reward: { money: 2000, happy: 0 }, // WDG pays for the errand; the real price is your standing
  },
  // Origin quest (the detective): recon the Orchid Room's good table for Doyle.
  // Completes by ASK DOYLE ABOUT THE TABLE once you've actually been inside the
  // Orchid (G.visited.orchid_room, gated by the report node's `when`). The reveal
  // is the syndicate seed; the reward's small — the real payoff is the thread.
  orchid_recon: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "The President's Table",
    giver: "doyle",
    trust: 2, // he reads you first — a sightline test — before handing over a job
    desc: "Get eyes on the Orchid Room's good table — the back room off the Pink Lotus — and see who " +
      "really holds it, then tell Doyle (ASK DOYLE ABOUT THE TABLE).",
    deps: [],
    at: "orchid_room",
    doneFlag: "orchidReported",
    reward: { money: 1500, happy: 4 },
  },
  // Origin quest (the investor): stop Wayne signing as a WDG nominee. Completes by
  // ASK WAYNE ABOUT THE PARTNER once you've seen how White Dish operates (heard
  // Gavin's pitch or been inside the Orchid — the warn node's `when`). Reward is
  // pure สนุก: you saved a man's life savings and got a Sang Som for it.
  nominee_deal: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "The Silent Partner",
    giver: "wayne",
    trust: 2,
    desc: "Wayne's about to sign as the farang face of a bar he'll never really own. Once you've seen how " +
      "White Dish works, set him straight (ASK WAYNE ABOUT THE PARTNER).",
    deps: [],
    at: "wayne",
    doneFlag: "nomineeWarned",
    reward: { money: 0, happy: 5 },
  },
  // Origin quest (the pension): hear the soi as it was — the deepest Tan seed, the
  // quiet man at the good table a generation ago. Pure dialogue; sitting still is
  // the whole mechanic.
  old_days: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "The Old Days",
    giver: "roy",
    trust: 2,
    desc: "Buy Roy's time and let the old soi come back to him — the bars before the brands, and the " +
      "ghosts still propping the place up (ASK ROY ABOUT THE OLD DAYS).",
    deps: [],
    at: "roy",
    doneFlag: "oldDaysHeard",
    reward: { money: 0, happy: 3 },
  },
  // Origin quest (the redundancy): honest counsel to a good man burning his payout
  // too fast. No money reward — the point is that you were straight with him.
  easy_come: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "Easy Come",
    giver: "macca",
    trust: 2,
    desc: "Macca's redundancy is going out faster than he'll admit. Give him the honest maths (ASK MACCA " +
      "ABOUT THE PAYOUT).",
    deps: [],
    at: "macca",
    doneFlag: "payoutPaced",
    reward: { money: 0, happy: 4 },
  },
  // Origin quest (the running): earn enough trust that Pete says the thing eating
  // him — the driver who knew his real name — and keep it quiet for him.
  quiet_one: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "A Quiet One",
    giver: "pete",
    trust: 2, // he gives nothing to a near-stranger; this one you earn
    desc: "Pete is sitting on something heavy. Earn his trust and hear it (ASK PETE ABOUT THE NAME).",
    deps: [],
    at: "pete",
    doneFlag: "nameKept",
    reward: { money: 0, happy: 4 },
  },
  // Origin quest (the returner): carry a careful family word into a room Rob can't
  // be seen in — the Orchid MC thread.
  her_brother: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "Her Brother",
    giver: "rob",
    trust: 2,
    desc: "Rob's ex-wife's brother rides with the club in the Orchid's back room. Carry his word if you " +
      "ever get in there (ASK ROB ABOUT THE BROTHER).",
    deps: [],
    at: "rob",
    doneFlag: "brotherWord",
    reward: { money: 0, happy: 4 },
  },
  // Origin quest (the monger): Barry's trophy album accidentally holds the only
  // photo of the quiet man. Completes once you know why that matters (been in the
  // Orchid or done Doyle's recon).
  wrong_shot: {
    vignette: true,   // an origin scene, not a job — no offer, no ACCEPT, no journal row
    name: "The Wrong Photo",
    giver: "barry",
    trust: 2,
    desc: "Somewhere in Barry's eleven years of trophy snaps is one he shouldn't have. Get a proper look " +
      "once you know what you're looking at (ASK BARRY ABOUT THE PHOTO).",
    deps: [],
    at: "barry",
    doneFlag: "wrongShot",
    reward: { money: 500, happy: 3 },
  },
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
    desc: "{{Win}} a killer pool league night — every third night, ฿100 entry (PLAY KILLER).",
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
    at: "glam",             // a shuttled patron — _questWhere reads his live bar
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
    at: "glam",
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
      "rows, Tree Town's far lane, and the quiet middle stretch of Soi 6.",
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
    at: "fergie",           // patron giver — live location via _patronRoom (his maze today)
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

  // ── The bar-owning chain (expat only) ─────────────────────────────────────
  // _goExpat's closing line promises this — "They say the smart ones end up
  // owning a bar…" — so the chain exists to make it a door rather than a wink.
  //
  // The bar is THE STINKY PINKY, and that choice is the whole design. You already
  // spent `white_dish` talking Bert out of selling it to Ryan Powers; the ailing
  // American owner is still ailing, and holding is not a plan. So the arc pays
  // off: the only buyer who isn't WDG is you. Gavin's smiling pitch loses to a
  // regular, which is exactly the thing WDG cannot price.
  //
  // (Soi Khao Talo's dead Shamrock is deliberately NOT this bar — it's the
  // Darkside, and neither WDG nor the Samsons have any reason to care what
  // happens out there. It's planted as a second-bar hook instead; the pressure
  // out there would come from local Thai interests, not the town rollups.)
  //
  // Built AS a dep chain, not a subsystem: each step completes off a `sets:` on
  // a giver's dialogue node. Four steps: premises → licence → partner → opening.
  bar_premises: {
    name: "The Old Man's Bar",
    giver: "bert",
    reqFlags: ["expatLife"],
    // you can only be offered the bar if you're the reason it wasn't sold
    deps: ["white_dish"],
    desc: "The old man's not getting better, and Bert says holding isn't a plan — " +
      "the Stinky sells to somebody. Ask him whether it could be you (ASK BERT ABOUT BUYING).",
    at: "bert",
    doneFlag: "barPremises",
    reward: { money: 0, happy: 4 },
  },
  bar_licence: {
    name: "Whose Name Is On It",
    giver: "wayne",
    reqFlags: ["expatLife"],
    // nominee_deal is a real prerequisite: Wayne gives the straight answer to the
    // one person who stopped him signing the crooked one.
    deps: ["bar_premises", "nominee_deal"],
    desc: "A farang can't hold the majority — that's the law, not a loophole. Wayne " +
      "owes you a straight answer about how it's actually done (ASK WAYNE ABOUT THE LICENCE).",
    at: "wayne",
    doneFlag: "barLicence",
    reward: { money: 0, happy: 4 },
  },
  bar_partner: {
    name: "Fifty-One Percent",
    giver: "candy",
    reqFlags: ["expatLife"],
    desc: "Fifty-one percent has to be a person, not a structure — someone you'd hand " +
      "your passport to. There is one obvious name (ASK CANDY ABOUT THE PARTNERSHIP).",
    deps: ["bar_licence"],
    at: "candy",
    doneFlag: "barPartner",
    reward: { money: 0, happy: 6 },
  },
  bar_opening: {
    name: "Under New Management",
    giver: "bert",
    reqFlags: ["expatLife"],
    desc: "Signed, stamped and paid. All that's left is to open your own doors and " +
      "find out who walks in (ASK BERT ABOUT OPENING).",
    deps: ["bar_partner"],
    at: "bert",
    doneFlag: "barOpen",
    reward: { money: 0, happy: 10 },
  },
};

// ── Nights behind your own rail ─────────────────────────────────────────────
// Working isn't a flat trade of happiness for money — that would make the whole
// decision arithmetic. Some nights behind your own bar are genuinely the best
// nights you have: two-week millionaires on the bell every hour, a staff
// birthday that didn't go stupid, the one high-season night your regulars all
// turn up at once and everything simply works. Those are the exceptions, and
// they're offset by the other exceptions — a shakedown, a drunk who turns, a
// girl who doesn't come in.
//
// Most nights are neither, which is what makes the other two land.
//
// `when(G)` gates an event; `weight` is relative. money/happy are the tail.
// THIS is where faction standing finally does something: police attention is
// weighted by how far outside the arrangement you've stayed. Inside, it simply
// doesn't happen — that is what being inside IS.
const WORK_NIGHTS = [
  // ── the good ones ────────────────────────────────────────────────────────
  {
    id: "millionaires", weight: 5, happy: 4, money: 4000,
    text: "Two lads three days into a two-week holiday and a bonus they haven't " +
      "told their wives about find your bell at nine o'clock and ring it roughly " +
      "hourly until one. The girls are laughing at them, not with them, and they " +
      "are having the time of their lives and do not care. The till sings. Bert " +
      "works the whole night with the expression of a man watching weather come " +
      "in off the sea.",
  },
  {
    id: "allin", weight: 4, happy: 5, when: G => !_lowSeason(),
    text: "Every regular you have is in tonight. Not arranged, not a promotion — " +
      "they simply all came, the way a room sometimes decides to be full. Two of " +
      "them are arguing about a football match from 1998. Somebody's put the " +
      "wrong music on and nobody has asked for it to be changed. This is the " +
      "night people mean when they say they want to own a bar, and you get maybe " +
      "six of them a year.",
  },
  {
    id: "birthday", weight: 4, happy: 4, money: -2500,
    text: "It's one of the girls' birthdays, which means a cake from the market, " +
      "a crate on the house, and a speaker turned up past the point Bert " +
      "approves of. It costs you a couple of thousand baht and nothing stupid " +
      "happens, which is the whole trick of a staff party. She cries a bit. " +
      "Somebody's mother is on a video call for twenty minutes.",
  },
  {
    id: "footy", weight: 4, happy: 3, money: 2200,
    text: "A match nobody expected to matter goes to the last ten minutes with " +
      "the room split down the middle, and the bar makes more in that half hour " +
      "than it did all Tuesday. Two men who were shouting at each other buy each " +
      "other beers afterwards, which is the entire case for football.",
  },
  // ── the bad ones ─────────────────────────────────────────────────────────
  {
    // the faction system, finally doing something. Inside the arrangement this
    // simply does not happen — that is what being inside IS.
    id: "police", weight: 0, happy: -3, money: -3000,
    when: G => (G.syn && G.syn.friction >= 2) && _faction("syndicate") < 2,
    // tuned down from 3+2f: at the old weight it was 40% of all events and
    // crowded the good nights out entirely, which flattened the texture. Being
    // inspected should DEFINE life outside the arrangement, not be the only
    // thing in it.
    weightFn: G => 1 + (G.syn.friction || 0),
    text: "Two officers come in at eleven, entirely polite, and go through the " +
      "licence, the staff list, the fire exit and the hours. Nothing is wrong. " +
      "Nothing is ever quite wrong. It takes ninety minutes on a Friday, the " +
      "room empties around them, and at the end there is a figure that is not " +
      "written down anywhere and is not negotiable and is not, in fairness, " +
      "very large. You pay it. Bert doesn't look at you while you do.",
  },
  {
    id: "violent", weight: 3, happy: -3,
    text: "A big lad who has been fine all week goes off at eleven over nothing " +
      "anybody can reconstruct afterwards. A stool goes. One of the girls gets " +
      "an elbow in the face getting out of the way, which is the part you will " +
      "think about later, not the stool. He's out in under a minute — the soi " +
      "handles it the way the soi handles it — and the room is quiet for an hour " +
      "and then, unnervingly, completely normal.",
  },
  {
    id: "noshow", weight: 3, happy: -2,
    text: "One of the girls doesn't come in and doesn't answer her phone. Nobody " +
      "will say anything about it, which tells you it isn't an emergency and is " +
      "somebody's boyfriend. You cover her section yourself, badly, and she is " +
      "in tomorrow as though nothing happened, and you decide — twice — not to " +
      "raise it.",
  },
  {
    id: "runner", weight: 2, happy: -1, money: -1800,
    text: "A table of six runs a tab all evening and then simply isn't there. " +
      "Bert saw it coming twenty minutes out and still couldn't stop it without " +
      "making a scene in front of forty customers, which is exactly what they " +
      "were counting on.",
  },
];

// ── Procurement: how work actually gets given out ───────────────────────────
// Once you own a bar, every improvement to it is a procurement decision, and
// procurement runs through whoever your partners are. Cleaning, mounting a
// screen, a till system — you do not shop around, and you do not do it
// yourself. The last one matters: a farang up a ladder with a drill isn't being
// thrifty, he's taking work off Thai people, and everyone around him will read
// it that way.
//
// The frame this content holds (see engine-systems _synAsk): this is not
// corruption being discovered. It is how business is done, here and everywhere
// — the only local difference is that nobody troubles to pretend otherwise.
// So no character treats it as a scandal, and the words "bribe" and
// "corruption" never appear. Gavin's "White Dish looks after its friends" is
// the identical sentence in a British accent.
//
// Refusing is allowed and nothing is DONE to you. You simply stop being helped,
// which for a business arrives as weather rather than as an event.
const SYNDICATE_JOBS = [
  {
    id: "cleaning",
    first: true,                        // the induction: stated, not asked
    lead: "\"Now. The cleaning.\"",
    ask: "It is not a question, and it isn't framed as one. Tan says it the way he " +
      "would tell you which road is shut — a thing already arranged, mentioned only " +
      "so you aren't surprised by it. \"I have three women. Good women, they do the " +
      "Orchid and two of the hotels. They will do your bar — morning, before you are " +
      "awake, you never see them.\" He names a monthly figure that is neither cheap " +
      "nor a swindle; it is simply the number. \"You pay them direct, not me. I take " +
      "nothing, my friend, you know this.\"",
    whoLabel: "ask who they are",
    who: "\"They are Burmese.\" He says it as flatly as he said the number. \"Most " +
      "of the cleaning in this town is Burmese, and most of the building, and most of " +
      "the kitchens you have eaten in this week. You did not notice, which is the job " +
      "done properly.\"\n\n\"They speak Thai — enough for the market, enough for " +
      "the police if they are polite. Reading, no. That is the part that makes " +
      "trouble.\" A small movement of the hand, dismissing his own digression. " +
      "\"Anyway. They are reliable, they do not steal, and if you keep them then some " +
      "other things become easier for you also. Not from me. Just — easier.\"",
    yes: "\"Good.\" That is the whole of his reaction; he is already texting " +
      "somebody.\n\nThey start Thursday. They are very good, the bar has never been " +
      "this clean, and Bert — who has opinions about most things — has none about this " +
      "at all. \"Best cleaners on the Darkside, bud. Wouldn't ask where they came " +
      "from.\"",
    perk: "The bin men, who used to come when they came, now come. And the uncle who " +
      "brings the beer up from Sattahip in a Hilux with one working door starts quoting " +
      "you the price he quotes everybody inside — not the price on the invoice. He does " +
      "it without ceremony: says a smaller number, starts unloading.",
    no: "\"Ah.\" A nod, perfectly pleasant. \"Then you will find somebody. It is not " +
      "difficult.\"\n\nAnd he's right; it isn't. You hire two women through Bert, " +
      "they're fine, the bar is clean enough.",
  },
  {
    id: "screen",
    lead: "\"The football. You need a screen.\"",
    ask: "He has evidently already discussed this with Bert, and possibly with the " +
      "regulars. \"Big one, behind the bar, on the bracket — and the wiring done " +
      "properly, in the trunking, not taped along the beam like the Water Buffalo.\" " +
      "A number, again without any theatre about it. \"My wife brother-in-law does the " +
      "hotels. Two men, one morning.\"",
    whoLabel: "ask why not do it yourself",
    // the rule stated by a character, not explained by the narrator
    who: "You mention, mildly, that you could put a bracket up yourself and save the " +
      "money.\n\nThe pause is very short and entirely good-natured, and it is the " +
      "first time all night he looks at you as though you have said something foreign. " +
      "\"No, no.\" He is smiling. \"My friend — you, up a ladder, with a drill, in " +
      "your own bar, where everybody can see.\" He lets you picture it. \"That is " +
      "work. Thai people do that work. You take it from them and you save — what, six " +
      "thousand baht? And every man on this soi knows the farang does his own wiring " +
      "because he will not pay.\"\n\nA shrug, the subject closed. \"You are the " +
      "owner. Owning is your job. Let the men who do the work do the work.\"",
    yes: "Two men arrive at nine, are finished by one, and take tea rather than beer " +
      "because they are working. The trunking is straight. The screen is enormous and " +
      "sits exactly level, which you only notice because the one at the Water Buffalo " +
      "never has.",
    perk: "Neither of them will take a tip. A week later a man you have never met " +
      "reboots your frozen till over the phone, for nothing, because he owes somebody " +
      "who owes somebody.",
    no: "\"Of course.\" No shift in tone at all. \"There are many people who do " +
      "this.\"\n\nThere are. The two lads you find are cheaper by half and pleasant " +
      "company, and the bracket goes up in an afternoon, and it is fine.",
  },
  {
    id: "pos",
    lead: "\"And the till.\"",
    ask: "\"That box is from before the flood. When it dies on a Saturday you will " +
      "lose the whole night, and it will die on a Saturday, because that is when they " +
      "die.\" He does not oversell it; he never does. \"There is a company. They do " +
      "the Orchid, the Golden Dragon, four hotels. They come out same day, always. It " +
      "is not the cheapest and it is not close to the cheapest.\"",
    whoLabel: "ask what you're really paying for",
    who: "\"You are paying for same day.\" He says it as though it were obvious, " +
      "which it is. \"Anybody can sell you a till. On a Saturday in high season, when " +
      "every bar on this coast has the same problem, you are one of forty phone calls " +
      "— or you are one of the four they come to first.\"\n\nHe opens the car door. " +
      "\"That is the only thing you ever buy in this country, my friend. Not the " +
      "thing. The order of the phone calls.\"",
    yes: "It costs what he said it would cost, which is too much. In August it dies on " +
      "a Saturday at nine in the evening and a man is standing in your bar at ten past " +
      "with the replacement under his arm, and you understand exactly what you bought.",
    perk: "You are one of the four.",
    no: "\"Mm.\" He considers the street for a moment. \"Then I hope it does not " +
      "die on a Saturday.\"\n\nThe system you buy instead is genuinely good and " +
      "genuinely cheaper, from a company in Bangkok with a very smart website.",
  },
];

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

  // ── Jomtien's quiet-side regulars (docs/map-coverage.md) ─────────────────────
  // Populating the biggest dead zone with the crowd it always implied — the
  // long-stay, settled, retired set at Sumalee's four Soi 7 bars. The other half
  // of The Quiet Side quest: it mourned Gordon, the regular who stopped coming;
  // these are the ones who didn't. Roger knew him (the tie), and his Gordon node
  // is quest-aware. Homed across the four bars so each has a regular nightly.
  roger: {
    name: "Roger", emoji: "⚽", age: 67, nat: "British", pronoun: "he",
    home: "lucky7", hops: true,
    look: "British man of sixty-seven, balding, reading glasses on a string, soft blue football shirt, contented.",
    desc: "Sixty-seven, an Everton shirt gone soft with washing, reading glasses on a string, and " +
      "the settled contentment of a man who has been told precisely where he may and may not " +
      "smoke. He retired to Jomtien eighteen years ago, married Lek from the fruit stall, and " +
      "escapes to Soi 7 for the football and the company of men who also have a Lek at home.",
    dialogue: [
      { text: "“Alright.” Roger shifts along a stool he doesn't need to. “Sit down, son, you're " +
          "blocking the telly. Roger. Been here since — oh, before you were shaving. What's the score, " +
          "what's the news, and don't you dare tell Lek I had the third one.”",
        short: "“Roger. Been here eighteen years. Sit down, son, you're blocking the telly.”" },
      { topic: "jomtien", text: "“Why Jomtien? Because Pattaya's for the young and the daft, and " +
          "I'm neither any more.” He counts it off. “Beach is quiet, beer's cheap, the wife's happy, " +
          "and if I drop dead the ambulance can actually get down the soi. You don't want the go-go at " +
          "my age, son. You want a fan, a fixture, and somewhere nobody's trying to sell you anything.”",
        short: "“Pattaya's for the young and daft. Here it's quiet, cheap, nobody's selling you anything. That'll be you one day.”" },
      { topic: "gordon", when: (st, G) => _flag("quietSideDone"), text: "“Gordon.” The smile goes gentle. “So now " +
          "we know. Went in his sleep, lucky sod, more than most of us'll get.” He nods along the bar. " +
          "“Sumalee put his picture up — small, by the King, you'd not know to look. Fifteen year he sat " +
          "that stool, right where you are, football and a Leo and never a cross word.” He lifts his " +
          "glass an inch. “To Gordon. Miss the daft article.”",
        short: "“So now we know about Gordon — went in his sleep. Sumalee put his picture up by the King. To Gordon.”" },
      { topic: "gordon", when: (st, G) => !_flag("quietSideDone"), text: "“Gordon? Didn't come back this cool " +
          "season, and that's not like him — fifteen year, never missed one.” A frown. “Sumalee's " +
          "fretting, though she'd walk into the sea before she'd say so. I keep hoping the daft sod's " +
          "just found somewhere warmer and forgot to write. You hear anything, you tell her, not me.”",
        short: "“Gordon didn't come back this season — fifteen year, never missed. Sumalee's fretting. You hear anything, tell her.”" },
    ],
  },
  dieter: {
    name: "Dieter", emoji: "🍺", age: 71, nat: "German", pronoun: "he",
    home: "seabreeze", hops: false,
    look: "German man of seventy-one, silver hair, very clean glasses, pressed pale short-sleeve shirt, precise.",
    desc: "Seventy-one, a pressed short-sleeve shirt, a beer mat squared to the table edge, and twenty " +
      "years of Jomtien behind a pair of very clean glasses. He drinks precisely two Chang a night, no " +
      "more, and can quote you the price of everything on this soi across three different decades.",
    dialogue: [
      { text: "“Guten Abend.” Dieter does not move his beer mat. “You may sit. I am Dieter. Twenty " +
          "years here — I remember when this soi was sand and one bar and the beer was fifteen baht, and " +
          "now the beer is” — he taps the menu — “well. You see. Everything changes and gets more " +
          "expensive and nobody asks the Germans.”",
        short: "“Dieter. Twenty years here. When this soi was sand and one bar. Everything changes, nobody asks the Germans.”" },
      { topic: "jomtien", text: "“Jomtien is correct for a pensioner. Quiet, orderly, the hospital is " +
          "good, the flight to Frankfurt is direct.” He aligns the mat again. “Pattaya I go maybe twice " +
          "a year, for the paperwork, and I come home tired and poorer. Here I know the price of my beer " +
          "and the name of the lady who pours it. At my age this is enough. More than enough. It is " +
          "comfortable.”",
        short: "“Jomtien is correct for a pensioner: quiet, orderly, the hospital good. I know the price of my beer and the lady who pours it. Enough.”" },
      { topic: "money", text: "“The pension is the pension — it does not grow. But the baht, it moves.” " +
          "A precise sigh. “When I came, one euro was fifty baht. Now?” He does not say the number; it " +
          "offends him. “So I drink two beer, not three, and I do not complain, because complaining is " +
          "also not free. This is why the Germans last out here and the English” — the smallest dry look " +
          "toward Roger's usual stool — “do not.”",
        short: "“The pension doesn't grow, the baht moves. So I drink two beer, not three, and don't complain. This is why the Germans last.”" },
    ],
  },
  gerald: {
    name: "Gerald", emoji: "🥂", age: 64, nat: "British", pronoun: "he",
    home: "sandbar", hops: true,
    look: "British man of sixty-four, silver hair, good tan, cream linen shirt, gin in hand, dapper.",
    desc: "Sixty-four, linen and a good tan, a gin-and-slimline in front of him and a paperback face-down " +
      "beside it. He has held the same sunbed on Dongtan for eleven years and knows every piece of gossip " +
      "that has ever crossed it. Camp as a row of tents and rather better company than most of the soi, " +
      "and the last man on this beach you should underestimate.",
    dialogue: [
      { text: "“Hello, you.” Gerald looks you over with frank, friendly appraisal and finds you " +
          "adequate. “Gerald. Don't fret, darling, you're not my type — too much drama in the young, and " +
          "I've quite retired from drama.” He pats the next stool. “Sit. Tell me something I don't know, " +
          "which after eleven years on that beach is a genuine challenge.”",
        short: "“Gerald. You're not my type, darling — too much drama in the young. Sit, tell me something I don't know.”" },
      { topic: "dongtan", text: "“Dongtan is the civilised end — our end, since you're asking, and even " +
          "if you're not.” A sip. “Same sunbed eleven years, same boy brings my towel, same gossip with " +
          "the trimmings changed. It isn't exciting, and that, dear heart, is the entire point. I did " +
          "exciting. Exciting is exhausting and it never once remembers your birthday.”",
        short: "“Dongtan's the civilised end. Same sunbed eleven years. Not exciting — that's the point. I did exciting; it never remembers your birthday.”" },
      { topic: "jomtien", text: "“Why here and not Pattaya? Because Pattaya tries too hard and Jomtien " +
          "has stopped trying, and at a certain age you find you prefer the company that's stopped trying.” " +
          "He turns the paperback face-up and back down, a small tell. “Also nobody here cares who I am or " +
          "was, which after a whole life of people caring rather a lot is the closest thing to a holiday " +
          "I've had.”",
        short: "“Pattaya tries too hard; Jomtien's stopped trying. I prefer the company that's stopped trying. And nobody here cares who I was.”" },
    ],
  },
  sandra: {
    name: "Sandra", emoji: "🍷", age: 59, nat: "British", pronoun: "she",
    home: "coconut", hops: false,
    look: "British woman of fifty-nine, sensible grey bob, glass of white wine, watchful, unhurried.",
    desc: "Fifty-nine, a sensible bob going gracefully grey, a glass of white going slowly warm, and the " +
      "unhurried gaze of a woman who moved here alone eight years ago and has regretted precisely none of " +
      "it. She runs some small quiet thing on a laptop, watches Soi 7 the way you'd watch a nature " +
      "documentary, and misses absolutely nothing.",
    dialogue: [
      { text: "“Well, hello.” Sandra marks her place with one finger. “Sandra. Yes, on my own; yes, " +
          "by choice; and no, it isn't sad — you'd be amazed how often I have to run through all three.” " +
          "A dry smile. “Sit down. I've watched this soi for eight years. I can tell you who everyone is, " +
          "and which of them is lying about it.”",
        short: "“Sandra. On my own, by choice, and no it isn't sad. Eight years watching this soi — I know who everyone is and who's lying.”" },
      { topic: "jomtien", text: "“I came out on my own at fifty-one, which everyone at home treated as a " +
          "nervous breakdown with a suntan.” She sips. “But a woman alone in Jomtien is invisible in the " +
          "nicest possible way — nobody is selling to you, nobody is marrying you, you are simply left to " +
          "get on with it. A little flat, a little income, a very big balcony. The best decision I have " +
          "never once had to explain to anyone.”",
        short: "“Came out alone at fifty-one — everyone called it a breakdown with a suntan. A woman alone here is invisible in the nicest way. Best decision I never explained.”" },
      { topic: "soi", text: "“What do I see? Everything, darling — that's the whole joy of the corner " +
          "table.” She nods minutely down the strip. “The new girls learning the ropes, the old boys " +
          "pretending they aren't lonely, the couples who'll last and the ones who won't, and Sumalee " +
          "keeping the entire thing turning without ever appearing to move. Better than anything on the " +
          "telly, and it changes cast every season. I shall be very cross when I die and it carries on " +
          "without me.”",
        short: "“Everything — that's the joy of the corner table. New girls, lonely old boys, Sumalee turning it all. Better than telly, new cast every season.”" },
    ],
  },

  glam: {
    name: "Glam", emoji: "🎸", age: 77, nat: "German",
    pronoun: "he",
    home: "cheeky_monkey", hops: false, shuttle: { after: 4, to: "hyper" }, protected: true,
    look: "German man of seventy-seven, wild sparse blonde hair, silk shirt open at the chest, tanned.",
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
    pronoun: "he",
    home: "gold_rush", hops: true, haunts: ["Soi Buakhao", "Tree Town"],
    avoids: ["candy_bar", "candy_bar_2", "stinky_bar"], rage: ["bert", "candy", "stinky"],
    look: "Northern Irish man of fifty-eight, short, bald, sunburnt red, boxer's nose, cauliflower ears.",
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
    pronoun: "he",
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
    pronoun: "he",
    home: "queen_vic", hops: false,
    look: "American man of seventy-four, horn-rimmed glasses, clashing Hawaiian shirt, spiral notebook.",
    desc: "Seventy-four, horn-rimmed glasses and a Hawaiian shirt at war with itself, a " +
      "spiral notebook and a biro he clicks while he watches the soi. He has been on this " +
      "coast longer than most of the bars, and he is writing all of it down whether it " +
      "likes it or not.",
    dialogue: [
      { topic: "glam", when: (st, G) => !_flag("diamondTruth"),
        text: "\u201cHere\u2019s what bothers me.\u201d The biro stops. \u201cA man with that much " +
          "money does not spend his last years on a plastic stool on the Jomtien strip. He has a " +
          "house somewhere. He has people.\u201d He shrugs, and it is not a comfortable shrug. " +
          "\u201cAnd yet every night, that bar. Not the next one along, not the one with the " +
          "aircon. That one.\u201d A long look at nothing. \u201cAsk him about the tour, he\u2019ll " +
          "talk till closing. Ask him why he sits THERE and he changes the subject so smoothly " +
          "you don\u2019t notice for an hour.\u201d",
        short: "\u201cWhy that bar? Ask him and he changes the subject beautifully.\u201d" },
      { topic: "glam", when: (st, G) => _flag("diamondTruth"),
        text: "You tell him as much as is yours to tell, which is not much. Mort listens without " +
          "writing anything down, which from him is a kind of ceremony. \u201cFour years I sat " +
          "twenty feet from that and called it a dead end.\u201d He caps the biro. \u201cIt does " +
          "not go in the column. Some things are just a man wanting to be near his kid.\u201d",
        short: "\u201cIt does not go in the column.\u201d" },
      // He invited you for a beer over text. If you turn up and he greets you as
      // a stranger, the invitation was a lie the game told — so this sits FIRST
      // and wins the greeting for as long as it is the newest thing between you.
      { when: (st, G) => _flag("jokeWho") && !_flag("mortMet"),
        sets: ["mortMet"],
        fx: (st, G) => { st.trust = Math.min(5, (st.trust || 0) + 1); },
        text: "He is already looking at the door when you come through it, and he places you " +
          "before you have said anything. \u201cThe one in forty.\u201d The notebook closes on " +
          "the biro. \u201cSit down, I said I would buy and I am a man of my word about beer " +
          "if nothing else.\u201d He signals two without asking what you drink. \u201cMort. " +
          "You already know that, you have had my material all week.\u201d",
        short: "\u201cThe one in forty. Sit down \u2014 I said I would buy.\u201d" },
      // The Glam saga (oldrocker → keys → quietmoney → family) is the best chain
      // in the game and the easiest to never find: its giver is a mamasan on a
      // three-bar rota and its subject is a patron in a bar you may never enter.
      // So Mort points at it — in character, because a columnist who cannot get
      // a story out of a man for four years WOULD hand it to somebody else.
      //
      // He must not spoil it. He does not know about Diamond; nobody does until
      // she decides you have earned it, and that decision is the whole chain.
      // What he has is a shape that does not add up, which is the right amount.
      // …and NOT on the first hello. A man who has not introduced himself does not
      // open with "do something for an old man"; he tells you who he is, and the
      // lead comes the next time you sit down. Gated on having heard him once.
      // Not offered in soi6 mode: the whole saga lives down in Jomtien and the
      // challenge can't leave the street — a lead you can't follow is a broken
      // promise (playtest flag #5, 2026-08-15).
      { when: (st, G) => G.mode !== "soi6" &&
          !G.quests.oldrocker && !_flag("glamHeard") && !_flag("mortGlam") &&
          // patrons keep their own book (G.patronTalk.talked), NOT G.talked —
          // and it resets daily, which is fine: the lead is once-ever anyway
          !!(G.patronTalk && G.patronTalk.talked && G.patronTalk.talked.mort),
        sets: ["mortGlam"],
        text: "He taps the biro twice and looks at you properly for the first time. \u201cSince " +
          "you\u2019re here \u2014 do something for an old man. There\u2019s a German drinks at " +
          "the Cheeky Monkey \u2014 down in Jomtien, the Thappraya strip. Seventy-odd, silk " +
          "shirt, hair like a dandelion in a wind tunnel. " +
          "Glam, they call him.\u201d He turns the notebook round; the page is mostly crossings-" +
          "out. \u201cFour years I\u2019ve tried to get his story and four years he\u2019s given " +
          "me the same nine anecdotes about a tour in \u201978. Charming. Useless.\u201d",
        short: "\u201cThe German at the Cheeky Monkey, on the Jomtien strip. Glam. Four years and nine anecdotes.\u201d" },
      { topic: "jokes", when: (st, G) => _flag("jokeWho"),
        text: "\u201cThe texts? Forty years of writing to people who never write back, and it " +
          "turns out I could not stop.\u201d He taps the notebook. \u201cThe column takes one " +
          "joke a week. I write nine. The other eight have to go somewhere or they rot, so " +
          "they go to whoever gave me a number in a bar and forgot.\u201d A shrug that is not " +
          "quite as light as he means it. \u201cA man my age either has a routine or he has " +
          "nothing at all going on. Mine sends jokes to strangers at nine every evening.\u201d",
        short: "\u201cThe column takes one a week. I write nine. The rest go to strangers.\u201d" },
      { text: "\"Mort.\" He finishes the line before he looks up. \"I write the Nite " +
        "Owl — the back-page column, the one your granddad read on the toilet. Retired " +
        "twice, un-retired twice; a man needs a deadline or the days run together and " +
        "the mind goes to soup.\" He clicks the pen. \"So I watch, I write it down, and " +
        "I don't give a hoot who minds. READ THE COLUMN if you like — it's mostly true.\"",
        short: "\"I write the Nite Owl. READ THE COLUMN — mostly true. Keeps me sane.\"" },
      { topic: "amulet", req: ["amuletReturned"],
        text: "\"The one off the far end of the beach.\" Mort does not ask how you know he " +
          "knows; he has been sitting in this window for twenty years. He clicks the biro " +
          "twice. \"You gave it back and got about four words for it, and you have been " +
          "chewing on that ever since.\" A dry look over the horn-rims. \"Son, that was the " +
          "whole conversation. She thanked you, she meant it, and she was not going to " +
          "stand on a beach explaining her family to a tourist — because the moment she " +
          "does, you are a man who needs looking after, and she has got a shrine to sweep " +
          "and forty bottles of Leo on ice.\" He turns back to the soi. \"You wanted the " +
          "scene where she cries and you carry it home with you. You got the real one. " +
          "Take the win.\"",
        short: "\"You got the real conversation, not the one you wanted. Take the win.\"" },
      { topic: "column", text: "\"Forty years of the same story, squire, and it never " +
        "gets old because the punters keep arriving new. A reader letter, a bar listing, " +
        "a joke, and whatever the street taught me that week. I don't moralise — I report " +
        "the weather and the women and let a man draw his own conclusions.\" A dry look. " +
        "\"He never does. READ THE COLUMN — you can pull it up anywhere now.\"" },
      { topic: "sponsor", text: "\"The kept ones?\" He clicks the pen, pleased to be asked. " +
        "\"Some fella back home wires her every month to stay off the floor — Germany, " +
        "Australia, a name on her phone she'll show you like a passport. She means the 'no'.\" " +
        "A dry look over the horn-rims. \"One lever only, squire, and it's an ugly one: you " +
        "outbid him. Not the barfine — HER. Send it, week on week, till your number's the " +
        "bigger one and she can't un-see it. Costs a fortune, and you're buying a person off " +
        "another man, and she knows it, and takes it. I've filed that story forty years. " +
        "Nobody ever likes how it reads.\"",
        short: "\"A kept girl? One lever: outbid her sponsor — send her money, week on week, till your number's bigger. Costs a fortune, and it never reads clean.\"" },
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
    pronoun: "he",
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
      { topic: "phones",
        text: "\"You want the year it went? I can give you the year.\" He can, and he does, " +
          "and it is not the year anything happened to this town. \"Two thousand and nine, " +
          "ten, thereabouts. When they all got the phones.\" The lager comes down on the " +
          "mat. \"Before that, son, a girl had to PICK. Understand? She'd pick you out of " +
          "the bar on the Monday and that was it, she was yours the fortnight — every " +
          "night, no messing, no mystery, no vanishing off at eleven because her sister's " +
          "locked out.\" He is entirely accurate and one inch from the point, and he does " +
          "not turn his head. \"Now she's sat in front of you doing four of us out of her " +
          "handbag. Germany at breakfast, you at nine, some poor sod in Stockholm at " +
          "midnight.\" A wounded pull. \"It's not the same girls any more. Something went " +
          "out of them.\"",
        short: "\"Two thousand and nine, when they got the phones. Before that a girl had to pick. Something went out of them.\"" },
      { topic: "sponsor", text: "\"Ah. The one behind the till who won't come out to play.\" He " +
        "nods slow, an old campaigner reading the ground. \"Kept girl, son. Some fella back home — " +
        "Germany, Australia, wherever — wires her every month to stay off the floor. She'll show you " +
        "his name on her phone and mean the 'no'.\" The glass turns. \"One lever only, and it's an " +
        "ugly one: you outbid him. Not the barfine — HER. Send it, gift it, week on week, till your " +
        "number's the bigger one and she can't un-see it. Costs a fortune, and it's not a nice thing " +
        "you're doing — you're buying a person off another man, and she knows it, and takes it anyway. " +
        "That's the part nobody warns you about.\"",
        short: "\"A kept girl? One lever: outbid her sponsor — send her money, week on week, till your number's bigger. Costs a fortune, and it isn't clean.\"" },
    ],
  },

  chuck: {
    name: "Chuck", emoji: "🤠", age: 58, nat: "American",
    pronoun: "he",
    home: "tequila_queen", hops: true,
    look: "American man of fifty-eight, sunburnt scalp and arms, plumbing-company polo, grinning.",
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
    pronoun: "he",
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
    pronoun: "he",
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
    pronoun: "he",
    home: "blue_dog", hops: false,
    look: "Thai man of forty-seven, lean, hotel-maintenance polo, weathered face, bottle of Leo.",
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
    pronoun: "he",
    home: "jasmine_garden", hops: true,
    look: "American man of fifty-four, six-foot-four, huge hands, grey buzz cut, mild expression.",
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
      { topic: "girlfriend", text: "\"Fella I knew out here — pipeline money, " +
        "patient sort — barfined the same girl twenty-one nights straight. " +
        "Dinners. Beach walks. Coffee on the balcony of a mornin'.\" The bottle " +
        "turns a slow quarter. \"Weren't a lie anywhere in it, that's the thing. " +
        "He didn't look at nobody else. Neither did she.\" A pull, unhurried. " +
        "\"Then one mornin' he tells her, darlin', you can quit the bar now — " +
        "and she says, real sweet, real confused, okay... but send mama the fine " +
        "by three. Or did he maybe wanna pay her salary by the month instead.\" " +
        "He sets the bottle down soft, like it might bruise. \"Weren't nobody " +
        "lyin', see. That's the part that'll get you. He was in love, and she " +
        "was at work, and them two things look exactly the same from the " +
        "outside. Every damn day of it.\" A beat. \"She told him he was special, " +
        "and I believe she meant it. I believe that made it worse.\"",
        short: "\"Twenty-one nights, same girl. He was in love; she was at work. Both true — that's the part that'll get you.\"" },
    ],
  },

  drew: {
    name: "Drew", emoji: "🚬", age: 53, nat: "American",
    pronoun: "he",
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
    pronoun: "he",
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
    pronoun: "he",
    home: "blue_dog", hops: false,
    look: "American man of sixty-two, faded Superman t-shirt over a heavy chest, grey stubble.",
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
    pronoun: "she",
    home: "queen_vic", hops: false,
    look: "American woman of forty-seven, greying shoulder-length hair, faded flannel shirt tied at the waist.",
    desc: "Forty-seven, unkempt shoulder-length hair gone grey, a faded flannel shirt " +
      "tied at the waist in a climate that argues against it. On the bar next to " +
      "her Singha: an actual Discman, its foam headphones held together with " +
      "electrical tape. She has the corner seat with the window view of Soi 6 — " +
      "the chaos observed from the calm side of the glass.",
    dialogue: [
      // Greeting is a little state machine: a stranger gets the full introduction;
      // a returning face gets a shorter one; once she's opened up (mood "open") it
      // warms. dstate/trust/mood are set by the nodes below — see _npcState.
      // Callback: if she's heard where you're from, she quotes it back (%home% is
      // filled by _fillSaid from G.player.said) — she keeps most things.
      { when: (st, G) => st.dstate !== "stranger" && G.player.said && G.player.said.home,
        text: "\"%home%.\" She says it like a thing she filed and kept. \"Still standing, or did you " +
          "burn that one down behind you too?\" The headphones are already at her neck — you're a known quantity now.",
        short: "\"%home%. Still standing?\" (She kept it. She keeps most things.)" },
      { when: (st) => st.mood === "open",
        text: "The headphones are at her neck before you've sat — for Angela, an " +
          "honour guard. \"Back on my side of the glass. Good.\" A nod at the stool " +
          "beside her. \"Sit. Mind the dart line.\"",
        short: "\"Back on my side of the glass. Sit — mind the dart line.\" (Headphones already down: an honour guard.)" },
      { when: (st) => st.dstate !== "stranger",
        text: "\"You again.\" The headphones come halfway down, provisional. \"Window " +
          "seat's mine, but the one beside it minds the dart line the same.\" Not warmth, " +
          "exactly. Not not-warmth either.",
        short: "\"You again.\" The headphones come half-down. Provisional." },
      { text: "\"Angela.\" The handshake is brief and firm; the eye contact is " +
        "rationed. \"Yes, that's a Discman. No, it's not ironic.\" She turns the " +
        "corner of a smile at the window, at Soi 6 howling away across the road. " +
        "\"I sit on this side of the glass. Best nature documentary in town — " +
        "you get the whole ecosystem without getting wet.\" She slides the " +
        "headphones down to her neck, which for her is a door opening.",
        short: "\"Yes, it's a Discman. No, it's not ironic.\" The headphones come down: a door opening.",
        asks: { key: "home", q: "She studies you a moment, unhurried. \"So where's home, before all this? Humour me.\"" } },
      { topic: "drew", text: "\"Drew. Yeah.\" The tone of a fact being filed. \"Same " +
        "schoolhouse at DLI — Korean, he was a class ahead. We weren't friends. We " +
        "just conjugated the same verbs in the same hallways.\" She turns the " +
        "Singha a quarter. \"Twenty-five years later his Facebook is all neon and " +
        "beach bars, and he looked — unstuck. I'd been stuck a long time. So.\" A " +
        "small shrug at the enormity of the decision. \"I was here four months " +
        "before I told him. He said 'huh.' We nod now, down the soi. That's the " +
        "right amount of Drew.\"",
        short: "\"Same schoolhouse, not friends. His Facebook looked unstuck. So. We nod now.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      { topic: "90s", text: "She taps the Discman like a witness taking the oath. " +
        "\"In here it's 1997, permanently. Mixtapes, a working Tower Records, my " +
        "whole life ahead of me and none of it wrong yet.\" She says it lightly, " +
        "which is the practiced part. \"Everything after 2001 reads like somebody " +
        "else's biography — the medical discharge, the marriage, the medications " +
        "with the names like minor Star Trek characters.\" The headphones get a " +
        "small adjustment. \"The 90s is the last decade I trust. So I brought it " +
        "with me.\"",
        short: "\"In here it's 1997, permanently. The last decade I trust.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      { topic: "depression", when: (st) => st.trust < 3, deflect: true,
        text: "A flat look; the headphones stay put. \"That's a third-drink conversation " +
          "and you're on your first. I don't hand strangers my whole chart.\" She turns " +
          "back to the window, the subject closed with brisk efficiency.",
        short: "\"That's a third-drink conversation and you're on your first.\" (Stick around; earn it.)" },
      { topic: "depression", when: (st) => st.trust >= 3,
        text: "She doesn't flinch at the word; she's clearly " +
        "done more reps with it than you have. \"Twenty years of it. The " +
        "brochure calls it 'treatment-resistant,' which is a hell of a review.\" " +
        "A sip. \"Thailand doesn't cure it. Anybody says this town cures " +
        "anything, count your kidneys.\" Then, at the window, the light going " +
        "gold on the chaos: \"But back home the sadness had my address. Here it " +
        "has to commute. The sun, the fruit guy who knows my order, a hundred " +
        "small transactions a day with people who don't need me to be okay " +
        "first.\" She resettles the headphones. \"It buys me daylight. I " +
        "reinvest the daylight. That's the whole system.\"",
        short: "\"Back home the sadness had my address. Here it has to commute.\"",
        fx: (st) => { st.know.depression = true; st.mood = "open"; } },
      { topic: "queen vic", text: "\"Terry holds the corner seat if I'm late — we " +
        "have never discussed this and never will, it's load-bearing.\" She " +
        "nods at the room: dartboard, wood, air conditioning like a national " +
        "embassy of moderation. \"The bars over there want something from you. " +
        "This one just wants you to mind the dart line.\" The window gets " +
        "another look. \"I tried the soi once. {{Nice}} girls. Loud planet. I do " +
        "better with a pane of glass between me and 1999.\"",
        short: "\"Terry holds the corner seat. It's load-bearing. We've never discussed it.\"",
        fx: (st) => { st.trust = Math.min(5, st.trust + 1); } },
      { topic: "navy", when: (st) => st.trust < 3, deflect: true,
        text: "The headphones come halfway up — a shutter, not a door. \"We just met and " +
          "you're asking about my service record.\" A thin, unoffended smile. \"Stick " +
          "around. Buy a Singha. Some things you earn.\" The subject is closed with Navy efficiency.",
        short: "\"You just met me and you're asking about my service record. Some things you earn.\"" },
      { topic: "navy", when: (st) => st.trust >= 3,
        text: "\"The hair and the handshake gave it away, huh.\" A flat, unoffended look. " +
        "\"Twelve years. Cryptologic technician, interpretive — which is Navy for a person who sits in a " +
        "room with headphones on translating other people's Korean.\" She taps the Discman; the joke lands " +
        "on herself and she lets it. \"DLI Monterey, then a listening post you're not cleared for and, it " +
        "turned out, neither was my spine. Two ruptured discs, a diagnosis, and they process you out very " +
        "politely — folded flag optional.\" The posture doesn't soften; that's the part that stayed. \"You " +
        "don't demob the reflexes. I still won't sit with my back to a door. Terry's corner seat faces the " +
        "room — that isn't an accident, and neither is why I picked this bar.\"",
        short: "\"Twelve years, Navy Korean linguist — DLI, a listening post, then a bad back processed me out. The posture stayed.\"",
        fx: (st) => { st.know.navy = true; st.mood = "open"; } },
    ],
  },

  danny: {
    name: "Danny", emoji: "💪", age: 50, nat: "Canadian",
    pronoun: "he",
    home: "club_mirage", hops: true,
    avoids: ["stinky_bar", "las_vegas"], // the map of his debts, drawn in bars
    look: "Canadian man of fifty, gym-built, black tank top, full tattoo sleeve, shaved head.",
    desc: "Fifty, but built like a rendering of forty — tank top, veins, a full " +
      "sleeve of tattoos that reads like a rap sheet of previous personalities. " +
      "He is always mid-conversation with somebody about an opportunity, and " +
      "always angled so he can see the door. Notably, he is never seen anywhere " +
      "near the Stinky Pinky — or Las Vegas a-go-go — of his own free will.",
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
    pronoun: "she",
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
    pronoun: "he",
    home: "las_vegas", hops: true,
    look: "British man of sixty, silver hair sharply parted, deep tan, crisp open-necked linen shirt.",
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
    pronoun: "he",
    home: "neon_paradise", hops: true,
    look: "Danish man of twenty-four, backpacker tan, shaggy fair hair, friendship bracelets to the elbow.",
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
        short: "\"Denmark, gap year, the most genuine people I've ever met!\" The lock screen glows.",
        sets: ["knowMikkel"] },
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

// What a patron looks like before you've learned their name — shown on the "At
// the rail" line and typeable/tappable to TALK ("talk to the owlish old-timer"),
// until you meet them (talk / photo / someone names them) and the name takes over.
// Assigned as a batch so the PATRONS entries stay lean. See _patronLabel.
const _PATRON_TITLES = {
  roger:    "a contented, henpecked English long-stayer",
  dieter:   "a precise German pensioner of two decades",
  gerald:   "a witty, linen-clad Dongtan regular",
  sandra:   "a sharp Englishwoman at the corner table",
  glam:     "an ancient German in disco-era finery",
  fergie:   "a red-faced, bald Ulsterman",
  ron:      "a leathery Aussie in a faded singlet",
  mort:     "an owlish old-timer scribbling in a notebook",
  nigel:    "a sun-spotted Brit in a grey Chang vest",
  chuck:    "a peeling American in a plumbing-company polo",
  dave:     "a tidy Brit nursing a flat shandy",
  helmut:   "a fastidious German with polished glasses",
  somsak:   "a quiet Thai in a maintenance polo",
  randy:    "a huge, big-handed American",
  drew:     "a chain-smoking American with Navy posture",
  david:    "a beaming Canadian in a soft ball cap",
  superman: "an old-timer in a faded Superman shirt",
  angela:   "a grey, flannel-shirted American woman",
  danny:    "a gym-hard Canadian in a tank top",
  josey:    "a broad-shouldered young Aussie in gym gear",
  reginald: "a well-preserved Brit in crisp linen",
  mikkel:   "a young Danish backpacker in friendship bracelets",
};
for (const [id, t] of Object.entries(_PATRON_TITLES)) if (PATRONS[id]) PATRONS[id].title = t;

// ── Character creation: who you are ─────────────────────────────────────────
// Picked in the taxi-ride intro (see _taxiIntro). Dialogue-only for v1: origin/
// personality/orientation gate and flavour conversation + courtship via when(st,G)
// predicates, no starting-stat modifiers. Each origin is ALSO an NPC on Soi 6
// (Phase B) — the one you pick is deactivated (you ARE him). `pick` is the line
// Tan hears; `tan` is his read on you. Voice: wry US-inflected English, the odd
// Thai particle, sees every farang clearly by the second traffic light.
// The narration language — the first thing Tan settles on the ride in. Picked in
// English (he's the lingua-franca contact); from the pick onward the game renders
// in the chosen tongue (Thai stays Thai). Endonym labels (English/Deutsch) are not
// translated; the `tan` reaction for a non-English pick renders in that language
// (it fires after G.player.lang is set — see _introAnswer / _L). Ships en + de.
const LANGUAGES = [
  { id: "en", label: "English",
    pick: "English is fine.",
    tan: "\"English — easy, half my job is English.\" He settles back into the drive." },
  { id: "de", label: "Deutsch",
    pick: "Deutsch. (German)",
    tan: "\"Deutsch — gut.\" Something in his patter loosens, like a channel he prefers. \"From here it's your language, my friend. The town stays foreign. That's the fun of it.\"" },
];

const ORIGINS = [
  { id: "redundancy", label: "Redundancy",
    pick: "A redundancy cheque and a trade nobody's hiring for anymore.",
    tan: "\"Twenty years on the tools, then a letter, na. I drive a lot of you this year.\" He crosses three lanes without looking. \"The payout feels like a fortune here. It is — for about a month. Spend it like it has to last, my friend, because it does.\"" },
  { id: "pension", label: "The pension",
    pick: "A pension, and twenty years of coming back to spend it.",
    tan: "\"Ahh, a regular! Then you don't need my airport speech.\" He grins into the mirror. \"You know this road better than the man who paved it. Same bars, mostly. Some of the same girls, even — don't tell them I said.\"" },
  { id: "running", label: "Running from it",
    pick: "Something back home I'd rather not get into.",
    tan: "A small nod; he lets it lie. \"Mai pen rai. Half this town is a forwarding address for a life that stopped working. Pattaya never asks for references — that's the whole product, na.\"" },
  { id: "pi", label: "The detective",
    pick: "I was a homicide detective. Now I find things quietly, for people.",
    tan: "The eyes flick to the mirror, a half-second too long. \"...Scouting for retirement, or working?\" A pause. \"No — don't answer. I drive people who ask questions for a living too. Sometimes I'm the one who called them.\" A card is in your hand before you saw it move. \"You need a door in this town — you have my number now.\"" },
  { id: "business", label: "The investor",
    pick: "I'm here to make something happen — a bar, property, an opportunity.",
    tan: "\"An opportunity.\" He says it like it tastes of something. \"Everybody's got one out here. One in ten is even real. Do yourself a favour — before you sign your name to anything, buy me a coffee. I'll tell you which farang really owns his 'own' bar.\"" },
  { id: "married", label: "The returner",
    pick: "I was married to a Thai woman once. That's over. So — here I am.",
    tan: "\"So you speak a little, you know how the song goes, and you know how it ends.\" He softens. \"Welcome back. Slower this time, maybe. Second time through, you watch the hands, not the smile.\"" },
  { id: "monger", label: "The monger",
    pick: "Golf. With the APAC team. (you did actually pack the clubs)",
    tan: "\"555 — the APAC team.\" Delighted, not unkind. \"I drive a hundred golfers who never find a course. You brought the clubs, which is somehow worse.\" A cheerful shrug. \"No shame, my man. This whole town is built on exactly you. Play your eighteen holes. All of them.\"" },
];

// The same five ids also apply to NPCs: a hand-authored NPC may opt in with a
// `personality:` field, which tilts how YOUR compliment/joke/tease resolve on
// them (_npcPersTalkOutcome, engine-play) — the NPC's tilt gets the last word
// over the player's. Showcase set: Mercedes/Tan operator, Bert/Daeng blunt,
// Candy/Wilai/Mala charmer, Joy/Petch joker, Roy whiteknight. (Kai stays
// personality-less on purpose: her `type: "operator"` is the scam vector, and
// the player-personality tests use her as a neutral conversational fixture.)
const PERSONALITIES = [
  { id: "charmer", label: "Charmer",
    pick: "Someone easy to like.",
    tan: "\"A charmer. The girls will love you — and your wallet — equally. The trick is knowing, each night, which one they mean.\"" },
  { id: "joker", label: "Joker",
    pick: "A laugh. I keep it light.",
    tan: "\"A joker. Good — sanuk is the real currency here, better than baht.\" A beat. \"Just read the table. Not every man at the bar wants a comedian at midnight.\"" },
  { id: "blunt", label: "Blunt",
    pick: "Straight talk. Take me or leave me.",
    tan: "\"Blunt.\" An approving nod. \"Out here that's exotic — everyone's selling in a soft voice. Opens some doors fast, slams others faster. Worth it, mostly.\"" },
  { id: "operator", label: "Operator",
    pick: "Someone always working the angle.",
    tan: "\"An operator.\" The grin is genuine now. \"Then we understand each other. You'll trust nobody in this town — which is exactly correct — and you'll do just fine.\"" },
  // The white knight — the softie with a rescue narrative attached. The girls read
  // him from across the bar; sharks love him; sob-stories land hardest here. Tan
  // plants the anti-victim theme without cruelty. (Composes with any origin.)
  { id: "whiteknight", label: "White knight",
    pick: "A decent man. Not like the others in here — the one who actually cares.",
    tan: "\"Mm. The good one.\" The patter drops for a second; he means it kindly. \"I drive a lot of good ones, my friend. The girls see it from across the bar — a man who want to save somebody.\" He picks his words. \"Some girls need saving. Most just need the rent. Try to know which, na.\"" },
];

// Orientation: v1 ships straight + bi (bi puts ladyboys on the menu — flips the
// katoey encounter / Peacock performers from gag to courtship). Gay is stubbed for
// the full version with Jomtien's scene — the field + _flirtUnwelcome routing can
// already carry it; just not offered here.
const ORIENTATIONS = [
  { id: "straight", label: "The ladies",
    pick: "The ladies.",
    tan: "\"The ladies. The factory setting of Soi 6.\" He signals the turn. \"Easy. Everyone here is on your side.\"" },
  { id: "bi", label: "Open-minded",
    pick: "The ladies — and I keep an open mind.",
    tan: "\"An open mind.\" A knowing tilt of the head. \"Good. This town rewards it — and it is very, very good at surprising the men who swear they are closed. Some of the most beautiful girls on this soi, my friend, weren't born girls. I'll point you right.\"" },
];

// ── Answering back: the player's side of the ask loop ───────────────────────
// A dialogue node's `asks: {key, q}` puts a question to the PLAYER and arms
// G.convoQ; the reply is free text, remembered in G.player.said[key], and the
// soi catches you if you tell it two ways (_convoAnswer). Free text is still
// the whole point — but a bare "answer in your own words" prompt gave a touch
// player nothing to tap and a new player nothing to imitate, so each key ships
// canned replies IN YOUR OWN VOICE. Entries are tagged `pers` (personality) or
// `origin`; an untagged one suits anybody. _askReplies (engine-parser) offers
// the identity-matched ones first, capped, and the chip bar renders them.
//
// AUTHORING RULES:
//  · Short. It's a line said at a bar, and it's stored verbatim.
//  · A key quoted back through a %token% (today: %home%) is TITLE-CASED on
//    replay, so those answers must be a place or a couple of words at most —
//    "Sheffield" reads right, a whole sentence does not.
//  · Tapping your own voice keeps your story straight across the soi; typing a
//    different answer somewhere else is exactly what the grapevine punishes.
//    That tension is the feature — don't "fix" it by de-duping keys.
const ASK_REPLIES = {
  // where you're from — quoted back by %home%, so: places only
  home: [
    { origin: "redundancy", text: "Sheffield" },
    { origin: "pension", text: "Portsmouth" },
    { origin: "running", text: "Nowhere I miss" },
    { origin: "pi", text: "Chicago" },
    { origin: "business", text: "Gold Coast" },
    { origin: "married", text: "Buriram, half the year" },
    { origin: "monger", text: "Reading" },
    { text: "Back home. It'll keep." },
  ],
  // why you're out here — the big one, nine NPCs ask it
  why: [
    { pers: "charmer", text: "Running to something, I'd like to think" },
    { pers: "joker", text: "Running from the weather, mostly" },
    { pers: "blunt", text: "Running from it. Next question" },
    { pers: "operator", text: "Neither. I go where the work is" },
    { pers: "whiteknight", text: "I wanted to be somewhere I was some use" },
    { text: "Bit of both, if I'm honest" },
  ],
  here: [
    { pers: "charmer", text: "The company. It's always the company" },
    { pers: "joker", text: "The beer's cold and nobody knows my name" },
    { pers: "blunt", text: "The girls. Let's not dress it up" },
    { pers: "operator", text: "Opportunity. Same as everybody" },
    { pers: "whiteknight", text: "Something that felt real, I suppose" },
  ],
  finding: [
    { pers: "charmer", text: "Better than I came for" },
    { pers: "joker", text: "Turning out expensive, mainly" },
    { pers: "blunt", text: "Exactly what it says on the tin" },
    { pers: "operator", text: "Turning out useful" },
    { pers: "whiteknight", text: "Sadder than the brochure. Still glad I came" },
  ],
  girlfriend: [
    { pers: "charmer", text: "Nobody waiting up. Which is a shame for somebody" },
    { pers: "joker", text: "Only my landlord, and she's cold to me" },
    { pers: "blunt", text: "No. Not for a while now" },
    { pers: "operator", text: "Nobody I'd owe an explanation to" },
    { pers: "whiteknight", text: "There was. She got tired of waiting" },
    { origin: "monger", text: "There is. We don't talk about the trips" },
    { origin: "married", text: "Was married to one. That's the whole story" },
  ],
  hotel: [
    { pers: "charmer", text: "Nothing fancy. I'm out all night anyway" },
    { pers: "joker", text: "A room with a fan that hates me" },
    { pers: "blunt", text: "Cheap. And I'm not saying where" },
    { pers: "operator", text: "Comfortable enough. Why do you ask?" },
    { pers: "whiteknight", text: "Decent little place. I'm easy to please" },
  ],
  stay: [
    { pers: "joker", text: "A week. Possibly forever, ask me Friday" },
    { pers: "blunt", text: "A week. Then home" },
    { pers: "operator", text: "Long enough to see what's what" },
    { text: "The week. Same as everybody" },
  ],
  return: [
    { pers: "charmer", text: "For you? Tomorrow" },
    { pers: "joker", text: "If the liver signs off, yes" },
    { pers: "blunt", text: "Maybe. I don't make promises in bars" },
    { pers: "operator", text: "If tonight's worth repeating" },
    { pers: "whiteknight", text: "I'd like to. I mean that" },
  ],
  trips: [
    { origin: "pension", text: "Twenty years of them" },
    { origin: "monger", text: "Lost count. Eleven? Twelve?" },
    { origin: "married", text: "I lived here. Different thing entirely" },
    { pers: "joker", text: "First time, and it shows, doesn't it" },
    { text: "A few. Enough to know the road" },
  ],
  firsttime: [
    { pers: "charmer", text: "Every night, they tell me. Enjoy it" },
    { pers: "joker", text: "Every night. Nobody's ever tapped a shoulder yet" },
    { pers: "blunt", text: "Every night. It stops being a party eventually" },
    { pers: "operator", text: "Every night — that's the business model" },
    { pers: "whiteknight", text: "Every night. Pace yourself, though" },
  ],
  shame: [
    { pers: "charmer", text: "Not for a long time, Barry" },
    { pers: "joker", text: "I left the guilt in the overhead locker" },
    { pers: "blunt", text: "No. I know what I came for" },
    { pers: "operator", text: "Guilt's expensive. I don't buy it" },
    { pers: "whiteknight", text: "Bit, yeah. Still working that out" },
  ],
  believe: [
    { pers: "charmer", text: "Met a few. They're all different, that's the trick" },
    { pers: "joker", text: "Three of them. All different. All Tuesday" },
    { pers: "blunt", text: "No. They're at work and so am I" },
    { pers: "operator", text: "I've met the act. It's a good act" },
    { pers: "whiteknight", text: "Yeah. And I know how that sounds" },
  ],
  smart: [
    { pers: "charmer", text: "Only if you love it more than the money" },
    { pers: "joker", text: "Smart's a strong word, Wayne" },
    { pers: "blunt", text: "No. Read the paperwork first" },
    { pers: "operator", text: "Only if your name's on the shares" },
    { pers: "whiteknight", text: "Careful, mate. Ask around first" },
  ],
  invested: [
    { pers: "joker", text: "Only in beer futures" },
    { pers: "blunt", text: "No. And I won't be" },
    { pers: "operator", text: "Not yet. I read things twice" },
    { origin: "business", text: "Looking at it. Talk me out of it" },
    { text: "No. You can relax" },
  ],
  sentme: [
    { pers: "charmer", text: "Nobody sent me. I just liked the look of you" },
    { pers: "blunt", text: "Nobody. I'm nobody" },
    { pers: "operator", text: "Nobody sends me anywhere" },
    { text: "Nobody sent me. Just being friendly" },
  ],
  dream: [
    { pers: "charmer", text: "Right now? This chair, this conversation" },
    { pers: "joker", text: "A bar with my name on it and a chair I never leave" },
    { pers: "blunt", text: "Enough money to stop counting it" },
    { pers: "operator", text: "To be the one who owns the room" },
    { pers: "whiteknight", text: "Somebody glad I turned up" },
  ],
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
  // The White Rabbit's Lao family (Fast Eddy is manager:true, deliberately not here)
  nuan: "mamasan", ampha: "cashier", champa: "hostess", boua: "hostess",
  kinnaree: "mamasan",
  pancake: "hostess", baitoey: "hostess",
  lek: "hostess", noi: "hostess", ping: "hostess", aom: "hostess",
  kai: "hostess", nook: "hostess", dew: "hostess",
  kat: "hostess", may: "hostess", dear: "hostess",
  kluay: "hostess", benz: "hostess", puu: "hostess", belle: "hostess",
  praewa: "hostess", nangfah: "hostess", tabtim: "hostess", chaba: "hostess",
  pukky: "hostess", somo: "hostess", nina: "hostess", bebe: "hostess", poy: "hostess", aum: "hostess",
  joy: "hostess", fon: "hostess", gift: "hostess", kwan: "hostess",
  nong: "hostess", pim: "hostess", bee: "hostess", jane: "hostess", mercedes: "hostess", kratae: "hostess",
  nira: "hostess", mind: "hostess", pia: "hostess", wilai: "hostess", chompoo: "hostess",
  yai: "mamasan", rose: "mamasan", kesorn: "mamasan", lawan: "mamasan", sumalee: "mamasan",
  diamond: "mamasan", wimon: "mamasan", ampai: "mamasan", kesinee: "mamasan",
  ploy: "cashier", aek: "cashier", malee: "cashier",
  jenny: "cashier", joon: "cashier", jun: "cashier", baimon: "cashier", fahsai: "cashier",
  preaw: "cashier", numfon: "cashier", nu: "cashier", haad: "cashier",
  candy: "mamasan", oy: "mamasan", daeng: "mamasan", mem: "mamasan", wan: "mamasan",
  nee: "mamasan", peung: "mamasan", malai: "mamasan", toi: "mamasan", saeng: "mamasan",
  bussaba: "mamasan", sopha: "mamasan", malila: "mamasan",
  // The Peacock: performers in the social machinery (courtship for a bi player,
  // the gracious pass for a straight one — _ladyboyGate). No barfine apparatus:
  // the cabaret refuses it in-fiction (_doBarfine's peacock branch).
  petch: "hostess", mala: "mamasan",
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
// Texted-selfie captions for filler hostesses who keep photos on their phone
// (about two in five do — see _buildHostess). PG-13 Tinglish, same voice as theirs.
const _H_SELFIES = [
  "new dress 👗 you like?? 😊", "beach today 🏖️ miss you na", "me eat somtam 🥵🌶️ so spicy 555",
  "new hair 💇‍♀️ good mai??", "waiting work 💕 think about you", "my cat 🐈 cute like me na 😽",
  "market this morning 🛵 buy food mama", "new nail 💅 pink na", "so hot today 🥵 i melt 555",
  "friend birthday 🎂 we sing loud loud", "rainy 🌧️ i stay home lonely 🥺", "gym 💪 strong for you",
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

function _buildHostess(name, th, room, id = name.toLowerCase()) {
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

  // Naturally nosy, but the English caps how far the questions reach — small,
  // stock openers, one per girl (deterministic via idx). Answers feed the same
  // G.player.said memory the expats tap; see _convoAsk / _convoAnswer.
  const ASK = [
    { key: "home", q: '"You from where? England? America? Australia?" Bright, practised, already guessing.' },
    { key: "stay", q: '"How long you stay Pattaya? Short time or looong time?" She giggles at her own joke.' },
    { key: "girlfriend", q: '"You have girlfriend? Wife? Nooo, really?" A delighted, skeptical squint.' },
    { key: "return", q: '"First time Pattaya, or you come back? Come back for somebody, maybe na?"' },
  ];

  // a girl whose desc says she's new plays Connect 4 like she's new — the
  // tier the player can actually beat, signalled by what they read of her
  const green = look.startsWith("New enough") || look.startsWith("Baby-faced");
  // about two in five keep photos on the phone and will text one to a contact —
  // three captions, hash-picked so she's stable (see _selfiesFor / _maybePhotoText)
  const hasPics = _hh(id, 37) % 5 < 2;
  const selfies = hasPics
    ? [0, 1, 2].map(k => _H_SELFIES[_hh(id, 51 + k * 17) % _H_SELFIES.length])
    : null;
  return {
    name, th, emoji, room, filler: true,
    ...(green ? { c4: 2 } : {}),
    ...(selfies ? { selfies } : {}),
    desc: `${look} — one of ${bar}'s girls, from ${from}. ${phone}`,
    dialogue: [
      { th: "สวัสดีค่ะ", rom: "sawatdee kha", text: idx(GREET, 23), short: idx(GREET_SHORT, 29),
        asks: idx(ASK, 47) },
      { topic: "family", text: idx(FAMILY, 31) },
      { topic: "home", text: idx(HOME, 43) },
      { topic: "plan", text: idx(PLAN, 37) },
      { topic: "wallet", notFlags: ["hasWallet"], text: idx(WALLET, 41) },
    ],
  };
}

// [name, Thai nickname, room]. Distribution: go-gos busiest, beer/Soi 6/club
// modest, expat & live-music bars light — Queen Vic is a pub, so none.
const _FILLER_HOSTESSES = [
  ["Ratsamee","รัศมี","lake_beer"], ["Kwanjai","ขวัญใจ","lake_beer"],
  ["Naree","นารี","windmill"], ["Sasi","ศศิ","windmill"], ["Yada","ญาดา","windmill"],
  ["Dao","ดาว","tequila_queen"], ["Mook","มุก","tequila_queen"], ["Ice","ไอซ์","tequila_queen"], ["Praew","แพรว","tequila_queen"],
  ["Fah","ฟ้า","neon_paradise"], ["View","วิว","neon_paradise"], ["Sara","ซาร่า","neon_paradise"],
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
  ["Taan","ตาล","gold_rush"], ["Tik","ติ๊ก","gold_rush"],
  ["Pui","ปุ้ย","starlight_bar"], ["Mild","มายด์","starlight_bar"],
  ["Aump","อั้ม","rabbit_hole"], ["Guitar","กีตาร์","rabbit_hole"],
  ["Namtip","น้ำทิพย์","lucky_charm"], ["Bella","เบลล่า","lucky_charm"],
  ["Prik","พริก","moonshine_bar"], ["Mek","เมฆ","moonshine_bar"],
  ["Namtan","น้ำตาล","khao_talo_bar"], ["Ying","หญิง","khao_talo_bar"],
  /* Golden Dragon girls (Kai, Nook, Dew) promoted to authored NPCs */
  /* Pink Lotus girls (Puu, Belle) promoted to authored NPCs */
  /* Sunset Dreams girls (Kat, May, Dear) promoted to authored NPCs */
  /* Ruby Kiss girls (Kluay, Benz) promoted to authored NPCs */
  ["Lin","หลิน","water_buffalo"], ["Nim","นิ่ม","water_buffalo"],
  ["Duan","เดือน","firefly_bar"], ["Saifon","สายฝน","firefly_bar"],
  ["Wanpen","วันเพ็ญ","mama_yai"],
  ["Pear","แพร์","orchid_club"], ["Jinda","จินดา","orchid_club"],
  ["Namfon","น้ำฝน","anchor_bar"], ["Bunny","บันนี่","dolphin_bar"], ["Jaja","จาจา","mooring_bar"],
  ["Dokmai","ดอกไม้","night_heron"], ["Jampa","จำปา","night_heron"],
  ["Ing","อิง","blue_dog"], ["Khing","ขิง","blue_dog"],
  /* Kitten Corner, Cherry Pop, and Soi 6 beer-bar girls promoted to authored NPCs */
  ["Bam","บาม","rock_factory"], ["Kwang","กวาง","rock_factory"],
  ["Manow","มะนาว","stinky_bar"],
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
  ["Tar","ตาล","doghouse"], ["Gof","กอฟ","doghouse"], ["Wassana","วาสนา","doghouse"],
  ["Bow","โบว์","doghouse"], // a SECOND Bow (Club Mirage has one) — see _fillerId
  ["Sroy","สร้อย","succubus"], ["Chom","ชม","succubus"], ["Pranee","ปราณี","succubus"],
  ["Milk","มิ้ลค์","velvet_club"], ["June","จูน","velvet_club"],
  // appended, never inserted — see _fillerId
  ["Fah","ฟ้า","the_terrace"], ["Namtip","น้ำทิพย์","the_terrace"],
  ["Praew","แพรว","kingfisher"], ["Kaew","แก้ว","kingfisher"],
  ["Meaw","แมว","two_stools"], ["Jinda","จินดา","two_stools"],
  ["Duan","เดือน","the_gecko"], ["Yok","หยก","the_gecko"],
  ["Fon","ฝน","sea_wall"], ["Kwang","กวาง","sea_wall"],
  ["Mook","มุก","breakwater"], ["Jib","จิ๊บ","breakwater"],
  ["Bee","บี","neon_palm"], ["Toey","เต้ย","neon_palm"],
  ["Pang","แป้ง","the_bucket"], ["Mint","มิ้นท์","the_bucket"],
];

// A filler girl's id used to be just her nickname lowercased, which quietly made
// every Thai nickname single-use across the whole town — and reusing one did not
// error, it OVERWROTE: the later row won and the earlier girl silently moved bars.
// Five of them relocated out of Club Mirage, Candy Bar 2, Las Vegas and Jasmine
// Garden that way before anyone noticed.
//
// That scarcity was invented by the code, not by Thailand — the country is full of
// girls called Bow and Fern and Ploy, and two bars each having one is MORE true,
// not less. So the bare nickname is still the id when it is free, and a taken one
// falls back to <room>_<name>. Existing ids are untouched (no portrait renames, no
// save breakage), and because _buildHostess hashes the ID to pick her hometown,
// look and story, the second Bow gets a different life for free.
// ORDER MATTERS, and it bit immediately: the bare id goes to whichever row the
// loop reaches FIRST, so a duplicate INSERTED above an existing row steals her
// id — and with it her portrait, since portraits are keyed on the id. Four
// mamasans (Water Buffalo, KINKY, Las Vegas, Firefly) were silently re-keyed
// that way within minutes of this landing. New rows go at the END of the table.
//
// The guard is portraits.test.js, and it is a real one rather than a convention:
// portraits are committed per id, so a stolen id leaves the original with no
// PNG and fails loudly. (A test that recomputes expected ids from the tables
// CANNOT catch this — it derives its expectation from the thing it is checking
// and passes on any ordering. One was written, and deleted for that reason.)
// ── pronouns ────────────────────────────────────────────────────────────────
// Requested by the Second Road agent (2026-08-09) via Mario, which is the
// protocol: the export is this repo's, so the field is added here rather than
// worked around there. Their report prose called a male manager "she" for six
// weeks, and both games were writing around the gap.
//
// It reports PRONOUNS, not gender, and it reports what the game's own prose
// already says rather than imposing a taxonomy — which matters here, because
// the cast includes kathoey characters (Diamond, Alisa, Mala, Petch) and a tom
// cashier (Aek), and the writing has always used "she" for all of them. The
// role default therefore lands correctly on them with no special case.
//
// Resolution: an explicit `pronoun` on the entry wins; otherwise the three
// lady-roles default to "she". Anything else must be explicit — world.test
// fails on a character who resolves to nothing, so a new manager or patron
// cannot slip through and be guessed at.
const _SHE_ROLES = new Set(["hostess", "mamasan", "cashier"]);
function _pronoun(id) {
  const c = NPCS[id] || (typeof PATRONS !== "undefined" && PATRONS[id]);
  if (!c) return undefined;
  return c.pronoun || (_SHE_ROLES.has(NPC_ROLES[id]) ? "she" : undefined);
}

function _fillerId(name, room) {
  const bare = name.toLowerCase();
  return NPCS[bare] ? room + "_" + bare : bare;
}

for (const [name, th, room] of _FILLER_HOSTESSES) {
  const id = _fillerId(name, room);
  NPCS[id] = _buildHostess(name, th, room, id);
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
  "Silk blouse, jade bangle, and the calm of a woman who has heard every line",
  "A cloud of perfume and authority, hair lacquered against the fans",
  "Half-moon glasses down her nose, appraising you over the top of them",
  "Broad, motherly, and entirely able to have you removed by smiling",
  "Rings on every finger and a voice that cuts the music when she wants it",
  "Elegant, weathered, and plainly the last word on everything in the room",
];
const _M_STORY = [
  "danced this same street before you were her problem",
  "came up from the rice fields and never once looked back",
  "has run this floor longer than most of the girls have been alive",
  "buried a husband, raised two kids, and built a concrete house on lady drinks",
  "married a farang, buried the marriage, and kept the house",
  "started on the stage at seventeen and owns three of these stools now",
  "puts four kids through school on other men's lonely nights",
  "has watched the soi flood, burn, and rebuild, and outlasted all three",
];
// Kept deliberately deep: Soi 6 alone puts six cashiers within a short walk, so
// a shallow pool reads as copy-paste bar to bar (see the prose-review notes).
const _C_LOOK = [
  "In a cage of fairy lights, counting notes faster than the eye follows",
  "Black polo, a lanyard of too many keys, a calculator she never needs",
  "Neat bun, neat ledger, an engagement ring worn on a chain",
  "Headset on one ear, {{phone}} in one hand, the till in perfect order",
  "Quiet and quick, the still point the whole loud room pays into",
  "Fingers flying over a calculator app, eyes never leaving the cash",
  "Reading glasses, a receipt spike, and no patience for a disputed tab",
  "A note-counting machine at her elbow and a faster one behind her eyes",
  "A blunt bob, red lipstick, and a stare that reconciles you at a glance",
  "Perched above the till like a lifeguard watching a pool of drunks",
  "Cash drawer open, phone face-down, all of her attention on the maths",
  "Sleeve of faded tattoos and an abacus brain — the least-fooled soul in here",
];

function _buildMama(name, th, room, id = name.toLowerCase()) {
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
      { topic: "wallet", notFlags: ["hasWallet"], text: idx(WALLET, 43) },
    ],
  };
}

function _buildCashier(name, th, room, id = name.toLowerCase()) {
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
      { topic: "wallet", notFlags: ["hasWallet"], text: idx(WALLET, 43) },
    ],
  };
}

// [name, Thai nickname, room]. One mamasan per bar (a chain shares hers, so the
// Candy Bars are absent here) and one cashier per bar. Distribution mirrors the
// hostesses': every hostess venue gets both; the Queen Vic pub gets neither.
const _FILLER_MAMAS = [
  ["Boonsri","บุญศรี","lake_beer"],
  ["Wanida","วนิดา","windmill"], ["Alisa","อลิสา","katoeys"],
  ["Sunee","สุนีย์","doghouse"],
  ["Pen","เพ็ญ","blue_dog"], ["Muay","หมวย","rock_factory"], ["Lamai","ละมัย","stinky_bar"],
  ["Jeab","เจี๊ยบ","neon_paradise"], ["Da","ดา","club_mirage"], ["Rin","ริน","crystal_palace"],
  ["Kob","กบ","paradise_nights"], ["Koi","ก้อย","midnight_sun"], ["Ratana","รัตนา","lucky_tiger"],
  ["Waew","แวว","silk_rose"], ["Ple","เปิ้ล","jasmine_garden"], ["Orm","อ้อม","gold_rush"],
  ["Jom","จอม","starlight_bar"], ["Somsri","สมศรี","kinky"], ["Ratree","ราตรี","las_vegas"],
  ["Wandee","วันดี","water_buffalo"], ["Somjai","สมใจ","firefly_bar"],
  ["Tui","ตุ่ย","night_heron"],
  
  ["Wandee","วันดี","the_terrace"], ["Somsri","สมศรี","kingfisher"],
  ["Ratree","ราตรี","two_stools"], ["Somjai","สมใจ","the_gecko"],
  ["Duang","ดวง","sea_wall"], ["Mookda","มุกดา","breakwater"],
  ["Nittaya","นิตยา","neon_palm"], ["Ratchada","รัชดา","the_bucket"],
];
const _FILLER_CASHIERS = [
  ["Napa","นภา","lake_beer"],
  ["Nubnab","นับหนับ","windmill"], ["Farida","ฟาริดา","katoeys"],
  ["Tukky","ตุ๊กกี้","doghouse"], ["Noot","นุช","succubus"],
  ["Golf","กอล์ฟ","tequila_queen"], ["Air","แอร์","blue_dog"], ["Apple","แอปเปิ้ล","rock_factory"],
  ["Cake","เค้ก","stinky_bar"], ["Care","แคร์","candy_bar_2"], ["Cartoon","การ์ตูน","neon_paradise"],
  ["Earn","เอิร์น","club_mirage"], ["Eye","อาย","crystal_palace"], ["Fai","ฝ้าย","paradise_nights"],
  ["Gam","แก้ม","candy_bar"], ["Ging","กิ่ง","lucky_tiger"], ["Grace","เกรซ","silk_rose"],
  ["Hong","ห่อง","jasmine_garden"], ["Jah","จ๊ะ","gold_rush"], ["Jeed","จี๊ด","starlight_bar"],
  ["Kaimook","ไข่มุก","slutty"], ["Kanom","ขนม","las_vegas"], ["Keng","เก่ง","khao_talo_bar"],
  ["Best","เบสท์","water_buffalo"], ["Aim","เอม","firefly_bar"], ["Tangmo","แตงโม","mama_yai"],
  ["Kanya","กัญญา","orchid_club"],
  ["Mon","มล","night_heron"],
  
  ["Kade","เกด","the_terrace"], ["Noey","เนย","kingfisher"],
  ["Orm","ออม","two_stools"], ["Ple","เปิ้ล","the_gecko"],
  ["Gig","กิ๊ก","sea_wall"], ["Kade","เกด","breakwater"],
  ["Noey","เนย","neon_palm"], ["Fai","ฝ้าย","the_bucket"],
];

for (const [name, th, room] of _FILLER_MAMAS) {
  const id = _fillerId(name, room);
  NPCS[id] = _buildMama(name, th, room, id);
  NPC_ROLES[id] = "mamasan";
}
for (const [name, th, room] of _FILLER_CASHIERS) {
  const id = _fillerId(name, room);
  NPCS[id] = _buildCashier(name, th, room, id);
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
// them. One knowing deviation from the game graph, kept for the audit to flag
// rather than silently smoothed: the REAL Tree Town is at the Buakhao/Klang
// corner (north end — the game graph hangs it off Buakhao south).
//
// A SECOND "deviation" was listed here and was simply wrong. It said the police
// station is on Soi 9 *south of Central Festival* and that the graph therefore
// walks north from the mall in error. The station really is on Soi 9 — OSM puts
// it at 12.935987/100.882822, the same latitude as Soi 9's Beach Road end to
// five decimals — but the order down Beach Road is PK, Soi 7, Soi 8, Soi 9,
// Central Mall, so Soi 9 is NORTH of the mall. `central_mall —n→
// police_station` was right all along. Removed rather than carried, because a
// note claiming a correct thing is broken is worse than no note.
//
// DISTRICT PASSES — 4 DECIMALS IS SKETCHED, 5 IS SURVEYED. The map is being
// pinned district by district against OSM, and the decimal count is the marker
// of which have had their pass. Don't "tidy" a 5dp district back to 4.
//
//   THE EXPANSION SPEC LIVES IN docs/map-expansion.md — new rooms, piwin
//   stands, 7-Elevens, the Buakhao-market repurpose and the exit fixes, with
//   Mario's content brief for each. Coordinates for everything in it are banked
//   in this header. Biggest single item: only FOUR motosai stands exist and
//   ELEVEN districts have none, which makes those districts dead ends after the
//   last baht bus.
//
//   CANON CORRECTION (Mario, 2026-08-08): there is NO Soi Buakhao market any
//   more — Tree Town replaced it years ago. The `buakhao_market` room needs
//   repurposing and its NPC rehoming (Mike's Mall is the suggested new home once
//   that room exists). Candy Bar also MOVES to Cindy Bar's real spot at the Soi
//   Diana junction; she is semi-famous as an after-hours place, on account of
//   the out-of-the-way location and the brown envelopes that keep the police
//   away. Both are bar-mat/content work, not survey.
//
//   Supertown = the JOMTIEN COMPLEX (Jomtien Walking Street), 12.900415/
//   100.867802 — 118 m north of the Thappraya strip, which is exactly what
//   `thappraya_mid —n→ supertown_alley` claims. It has TWO doors on purpose:
//   the Jomtien strip to the south and Thappraya heading north.
//   Its remaining flag is a BAR-MAT defect, not a coordinate one:
//   `thappraya_ext_s —w→ supertown_elbow` audits at 74 because the hill room is
//   NORTH of the complex, not east of it. That exit wants to be `s`.
//
//   Pratumnak crest + Dongtan Beach Rd — DONE 2026-08-08. THE SURVEY IS NOW
//   COMPLETE: all 177 rooms carry 5-decimal surveyed coordinates.
//   Soi Phra Tam Nak 5 is the crest — from the Pratumnak coast at
//   12.909228/100.858152 east to 12.914395/100.867004, where it meets Pratumnak
//   Hill Road, which then runs SOUTH into Thappraya at 12.911490/100.869325.
//   `pratumnak_hill_rd` sits at that eastern junction and the whole
//   thappraya_ext / dongtan_rd chain audits clean.
//   Dongtan Beach Rd now runs its real length — from the Jomtien corner up to
//   Soi 5's west end, ~1.5 km, rather than the 520 m the derived pass gave it.
//   Two flags remain here and they are SUPERTOWN, which has two doors: it hangs
//   off thappraya_mid AND thappraya_ext_s, so one of those cannot be a true
//   compass word. That is the complex being an elbow, not a coordinate error.
//
//   Soi Honey — DONE 2026-08-08, the district I missed on the first sweep.
//   It is "Soi Honey (Pattaya Sai Song 11)" in OSM and it is the next soi NORTH
//   of Soi Diana, not south — searching a bbox below Diana finds nothing, which
//   is exactly the mistake made here first. 349 m:
//     W (Second Rd) 12.931886/100.883004   E (Buakhao) 12.929939/100.885542
//   Its west exit to second_rd_s cleared on placement. `soi_honey_e —e→
//   buakhao_s` still flags at 137, and it is the SAME under-noding story: Soi
//   Honey meets Buakhao 125 m from buakhao_n and 620 m from buakhao_s, so the
//   exit points at the wrong node. Add it to the Buakhao node list.
//
//   Tree Town, Soi Myth Night, KISS — surveyed 2026-08-08, closing the sweep.
//     Kiss Food & Drinks 2  12.930868/100.882050  — Second Rd x Soi Diana, and
//         it lands 20 m from corner 4, confirming that junction independently
//     Tree Town (market)    12.931438/100.885545  — Soi Buakhao, N of Diana
//     Tree Town foodcourt   12.930904/100.885816
//     Soi Myth Night        12.932742/100.884791  — the west continuation of
//         Soi Made In Thailand (Night Plaza 12.932548/100.884683), running to
//         Second Road just south of Central Mall
//     French Kiss (in TT)   12.931610/100.885189
//
//   WHAT THE WHOLE SWEEP CONCLUDES. Placing these at truth pushed the audit from
//   17 flags to 23, and the rise is the finding rather than a regression: nearly
//   every remaining flag now names a MISSING NODE rather than a bad coordinate.
//   The audit has become the specification for the bar-mat work.
//
//   SOI BUAKHAO IS THE BIG ONE. It has three nodes and needs about five. Real
//   junctions along it, north to south: Pattaya Klang 12.935939/100.888539,
//   Soi Made In Thailand / Myth Night ~12.9325, Tree Town ~12.9314, Soi Diana
//   12.928811/100.884802, then the southern end. Today `buakhao_n` is asked to
//   be the Klang junction (pattaya_klang), the Myth Night junction (myth_night)
//   AND the Diana junction (diana_e, lk_entrance, metropole_room) — points
//   spread over 800 m. Those three flags are one request.
//
//   SECOND ROAD needs a node at Soi Diana's latitude (~12.9310). `second_rd_c`
//   must stay level with Central Mall for its own west exit, so `diana_w —w→
//   second_rd_c` and `soi_honey_w —w→ second_rd_s` cannot both be satisfied by
//   any coordinate.
//
//   Tree Town's internal maze keeps one flag (`tt_deep —n→ tt_back`, 74). Its
//   lanes genuinely loop back on themselves — it is described in-game as a maze
//   — and that is the grid doing its best on a shape that has no clean axis.
//
//   The LK Metro / Soi Diana junction — surveyed 2026-08-08 from a close-up.
//     Cindy Bar    12.928568/100.884735   — the real-world Candy Bar
//     LK Metropole 12.929594/100.884643   — the L-shaped alley wraps it
//     Areca Lodge  12.929152/100.882903
//
//   These three pin `buakhao_n` to the SOI DIANA junction, because lk_entrance
//   and metropole_room hang off it and LK Metropole is here, not at the Klang
//   end. An earlier pass had put buakhao_n at the Klang junction, which audited
//   better and was wrong about the ground.
//
//   BUAKHAO_N IS OVER-CONSTRAINED, and no coordinate fixes it. It must be the
//   Klang junction (for `pattaya_klang —e→`) AND the Diana junction (for
//   diana_e, lk_entrance, metropole_room) — 800 m apart. SOI BUAKHAO NEEDS A
//   FOURTH NODE at its Klang end. Until then `pattaya_klang —e→ buakhao_n`
//   flags at 102, and that flag is the request.
//
//   TWO VENUES ARE ATTACHED TO THE WRONG NODE, both left alone as bar-mat work:
//   - `candy_bar` hangs off buakhao_market, but Cindy Bar is at the DIANA
//     junction, 400 m north. Do NOT quietly re-hang it: Candy's `bars` rotation
//     and the Act One wallet chain both depend on where she is, so moving her is
//     a gameplay change, not a tidy-up.
//   - `areca_room` hangs off diana_e (the Buakhao end), but Areca Lodge is a
//     THIRD of the way along from the Second Road end. `diana_e —s→ areca_room`
//     flags at 93 as a result.
//
//   Placing these at truth took the map from 17 flags to 21. That is the right
//   trade: the four new ones are long compressions that name a missing node,
//   while the alternative was three real buildings drawn hundreds of metres from
//   where they stand.
//
//   The Buakhao / Soi Diana block — DONE 2026-08-08. Four corners, all 0 m,
//   clockwise from upper left:
//     1. Second Rd x Pattaya Klang   12.936653/100.886508
//     2. Pattaya Klang x Buakhao     12.935939/100.888539
//     3. Buakhao x Soi Diana         12.928811/100.884802
//     4. Soi Diana x Second Rd       12.931045/100.882042
//   Sides N 234 m, E 886 m, S 388 m, W 787 m — a quadrilateral, not a rectangle.
//
//   NAMES: Soi Diana is "Soi Diana (Pattaya Sai Song 13)" in OSM. SOI BUAKHAO IS
//   SPLIT ACROSS TWO NAMES — "Soi Kasem Suwan 13" for the northern run and "Soi
//   Buakhao (Pattaya Tai 22)" for the south; their ends match to six decimals, so
//   concatenate them or you survey half a street.
//
//   THE RULE THIS BLOCK TEACHES: Second Road and Soi Buakhao are PARALLEL, ~400 m
//   apart. Every east-west link between them only works if both ends sit at the
//   SAME LATITUDE. Placing Buakhao's nodes by distance-along-the-road instead
//   left each w/e exit pointing diagonally and flagged five of them at 99-143.
//   Pairing each Buakhao node to the latitude of the Second Road node its exit
//   NAMES cleared all five. Same lesson as the Second Road pass: derive from the
//   neighbour, not the tape measure.
//   LK Metro is at its real cached position; its link to buakhao_n is `out`,
//   which the audit does not check, so truth was free there.
//
//   TWO BAR-MAT DEFECTS EXPOSED, left alone because they are exit changes:
//   - `diana_w —w→ second_rd_c` audits at 132. Soi Diana meets Second Road 380 m
//     SOUTH of Central Mall, and second_rd_c has to stay level with the mall for
//     its own west exit to work. No coordinate satisfies both; the graph needs a
//     Second Road node at Diana's latitude.
//   - `buakhao_n —n→ pattaya_klang` audits at 70. Both sit ON Pattaya Klang Road,
//     220 m apart east-west, so the exit should be `w`, not `n`.
//
//   Naklua + the Dolphin roundabout — DONE 2026-08-08, closing the loop.
//   ★ THE DOLPHIN ROUNDABOUT ~12.95095/100.88750. Four roads converge there and
//   the pairwise gaps are 13-29 m, which is the roundabout's own diameter, not
//   error: Beach Rd, Second Rd, Naklua Rd and North Pattaya Rd all terminate on
//   it. Naklua Road then runs NE; going SW puts you back on Beach Road.
//   Naklua's rooms are laid by arc length up the real Naklua Road from there —
//   naklua_rd at 320 m, hotel_soi (Sabai Palms) at 1150 m. Zero flags, including
//   naklua_massage —n→ lotus_oil which had been auditing at 124.
//
//   ★ SOI 6 x SECOND ROAD 12.941817/100.887880 — Soi 6's east end sits ON Second
//   Road at 0 m. BUT THE GRAPH DOES NOT KNOW IT: `soi6_deep` has a single exit,
//   `w`, so in-game Soi 6 is a cul-de-sac you can only leave the way you came.
//   Harmless in soi6 mode (SOI6_ROOMS fences it anyway), but in the full game the
//   east end should open onto Second Road, and the real junction is banked here
//   for when it does. Bar-mat work: adding that exit changes what players walk.
//
//   The Pattaya Klang corridor — DONE 2026-08-08. North up Sukhumvit from
//   Thepprasit to Central Pattaya Road, then west to the sea. All at 0 m:
//     Sukhumvit x Pattaya Klang   12.931784/100.900511
//     Second Rd x Pattaya Klang   12.936653/100.886508
//     Beach Rd  x Pattaya Klang   12.937908/100.883387
//   Pattaya Klang spans 1.98 km, highway to sea.
//
//   Second Road's rooms are placed LEVEL WITH THE NEIGHBOUR EACH ONE'S w/e EXIT
//   NAMES, not at even spacing: second_rd_c level with Central Mall, second_rd_s
//   level with beach_rd_s. Spacing them evenly first put both several hundred
//   metres south of the thing they point at, which flagged their west exits at
//   124-127 degrees. Derive from the neighbour, not from the tape measure.
//
//   THIS PASS MADE THE AUDIT NOISIER, on purpose. Second Road moved ~450 m east
//   onto its real line, and six districts hang off it — Buakhao, Myth Night,
//   Soi Diana, Soi Honey, LK Metro, Tree Town — all still un-surveyed and all
//   now visibly on the wrong side. Those ~7 flags are the truth becoming
//   visible, not damage: the old agreement was two errors pointing the same way.
//
//   Worth fixing when the bar mat is next opened: `pattaya_klang —w→ beach_rd_n`
//   audits at 75 degrees because it lands at the SOI 6 foot, 560 m north of
//   where Central Pattaya Road actually meets Beach Road. Re-pointing it at
//   beach_rd_c would audit at ~24. That is an exit change, so it is bar-mat
//   work, not survey.
//
//   The Darkside — DONE 2026-08-08. Colloquially it is EVERYTHING EAST OF
//   SUKHUMVIT; that is the whole definition, and it is why the highway crossing
//   matters more than any single venue out there.
//   Following Thep Prasit east off Thappraya:
//     Thepprasit x Sukhumvit   12.909106/100.896045
//     Khao Talo x Sukhumvit    12.910043/100.896200
//   It is a STAGGERED crossroads — Khao Talo leaves 105 m NORTH of where
//   Thepprasit arrives, so they are not one junction. Khao Talo Rd then runs
//   2.7 km east. Sukhumvit is tagged highway=trunk with NO ref, so a search for
//   ref="3" finds nothing; that cost a lookup.
//
//   The bar strip is INFERRED, and the distinction matters. The real-world
//   anchors are the Black Swan (west end) and the New Secret (east) — OSM has
//   NEITHER by name. What it does map is a dense run of bars from AJ's at
//   100.9053 to the Mini Bar at 100.9112, about 640 m, and the strip is laid
//   along that. If either anchor is ever mapped, re-pin from it, not from this.
//
//   Lake Mabprachan is pinned to the LAKESIDE VENUE CLUSTER (Ice Star / River
//   Tree / My Friends / Pat's Bar, ~12.93306/100.96684) rather than the middle
//   of the water, because the room is the restaurant strip — "lakeside
//   restaurants, families eat grilled fish under string lights" — not the lake.
//   Hemingways Lakeside is the real anchor there and is also absent from OSM.
//   Its exit audits at ~66°: the lake really is ENE and the bar mat calls it
//   north. Honest compression, same class as Walking Street's `s`. Left alone.
//
//   Jomtien — DONE 2026-08-08, the last survey segment. The "double rectangle"
//   turns out to be a real rectangle: all four corners meet at 0 m, and opposite
//   sides agree within 3% (west 459 m / east 474 m, north 400 m / south 409 m).
//     NW  beach rd × Thappraya   12.898695/100.866979
//     NE  Second Rd × Thappraya  12.900968/100.869847
//     SW  beach rd × Soi 7       12.895679/100.869888
//     SE  Second Rd × Soi 7      12.897898/100.872898
//   The whole block had been sitting ~1 km south of that. Ring rooms now land
//   0–23 m from their real road.
//
//   WALK EACH SIDE IN LOOP ORDER, ending ON the shared corner, with the next
//   side starting a little way along it. Laying every side from its own start
//   instead put the two rooms at a corner on different spurs, so the exit
//   between them pointed across the angle rather than along a side — seven
//   corner exits flagged at 80–100°. Same layout, reordered: zero.
//   The rectangle is rotated ~51° from the compass, so sides audit at 37–44°.
//   That is the grid working, not error: see the 45° floor above.
//
//   DERIVED, NOT SURVEYED: Dongtan. Its beach road carries no name in OSM
//   (Jomtien Sai Nueng starts AT the Thappraya corner and runs south), so those
//   five rooms continue the coast line north of the corner instead of tracing a
//   real way. Sand and road are paired at equal distances up the coast — pairing
//   them at different distances is what flagged dongtan_beach_m —e→ dongtan_rd_m
//   at 118°, and it was my arithmetic, not the map.
//
//   Walking Street — DONE 2026-08-08. In OSM it carries Beach Road's own name
//   (ถนนพัทยาสายหนึ่ง) tagged highway=pedestrian, because it IS Beach Road,
//   pedestrianised — searching for a way named "Walking Street" finds only a
//   7 m stub at the arch. 737 m: the gate at 12.927447/100.874687 down to
//   Bali Hai pier at 12.924602/100.868548, the traditional end of the strip.
//   Bali Hai has NO ROOM yet; the coordinate is banked here for when it gets one.
//   SOI DIAMOND, likewise banked: it leaves Walking Street at
//   12.926559/100.873403 — exactly on the strip, 170 m down from the gate, 23%
//   of the way — and runs 153 m southeast to 12.925409/100.874182, which is
//   ~30 m off Second Road. Two go-gos are planned along it. Note it is NOT the
//   game's existing "Soi Diana" (diana_w/_mid/_e), a different street.
//   "WALKING STREET" IS NOT A ROAD NAME. It's what the strip between the gate
//   and Bali Hai is called; the road is Pattaya Sai Nueng ("First Road") and it
//   runs straight through. Beach Road and Walking Street are THE SAME ROAD,
//   named by stretch — which is why OSM files them under one name, and why an
//   unbounded filter runs out of both ends. Bound it, or the arc inflates from
//   744 m to 949 m and skews everything placed by fraction-along-the-street.
//   Between the two points it is near-straight: 744 m of arc on a 737 m chord.
//
//   AND IT KEEPS GOING — the route to Pratumnak, anchored end to end. Sai Nueng
//   runs 203 m past Bali Hai to ★ 12.924855/100.866694, the junction with THIRD
//   ROAD. Turn left there (coming from Walking Street) and Third Road runs
//   892 m southeast, meeting Pra Tumnak Road at 0 m (12.920679/100.870065) and
//   Thappraya Road at 0 m (12.921010/100.872156). Big Buddha sits 258 m off it.
//
//   NAMING TRAP, and it cost two failed lookups: OSM files Third Road under its
//   royal official name, CHALERMPHRAKIAT ROAD. Google says "Pattaya 3rd Rd".
//   Same road. Searching สายสาม finds nothing — the numbered sois and roads use
//   the DIGIT (พัทยาสาย 3), not the word. Expect this on any Thai road that has
//   been royally renamed; look for the official name before concluding a road
//   is missing from OSM.
//
//   PRATUMNAK HILL ROAD is Pra Tumnak Road, and here is the whole of it, traced
//   from Third Road south. Every junction touches at 0 m:
//     ① × Third Rd           12.920506/100.869949
//     ② passes Big Buddha    12.919734/100.867854   (138 m off — it goes AROUND)
//     ③ × Pratumnak Soi 5    12.914395/100.867004   (Phra Tamnak 5 in OSM)
//     ④ × Thappraya Rd       12.911490/100.869325
//     ⑤ Thappraya × Third Rd 12.921158/100.872165   — and the loop closes.
//
//   THE CONNECTOR GAP, measured. Soi 5's east end meets Pra Tumnak Road at 0 m
//   and Thappraya Road at 392 m — they do NOT touch. But `pratumnak_hill_rd`
//   (the crest room, which loosely IS Soi 5) carries `e → thappraya_ext_n`,
//   asserting a link that does not exist on the ground. Reaching Thappraya from
//   Soi 5 really means going via Pra Tumnak Road. Left alone deliberately: that
//   is BAR-MAT work — it needs a connector room, which is new content and a real
//   game change — and it is the one place in this district where survey and bar
//   mat stop being separable. Don't quietly bend the crest's coordinates to make
//   the exit look plausible; the exit is what's wrong.
//
//   Big Buddha is Wat Khao Phra Bat, 12.920396/100.866772 — `buddha_hill` is
//   pinned there, and `pratumnak_rd` to the Third Rd × Pra Tumnak junction.
//   With both endpoints real, `ws_gate —w→ pratumnak_rd` audits at 56°, down
//   from 72°, even though it still compresses the strip, the tail past the pier,
//   Third Road and the climb into ONE exit. That is the bar mat map earning its
//   keep: a punter really does think "west from the gate, up to Pratumnak".
//   The two stretch rooms had their names BACKWARDS — the middle one was called
//   South and the far one North, on a street that runs south from the gate. Ids
//   encoded it too, so both were swapped rather than just the labels; fixing
//   only the labels would have left the same trap one layer down.
//   Deliberately left flagged: the spine audits at ~64°, because Walking Street
//   really runs WSW (bearing 244°) and `w` would be the closer compass word.
//   The graph keeps `s` on purpose — everyone, including our own gate prose,
//   says the strip runs south, and "go west along Walking Street" would be
//   nonsense. This is the bar mat map matching the VERNACULAR rather than the
//   compass, which is what a bar mat map is for. Don't "fix" it.
//
//   Beach Road, Soi 6 south to the Walking Street gate — DONE 2026-08-08.
//   Every room was 344–755 m off the real road; now 0–90 m. Landmarks pinned
//   from OSM: Pattaya Klang junction 12.937594/100.883266, Soi 7's Beach Road
//   end 12.937147/100.883067, the police station at Soi 9 12.935987/100.882822,
//   Central Festival 12.934403/100.883454 (it straddles through to Second Rd,
//   so its room is the Beach Road front), and Tequila Queen at its real-world
//   original the Tahitian Queen, 12.931642/100.879457. Order down the road is
//   PK, Soi 7, Soi 8, Soi 9, Central Mall — worth stating because the sois do
//   NOT simply run north to south past Klang.
//   (RESOLVED 2026-08-08: the motel's 139° flag, Mike's Mall and Pattaya's own
//   Soi 7 all had entries here as outstanding. Soi 7 now exists, the motel hangs
//   off it where a short-time place actually would, and the mall is pinned.)
//
//   ── THE REMAINING 9 AUDIT FLAGS ARE ALL DELIBERATE ───────────────────────
//   Checked exhaustively 2026-08-09, and the earlier gloss on them — "the 45°
//   floor, a four-direction grid can't do diagonals" — was WRONG. Every one is
//   a labelling choice, not a geometric limit: each sits 65–73° off its
//   DECLARED direction but only 17–25° off its NEAREST cardinal, so the grid
//   could say all of them accurately and we have chosen otherwise. Adding
//   intermediate nodes cannot help either — a node on a straight line inherits
//   its bearing, and checked against the OSM polylines none of these roads
//   bends enough to stair-step around.
//
//     Walking Street ×4 (bali_hai→ws_south, ws_north↔ws_south, ws_alley→ws_north)
//       The strip runs ENE–WSW, 24° off due east-west. The game calls its ends
//       North and South, and the ROOM NAMES say so. Relabelling to e/w would
//       green the audit and make the strip read wrong. Bar-mat beats survey.
//     khao_talo ↔ lake_mabprachan ×2
//       6.8 km out to the lake, declared n/s, really ENE/WSW. The long-standing
//       "lake is north, into the dark" call.
//     Tree Town ×3 (tt_deep→tt_back, tt_back↔tt_lane_1)
//       The Back Lane is AUTHORED to disorient — its own desc is "without
//       light, every exit feels like the same wrong one" — and four of its
//       cardinal exits are deliberately non-reciprocal. Do not "fix" these;
//       the prose is the spec.
//
//   Soi 6 + its Beach Road foot — DONE 2026-08-08, the first pass and the
//   center of truth. Laid along the real ซอยพัทยา 6: 359 m, west end
//   12.942883/100.884751 at Beach Road, east end 12.941817/100.887880 at
//   Second Road. It runs ESE, dropping 118 m of latitude on the way, which is
//   why the old dead-flat 108 m strip could never have read as a street.
//
// Known consequence, deliberately left for the next pass rather than fudged:
// moving the Soi 6 junction ~220 m east to its true spot puts a kink in Beach
// Road, so `pattaya_klang —w→ beach_rd_n` audits worse than before. Beach Road
// south to Walking Street is the next segment; it fixes itself there.
//
// Pin each district on its OWN real coordinates, never by chaining off the
// last one — a chain accumulates every previous district's drift. Adjacency is
// the CHECK that they meet, not the source.
const ROOM_GEO = {
  // Jomtien
  jomtien_beach:    [12.89615, 100.86855],
  dongtan_beach:    [12.89826, 100.86651],
  jomtien_beach_rd: [12.89719, 100.86843],
  jomtien_thai:     [12.89735, 100.86819],
  // Soi 7 (Jomtien Beach Rd → Second Rd) and its Second-Road cluster
  jomtien_soi_7_w:          [12.89595, 100.87025],
  jomtien_soi_7_e:          [12.89763, 100.87254],
  jomtien_2nd:      [12.89790, 100.87290],
  soi_rompho:       [12.89806, 100.87266],
  kiss_jomtien:     [12.89960, 100.87113],
  jomtien_2nd_n:    [12.90060, 100.87021],
  lucky7:           [12.89611, 100.87001],
  seabreeze:        [12.89596, 100.87049],
  coconut:          [12.89779, 100.87230],
  sandbar:          [12.89765, 100.87278],
  jomtien_soi_7_oil:         [12.89582, 100.87001],
  jomtien_soi_7_thai:        [12.89751, 100.87230],
  // Thappraya Road / Jomtien Main Strip (Dongtan → Second Rd)
  thappraya_w:      [12.89897, 100.86732],
  thappraya_mid:    [12.89983, 100.86841],
  thappraya_e:      [12.90097, 100.86985],
  supertown_alley:  [12.90042, 100.86780],
  supertown_elbow:  [12.90079, 100.86819],
  peacock_cabaret:  [12.90094, 100.86835],
  adonis_club:      [12.90054, 100.86756],
  arrow_bar:        [12.89913, 100.86708],
  the_boardroom:    [12.89899, 100.86756],
  beach_turn_massage:[12.89884, 100.86708],
  cheeky_monkey:    [12.89985, 100.86865],
  hyper:            [12.89999, 100.86817],
  velvet_club:      [12.89970, 100.86817],
  take_care_me:     [12.90113, 100.86961],
  the_office:       [12.90099, 100.87009],
  thappraya_massage:[12.90084, 100.86961],
  jomtien_7eleven:  [12.89584, 100.86965],
  jomtien_beach_m:  [12.89720, 100.86753],
  jomtien_soi_7_beach_end:   [12.89537, 100.86949],
  jomtien_beach_s1: [12.89408, 100.87077],
  jomtien_beach_s2: [12.89279, 100.87205],
  jomtien_beach_s3: [12.89150, 100.87333],
  dongtan_beach_s:  [12.90198, 100.86339],
  dongtan_beach_m:  [12.90546, 100.86048],
  dongtan_beach_n:  [12.90883, 100.85765],
  jomtien_beach_rd_s: [12.89568, 100.86989],
  jomtien_soi_7_m:          [12.89679, 100.87139],
  jomtien_2nd_m:    [12.89943, 100.87137],
  jomtien_beach_rd_n: [12.89870, 100.86698],
  // Pratumnak
  pratumnak_rd:     [12.92068, 100.87007],
  thappraya_ext_s:  [12.90458, 100.86927],
  thappraya_ext_m:  [12.90765, 100.86893],
  thappraya_ext_n:  [12.91354, 100.87064],
  pratumnak_soi5:   [12.91238, 100.86183],
  pratumnak_soi5_m: [12.91133, 100.86060],
  the_terrace:      [12.91139, 100.86050],
  kingfisher:       [12.91127, 100.86068],
  half_moon_massage:[12.91142, 100.86072],
  pratumnak_soi5_b: [12.91028, 100.85937],
  two_stools:       [12.91034, 100.85928],
  the_gecko:        [12.91022, 100.85945],
  hillside_massage: [12.91037, 100.85949],
  pratumnak_clubs:  [12.91339, 100.86442],
  doghouse:         [12.91333, 100.86430],
  succubus:         [12.91347, 100.86455],
  pratumnak_hill_rd:[12.91440, 100.86700],
  dongtan_rd_n:     [12.90923, 100.85815],
  dongtan_rd_m:     [12.90586, 100.86098],
  dongtan_rd_s:     [12.90238, 100.86389],
  buddha_hill:      [12.9204, 100.86677],
  // Walking Street (the gate is the north end; "ws_south" is the DEEP end)
  ws_gate:          [12.92745, 100.87469],
  pattaya_tai:      [12.92633, 100.87546],
  thai_massage:     [12.92731, 100.87496],
  ws_north:         [12.92616, 100.87269],
  katoeys:           [12.92614, 100.87397],
  windmill:          [12.92598, 100.8736],
  soi_diamond:       [12.92606, 100.87379],
  ws_alley:         [12.92645, 100.87255],
  ws_south:         [12.92508, 100.87018],
  cheap_charlies_jt: [12.8968, 100.87118],
  cheap_charlies:    [12.92839, 100.88462],
  bali_hai:          [12.9246, 100.86855],
  neon_paradise:    [12.92616, 100.87243],
  club_mirage:      [12.92616, 100.87294],
  crystal_palace:   [12.92508, 100.86992],
  paradise_nights:  [12.92508, 100.87044],
  midnight_sun:     [12.92467, 100.86987],
  // Beach Road
  beach_rd_s:       [12.92983, 100.87751],
  papaya_massage:   [12.92934, 100.87788],
  beachthai_massage:[12.92906, 100.87788],
  short_time_motel: [12.93626, 100.88503],
  beach_rd_c:       [12.93450, 100.88159],
  beach_rd_soi7:    [12.93715, 100.88307],
  beach_rd_klang:   [12.93791, 100.88339],
  beach_rd_soi9:    [12.93598, 100.88247],
  pattaya_soi_9:    [12.93515, 100.88377],
  beach_rd_soi8:    [12.93655, 100.88277],
  sea_wall:         [12.93676, 100.88293],
  breakwater:       [12.93662, 100.88297],
  neon_palm:        [12.93640, 100.88300],
  the_bucket:       [12.93628, 100.88308],
  pattaya_soi_8:    [12.93573, 100.88413],
  beachrd_oil:      [12.93396, 100.88186],
  tequila_queen:    [12.93164, 100.87946],
  promenade:        [12.93450, 100.88117],
  central_mall:     [12.93440, 100.88345],
  police_station:   [12.93599, 100.88282],
  beach_rd_top:     [12.94923, 100.88455],
  beach_rd_n:       [12.94288, 100.88475],
  stinky_bar:       [12.94275, 100.88459],
  blue_dog:         [12.94309, 100.88471],
  beach_north_end:  [12.94900, 100.88300],
  north_beach:      [12.94324, 100.88371],
  central_beach:    [12.93770, 100.88190],
  // Soi 6 (Soi Yodsak) — runs inland east off Beach Road: west end, middle, east end
  soi6_street:      [12.94265, 100.88544],
  pink_lotus:       [12.94285, 100.88530],
  orchid_room:      [12.94285, 100.88530],
  golden_dragon:    [12.94251, 100.88539],
  sunset_dreams:    [12.94272, 100.88568],
  soi6_mid:         [12.94230, 100.88647],
  queen_vic:        [12.94253, 100.88623],
  qv_room:          [12.94253, 100.88623],
  sunset_rail:      [12.94219, 100.88633],
  bay_watch:        [12.94240, 100.88662],
  sandy_toes:       [12.94206, 100.88671],
  soi6_deep:        [12.94198, 100.88741],
  kitten_corner:    [12.94218, 100.88727],
  cherry_pop:       [12.94184, 100.88736],
  ruby_kiss:        [12.94205, 100.88765],
  // Naklua
  // The Dolphin roundabout. Beach Rd, Second Rd, Naklua Rd and North Pattaya Rd all
  // terminate on it within 13-29 m of each other — that spread is its diameter, not
  // error. Its centre is the mean of the four road-ends.
  dolphin:          [12.95095, 100.88750],
  naklua_rd:        [12.95343, 100.88926],
  orchid_club:      [12.95327, 100.88884],
  hotel_soi:        [12.95958, 100.89365],
  hotel_room:       [12.95978, 100.89377],
  naklua_bars:      [12.95331, 100.88967],
  anchor_bar:       [12.95320, 100.88982],
  dolphin_bar:      [12.95349, 100.88971],
  mooring_bar:      [12.95304, 100.88985],
  white_rabbit:     [12.95318, 100.89012],
  naklua_massage:   [12.95380, 100.88908],
  naklua_thai:      [12.95392, 100.88891],
  lotus_oil:        [12.95407, 100.88904],
  emperor_soapy:    [12.95396, 100.88930],
  // Second Road
  second_rd_s:      [12.92999, 100.88084],
  second_rd_diamond:[12.92537, 100.87396],
  second_rd_india:  [12.92303, 100.87202],
  second_thai:      [12.93014, 100.88107],
  second_rd_c:      [12.93431, 100.88506],
  second_rd_mall:   [12.93390, 100.88470],
  second_rd_n:      [12.93539, 100.88580],
  second_rd_soi8:   [12.93491, 100.88548],
  pattaya_soi_7:    [12.93650, 100.88460],
  smile_massage:    [12.93552, 100.88554],
  poseidon_soapy:   [12.93528, 100.88606],
  pattaya_klang:    [12.93665, 100.88651],
  second_rd_soi6:   [12.94182, 100.88788],
  // Myth Night
  myth_night:       [12.93274, 100.88479],
  mikes_mall:        [12.9319, 100.88081],
  night_bazaar:      [12.93232, 100.88451],
  candy_bar_2:      [12.93298, 100.88507],
  myth_stage:       [12.93301, 100.88483],
  amp_room:         [12.93309, 100.88464],
  feedback_bar:     [12.93307, 100.88503],
  encore_bar:       [12.93292, 100.88472],
  soundcheck_bar:   [12.93321, 100.88490],
  myth_rows:        [12.93247, 100.88475],
  craft_cargo:      [12.93252, 100.88457],
  the_growler:      [12.93249, 100.88490],
  container_8:      [12.93234, 100.88463],
  reload_bar:       [12.93227, 100.88483],
  // Soi Buakhao
  buakhao_lk:       [12.92962, 100.88533],
  buakhao_n:        [12.92881, 100.88480],
  diana_oil:         [12.93077, 100.88184],
  myth_massage:      [12.93184, 100.88701],
  klang_massage:     [12.93567, 100.88832],
  second_rd_diana:   [12.93104, 100.88204],
  second_rd_myth:    [12.93257, 100.88377],
  second_rd_honey:   [12.93189, 100.883],
  buakhao_honey:     [12.92994, 100.88554],
  buakhao_myth:      [12.93208, 100.88678],
  buakhao_tt:       [12.93146, 100.88646],
  buakhao_klang:     [12.93594, 100.88854],
  metropole_room:   [12.92974, 100.88485],
  rock_factory:     [12.92914, 100.88489],
  lucky_tiger:      [12.92901, 100.88506],
  buakhao_market:   [12.92691, 100.88300],
  candy_bar:        [12.92857, 100.88474],
  silk_rose:        [12.92693, 100.88327],
  buakhao_oil:      [12.92676, 100.88312],
  buakhao_s:        [12.92490, 100.88002],
  buakhao_pt:       [12.92403, 100.87906],
  jasmine_garden:   [12.92414, 100.87915],
  // Soi Honey (Soi 11, between Second Rd and Buakhao)
  soi_honey_w:      [12.93165, 100.88331],
  soi_honey_e:      [12.93023, 100.88516],
  honey_soapy:      [12.93142, 100.88328],
  honey_trap:       [12.93188, 100.88334],
  queen_bee:        [12.93046, 100.88519],
  buzz_inn:         [12.93000, 100.88513],
  // Soi Diana (the big go-go soi; Second Rd ↔ Buakhao, past LK Metro)
  diana_w:          [12.93078, 100.88237],
  diana_mid:        [12.92993, 100.88342],
  diana_e:          [12.92908, 100.88447],
  kiss:             [12.93087, 100.88205],
  dollhouse:        [12.93126, 100.88199],
  sapphire:         [12.93015, 100.88346],
  sundowner:        [12.92971, 100.88339],
  cricketers:       [12.92930, 100.88453],
  areca_room:       [12.92915, 100.88290],
  // Tree Town (real: the Buakhao/Klang corner)
  tt_entrance:      [12.93150, 100.88618],
  tt_lane_1:        [12.93148, 100.88588],
  tt_lane_2:        [12.93146, 100.88558],
  tt_back:          [12.93128, 100.88535],
  tt_deep:          [12.93118, 100.88508],
  gold_rush:        [12.93168, 100.88590],
  starlight_bar:    [12.93166, 100.88560],
  rainbow_girls:    [12.93114, 100.88482],
  oy_office:        [12.93110, 100.88464],
  tt_lane_3:        [12.93106, 100.88536],
  rabbit_hole:      [12.93102, 100.88522],
  lucky_charm:      [12.93104, 100.88516],
  moonshine_bar:    [12.93098, 100.88558],
  // LK Metro (the L-shaped soi off Buakhao)
  lk_entrance:      [12.92918, 100.88432],
  lk_main:          [12.92957, 100.885],
  kinky:            [12.92968, 100.88498],
  slutty:           [12.92946, 100.88503],
  lk_bend:          [12.9296, 100.88445],
  las_vegas:        [12.9295, 100.88441],
  lk_sports:        [12.9295, 100.88489],
  metro_garden:     [12.9297, 100.88448],
  pit_stop:         [12.92966, 100.88434],
  // The Darkside
  sukhumvit_crossing: [12.91004, 100.89620],
  khao_talo_strip:  [12.90782, 100.90693],
  shamrock:         [12.90802, 100.90665],  // the dark end of the strip
  water_buffalo:    [12.90813, 100.90699],
  firefly_bar:      [12.90764, 100.90706],
  night_heron:      [12.90764, 100.90754],
  mama_yai:         [12.90759, 100.90958],
  khao_talo:        [12.90779, 100.90975],
  khao_talo_bar:    [12.90797, 100.90995],
  lake_mabprachan:  [12.93306, 100.96684],
  lake_bar:         [12.93288, 100.96712],
  lake_beer:        [12.93294, 100.96698],
};
