// LBB localization catalogs. Maps an exact English source string → its translation,
// per language. English is the source of truth; any string NOT listed here falls
// back to English (see _L in engine-core.js). Keyed by the literal English text a
// _say()/_L() call emits — same discipline as the th/rom fields in world.js.
//
// Coverage grows incrementally; a partly-translated game still runs (English
// fallback). Load order: after world.js/games.js, before the engine (referenced
// only at runtime by _L, so order is not strict).
//
// de — Deutsch. Register: Tan is a sharp, warm Thai fixer with easy English; in
// German he's colloquial and informal (du). Thai flavour words (na, sanuk, 555,
// Mai pen rai, farang) stay as-is — they're foreign to the German player too.
const _CATALOGS = {
  de: {
    // ── the language pick's own acknowledgement (renders once lang = de) ──────
    "\"Deutsch — gut.\" Something in his patter loosens, like a channel he prefers. \"From here it's your language, my friend. The town stays foreign. That's the fun of it.\"":
      "\"Deutsch — gut.\" Etwas in seinem Geplapper lockert sich, wie ein Sender, den er lieber mag. \"Ab hier in deiner Sprache, mein Freund. Die Stadt bleibt fremd. Das ist der Spaß daran.\"",

    // ── the three identity questions ─────────────────────────────────────────
    "\"So — what's the story back home?\" A glance in the mirror. \"Everybody on this drive is leaving something behind. What's yours?\"":
      "\"Also — was ist die Geschichte daheim?\" Ein Blick in den Spiegel. \"Jeder auf dieser Fahrt lässt etwas zurück. Was ist deins?\"",
    "\"Okay. Two hours to fill.\" He drums the wheel. \"When a room turns to look at you — and out here, my friend, it will — what do they get?\"":
      "\"Okay. Zwei Stunden zu füllen.\" Er trommelt aufs Lenkrad. \"Wenn ein Raum sich umdreht und dich ansieht — und hier draußen, mein Freund, wird er das — was kriegt er zu sehen?\"",
    "\"Last one — saves us both time later, na.\" An easy shrug. \"What are you in the market for?\"":
      "\"Die letzte — spart uns beiden später Zeit, na.\" Ein lässiges Achselzucken. \"Wonach suchst du?\"",

    // ── prompts ──────────────────────────────────────────────────────────────
    "(Pick a number.)": "(Wähl eine Zahl.)",
    "\"Hah — a number, my friend. Long drive.\"": "\"Hah — eine Zahl, mein Freund. Lange Fahrt.\"",

    // ── ORIGINS: label / pick / tan ──────────────────────────────────────────
    "Redundancy": "Wegrationalisiert",
    "A redundancy cheque and a trade nobody's hiring for anymore.":
      "Ein Abfindungsscheck und ein Handwerk, für das keiner mehr einstellt.",
    "\"Twenty years on the tools, then a letter, na. I drive a lot of you this year.\" He crosses three lanes without looking. \"The payout feels like a fortune here. It is — for about a month. Spend it like it has to last, my friend, because it does.\"":
      "\"Zwanzig Jahre auf dem Bau, dann ein Brief, na. Ich fahre dieses Jahr viele von euch.\" Er wechselt drei Spuren, ohne zu schauen. \"Die Abfindung fühlt sich hier wie ein Vermögen an. Ist sie auch — für etwa einen Monat. Gib sie aus, als müsste sie reichen, mein Freund, denn das muss sie.\"",

    "The pension": "Die Rente",
    "A pension, and twenty years of coming back to spend it.":
      "Eine Rente, und zwanzig Jahre, in denen ich wiederkomme, um sie auszugeben.",
    "\"Ahh, a regular! Then you don't need my airport speech.\" He grins into the mirror. \"You know this road better than the man who paved it. Same bars, mostly. Some of the same girls, even — don't tell them I said.\"":
      "\"Ahh, ein Stammgast! Dann brauchst du meine Flughafen-Rede nicht.\" Er grinst in den Spiegel. \"Du kennst diese Straße besser als der Mann, der sie geteert hat. Meist dieselben Bars. Sogar ein paar von denselben Mädchen — sag ihnen nicht, dass ich das gesagt hab.\"",

    "Running from it": "Auf der Flucht",
    "Something back home I'd rather not get into.":
      "Etwas daheim, worüber ich lieber nicht reden will.",
    "A small nod; he lets it lie. \"Mai pen rai. Half this town is a forwarding address for a life that stopped working. Pattaya never asks for references — that's the whole product, na.\"":
      "Ein kleines Nicken; er lässt es auf sich beruhen. \"Mai pen rai. Die halbe Stadt ist eine Nachsendeadresse für ein Leben, das nicht mehr funktioniert hat. Pattaya fragt nie nach Referenzen — das ist das ganze Produkt, na.\"",

    "The detective": "Der Detektiv",
    "I was a homicide detective. Now I find things quietly, for people.":
      "Ich war bei der Mordkommission. Jetzt finde ich Dinge, leise, für Leute.",
    "The eyes flick to the mirror, a half-second too long. \"...Scouting for retirement, or working?\" A pause. \"No — don't answer. I drive people who ask questions for a living too. Sometimes I'm the one who called them.\" A card is in your hand before you saw it move. \"You need a door in this town — you have my number now.\"":
      "Die Augen zucken zum Spiegel, eine halbe Sekunde zu lang. \"...Auf Ruhesitz-Suche, oder im Dienst?\" Eine Pause. \"Nein — antworte nicht. Ich fahre auch Leute, die beruflich Fragen stellen. Manchmal bin ich der, der sie gerufen hat.\" Eine Karte liegt in deiner Hand, bevor du die Bewegung gesehen hast. \"Du brauchst eine Tür in dieser Stadt — jetzt hast du meine Nummer.\"",

    "The investor": "Der Investor",
    "I'm here to make something happen — a bar, property, an opportunity.":
      "Ich bin hier, um etwas auf die Beine zu stellen — eine Bar, Immobilien, eine Gelegenheit.",
    "\"An opportunity.\" He says it like it tastes of something. \"Everybody's got one out here. One in ten is even real. Do yourself a favour — before you sign your name to anything, buy me a coffee. I'll tell you which farang really owns his 'own' bar.\"":
      "\"Eine Gelegenheit.\" Er sagt es, als schmeckte es nach etwas. \"Jeder hier draußen hat eine. Jede zehnte ist sogar echt. Tu dir einen Gefallen — bevor du irgendwo deinen Namen druntersetzt, lad mich auf einen Kaffee ein. Ich sag dir, welchem Farang seine 'eigene' Bar wirklich gehört.\"",

    "The returner": "Der Rückkehrer",
    "I was married to a Thai woman once. That's over. So — here I am.":
      "Ich war mal mit einer Thailänderin verheiratet. Das ist vorbei. Also — hier bin ich.",
    "\"So you speak a little, you know how the song goes, and you know how it ends.\" He softens. \"Welcome back. Slower this time, maybe. Second time through, you watch the hands, not the smile.\"":
      "\"Also sprichst du ein bisschen, du kennst das Lied, und du weißt, wie es endet.\" Er wird sanfter. \"Willkommen zurück. Diesmal langsamer, vielleicht. Beim zweiten Mal achtest du auf die Hände, nicht aufs Lächeln.\"",

    "The monger": "Der Puffgänger",
    "Golf. With the APAC team. (you did actually pack the clubs)":
      "Golf. Mit dem APAC-Team. (du hast die Schläger tatsächlich eingepackt)",
    "\"555 — the APAC team.\" Delighted, not unkind. \"I drive a hundred golfers who never find a course. You brought the clubs, which is somehow worse.\" A cheerful shrug. \"No shame, my man. This whole town is built on exactly you. Play your eighteen holes. All of them.\"":
      "\"555 — das APAC-Team.\" Erfreut, nicht gemein. \"Ich fahre hundert Golfer, die nie einen Platz finden. Du hast die Schläger mitgebracht, was irgendwie schlimmer ist.\" Ein fröhliches Achselzucken. \"Keine Schande, mein Freund. Diese ganze Stadt ist auf genau dich gebaut. Spiel deine achtzehn Löcher. Alle.\"",

    // ── PERSONALITIES: label / pick / tan ────────────────────────────────────
    "Charmer": "Der Charmeur",
    "Someone easy to like.": "Jemand, den man leicht mag.",
    "\"A charmer. The girls will love you — and your wallet — equally. The trick is knowing, each night, which one they mean.\"":
      "\"Ein Charmeur. Die Mädchen werden dich lieben — und dein Portemonnaie — gleichermaßen. Der Trick ist, jeden Abend zu wissen, welches von beiden sie meinen.\"",

    "Joker": "Der Spaßvogel",
    "A laugh. I keep it light.": "Ein Lacher. Ich nehm's locker.",
    "\"A joker. Good — sanuk is the real currency here, better than baht.\" A beat. \"Just read the table. Not every man at the bar wants a comedian at midnight.\"":
      "\"Ein Spaßvogel. Gut — Sanuk ist hier die eigentliche Währung, besser als Baht.\" Eine Pause. \"Lies nur den Tisch. Nicht jeder Mann an der Bar will um Mitternacht einen Komiker.\"",

    "Blunt": "Direkt",
    "Straight talk. Take me or leave me.": "Klartext. Nimm mich, wie ich bin, oder lass es.",
    "\"Blunt.\" An approving nod. \"Out here that's exotic — everyone's selling in a soft voice. Opens some doors fast, slams others faster. Worth it, mostly.\"":
      "\"Direkt.\" Ein anerkennendes Nicken. \"Hier draußen ist das exotisch — alle verkaufen mit sanfter Stimme. Öffnet manche Türen schnell, knallt andere schneller zu. Meistens lohnt es sich.\"",

    "Operator": "Der Stratege",
    "Someone always working the angle.": "Jemand, der immer eine Masche hat.",
    "\"An operator.\" The grin is genuine now. \"Then we understand each other. You'll trust nobody in this town — which is exactly correct — and you'll do just fine.\"":
      "\"Ein Stratege.\" Das Grinsen ist jetzt echt. \"Dann verstehen wir uns. Du wirst niemandem in dieser Stadt trauen — was genau richtig ist — und du wirst bestens zurechtkommen.\"",

    "White knight": "Der weiße Ritter",
    "A decent man. Not like the others in here — the one who actually cares.":
      "Ein anständiger Mann. Nicht wie die anderen hier — der, dem es wirklich etwas bedeutet.",
    "\"Mm. The good one.\" The patter drops for a second; he means it kindly. \"I drive a lot of good ones, my friend. The girls see it from across the bar — a man who want to save somebody.\" He picks his words. \"Some girls need saving. Most just need the rent. Try to know which, na.\"":
      "\"Mm. Der Gute.\" Das Geplapper setzt für einen Moment aus; er meint es freundlich. \"Ich fahre viele Gute, mein Freund. Die Mädchen sehen es quer durch die Bar — ein Mann, der jemanden retten will.\" Er wägt seine Worte. \"Manche Mädchen brauchen Rettung. Die meisten brauchen nur die Miete. Versuch zu erkennen, welche, na.\"",

    // ── ORIENTATIONS: label / pick / tan ─────────────────────────────────────
    "The ladies": "Die Damen",
    "The ladies.": "Die Damen.",
    "\"The ladies. The factory setting of Soi 6.\" He signals the turn. \"Easy. Everyone here is on your side.\"":
      "\"Die Damen. Die Werkseinstellung der Soi 6.\" Er setzt den Blinker. \"Einfach. Hier ist jeder auf deiner Seite.\"",

    "Open-minded": "Aufgeschlossen",
    "The ladies — and I keep an open mind.": "Die Damen — und ich bleibe aufgeschlossen.",
    "\"An open mind.\" A knowing tilt of the head. \"Good. This town rewards it — and it is very, very good at surprising the men who swear they are closed. Some of the most beautiful girls on this soi, my friend, weren't born girls. I'll point you right.\"":
      "\"Aufgeschlossen.\" Ein wissendes Neigen des Kopfes. \"Gut. Diese Stadt belohnt das — und sie ist sehr, sehr gut darin, die Männer zu überraschen, die schwören, sie seien es nicht. Manche der schönsten Mädchen auf dieser Soi, mein Freund, wurden nicht als Mädchen geboren. Ich weise dir den Weg.\"",

    // ── Tan drops you on the soi (last intro beat before the opening) ─────────
    "\"Okay. I got you.\" Tan swings off Second Road and the neon of Soi 6 swallows the windscreen. He drops you at the mouth of the soi, presses a cold water you didn't ask for into your hand, and taps the card already in your pocket. \"First night is on you, my friend. Do me one favour—\" the grin again \"—try to keep your wallet.\"":
      "\"Okay. Ich hab dich.\" Tan biegt von der Second Road ab, und das Neon der Soi 6 verschluckt die Windschutzscheibe. Er setzt dich an der Mündung der Soi ab, drückt dir ein kaltes Wasser in die Hand, um das du nicht gebeten hast, und tippt auf die Karte, die schon in deiner Tasche steckt. \"Die erste Nacht geht auf dich, mein Freund. Tu mir einen Gefallen—\" wieder das Grinsen \"—versuch, dein Portemonnaie zu behalten.\"",

    // ── the opening scenes (what you land in right after the intro) ───────────
    // ALL-CAPS command tokens (HELP, DOWN, INVENTORY, EXAMINE, QUESTS, TALK, ASK,
    // HINT) are kept in English — they are the actual commands the parser accepts
    // and the words decorate() turns into taps; the German prose wraps around them.
    // Thai (สบายสบาย) and ฿ amounts stay; German uses ฿100.000-style separators.
    "Soi 6 · a Pattaya misadventure · Soi Sanuk universe":
      "Soi 6 · ein Pattaya-Schlamassel · Soi-Sanuk-Universum",
    "One week in Pattaya, and you've picked your street and planted your flag: SOI 6 — the loudest hundred metres in Thailand — with the Queen Vic Inn right in the thick of it. You're not leaving the soi this trip; the rest of the city keeps for next time.":
      "Eine Woche in Pattaya, und du hast deine Straße gewählt und deine Flagge gepflanzt: SOI 6 — die lautesten hundert Meter Thailands — mit dem Queen Vic Inn mittendrin. Diese Reise verlässt du die Soi nicht; der Rest der Stadt hält sich bis zum nächsten Mal.",
    "฿{bank} for the week sits in the bank. ฿{pocket} is in your pocket — the rest comes out of the ATM on the street (฿{fee} a pull, ฿{cap} a day) when you need it.":
      "฿{bank} für die Woche liegen auf der Bank. ฿{pocket} hast du in der Tasche — der Rest kommt aus dem Geldautomaten auf der Straße (฿{fee} pro Abhebung, ฿{cap} am Tag), wenn du ihn brauchst.",
    "Goal: สบายสบาย. Get happy. Max out the week. ★":
      "Ziel: สบายสบาย. Werd glücklich. Hol das Maximum aus der Woche. ★",
    "(HELP lists commands. Your night is DOWN the stairs — the pub first, then out into the soi.)":
      "(HELP zeigt die Befehle. Dein Abend geht die Treppe DOWN — erst der Pub, dann raus auf die Soi.)",

    "a Pattaya misadventure · Soi Sanuk universe":
      "ein Pattaya-Schlamassel · Soi-Sanuk-Universum",
    "Day two of your week in Pattaya, and it starts like this: face-down on Jomtien beach, sunset bleeding into the sea, your head pounding like a bass bin outside Neon Paradise A-Go-Go. Day one went well, is the thing. Too well.":
      "Tag zwei deiner Woche in Pattaya, und er beginnt so: mit dem Gesicht nach unten am Strand von Jomtien, der Sonnenuntergang blutet ins Meer, dein Kopf dröhnt wie eine Bassbox vor dem Neon Paradise A-Go-Go. Tag eins lief gut, das ist die Sache. Zu gut.",
    "Your wallet is GONE. Your phone reads 13% battery. Your hotel is in Naklua — the whole town away. The baht bus is ฿{f} a head.":
      "Deine Brieftasche ist WEG. Dein Handy zeigt 13% Akku. Dein Hotel ist in Naklua — am anderen Ende der Stadt. Der Baht-Bus kostet ฿{f} pro Kopf.",
    "You have ฿0.": "Du hast ฿0.",
    "It's going to be one of those nights.": "Es wird eine von diesen Nächten.",
    "(New here? Turn out your pockets — INVENTORY, then EXAMINE what you find — and check what you're up against with QUESTS. The rest, the soi teaches: TALK to people and ASK them about your wallet. HELP lists everything.)":
      "(Neu hier? Leer deine Taschen — INVENTORY, dann EXAMINE, was du findest — und sieh mit QUESTS, was dir bevorsteht. Den Rest bringt dir die Soi bei: TALK mit Leuten und ASK sie nach deiner Brieftasche. HELP zeigt alles.)",
    "The soi remembers your face now. If the night goes quiet, ask it: (HINT)":
      "Die Soi kennt jetzt dein Gesicht. Wenn die Nacht still wird, frag sie: (HINT)",
    "(Type HELP for commands.)": "(Tippe HELP für die Befehle.)",

    // ── room scaffolding labels (the frame around every LOOK) ────────────────
    // Only the label word is translated; the direction/venue/command tokens after
    // it (out, s, Queen Vic Inn, ENTER) stay as-is.
    "You can see: ": "Du siehst: ",
    "Here: ": "Hier: ",
    "Exits: ": "Ausgänge: ",
    "Step inside: ": "Eintreten: ",
    ". (ENTER <name>)": ". (ENTER <Name>)",

    // ── landing-room names + descriptions (where each mode drops you) ─────────
    "Your Room — Queen Vic Inn": "Dein Zimmer — Queen Vic Inn",
    "Jomtien Beach (South)": "Jomtien Beach (Süd)",
    "The balcony room over the Queen Vic: wood floors, a ceiling fan with strong opinions, and the balcony itself — a recliner, a small table, and the whole of Soi 6 performing below like a fish tank somebody dropped a radio into. A firm double bed fills the rest of the room — the neon never quite lets go of it, but the blackout curtains and the aircon get you there. A flatscreen on the wall and a mini-fridge in the corner — two free waters a day, housekeeping's one kindness — round out the luxuries. (SLEEP to turn in and end the night · WATCH TV · OPEN FRIDGE · or step onto the BALCONY.)":
      "Das Balkonzimmer über dem Queen Vic: Holzböden, ein Deckenventilator mit starken Meinungen, und der Balkon selbst — ein Liegestuhl, ein kleiner Tisch und die ganze Soi 6, die unten aufführt wie ein Aquarium, in das jemand ein Radio geworfen hat. Ein festes Doppelbett füllt den Rest des Zimmers — das Neon lässt nie ganz von ihm ab, aber die Verdunklungsvorhänge und die Klimaanlage bringen dich hin. Ein Flachbildschirm an der Wand und ein Minikühlschrank in der Ecke — zwei kostenlose Wasser am Tag, die eine Freundlichkeit des Zimmerservice — runden den Luxus ab. (SLEEP zum Schlafengehen und die Nacht beenden · WATCH TV · OPEN FRIDGE · oder tritt auf den BALCONY.)",
    "Soft sand, folded-up loungers, and the last smear of sunset dying over the sea. Two gray-and-white soi cats hold down the end of a lounger, the big one sitting slightly in front of the small one, both watching the water. The beach road glows to the east; the sand runs north up the shore and narrows south toward the Soi 7 end, where a drinks cart is parked. Your face was in this sand until about a minute ago.":
      "Weicher Sand, zusammengeklappte Liegen und der letzte Streifen Sonnenuntergang, der überm Meer verglüht. Zwei grau-weiße Soi-Katzen halten das Ende einer Liege besetzt, die große sitzt ein Stück vor der kleinen, beide beobachten das Wasser. Die Strandstraße glüht im Osten; der Sand zieht sich nach Norden die Küste hinauf und verengt sich südlich zum Soi-7-Ende, wo ein Getränkewagen parkt. Dein Gesicht lag bis vor etwa einer Minute in diesem Sand.",

    // ── the tap interface: chip + flyout-wheel LABELS (display only) ──────────
    // These are keyed by the exact English chip/wheel label; term.js renders
    // _L(label) while still submitting the English command underneath. Dynamic
    // labels (NPC/venue/hotel names, ฿ amounts) aren't listed → fall back, correct.
    // Short keys are safe: no _say() prose is ever exactly one of these words.

    // room + navigation chips
    "look": "Umsehen", "map": "Karte", "help": "Hilfe", "inv": "Taschen",
    "buy beer": "Bier kaufen", "play": "Spielen", "light": "Licht", "bus": "Bus",
    "buy water": "Wasser kaufen", "buy food": "Essen kaufen",
    "balance": "Kontostand", "stay put": "Bleiben", "quit": "Beenden",
    // directions (label only; the n/s/e/w/… command stays English)
    "E": "O", "IN": "REIN", "OUT": "RAUS", "UP": "HOCH", "DOWN": "RUNTER",
    // open-prefill chips (keep the trailing ellipsis)
    "buy drink…": "Drink kaufen…", "hire…": "Anheuern…", "flirt…": "Flirten…",
    "barfine…": "Barfine…", "talk…": "Reden…", "motosai…": "Motosai…",
    // in-conversation palette
    "compliment": "Kompliment", "joke": "Witz", "tease": "Necken",
    "flirt": "Flirten", "buy drink": "Drink kaufen", "leave": "Gehen",
    // vacation-end / relocation
    "play again": "Nochmal spielen", "new vacation": "Neuer Urlaub",
    "move to Pattaya": "Nach Pattaya ziehen",
    // flyout-wheel actions (term.js _NPC_ACT)
    "talk": "Reden", "examine": "Ansehen", "photo": "Foto",
    "buy her a drink": "Ihr einen Drink", "buy him a drink": "Ihm einen Drink",
    "tip …": "Trinkgeld …", "contact": "Nummer", "barfine": "Barfine",
    "hire": "Anheuern", "wai": "Wai",

    // ── Soi 6 walkable rooms (the pub + the three stretches you traverse) ─────
    // Bar names + Second Road stay (proper nouns); the girls' English shouts stay
    // English (foreign flavour, like Thai); (WATCH SOI) stays (a command token).
    "Soi 6 (Middle)": "Soi 6 (Mitte)",
    "Soi 6 (West End)": "Soi 6 (Westende)",
    "Soi 6 (East End)": "Soi 6 (Ostende)",
    "Actual air conditioning. Actual wood panelling. A dartboard. The Queen Vic Inn anchors the quiet middle stretch of Soi 6 with the righteous calm of a man who has seen it all and ordered another pint — the one place on the soi that isn't shouting. Through the window, the soi performs — the show without the sweat (WATCH SOI). Terry holds down the corner stool with a beer and the settled air of a man who has watched it all twice. At the far end, most nights, Mort's spiral notebook lies open beside his beer — as much a fixture as the dartboard. A staircase behind the bar leads UP to the guest rooms.":
      "Echte Klimaanlage. Echte Holzvertäfelung. Eine Dartscheibe. Das Queen Vic Inn verankert das ruhige Mittelstück der Soi 6 mit der gerechten Gelassenheit eines Mannes, der alles gesehen und noch ein Pint bestellt hat — der einzige Ort auf der Soi, der nicht schreit. Durchs Fenster führt die Soi ihr Stück auf — die Show ohne den Schweiß (WATCH SOI). Terry hält den Eckhocker mit einem Bier und der abgeklärten Ruhe eines Mannes, der alles zweimal gesehen hat. Am anderen Ende liegt an den meisten Abenden Morts Spiralblock aufgeschlagen neben seinem Bier — so sehr Inventar wie das Dartboard. Eine Treppe hinter der Bar führt nach oben zu den Gästezimmern.",
    "The middle of Soi 6, where the wall of noise thins to something you can hear yourself think over. The hard-selling open fronts of the west end give way to a run of easygoing beer bars whose whole business is letting you sit and watch the parade rather than be dragged into it. The pullers here are lazier, or wiser — they leave the grabbing to the loud ends and pick up the men who wander through wanting a cold one and a ringside seat. THE SHADY LADY, FRONT ROW BAR, and THE VERANDAH line the quiet stretch, and the QUEEN VIC INN — real aircon, real wood, a dartboard — anchors it, the one place on the soi that isn't shouting. West, the racket starts up again; east, it's worse.":
      "Die Mitte der Soi 6, wo die Lärmwand auf etwas ausdünnt, bei dem du dich selbst denken hörst. Die aufdringlichen offenen Fronten des Westendes weichen einer Reihe entspannter Bierbars, deren ganzes Geschäft darin besteht, dich sitzen und die Parade beobachten zu lassen, statt dich hineinzuziehen. Die Schlepper hier sind fauler, oder klüger — sie überlassen das Grabschen den lauten Enden und sammeln die Männer ein, die durchspazieren und ein kühles Bier und einen Logenplatz wollen. THE SHADY LADY, FRONT ROW BAR und THE VERANDAH säumen das ruhige Stück, und das QUEEN VIC INN — echte Klimaanlage, echtes Holz, eine Dartscheibe — verankert es, der einzige Ort auf der Soi, der nicht schreit. Im Westen geht der Krach wieder los; im Osten ist es schlimmer.",
    "The west end of the soi, and it hits you the moment you step in — a wall of bars at volume, each trying to drown the next in bass and shouted Thai pop. No stages, no dark rooms: just open-air fronts at street level thrown wide to the pavement, and the ladies working them, spilling out in sequins and very little else to reel in anything that walks. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" You are grabbed by the wrist. You are grabbed by the other wrist. Someone significantly shorter than you attempts to climb onto your back. A couple of the girls have armed themselves with foam pool noodles and swat anyone who dares walk past without stopping. PINK LOTUS LOUNGE, GOLDEN DRAGON BAR, and SUNSET DREAMS LOUNGE are the main combatants here. East, the soi opens into a quieter middle stretch before the racket picks up again at the far end.":
      "Das Westende der Soi, und es trifft dich in dem Moment, in dem du hineintrittst — eine Wand aus Bars auf voller Lautstärke, jede versucht die nächste in Bass und gebrülltem Thai-Pop zu ertränken. Keine Bühnen, keine dunklen Zimmer: nur Freiluft-Fronten auf Straßenniveau, weit zum Gehweg hin aufgerissen, und die Damen, die sie bespielen, quellen in Pailletten und sehr wenig sonst heraus, um alles hereinzuangeln, was vorbeiläuft. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" Du wirst am Handgelenk gepackt. Du wirst am anderen Handgelenk gepackt. Jemand deutlich Kleineres als du versucht, dir auf den Rücken zu klettern. Ein paar der Mädchen haben sich mit Schaumstoff-Poolnudeln bewaffnet und hauen jeden, der es wagt, ohne anzuhalten vorbeizugehen. PINK LOTUS LOUNGE, GOLDEN DRAGON BAR und SUNSET DREAMS LOUNGE sind hier die Hauptkämpfer. Im Osten öffnet sich die Soi in ein ruhigeres Mittelstück, bevor der Krach am anderen Ende wieder losgeht.",
    "The east end of the soi, past the quieter middle, where the bars run on toward Second Road and the volume comes roaring back. KITTEN CORNER, CHERRY POP BAR, and RUBY KISS BAR trade wrist-grabs down this stretch — same open ground-floor fronts, same three-colour neon, same staircases behind the bar the menu doesn't mention, and the same foam pool noodles that find your ribs if you try to walk on by.":
      "Das Ostende der Soi, hinter der ruhigeren Mitte, wo die Bars weiter zur Second Road hin laufen und die Lautstärke brüllend zurückkommt. KITTEN CORNER, CHERRY POP BAR und RUBY KISS BAR tauschen auf diesem Stück Handgelenk-Griffe aus — dieselben offenen Erdgeschossfronten, dasselbe dreifarbige Neon, dieselben Treppen hinter der Bar, die die Karte nicht erwähnt, und dieselben Schaumstoff-Poolnudeln, die deine Rippen finden, wenn du versuchst vorbeizugehen.",

    // ── Soi 6 bar interiors (the 7 bars + 3 beer bars you enter on the strip) ─
    // Venue names (Pink Lotus Lounge, The Shady Lady…), character names, CAPS
    // commands (ORCHID ROOM, GO BACK), and brands (Blue Label) stay as-is.
    "A beer bar in the quiet middle of Soi 6, deliberately set back under a low awning and a stand of potted palms — shade, in both senses. A long rail faces the soi so the regulars can watch the parade go past without being in it. Pukky pours without being asked and misses nothing that happens on the pavement.":
      "Eine Bierbar in der ruhigen Mitte der Soi 6, bewusst zurückgesetzt unter einer niedrigen Markise und einer Reihe Topfpalmen — Schatten, in beiderlei Sinn. Ein langer Tresen zeigt zur Soi, damit die Stammgäste die Parade vorbeiziehen sehen, ohne selbst mittendrin zu sein. Pukky schenkt nach, ohne gefragt zu werden, und ihr entgeht nichts, was auf dem Gehsteig passiert.",

    "A beer bar that leans all the way into what the middle of Soi 6 is good for: a row of stools pulled right up to the open front, angled at the soi like theatre seating. The house joke is a laminated 'SHOW TIMES' card that just reads ALL NIGHT. Somo keeps the cooler cold and the running commentary warm.":
      "Eine Bierbar, die voll auf das setzt, wofür die Mitte der Soi 6 gut ist: eine Reihe Hocker direkt an die offene Front gezogen, zur Soi ausgerichtet wie Theatersitze. Der Hauswitz ist eine laminierte 'SHOW TIMES'-Karte, auf der nur ALL NIGHT steht. Somo hält den Kühler kalt und den laufenden Kommentar warm.",

    "The calmest front on Soi 6: a raised wooden deck a step up off the pavement, a rail, a couple of lazy fans, and enough of a threshold that the soi's aggressive lady-pullers don't bother climbing it. Nina brings the beer to your chair so you never have to give up the good seat.":
      "Die ruhigste Front der Soi 6: ein erhöhtes Holzdeck, eine Stufe über dem Gehsteig, ein Geländer, ein paar träge Ventilatoren, und gerade genug Schwelle, dass die aggressiven Lady-Puller der Soi sich das Hochsteigen sparen. Nina bringt das Bier an deinen Stuhl, damit du den guten Platz nie aufgeben musst.",

    "White Dish's flagship, and the loudest argument for why the group should not be allowed nice things. The front is open to the street; half the bar is technically the pavement. Neon tubes frame the sign in three colours simultaneously. Inside, the pink is structural — walls, barstools, the girls' outfits, arguably the air itself. Joy is already talking before you sit down. A staircase at the back climbs to the short-time rooms; beside it, a velvet-roped, unmarked door leads to the ORCHID ROOM — the group's members-only back room, and very much not for tonight's walk-up trade. (GO BACK, if you think you're on the list.)":
      "White Dishs Flaggschiff, und das lauteste Argument dafür, warum man der Gruppe keine schönen Dinge anvertrauen sollte. Die Front ist offen zur Straße; die halbe Bar ist streng genommen Gehsteig. Neonröhren rahmen das Schild in drei Farben gleichzeitig. Drinnen ist das Pink strukturell — Wände, Barhocker, die Outfits der Mädchen, wohl auch die Luft selbst. Joy redet schon, bevor du dich setzt. Eine Treppe hinten führt hinauf zu den Kurzzeit-Zimmern; daneben führt eine samtbeseilte, unbeschriftete Tür zum ORCHID ROOM — dem Members-only-Hinterzimmer der Gruppe, und ganz sicher nichts für die Laufkundschaft von heute Abend. (GO BACK, falls du glaubst, du stehst auf der Liste.)",

    "The name is the last classy thing about it. Ryan Powers wanted a members' club — leather, low light, single malt, discretion — and got a bacchanal, because the room curdled to match its owner. The 'hostesses' start the night topless and end it well past that; the low light is a strobe; the discretion is a joke told at volume. The clientele is the soi's real economy: high rollers who tip in colours the pavement trade never sees, and at the corner tables the men the monthly envelope actually pays — a patched MC president holding court over a bottle of Blue Label, and, at the best table in the room, a soft-spoken Thai man in an unremarkable shirt whom everyone, the MC president included, is very careful to defer to. On a raised banquette at the back, filming himself over all of it, is Ryan Powers — actually, improbably, down tonight.":
      "Der Name ist das letzte Stück Klasse daran. Ryan Powers wollte einen Members' Club — Leder, gedämpftes Licht, Single Malt, Diskretion — und bekam ein Bacchanal, weil der Raum verdarb, bis er zu seinem Besitzer passte. Die 'Hostessen' beginnen den Abend oben ohne und enden ihn deutlich darüber hinaus; das gedämpfte Licht ist ein Stroboskop; die Diskretion ist ein laut erzählter Witz. Die Klientel ist die wahre Ökonomie der Soi: Highroller, die in Farben Trinkgeld geben, die das Straßengeschäft nie zu sehen bekommt, und an den Ecktischen die Männer, die der monatliche Umschlag wirklich bezahlt — ein MC-Präsident mit Kutte, der bei einer Flasche Blue Label Hof hält, und, am besten Tisch im Raum, ein leise sprechender Thai in einem unscheinbaren Hemd, dem alle, den MC-Präsidenten eingeschlossen, sehr sorgfältig den Vortritt lassen. Auf einer erhöhten Bank hinten, sich selbst über allem filmend, sitzt Ryan Powers — tatsächlich, wider Erwarten, heute Abend da.",

    "Open-fronted, louder than you expected from outside, which is saying something. The gold dragon above the bar was hand-painted by someone's cousin and has been there longer than most of the staff. Vintage Thai pop on the speakers — not the jukebox, it died in 2019, but the playlist is a faithful tribute. Nobody has updated it and nobody has complained. Pia keeps the bar — and the dead jukebox's memory — with a flat, unbothered calm.":
      "Nach vorn offen, lauter als von außen erwartet, was etwas heißen will. Der goldene Drache über der Bar wurde von irgendjemandes Cousin von Hand gemalt und hängt dort länger als die meisten Angestellten. Alter Thai-Pop aus den Boxen — nicht die Jukebox, die starb 2019, aber die Playlist ist eine treue Hommage. Niemand hat sie aktualisiert und niemand hat sich beschwert. Pia führt die Bar — und das Andenken der toten Jukebox — mit flacher, unbeeindruckter Ruhe.",

    "Open to the pavement like the rest, but bathed in soft pink light instead of three-colour neon, with a hand-painted cloud mural gone streaky above the bar — the 'dreams' part, such as it is. It's no gentler for the mood lighting: the girls work the open front as hard as anyone on the soi. Kwan folds napkins into cranes at the end of the rail, adding to a row of them lined up like a tiny origami militia, and still finds a hand free for your sleeve as you pass.":
      "Zur Straße offen wie der Rest, aber in weiches rosa Licht getaucht statt in dreifarbiges Neon, mit einem handgemalten Wolken-Wandbild, das über der Bar verlaufen ist — der 'Dreams'-Teil, so wie er ist. Sanfter macht es die Stimmungsbeleuchtung nicht: Die Mädchen bearbeiten die offene Front so hart wie alle anderen auf der Soi. Kwan faltet am Ende des Tresens Servietten zu Kranichen, einer wachsenden Reihe, aufgereiht wie eine winzige Origami-Miliz, und hat trotzdem eine Hand frei für deinen Ärmel, wenn du vorbeigehst.",

    "Open to the pavement, walled in cat posters and a neon paw print. Praewa and Nangfah work the front, and the grab-and-giggle starts before you've fully stopped walking; Kesinee watches it all from the till, pricing you before you sit. A staircase at the back goes up to the short-time rooms.":
      "Zur Straße offen, zugepflastert mit Katzenpostern und einem Neon-Pfotenabdruck. Praewa und Nangfah bearbeiten die Front, und das Grapschen-und-Kichern beginnt, bevor du ganz zum Stehen gekommen bist; Kesinee beobachtet alles von der Kasse und preist dich ein, bevor du dich setzt. Eine Treppe hinten führt hinauf zu den Kurzzeit-Zimmern.",

    "Red from floor to ceiling, a bowl of actual cherries on the bar that nobody eats, and a sound system stuck on one bubblegum playlist. Tabtim and Chaba call the odds from the rail. The stairs are where the stairs always are.":
      "Rot von oben bis unten, eine Schale echter Kirschen auf der Bar, die niemand isst, und eine Anlage, die auf einer einzigen Bubblegum-Playlist festhängt. Tabtim und Chaba geben vom Tresen die Quoten aus. Die Treppe ist da, wo die Treppe immer ist.",

    "The last loud front before the soi spills onto Second Road: lipstick-red lighting, a mirror wall, and a lipstick-mark motif on everything including the glasses. Wilai runs the front stools, and Kluay and Benz have already claimed the two nearest for you.":
      "Die letzte laute Front, bevor die Soi auf die Second Road ausläuft: lippenstiftrotes Licht, eine Spiegelwand und ein Lippenstift-Kuss-Motiv auf allem, die Gläser eingeschlossen. Wilai führt die vorderen Hocker, und Kluay und Benz haben die zwei nächsten schon für dich beansprucht.",

    // ══ TAITCH — Mercedes (gold_rush) ════════════════════════════════════════
    // A Taitch lady: 5 years in Munich, so she meets a German punter in the German
    // that once made her small — now on HER terms. NARRATION → clean German; HER
    // SPEECH → Taitch (dropped endings, no articles, Thai syntax + German vocab,
    // her dry wit intact). Thai particles (na, tilac, mai pen rai) stay. Only her
    // lines are catalogued, so every other NPC still falls back to English speech.
    "A little older than the other girls here and a great deal less nervous — she moves like someone who has already seen the worst a room can do to a person. Her English is good, with a flat European edge the soi doesn't usually carry.":
      "Ein bisschen älter als die anderen Mädchen hier und ein gutes Stück weniger nervös — sie bewegt sich wie jemand, der das Schlimmste, das ein Raum einem Menschen antun kann, schon gesehen hat. Ihr Deutsch ist gut, mit einer flachen europäischen Kante, die die Soi sonst nicht trägt.",

    "\"Welcome to Cherry Pop.\" A small, real smile. \"Loud, pink, entirely a machine — but the drinks are cold and I do not lie to you, which on this soi is a luxury. Sit. I am Mercedes. Yes, like the car. I had one in the driveway in Munich and never once the keys. Now I keep the name and skip the car.\"":
      "Sie fängt die Kante in deinem Englisch beim ersten Satz — «Ah. Deutscher.» Ein trockenes, fast belustigtes Nicken, und sie wechselt die Sprache, als leg sie einen Mantel ab, den sie sowieso nicht mag. \"Willkommen im Cherry Pop.\" Ein kleines, echtes Lächeln. \"Laut, pink, komplett Maschine — aber Drinks sind kalt und ich lüg dich nicht an, was auf dieser Soi Luxus ist. Setz. Ich bin Mercedes. Ja, wie Auto. Ich hab einen gehabt in Einfahrt in München, und nie einmal Schlüssel. Jetzt ich behalt Name und lass Auto weg.\"",
    "\"Mercedes — like the car. Kept the name, skipped the car. Sit, tilac.\"":
      "\"Mercedes — wie Auto. Name behalt, Auto weg. Setz, tilac.\"",

    "\"Germany. Five years, Munich. Big house, a car, the health insurance — everything the brochure promise.\" She turns a coaster over. \"And I could not tell a joke. Could not argue, could not be a person — only 'Guten Tag, Danke', like a child with two words. His mother look at me: prostitute who steal my son. Never once she say it. Never once she hide it.\"":
      "\"Deutschland. Fünf Jahr, München. Großes Haus, Auto, Krankenversicherung — alles was Broschüre versprech.\" Sie dreht einen Bierdeckel um. \"Und ich konnt kein Witz erzähl. Konnt nicht streit, konnt nicht Mensch sein — nur 'Guten Tag, Danke', wie Kind mit zwei Wort. Seine Mutter schau mich an: Prostituierte, die mein Sohn stiehl. Nie einmal sie sagt. Nie einmal sie versteck.\"",
    "\"Munich: big house, no jokes. A mute child with a nice kitchen.\"":
      "\"München: großes Haus, kein Witz. Ein stumm Kind mit schön Küche.\"",

    "\"My visa was married to him — you understand? Not to me. I leave, I am on a plane in one month. So I stay.\" A shrug with a whole country in it. \"Three hundred euro pocket money, and I must account for it. In Pattaya I made eighty thousand baht and sent half to my mother in Isaan. There, I cannot send one baht. A Thai daughter who cannot take care of her mother has lost everything. The house was warm. I was empty.\"":
      "\"Mein Visum war verheirat mit ihm — du versteh? Nicht mit mir. Ich geh, ich bin in Flugzeug in ein Monat. Also ich bleib.\" Ein Achselzucken mit einem ganzen Land drin. \"Dreihundert Euro Taschengeld, und ich muss abrechne dafür. In Pattaya ich hab achtzigtausend Baht gemacht und Hälfte geschickt zu meine Mutter in Isaan. Dort, ich kann nicht ein Baht schick. Thai-Tochter, die nicht kann sorg für ihre Mutter, hat alles verlor. Haus war warm. Ich war leer.\"",
    "\"Visa tied to him, 300 euro to account for, could not send my mother a baht. Warm house, empty me.\"":
      "\"Visum an ihn gebund, 300 Euro abrechne, kein Baht für meine Mutter. Warmes Haus, leere ich.\"",

    "\"Hans was not cruel. That is the joke — no black eye, no drama.\" She almost laughs. \"My uncle die. I ask him to book the flight for the funeral. He open Excel. Excel! Turn the screen to me — 'too expensive right now' — and then so gentle: 'You know you have nothing without me.'\" She snaps the coaster flat. \"That night I pack. In Munich, zero friends. In Pattaya, one hundred people waiting for me. Which one is rich?\"":
      "\"Hans war nicht grausam. Das ist Witz — kein blaues Auge, kein Drama.\" Sie lacht fast. \"Mein Onkel stirb. Ich frag ihn, Flug buch für Beerdigung. Er macht Excel auf. Excel! Dreht Bildschirm zu mir — 'zu teuer grad' — und dann so sanft: 'Du weiß, du hast nichts ohne mich.'\" Sie knallt den Bierdeckel flach. \"Diese Nacht ich pack. In München, null Freund. In Pattaya, hundert Leute wart auf mich. Welche ist reich?\"",
    "\"He opened a spreadsheet for my uncle's funeral. 'Nothing without me.' I packed that night.\"":
      "\"Er macht Tabelle auf für Beerdigung von mein Onkel. 'Nichts ohne mich.' Diese Nacht ich pack.\"",

    "\"People see an old girl back on the stool and they think — poor thing, could not keep him.\" The smile sharpens, not unkind. \"So let me give you the reality, tilac. In Germany: big house, car, insurance — and I ask permission to buy som tam, I beg to visit my own family. Here: a cheap room and a Honda Click. But I am free. I send my mother money when I want. I laugh loud with my friends. Which one is the real dream? I chose it. Nobody chose for me.\"":
      "\"Leute sehen alte Frau zurück auf Hocker und denk — arme Ding, konnt ihn nicht halt.\" Das Lächeln wird schärfer, nicht unfreundlich. \"Also lass mich dir Wahrheit geb, tilac. In Deutschland: großes Haus, Auto, Versicherung — und ich frag Erlaubnis für som tam kauf, ich bettel, meine eigene Familie besuch. Hier: billiges Zimmer und Honda Click. Aber ich bin frei. Ich schick meine Mutter Geld wann ich will. Ich lach laut mit meine Freund. Welche ist der echte Traum? Ich hab gewählt. Keiner hat für mich gewählt.\"",
    "\"Big house and permission, or a Honda Click and freedom? I chose. That's the whole story.\"":
      "\"Großes Haus und Erlaubnis, oder Honda Click und Freiheit? Ich hab gewählt. Das ist ganze Geschichte.\"",

    "\"Money?\" She waves a hand at the neon. \"It come, it go, like the rain. In Munich I learn the other way — everything counted, everything saved — and it made me small. Here, when I have it I send it home, I buy Nong her dinner; when it is zero, mai pen rai, I earn again. That is not being poor. That is being free of the counting.\"":
      "\"Geld?\" Sie winkt mit der Hand zum Neon. \"Es komm, es geh, wie Regen. In München ich lern andere Weg — alles gezählt, alles gespart — und das macht mich klein. Hier, wenn ich hab, ich schick nach Haus, ich kauf Nong ihr Essen; wenn null, mai pen rai, ich verdien wieder. Das ist nicht arm sein. Das ist frei sein von Zählerei.\"",
    "\"Money is rain — comes, goes, I send it home. In Munich the counting made me small.\"":
      "\"Geld ist Regen — komm, geh, ich schick nach Haus. In München Zählerei macht mich klein.\"",

    "\"Nong? The trembling one over at the Gold Rush.\" Something almost maternal crosses her face. \"I worked that bar before this one — first week she was, scared of the door, scared of Mamasan, scared of everything. I was her, fifteen years ago, a go-go on Soi 6.\" A softer smile. \"Somebody should tell her the worst thing that happen is you go all the way to Munich and come back. Not so bad, in the end. I still keep an eye out, from here.\"":
      "\"Nong? Die Zittrige drüben im Gold Rush.\" Etwas fast Mütterliches geht über ihr Gesicht. \"Ich hab die Bar vor dieser gearbeit — erste Woche war sie, Angst vor Tür, Angst vor Mamasan, Angst vor allem. Ich war sie, vor fünfzehn Jahr, Go-go auf Soi 6.\" Ein weicheres Lächeln. \"Jemand soll ihr sag: schlimmste, was passier, ist du geh ganz bis München und komm zurück. Nicht so schlimm, am Ende. Ich pass immer noch auf, von hier.\"",
    "\"Nong, over at the Gold Rush — I was her, fifteen years ago. I keep an eye out.\"":
      "\"Nong, drüben im Gold Rush — ich war sie, vor fünfzehn Jahr. Ich pass auf.\"",

    "\"You keep coming back to Cherry Pop for ME — the neon is not that charming, we both know it.\" For once Mercedes lets the dry line land soft. \"After Munich I made myself one promise: no more man I have to manage. And here is you — needing no managing, buying the old girl at the loud bar her drink like it is Vienna. Don't make me like you, farang. I am badly out of practice.\"":
      "\"Du komm immer zurück zum Cherry Pop für MICH — Neon ist nicht so charmant, wir wissen beide.\" Ausnahmsweise lässt Mercedes die trockene Zeile weich landen. \"Nach München ich hab mir ein Versprech gemacht: kein Mann mehr, den ich manag muss. Und hier bist du — brauch kein Managen, kaufst der alten Frau an der lauten Bar ihr Drink wie es Wien wär. Mach nicht, dass ich dich mag, Farang. Ich bin schlecht aus Übung.\"",
    "\"Don't make me like you, farang. I'm badly out of practice.\"":
      "\"Mach nicht, dass ich dich mag, Farang. Ich bin schlecht aus Übung.\"",

    "\"Sit — the good stool, I saved it.\" Mercedes slides your drink over without asking; she knows the order now. \"You are the only one in here who asks me a question and then waits for the answer. It is a low bar, I know. Munich was lower.\"":
      "\"Setz — guter Hocker, ich hab gespart.\" Mercedes schiebt dir dein Drink rüber, ohne zu frag; sie kennt die Bestellung jetzt. \"Du bist einzige hier, der mir Frage stellt und dann wart auf Antwort. Ist niedrige Latte, ich weiß. München war niedriger.\"",
    "\"You ask a question and wait for the answer. Low bar. Munich was lower.\"":
      "\"Du stell Frage und wart auf Antwort. Niedrige Latte. München war niedriger.\"",

    // ══ TAITCH — Jenny (pink_lotus) ══════════════════════════════════════════
    // The 2nd Taitch lady — deliberately LIGHTER than Mercedes. Jenny never lived
    // in Germany; she picked her German off Klaus, her sponsor of two years. So her
    // Taitch is more fragmentary and warmer — phrasebook German (endearments, money,
    // "sauber"/clean, "vergeben"/spoken-for), heavier Thai syntax, present tense.
    "Neat, quick with the till, a promise ring she touches when she's thinking. She took the cashier seat on purpose — off the floor, off the market, kept clean for the man in Germany who sends the money.":
      "Ordentlich, flink an der Kasse, ein Versprechensring, den sie berührt, wenn sie nachdenkt. Sie hat den Kassenplatz mit Absicht genommen — weg vom Parkett, weg vom Markt, sauber gehalten für den Mann in Deutschland, der das Geld schickt.",

    "\"Hello, welcome.\" Warm, with a boundary in it — the smile of a woman who has practised saying no nicely. \"I do the till, not the floor. You want a girl, I call a good one over, no problem. Me, I am spoken for.\" She touches the ring without knowing she does.":
      "Sie hört den Akzent und ihr Gesicht geht auf. \"Oh — du bist Deutsch? 😊 Ich üb mit Klaus, jetzt ich üb mit dir ein bisschen, ja?\" Dann kehrt die Grenze zurück, freundlich, geübt. \"Hallo, willkommen. Ich mach Kasse, nicht Parkett. Du willst Mädchen, ich ruf eine Gute, kein Problem. Ich — ich bin vergeben.\" Sie berührt den Ring, ohne zu wissen, dass sie es tut.",
    "\"I do the till, not the floor. I am spoken for — I'll call a girl over for you.\"":
      "\"Ich mach Kasse, nicht Parkett. Ich bin vergeben — ich ruf dir eine Gute.\"",

    "\"Klaus. Germany.\" She says the name like an anchor. \"Two year now. He send money every month, I keep clean, I stay off the floor, I go with nobody. That is the deal, I keep my side.\" A steadiness that is mostly real. \"He come Pattaya twice a year. In between, I count the drinks and I count the days. Good deal. Better than the floor.\"":
      "\"Klaus. Deutschland.\" Sie sagt den Namen wie einen Anker. \"Zwei Jahr jetzt. Er schick Geld jeden Monat, ich bleib sauber, ich bleib weg vom Parkett, ich geh mit keinem. Das ist Deal, ich halt meine Seite.\" Eine Festigkeit, die größtenteils echt ist. \"Er komm Pattaya zweimal im Jahr. Dazwischen ich zähl Drinks und ich zähl Tage. Guter Deal. Besser als Parkett.\"",

    "She doesn't touch the ring this time. \"You know what you did, na. You made the number too big to say no to.\" Not angry — tired, ashamed, and doing the arithmetic anyway. \"Klaus send good money, every month, two year. You just... kept putting it in. Week after week. Till your number bigger than his, and I saw it, and now I cannot un-see.\" A flat breath. \"I am not clean anymore. You bought that. I hope it was worth what it cost. For both of us.\"":
      "Diesmal berührt sie den Ring nicht. \"Du weiß, was du getan hast, na. Du hast Zahl zu groß gemacht, um Nein zu sag.\" Nicht wütend — müde, beschämt, und rechnet trotzdem. \"Klaus schick gutes Geld, jeden Monat, zwei Jahr. Du hast einfach... immer weiter reingelegt. Woche für Woche. Bis deine Zahl größer als seine, und ich hab's geseh, und jetzt kann ich's nicht mehr un-sehen.\" Ein flacher Atemzug. \"Ich bin nicht mehr sauber. Du hast das gekauft. Ich hoff, es war wert, was es gekostet hat. Für uns beide.\"",
    "\"You made the number too big to say no. I am not clean anymore — you bought that.\"":
      "\"Du hast Zahl zu groß gemacht für Nein. Ich bin nicht mehr sauber — du hast das gekauft.\"",

    // Jenny's "loosening" drip — her texted selfies as your gifts outbid Klaus. Taitch,
    // phrasebook + emoji, the same warm-fragmentary voice. (Baimon's stay English: her
    // sponsor Dave is Australian, so she never learned German — English fallback is right.)
    "hi 😊 quiet shift today. i think of you a little na":
      "hi 😊 heut ruhig Schicht. ich denk ein bisschen an dich na",
    "Klaus always busy now. you not too busy for me na? 🙈 don't tell":
      "Klaus immer beschäftigt jetzt. du nicht zu beschäftigt für mich na? 🙈 nicht sagen",
    "just for you. i never do this before 😳 don't make me regret it":
      "nur für dich. ich mach das nie vorher 😳 lass mich nicht bereu",

    "\"Not married. Not yet.\" She turns it. \"Promise ring. He say when he retire he take me Germany, we marry proper. I believe him. Mostly.\" The 'mostly' escapes before she can stop it, and she files it away, embarrassed. \"He is a good man. Really. Two year, always the money come.\"":
      "\"Nicht verheirat. Noch nicht.\" Sie dreht ihn. \"Versprechensring. Er sag, wenn er Rente, er nimm mich Deutschland, wir heirat richtig. Ich glaub ihm. Meistens.\" Das 'meistens' entwischt, bevor sie es stoppen kann, und sie legt es beschämt weg. \"Er ist guter Mann. Wirklich. Zwei Jahr, immer kommt Geld.\"",

    // ══ FLUENT — Chompoo (ruby_kiss) ═════════════════════════════════════════
    // The third German-speaking lady, and the counterpoint: NOT Taitch. Chompoo
    // lived five years in Berlin and speaks GENUINELY fluent, idiomatic German —
    // full conjugation, subjunctive, colloquialisms — so both her narration AND her
    // speech render as real German (contrast to Jenny's dropped-ending phrasebook).
    // Her greeting carries the discovery beat: she clocks the accent and switches,
    // delighted, dropping the English stage-performance. Thai particles (na) stay.
    "The one on the little stage who dances like she's bored of being the most interesting person in the room, because she is. Cheekbones, a dancer's line, and an amused, appraising calm that reads a man in a glance and prices him in the next. Drops a German word now and then like she's forgotten you might not follow.":
      "Die auf der kleinen Bühne, die tanzt, als langweile es sie, die interessanteste Person im Raum zu sein — weil sie es ist. Wangenknochen, die Linie einer Tänzerin und eine amüsierte, taxierende Ruhe, die einen Mann mit einem Blick liest und ihn mit dem nächsten einpreist. Wirft ab und zu ein deutsches Wort hin, als hätte sie vergessen, dass du vielleicht nicht folgst.",

    "She finishes the eight-count before she even looks at you — the stage is hers and she knows it. \"Hi. Yes, ladyboy, before you spend an hour wondering — I like to save everyone the detective work.\" The English is quick and unaccented in the wrong places, schooled somewhere colder than here. \"Berlin polished it. Long story, expensive city. Buy me a drink and I might tell you a little of it — auf Englisch, don't worry, Schatz.\"":
      "Sie tanzt den Achter zu Ende, bevor sie dich überhaupt ansieht — die Bühne gehört ihr, und das weiß sie. Dann fällt der Groschen: der Akzent. Ein langsames, entzücktes Lächeln. «Na endlich. Ein Landsmann der Sprache, nicht des Passes.» Und das englische Bühnen-Ich lässt sie einfach fallen. \"Ja, Ladyboy, bevor du eine Stunde grübelst — ich spar uns allen gern die Detektivarbeit. Berlin hat mein Deutsch poliert. Lange Geschichte, teure Stadt. Kauf mir einen Drink, dann erzähl ich dir ein bisschen davon — und diesmal auf Deutsch, umso besser, Schatz.\"",
    "\"Yes, ladyboy — saves us the detective work. My English got polished in Berlin. Buy me a drink and I tell you a little — auf Englisch, don't worry.\"":
      "\"Ja, Ladyboy — spart die Detektivarbeit. Mein Deutsch ist in Berlin poliert worden. Kauf mir einen Drink, dann erzähl ich dir ein bisschen — auf Deutsch, umso besser.\"",

    "\"In Pattaya it is a category. In Berlin it was just Tuesday.\" She says it without heat, filing her nail. \"Five years in a city that had genuinely seen everything cured me of flinching about it. I came back unshockable, Schatz — do you know how restful that is? The men here who think they are being daring...\" A small, delighted laugh. \"Süß. I have been to parties that would stop their hearts.\"":
      "\"In Pattaya ist es eine Kategorie. In Berlin war es einfach Dienstag.\" Sagt sie ohne Schärfe, während sie sich die Nägel feilt. \"Fünf Jahre in einer Stadt, die wirklich schon alles gesehen hatte, haben mir das Zusammenzucken abgewöhnt. Ich kam unerschütterlich zurück, Schatz — weißt du, wie erholsam das ist? Die Männer hier, die glauben, sie wären gewagt...\" Ein kleines, entzücktes Lachen. \"Süß. Ich war auf Partys, die ihnen das Herz stehenbleiben ließen.\"",
    "\"In Pattaya it is a category. In Berlin it was just Tuesday. I came back unshockable — do you know how restful that is?\"":
      "\"In Pattaya eine Kategorie. In Berlin einfach Dienstag. Ich kam unerschütterlich zurück — weißt du, wie erholsam das ist?\"",

    "\"Scholarship. Media design — I was going to be very serious and make title sequences.\" A wry tilt. \"I arrived with textbook German and a suitcase, and the city taught me the rest at three in the morning. Bartenders, DJs, the KitKat crowd, artists who never slept.\" She turns the glass. \"University gave me a diploma. Berlin gave me the language, the nerve, and a very particular address book. Guess which one paid the rent.\"":
      "\"Stipendium. Mediendesign — ich wollte sehr seriös werden und Vorspänne gestalten.\" Ein schiefes Lächeln. \"Ich kam mit Schulbuch-Deutsch und einem Koffer an, und den Rest hat mir die Stadt um drei Uhr morgens beigebracht. Barkeeper, DJs, die KitKat-Leute, Künstler, die nie schliefen.\" Sie dreht das Glas. \"Die Uni gab mir ein Diplom. Berlin gab mir die Sprache, den Nerv und ein sehr spezielles Adressbuch. Rate, was die Miete bezahlt hat.\"",
    "\"Scholarship — media design. Arrived with textbook German; the city taught me the rest at 3am. The diploma, or the address book — guess which paid rent.\"":
      "\"Stipendium — Mediendesign. Kam mit Schulbuch-Deutsch; den Rest lehrte mich die Stadt um drei. Diplom oder Adressbuch — rate, was die Miete zahlte.\"",

    "\"Fließend. Fluent, genuinely — not the bar kind.\" A note of real pride, quickly disowned. \"Five years living it, arguing in it, being heartbroken in it. You do not forget a language you cried in.\" She studies you. \"The German men love it, of course — they get off the plane braced to translate themselves and instead a katoey in Soi 6 corrects their grammar. Some of them never recover. Gut so.\"":
      "\"Fließend. Wirklich fließend — nicht die Bar-Variante.\" Ein Anflug von echtem Stolz, schnell wieder abgetan. \"Fünf Jahre drin gelebt, drin gestritten, drin das Herz gebrochen bekommen. Eine Sprache, in der man geweint hat, vergisst man nicht.\" Sie mustert dich. \"Die deutschen Männer lieben es natürlich — sie steigen aus dem Flieger, bereit, sich selbst zu übersetzen, und stattdessen korrigiert ihnen ein Katoey auf der Soi 6 die Grammatik. Manche erholen sich nie davon. Gut so.\"",
    "\"Fließend — genuinely fluent, not the bar kind. Five years living it. The German men get off the plane and a katoey on Soi 6 corrects their grammar. Some never recover.\"":
      "\"Fließend — wirklich, nicht die Bar-Variante. Fünf Jahre drin gelebt. Die Deutschen steigen aus dem Flieger, und ein Katoey auf der Soi 6 korrigiert ihre Grammatik. Manche erholen sich nie.\"",

    "\"Every high season, the same faces book the same two weeks.\" She counts them off, amused, unsentimental. \"Frankfurt banker. The film-money one from Munich. Two who still think they discovered me.\" A cool, clear-eyed shrug. \"They call it a holiday. It happens to land on my schedule every year, funny that. I let them buy the drink and the nostalgia. The rest retired with the address book — but a girl lets a man hope. Hope is the most expensive thing I sell now, Schatz.\"":
      "\"Jede Hochsaison buchen dieselben Gesichter dieselben zwei Wochen.\" Sie zählt sie auf, amüsiert, unsentimental. \"Frankfurter Banker. Der mit dem Filmgeld aus München. Zwei, die immer noch glauben, sie hätten mich entdeckt.\" Ein kühles, klarsichtiges Achselzucken. \"Sie nennen es Urlaub. Fällt zufällig jedes Jahr genau auf meinen Dienstplan, komisch. Ich lass sie den Drink und die Nostalgie kaufen. Der Rest ist mit dem Adressbuch in Rente gegangen — aber ein Mädchen lässt einen Mann hoffen. Hoffnung ist das Teuerste, was ich heute verkaufe, Schatz.\"",
    "\"Same faces, same two weeks, every high season. They call it a holiday; it lands on my schedule, funny that. I sell them the drink and the nostalgia. Hope is the most expensive thing I sell now.\"":
      "\"Dieselben Gesichter, dieselben zwei Wochen, jede Hochsaison. Sie nennen es Urlaub; fällt genau auf meinen Dienstplan, komisch. Ich verkauf ihnen Drink und Nostalgie. Hoffnung ist das Teuerste, was ich heute verkaufe.\"",

    "\"The stage? A formality. I could stop and they would still watch.\" Not vanity — an audit. \"Six years of it teaches you exactly where every eye in a room is. Useful skill. Transfers to almost everything.\" She steps back up onto the little stage in one unhurried movement. \"Watch or don't, Schatz. I dance for the mirror.\"":
      "\"Die Bühne? Eine Formsache. Ich könnte aufhören, und sie würden trotzdem hinsehen.\" Keine Eitelkeit — eine Bestandsaufnahme. \"Sechs Jahre lehren dich, wo genau jedes Auge im Raum ist. Nützliche Fähigkeit. Lässt sich auf fast alles übertragen.\" In einer unaufgeregten Bewegung steigt sie zurück auf die kleine Bühne. \"Sieh zu oder nicht, Schatz. Ich tanze für den Spiegel.\"",
    "\"The stage is a formality — I could stop and they'd still watch. Six years teaches you where every eye is. I dance for the mirror.\"":
      "\"Die Bühne ist Formsache — ich könnte aufhören, sie würden trotzdem hinsehen. Sechs Jahre lehren dich, wo jedes Auge ist. Ich tanze für den Spiegel.\"",

    "The performance drops the moment she clocks you — not the stage one, the OTHER one, the arch little price-tag smile she wears for the room. \"Ach, du.\" Just that, warm and unguarded and a little rueful. \"You know what you are, Schatz? You are the one who never booked the legend. All of them fly around the world for a woman who does not exist any more — the Berlin one, the story.\" She shrugs, and for once there is no angle in it. \"You just... like when I sit here. That one nobody can wire me. That one I keep for free.\"":
      "Die Vorstellung fällt in dem Moment, in dem sie dich erkennt — nicht die auf der Bühne, die ANDERE, das kleine, spöttische Preisschild-Lächeln, das sie für den Raum trägt. \"Ach, du.\" Nur das, warm und ungeschützt und ein bisschen wehmütig. \"Weißt du, was du bist, Schatz? Du bist der, der nie die Legende gebucht hat. Sie fliegen alle um die halbe Welt für eine Frau, die es nicht mehr gibt — die aus Berlin, die Geschichte.\" Sie zuckt mit den Schultern, und ausnahmsweise steckt kein Winkel darin. \"Du magst einfach, wenn ich mich hierher setze. Für den einen kann mich niemand überweisen. Den behalt ich umsonst.\"",
    "\"Ach, du.\" The price-tag smile drops. \"You never booked the legend, Schatz. Everyone else flies here for a woman who doesn't exist any more. You just like when I sit here — that one nobody can wire me.\"":
      "\"Ach, du.\" Das Preisschild-Lächeln fällt. \"Du hast nie die Legende gebucht, Schatz. Alle anderen fliegen her für eine Frau, die es nicht mehr gibt. Du magst einfach, wenn ich hier sitze — für den einen kann mich keiner überweisen.\"",

    "\"Back again, and you did not even pretend it was Berlin business.\" A real smile, drier and closer than the stage one. \"Refreshing. Most of my regulars need a story — old times, old arrangement, makes it feel less like what it is.\" She tilts her head, reading you. \"You don't run the story. I don't quite know what to do with that yet. Sit, na. We find out.\"":
      "\"Schon wieder da — und du hast nicht mal so getan, als wär's Berliner Geschäft.\" Ein echtes Lächeln, trockener und näher als das von der Bühne. \"Erfrischend. Die meisten meiner Stammgäste brauchen eine Geschichte — alte Zeiten, altes Arrangement, dann fühlt es sich weniger nach dem an, was es ist.\" Sie legt den Kopf schief und liest dich. \"Du fährst die Geschichte nicht. Ich weiß noch nicht ganz, was ich damit anfangen soll. Setz dich, na. Finden wir's raus.\"",
    "\"Back again — and no Berlin-business excuse. Refreshing. Most regulars need a story. You don't. Sit, na.\"":
      "\"Schon wieder da — und keine Berlin-Ausrede. Erfrischend. Die meisten Stammgäste brauchen eine Geschichte. Du nicht. Setz dich, na.\"",

    // Reusable composite templates: {line}=an already-localised pool pick, {m}=cash,
    // {p}=price, {name}=item. ONE entry each localises the money suffix everywhere.
    "{line} (฿{m} left.)": "{line} (฿{m} übrig.)",
    "฿{p} buys {name}. {line} (฿{m} left.)": "฿{p} für {name}. {line} (฿{m} übrig.)",
    "The room has developed a gentle rotation.": "Der Raum hat eine sanfte Drehung entwickelt.",
    "The neon is starting to smear pleasantly.": "Das Neon fängt an, angenehm zu verschmieren.",
    "The night improves by one bottle's worth.": "Der Abend wird um eine Flasche besser.",

    // ── SCORE / DIAGNOSE stat readouts ({placeholders} filled by _fmt) ────────
    "สนุก happiness: {h} — {lvl}": "สนุก Zufriedenheit: {h} — {lvl}",
    "{wd}, day {d}{stage} · {clock} · ฿{m} · battery {bat}%{quiz}":
      "{wd}, Tag {d}{stage} · {clock} · ฿{m} · Akku {bat}%{quiz}",
    " of 7": " von 7",
    " · expat life": " · Expat-Leben",
    " · QUIZ NIGHT 20:00-22:00": " · QUIZNIGHT 20:00-22:00",
    "hunger {hu} · thirst {th}": "Hunger {hu} · Durst {th}",
    " · {d} bottle{s} deep": " · {d} Bier intus",
    " · banged up ({h}/3)": " · lädiert ({h}/3)",
    "📱 {c} unread message{s} (CHECK MESSAGES)": "📱 {c} ungelesene Nachricht(en) (CHECK MESSAGES)",
    "Standing: {s}": "Ansehen: {s}",
    // happy-level glosses (the romanised-Thai tiers stay; only the English glosses translate)
    "โอเค — finding your feet": "โอเค — Fuß fassen",
    "เหนื่อย — running on empty": "เหนื่อย — am Limit",
    // DIAGNOSE parts
    "hungry enough to envy the soi dogs": "hungrig genug, um die Soi-Hunde zu beneiden",
    "peckish, and every cart on the street smells personal": "leicht hungrig, und jeder Karren auf der Straße riecht persönlich",
    "fed": "satt",
    "dry as a temple bell": "trocken wie eine Tempelglocke",
    "thirsty": "durstig",
    "watered": "getränkt",
    "stone sober, which is fixable": "stocknüchtern, was sich beheben lässt",
    "in no state to be on the back of a motorbike": "nicht in der Verfassung, hinten auf ein Motorrad zu steigen",
    "nursing a barfine souvenir that itches and burns — a clinic job (GET TESTED, it's free)":
      "pflegst ein Barfine-Souvenir, das juckt und brennt — ein Fall für die Klinik (GET TESTED, kostenlos)",
    "{d} bottles deep and navigating by neon": "{d} Bier intus und navigierst nach Neon",
    "{d} bottles deep, the world pleasantly loose at the hinges": "{d} Bier intus, die Welt angenehm locker in den Angeln",
    "{d} bottle{s} in": "{d} Bier intus",
    "banged up ({h}/3 — a third strike ends the night)": "lädiert ({h}/3 — der dritte Treffer beendet die Nacht)",
    "Self-diagnosis, {clock}: {parts}.": "Selbstdiagnose, {clock}: {parts}.",
    "Phone {bat}% · ฿{m} · สนุก {h} ({lvl}). You will live, which in this town is both a prognosis and a lifestyle.":
      "Handy {bat}% · ฿{m} · สนุก {h} ({lvl}). Du wirst überleben, was in dieser Stadt sowohl eine Prognose als auch ein Lebensstil ist.",

    // ── Ladyboy gracious-pass (straight player flirts/barfines a katoey) ──────
    "{n} clocks you clocking her and is already three steps ahead. \"Not for you, tilac — no problem. I know my customer, and you are not him.\" No hurt in it; she's been read a thousand times and long since stopped minding which way it goes. \"Plenty girls here. Go, be happy.\"":
      "{n} bemerkt, wie du sie musterst, und ist dir schon drei Schritte voraus. \"Nicht für dich, tilac — kein Problem. Ich kenn meinen Kunden, und du bist es nicht.\" Kein Groll darin; sie ist tausendmal durchschaut worden und hat längst aufgehört, sich zu kümmern, in welche Richtung es geht. \"Genug Mädchen hier. Geh, sei glücklich.\"",
    "A slow, knowing smile. \"You didn't know? Now you know.\" {n} gives you the beat to decide, and reads the answer off your face before you find it. \"Is okay, tilac — you are not the first, and I am not offended. The ladies are that way.\" A graceful tilt of the head, and she turns to a customer looking for exactly her.":
      "Ein langsames, wissendes Lächeln. \"Du wusstest nicht? Jetzt weißt du.\" {n} lässt dir den Moment zum Entscheiden und liest die Antwort aus deinem Gesicht, bevor du sie selbst findest. \"Ist okay, tilac — du bist nicht der Erste, und ich bin nicht beleidigt. Die Damen sind da drüben.\" Eine anmutige Neigung des Kopfes, und sie wendet sich einem Kunden zu, der genau sie sucht.",

    // ── Barfine negotiation modal (SHORT TIME/LONG TIME/NO stay as commands) ──
    "(SHORT TIME {st} — one round, the night carries on · LONG TIME {lt} — overnight · NO backs out.)":
      "(SHORT TIME {st} — eine Runde, der Abend geht weiter · LONG TIME {lt} — über Nacht · NO steigt aus.)",
    "waived — past midnight": "entfällt — nach Mitternacht",

    // ── INVENTORY scaffolds (item names localised per-name at the call site) ──
    "You are carrying: ": "Du trägst: ",
    "You are carrying nothing but experience.": "Du trägst nichts außer Erfahrung.",
    "{c} condom{s}": "{c} Kondom{s}",

    // ── Repeatable action pools (fire every turn: buy beer/water, eat) ────────
    // Pure-string _pickVary pools (_BEER_LINES/_WATER_LINES/_TOASTIE_LINES/
    // _STALL_EAT_LINES): _say runs each picked line through _L, so a catalog hit
    // translates it. Brands (Chang/Leo/Singha/7-Eleven) and ฿ stay.
    "One big Chang, cold enough to hurt.":
      "Ein großes Chang, kalt genug, dass es wehtut.",
    "A sweating bottle of Leo, cap flicked into the gutter — the first pull the best one.":
      "Eine schwitzende Flasche Leo, der Kronkorken in die Gosse geschnippt — der erste Zug der beste.",
    "Cold Singha, condensation already running for the door. The bar exhales; so do you.":
      "Kaltes Singha, das Kondenswasser läuft schon Richtung Tür. Die Bar atmet aus; du auch.",
    "Another big one, cracked and poured over the last of the ice. The true national anthem.":
      "Noch ein Großes, aufgemacht und über die letzten Eiswürfel gegossen. Die wahre Nationalhymne.",

    "A cold bottle of water, gone in one go. Civilisation.":
      "Eine kalte Flasche Wasser, in einem Zug weg. Zivilisation.",
    "Ice-cold plastic, sweating in your hand; half of it's gone before you lower the bottle.":
      "Eiskaltes Plastik, das dir in der Hand schwitzt; die Hälfte ist weg, bevor du die Flasche absetzt.",
    "Cold water straight down, and your body files a quiet note of thanks.":
      "Kaltes Wasser direkt runter, und dein Körper reicht ein leises Dankeschön ein.",
    "You crack the cap and drink it where you stand — sweet, cold, worth ten times what it cost.":
      "Du drehst den Deckel auf und trinkst im Stehen — süß, kalt, zehnmal so viel wert wie der Preis.",
    "A litre of cold water vanishes and the heat loosens its grip a notch.":
      "Ein Liter kaltes Wasser verschwindet und die Hitze lockert ihren Griff eine Stufe.",
    "Frosted, capped, cracked, drained. The worst of the thirst just... stops.":
      "Beschlagen, verschlossen, aufgemacht, geleert. Das Schlimmste vom Durst hört einfach... auf.",

    "The iconic 7-Eleven cheese toastie, pressed twice while you wait, eaten molten on the kerb like every farang before you back to the dawn of time. There are worse religions.":
      "Der ikonische 7-Eleven-Käsetoast, zweimal gepresst, während du wartest, glühend heiß am Bordstein gegessen wie jeder Farang vor dir bis zum Anbeginn der Zeit. Es gibt schlimmere Religionen.",
    "A ham-and-cheese toastie, folded and branded with grill lines, handed over blistering. You eat it on the kerb and resent how perfect it is.":
      "Ein Schinken-Käse-Toast, gefaltet und mit Grillstreifen gebrandmarkt, kochend heiß überreicht. Du isst ihn am Bordstein und nimmst es ihm übel, wie perfekt er ist.",
    "The cheese toastie comes out structurally unsound and molten in the middle. Gone in four bites — a 7-Eleven sacrament.":
      "Der Käsetoast kommt statisch instabil und in der Mitte geschmolzen heraus. Nach vier Bissen weg — ein 7-Eleven-Sakrament.",
    "฿35 of pressed-bread engineering. You burn the roof of your mouth on the cheese toastie exactly as intended, and would do it again.":
      "฿35 Pressbrot-Ingenieurskunst. Du verbrennst dir am Käsetoast den Gaumen genau wie vorgesehen, und würdest es wieder tun.",
    "You eat the toastie leaning on a bollard, cheese cauterising your tongue, and understand — briefly, completely — why the expats never leave.":
      "Du isst den Toast an einen Poller gelehnt, der Käse verätzt dir die Zunge, und du verstehst — kurz, vollständig — warum die Expats nie weggehen.",

    "You eat, and the night quietly improves.":
      "Du isst, und der Abend wird still ein bisschen besser.",
    "You eat where you are, no ceremony, and something knotted in the evening comes loose.":
      "Du isst, wo du gerade bist, ohne Zeremonie, und etwas am Abend Verknotetes löst sich.",
    "Cheap, correct, and exactly what the night needed.":
      "Billig, richtig, und genau das, was der Abend brauchte.",
    "Hot, unfussy, gone too soon — the good kind, and the hunger backs off.":
      "Heiß, unkompliziert, zu schnell weg — die gute Sorte, und der Hunger zieht sich zurück.",
    "You clean the plate. The world softens a degree at the edges.":
      "Du machst den Teller leer. Die Welt wird an den Rändern ein Grad weicher.",
    "Every baht of it earns out; the night steadies on a full stomach.":
      "Jeder Baht davon zahlt sich aus; der Abend wird auf vollem Magen ruhiger.",

    // Lady-drink lines — _fmt templates ({n}=name, {p}=price). The "(฿X left.)"
    // suffix is appended by the caller and handled as its own fragment below.
    "One lady drink for {n} — ฿{p} on the tab that is your life.":
      "Ein Lady Drink für {n} — ฿{p} auf der Rechnung, die dein Leben ist.",
    "{n} gets her cola-with-benefits; the mamasan's biro logs ฿{p} without looking up.":
      "{n} bekommt ihre Cola-mit-Vorteilen; der Kuli der Mamasan verbucht ฿{p}, ohne aufzublicken.",
    "A thimble of something mostly ice lands in front of {n} — ฿{p}, gone in three sips.":
      "Ein Fingerhut von irgendwas, überwiegend Eis, landet vor {n} — ฿{p}, in drei Schlucken weg.",
    "“Chon kaew!” {n} toasts you with her ฿{p} lady drink and means it for exactly one sip.":
      "„Chon kaew!“ {n} stößt mit ihrem ฿{p}-Lady-Drink auf dich an und meint es für genau einen Schluck.",
    "You buy {n} a drink; she rewards it with a smile calibrated to the exact value of ฿{p}.":
      "Du kaufst {n} einen Drink; sie belohnt es mit einem Lächeln, geeicht auf den exakten Wert von ฿{p}.",
    "Another ฿{p} lady drink for {n} — the house's real product, sold by the glass.":
      "Noch ein ฿{p}-Lady-Drink für {n} — das eigentliche Produkt des Hauses, glasweise verkauft.",
    "{n}'s glass runs dry the way a meter does; ฿{p} restarts it.":
      "{n}s Glas läuft leer wie ein Taxameter; ฿{p} startet es neu.",
    "The waitress doesn't even ask — {n}'s drink, ฿{p}, straight onto your tab.":
      "Die Kellnerin fragt nicht mal — {n}s Drink, ฿{p}, direkt auf deine Rechnung.",

    // ── TIME (the clock readout) — first line via _fmt, the rest fixed ────────
    // The {clock}/{weekday}/{day} template is filled by _fmt (word-order-safe).
    "{clock}, {weekday} — day {day} of 7.": "{clock}, {weekday} — Tag {day} von 7.",
    "{clock}, {weekday} — day {day} of the rest of your life.":
      "{clock}, {weekday} — Tag {day} vom Rest deines Lebens.",
    // weekdays (fed through _L inside the template fill)
    "Sunday": "Sonntag", "Monday": "Montag", "Tuesday": "Dienstag",
    "Wednesday": "Mittwoch", "Thursday": "Donnerstag", "Friday": "Freitag",
    "Saturday": "Samstag",
    // quiz-night status
    "(Quiz night tonight: 20:00–22:00, three bars, teachers in from Rayong.)":
      "(Heute Quiznight: 20:00–22:00, drei Bars, Lehrer aus Rayong angereist.)",
    "(Quiz night is ON somewhere right now.)": "(Quiznight läuft gerade irgendwo.)",
    "(Quiz night has been and gone.)": "(Quiznight war und ist vorbei.)",
    // barfine-rate status
    "(Early doors: barfines run ×1.5 until 21:00.)":
      "(Frühschicht: Barfines kosten ×1,5 bis 21:00.)",
    "(Past midnight: most beer bars have quietly dropped the barfine.)":
      "(Nach Mitternacht: die meisten Bierbars haben die Barfine still fallen lassen.)",
    "(Prime time. Standard rates apply.)": "(Hauptzeit. Es gelten die Standardpreise.)",
    // last-baht-bus status (the titular tension)
    "(The last baht bus has gone — it's the piwin's small-hours tax or shoe leather home now.)":
      "(Der letzte Baht-Bus ist weg — jetzt heißt es Piwin-Nachttarif oder zu Fuß nach Haus.)",
    "(Last baht bus around 2 a.m. — the ฿{f} ride home is nearly up.)":
      "(Letzter Baht-Bus gegen 2 Uhr — die ฿{f}-Fahrt nach Haus ist fast vorbei.)",
    "(Baht buses running: ฿{f} the ride home until the last one, ~2 a.m.)":
      "(Baht-Busse fahren: ฿{f} nach Haus bis zum letzten, ~2 Uhr.)",
    // ── Soi 6 revisit pools + item names/descs (workflow-translated, Opus-reviewed) ──
    "Back to the Shady Lady, set back under its awning, the rail facing the soi so you can watch the circus without joining it.":
      "Zurück zur Shady Lady, zurückgesetzt unter ihre Markise, die Theke zur Soi hin ausgerichtet, sodass du den Zirkus beobachten kannst, ohne mitzumachen.",
    "Pukky has your bottle open before you've picked a stool. Out front the soi does its thing; in here nobody makes you part of it.":
      "Pukky hat deine Flasche schon geöffnet, bevor du dir einen Hocker ausgesucht hast. Draußen macht die Soi ihr Ding; hier drin zwingt dich niemand, mitzumachen.",
    "You settle back onto the rail in the shade. The parade grinds past a few feet away, and the whole pleasure is being just outside it.":
      "Du lässt dich wieder an der Theke im Schatten nieder. Die Parade zieht ein paar Schritte entfernt vorbei, und das ganze Vergnügen besteht darin, knapp außerhalb davon zu sein.",
    "The Shady Lady again — potted palms, low awning, cold Chang, and the best seat on the soi for watching other men get pulled into bars.":
      "Wieder die Shady Lady — Palmen in Kübeln, niedrige Markise, kaltes Chang, und der beste Platz auf der Soi, um zuzusehen, wie andere Männer in Bars gezogen werden.",
    "Back under the awning where the noise softens by half. Pukky nods, pours, and goes back to reading the pavement like a form guide.":
      "Zurück unter die Markise, wo der Lärm um die Hälfte leiser wird. Pukky nickt, schenkt ein und liest weiter den Gehweg wie eine Formtabelle.",
    "The shaded rail takes you back. A go-go tout two doors down loses a customer; the Shady Lady's regulars rate the technique and drink on.":
      "Die schattige Theke nimmt dich wieder auf. Zwei Türen weiter verliert ein Go-Go-Anwerber einen Kunden; die Stammgäste der Shady Lady bewerten die Technik und trinken weiter.",
    "Back to the quiet middle and the shade, a cold one sweating on the rail, the soi safely at arm's length where you like it.":
      "Zurück zur ruhigen Mitte und dem Schatten, ein kaltes Bier schwitzt auf der Theke, die Soi sicher auf Armeslänge, so wie du es magst.",
    "Back into the Front Row, stools pulled up to the open front, the soi playing out a few feet away like it's ticketed.":
      "Zurück in die Front Row, Hocker an die offene Front herangezogen, die Soi spielt sich ein paar Schritte entfernt ab, als bräuchte man ein Ticket.",
    "Somo slides your Chang over and picks up the commentary mid-sentence, narrating the pavement like a man calling the races.":
      "Somo schiebt dir dein Chang rüber und nimmt den Kommentar mitten im Satz wieder auf, beschreibt den Gehweg wie ein Mann, der ein Pferderennen kommentiert.",
    "You take a front-row stool. Down the soi a barker reels one in; the bar murmurs its scoring and drinks.":
      "Du nimmst einen Hocker in der ersten Reihe. Die Soi hinunter angelt ein Anwerber sich einen; die Bar murmelt ihre Wertung und trinkt weiter.",
    "Front Row again — the ALL NIGHT show card, the theatre seating, Somo cold-beer-ready and full of opinions on the passing trade.":
      "Wieder die Front Row — die ALL NIGHT-Showkarte, die Theaterbestuhlung, Somo bereit mit kaltem Bier und voller Meinungen über die vorbeiziehende Laufkundschaft.",
    "Back to the best cheap seats on the soi, where the entertainment is free, continuous, and always someone else.":
      "Zurück zu den besten billigen Plätzen auf der Soi, wo die Unterhaltung kostenlos, ununterbrochen und immer jemand anderes ist.",
    "The open front takes you back in. A hen party gets herded past; the Front Row rates it a seven and Somo pours another.":
      "Die offene Front lässt dich wieder ein. Ein Junggesellinnenabschied wird vorbeigetrieben; die Front Row bewertet es mit einer Sieben, und Somo schenkt noch eins ein.",
    "Back to the row of stools aimed at the parade, a cold one in reach and the whole soi performing for the price of a beer.":
      "Zurück zur Hockerreihe mit Blick auf die Parade, ein kaltes Bier in Reichweite, und die ganze Soi tritt auf für den Preis eines Bieres.",
    "Back up onto the Verandah's wooden deck, a step above the soi and just far enough off it to be left alone.":
      "Zurück hinauf auf das Holzdeck der Verandah, eine Stufe über der Soi und gerade weit genug davon entfernt, um in Ruhe gelassen zu werden.",
    "Nina walks your Chang out to the rail chair again. Down on the pavement the pullers work; up here the fans turn and nobody hurries.":
      "Nina bringt dein Chang wieder hinaus zum Stuhl an der Reling. Unten auf dem Gehweg arbeiten die Anreißer; hier oben drehen sich die Ventilatoren, und niemand hat es eilig.",
    "You settle back into a chair on the raised deck. The step up is doing its quiet job — the grabbers stay on the pavement where they belong.":
      "Du lässt dich wieder in einen Stuhl auf dem erhöhten Deck sinken. Die Stufe nach oben erledigt still ihre Arbeit — die Zupacker bleiben auf dem Gehweg, wo sie hingehören.",
    "The Verandah again — the deck, the lazy fans, the rail, and the small civilised miracle of a Soi 6 seat where no one climbs into your lap.":
      "Wieder die Verandah — das Deck, die trägen Ventilatoren, die Reling, und das kleine zivilisierte Wunder eines Platzes auf Soi 6, wo dir niemand auf den Schoß klettert.",
    "Back above the soi by one wooden step, which turns out to be exactly enough. Nina reads your thirst and beats you to it.":
      "Zurück über der Soi, eine Holzstufe höher, was sich als genau ausreichend erweist. Nina erkennt deinen Durst und ist dir schon einen Schritt voraus.",
    "The raised deck takes you back. The soi churns a step below; you put your feet on the rail and let it.":
      "Das erhöhte Deck nimmt dich wieder auf. Die Soi brodelt eine Stufe tiefer; du legst die Füße auf die Reling und lässt es geschehen.",
    "Back to the quietest chair on the loudest soi, a cold one arriving unbidden, the parade safely down off the deck.":
      "Zurück zum ruhigsten Stuhl auf der lautesten Soi, ein kaltes Bier kommt ungebeten, die Parade sicher unten, weg vom Deck.",
    "Back onto the west end and the wall of noise hits first, the hands second. \"HANDSOME MAN!\" \"WHERE YOU GO SEXY MAN?\" You are grabbed, released, grabbed again, an item passed between bars.":
      "Zurück am Westende, und zuerst trifft dich die Lärmwand, dann die Hände. \"HANDSOME MAN!\" \"WHERE YOU GO SEXY MAN?\" Du wirst gepackt, losgelassen, wieder gepackt, ein Gegenstand, der zwischen Bars weitergereicht wird.",
    "The soi takes you back into the bass and the barkers. A girl detaches from an open front to walk backwards ahead of you, selling her bar with her whole body. Then another. Then another.":
      "Die Soi holt dich zurück in den Bass und die Anpreiser. Ein Mädchen löst sich von einer offenen Front, um rückwärts vor dir herzugehen und ihre Bar mit dem ganzen Körper zu verkaufen. Dann noch eine. Dann noch eine.",
    "Back into the loudest hundred metres in Thailand. Six sound systems fight, a dozen girls call you handsome in the same second, and one of them takes a foam pool noodle to your shoulder for walking too slow.":
      "Zurück in die lautesten hundert Meter Thailands. Sechs Soundsysteme kämpfen gegeneinander, ein Dutzend Mädchen nennen dich im selben Moment handsome, und eine von ihnen verpasst dir eine Schwimmnudel aus Schaumstoff auf die Schulter, weil du zu langsam läufst.",
    "You step back into the west end and it's exactly as you left it: sequins, wrist-grabs, competing basslines, and the flat certainty that you will be spending money very soon.":
      "Du trittst zurück ins Westende, und es ist genau so, wie du es verlassen hast: Pailletten, Handgelenk-Griffe, konkurrierende Basslinien und die schlichte Gewissheit, dass du sehr bald Geld ausgeben wirst.",
    "Back onto Soi 6 West, where standing still is not an option — a hand takes your wrist, a voice takes your name (you have no name here, you are Handsome), and a bar takes its shot.":
      "Zurück auf Soi 6 West, wo Stillstehen keine Option ist — eine Hand nimmt dein Handgelenk, eine Stimme nimmt deinen Namen (du hast hier keinen Namen, du bist Handsome), und eine Bar nutzt ihre Chance.",
    "The soi swallows you again. \"You! Yes you! Come Pink Lotus!\" \"No — Golden Dragon!\" \"He come with ME.\" You are, briefly, the most wanted man in Thailand.":
      "Die Soi verschluckt dich wieder. \"You! Yes you! Come Pink Lotus!\" \"No — Golden Dragon!\" \"He come with ME.\" Du bist, kurzzeitig, der begehrteste Mann Thailands.",
    "Back into the churn and the neon. The girls out front read foot traffic for a living, and you are foot traffic; the pitch starts before you've fully arrived.":
      "Zurück in den Trubel und das Neonlicht. Die Mädchen davor lesen Laufkundschaft zum Broterwerb, und du bist Laufkundschaft; die Anmache beginnt, bevor du überhaupt richtig angekommen bist.",
    "Soi 6 West again — a river of hands and offers, the quieter middle stretch glowing ahead east like a promise, the whole street daring you to reach it sober and solvent.":
      "Wieder Soi 6 West — ein Fluss aus Händen und Angeboten, das ruhigere Mittelstück leuchtet im Osten voraus wie ein Versprechen, und die ganze Straße fordert dich heraus, es nüchtern und solvent zu erreichen.",
    "Back into the Pink Lotus and three hands find you at once — a lap claimed, a thigh against yours, Joy's mouth already at your ear: \"Lady drink first, then upstairs, na? I show you why they call it Pink.\"":
      "Zurück in den Pink Lotus, und gleich drei Hände finden dich auf einmal — ein Schoß beansprucht, ein Schenkel an deinem, Joys Mund schon an deinem Ohr: \"Lady drink zuerst, dann nach oben, na? Ich zeig dir, warum sie es Pink nennen.\"",
    "The pink swallows you again. No warm-up here — a girl is in your lap doing the math on your shirt before you have sat. \"You buy me drink, handsome? Then up. I make you forget the flight home.\"":
      "Das Pink verschluckt dich wieder. Kein Aufwärmen hier — ein Mädchen sitzt schon auf deinem Schoß und rechnet dein Hemd durch, bevor du dich gesetzt hast. \"Du kaufst mir drink, handsome? Dann hoch. Ich lass dich den Flug nach Hause vergessen.\"",
    "You are barely past the door before the offer is on the table, plain as the price list: \"Short time, long time, up to you — but you came back for a reason, na. Sit. Let me remind you.\"":
      "Kaum bist du zur Tür rein, liegt das Angebot schon auf dem Tisch, klar wie die Preisliste: \"Short time, long time, du entscheidest — aber du bist nicht ohne Grund zurückgekommen, na. Setz dich. Lass mich dich erinnern.\"",
    "Pink Lotus does not do coy. A knee hooks yours, a hand slides up your arm, the pitch a purr against your jaw: \"Why you sit alone? One drink, we go up, everybody happy.\"":
      "Der Pink Lotus tut nicht zimperlich. Ein Knie hakt sich in deins, eine Hand gleitet deinen Arm hoch, das Angebot ein Schnurren an deinem Kiefer: \"Warum du allein sitzen? Ein drink, wir gehen hoch, alle happy.\"",
    "Back to the pink and the full-court press — grabbed, seated, straddled by attention, and told warmly and without a flicker of doubt exactly what tonight costs and exactly what it buys.":
      "Zurück ins Pink und die volle Breitseite — gegriffen, gesetzt, von Aufmerksamkeit umzingelt, und dir wird warm und ohne den leisesten Zweifel genau gesagt, was heute Nacht kostet und was es dir bringt.",
    "The girls clock you the second you round the post and close in like choreography. \"Same handsome from before! You want me now? Upstairs quiet, aircon cold — worth the walk, I promise.\"":
      "Die Mädchen erkennen dich in der Sekunde, in der du um den Pfosten biegst, und rücken an wie einstudiert. \"Derselbe handsome von vorhin! Willst du mich jetzt? Oben ruhig, Klimaanlage kalt — der Weg lohnt sich, versprochen.\"",
    "Into the Pink Lotus, where nobody wastes your time or theirs: a lap, a hand, a mouth at your ear naming a number and a room, and the fairy lights doing their best to make it romantic.":
      "Hinein in den Pink Lotus, wo niemand deine Zeit verschwendet oder seine eigene: ein Schoß, eine Hand, ein Mund an deinem Ohr, der eine Zahl und ein Zimmer nennt, und die Lichterketten geben ihr Bestes, das Ganze romantisch wirken zu lassen.",
    "Back onto a pink stool with a girl already arranging herself across you. \"You think about me all day? Liar.\" She laughs, delighted. \"Okay — buy the drink, we go up, you think about me tomorrow.\"":
      "Zurück auf einen pinken Hocker, ein Mädchen drapiert sich schon über dir. \"Du hast den ganzen Tag an mich gedacht? Lügner.\" Sie lacht, entzückt. \"Okay — kauf den drink, wir gehen hoch, morgen denkst du an mich.\"",
    "Back into the Orchid Room and the strobe and the noise and the skin, the members' club Powers keeps calling classy while it proves him wrong in every direction at once.":
      "Zurück in den Orchid Room, das Stroboskop, der Lärm, die nackte Haut — der Mitgliederclub, den Powers ständig \"classy\" nennt, während er ihm in jeder Hinsicht gleichzeitig widerspricht.",
    "The Orchid takes you back into its expensive bacchanal — the high rollers, the MC patches, the quiet Thai man at the good table, and Powers on his banquette narrating himself to his own phone.":
      "Der Orchid holt dich zurück in seine teure Bacchanalie — die High Roller, die MC-Patches, der stille Thai-Mann am guten Tisch, und Powers auf seiner Bank, der sich selbst seinem eigenen Handy vorführt.",
    "Back past the velvet rope into the wild dark. Nobody here is walk-up trade; everybody here is somebody's problem, and Powers throws you a two-fingered salute without pausing his livestream.":
      "Zurück am Samtseil vorbei in das wilde Dunkel. Hier ist niemand Laufkundschaft; jeder hier ist irgendjemandes Problem, und Powers wirft dir einen Zwei-Finger-Gruß zu, ohne seinen Livestream zu unterbrechen.",
    "The back room again — topless going on nude, Blue Label going on trouble, and the one soft-spoken man everyone watches without looking at him. You've learned to sit where you can see the door.":
      "Der Hinterraum, wieder — oben ohne wird zu nackt, Blue Label wird zu Ärger, und der eine leise sprechende Mann, den alle beobachten, ohne ihn anzusehen. Du hast gelernt, dich so zu setzen, dass du die Tür sehen kannst.",
    "Back into the Orchid, where the money is loud, the girls are louder, the real power is silent, and Ryan Powers mistakes the whole arrangement for something he built.":
      "Zurück in den Orchid, wo das Geld laut ist, die Mädchen lauter, die wirkliche Macht schweigt, und Ryan Powers das ganze Arrangement mit etwas verwechselt, das er selbst aufgebaut hat.",
    "Back into the Golden Dragon, the dragon presiding, and a girl already peeling you toward a stool with a hand in your belt loop. \"You, handsome. Sit here. Buy me one, then we talk about upstairs.\"":
      "Zurück in den Golden Dragon, der Drache thront darüber, und ein Mädchen zieht dich schon an einem Gürtelbund zu einem Hocker. \"Du, handsome. Setz dich hier. Kauf mir einen, dann reden wir über oben.\"",
    "The vintage playlist and the wall of noise take you back — and so do two girls at once, one on each arm, negotiating you like a shared prize. \"Me first.\" \"No — ME first.\" \"Okay, you choose, but choose FAST.\"":
      "Die Vintage-Playlist und die Lärmwand holen dich zurück — genau wie zwei Mädchen auf einmal, je eine an jedem Arm, die dich wie einen geteilten Preis verhandeln. \"Ich zuerst.\" \"Nein — ICH zuerst.\" \"Okay, du entscheidest, aber entscheide SCHNELL.\"",
    "Louder than you remembered, and more direct: a girl slides into your lap mid-song and puts it plainly. \"Drink, then up, then you go home happy. Simple, na? Everything here is simple.\"":
      "Lauter als du es in Erinnerung hattest, und direkter: Ein Mädchen gleitet mitten im Song auf deinen Schoß und sagt es unverblümt. \"Drink, dann hoch, dann gehst du happy nach Hause. Einfach, na? Hier ist alles einfach.\"",
    "Back under the cousin-painted dragon. A hand flattens on your chest, a mouth finds your ear: \"Why you shy? This is Soi 6, tilac. Nobody here is shy. You buy me drink, I show you.\"":
      "Zurück unter den von der Cousine gemalten Drachen. Eine Hand legt sich flach auf deine Brust, ein Mund findet dein Ohr: \"Warum du schüchtern? Das ist Soi 6, tilac. Hier ist niemand schüchtern. Du kaufst mir drink, ich zeig's dir.\"",
    "The Golden Dragon reels you back in. Somebody already has your hand on her hip and her eyes on your wallet, and the whole thing is disarmingly, aggressively cheerful.":
      "Der Golden Dragon zieht dich wieder rein. Jemand hat deine Hand schon auf ihrer Hüfte und die Augen auf deiner Brieftasche, und das Ganze ist entwaffnend, aggressiv fröhlich.",
    "Back into the gold and the grab. \"Same shirt, same handsome! You come for me tonight?\" She does not wait for an answer; she is already climbing half into your lap. \"Yes. You come for me.\"":
      "Zurück ins Gold und den Griff. \"Gleiches Hemd, gleicher handsome! Du kommst heute Nacht für mich?\" Sie wartet keine Antwort ab; sie klettert schon halb auf deinen Schoß. \"Ja. Du kommst für mich.\"",
    "Into the Golden Dragon, where the offer arrives before the beer does: a thigh, a whisper, a price, a room number, all inside the first ten seconds, all with a grin.":
      "Hinein in den Golden Dragon, wo das Angebot vor dem Bier eintrifft: ein Schenkel, ein Flüstern, ein Preis, eine Zimmernummer, alles in den ersten zehn Sekunden, alles mit einem Grinsen.",
    "Back to the dragon and the dead jukebox's faithful ghost. A girl hooks a leg over yours and leans in close enough to share breath. \"Upstairs is nicer than down here. Much nicer. Buy me drink, I prove it.\"":
      "Zurück zum Drachen und dem treuen Geist der toten Jukebox. Ein Mädchen hakt ein Bein über deins und lehnt sich so nah heran, dass ihr denselben Atem teilt. \"Oben ist schöner als hier unten. Viel schöner. Kauf mir drink, ich beweis es dir.\"",
    "Back into the pink glow of Sunset Dreams, and a girl peels off the open front and onto you before your eyes adjust. \"You like soft light? I like soft man. Buy me drink, we go up where it's softer.\"":
      "Zurück in das pinke Leuchten von Sunset Dreams, und ein Mädchen löst sich von der offenen Front und ist bei dir, bevor sich deine Augen angepasst haben. \"Du magst weiches Licht? Ich mag weichen Mann. Kauf mir drink, wir gehen hoch, wo es weicher ist.\"",
    "The cloud mural and the rose light take you back, and so does a hand in your belt loop. \"Everybody think pink mean shy. Ha. Buy me drink, handsome — then upstairs, I show you not shy.\"":
      "Das Wolkenwandbild und das rosa Licht holen dich zurück, ebenso wie eine Hand in deinem Gürtelbund. \"Alle denken, pink heißt schüchtern. Ha. Kauf mir drink, handsome — dann nach oben, ich zeig dir, nicht schüchtern.\"",
    "Softer lit, no softer sell. A girl folds herself onto your stool with you already on it. \"Kwan makes the cranes; I make the offer. One drink, then up. Simple like everything on the soi.\"":
      "Weicher beleuchtet, nicht weicher verkauft. Ein Mädchen faltet sich auf deinen Hocker, obwohl du schon darauf sitzt. \"Kwan macht die Kraniche; ich mache das Angebot. Ein drink, dann hoch. Einfach wie alles auf der soi.\"",
    "Back under the streaky clouds into the pink. Somebody settles against you and gets straight to it — what's on offer, what it costs, which staircase — all in a warm purr.":
      "Zurück unter die verwischten Wolken, hinein ins Pink. Jemand schmiegt sich an dich und kommt gleich zur Sache — was im Angebot ist, was es kostet, welche Treppe — alles in einem warmen Schnurren.",
    "Sunset Dreams reels you in on rose light and quick hands: a girl's fingers find yours and move them where she wants, and the pitch is warm, direct, and completely unambiguous.":
      "Sunset Dreams zieht dich mit rosa Licht und flinken Händen an: Die Finger eines Mädchens finden deine und führen sie, wohin sie will, und das Angebot ist warm, direkt und völlig unmissverständlich.",
    "Back into the pink. \"You again. Good. The loud girls next door, they tire you out — me, I take my time.\" A hand slides up. \"Buy me one drink. Then we take our time upstairs.\"":
      "Zurück ins Pink. \"Du wieder. Gut. Die lauten Mädchen nebenan, die machen dich müde — ich, ich lasse mir Zeit.\" Eine Hand gleitet hoch. \"Kauf mir einen drink. Dann lassen wir uns Zeit, oben.\"",
    "Into Sunset Dreams, where the soft light just lets the girls lean closer to say the loud part: a number, a room, a promise, delivered against your ear like a secret.":
      "Hinein in Sunset Dreams, wo das sanfte Licht den Mädchen nur erlaubt, sich näher heranzulehnen, um den lauten Teil zu sagen: eine Zahl, ein Zimmer, ein Versprechen, an dein Ohr geflüstert wie ein Geheimnis.",
    "Back to the origami militia and the rose glow. A girl drapes over you and names the whole transaction like sweet nothings. Kwan, at the rail, adds another crane and says nothing at all.":
      "Zurück zur Origami-Miliz und dem rosa Schimmer. Ein Mädchen drapiert sich über dir und benennt das ganze Geschäft wie Kosenamen. Kwan, an der Theke, faltet noch einen Kranich und sagt gar nichts.",
    "Back to the middle of the soi, where the volume drops by half and the bars let you be. A cold-beer stretch built for watching, not for being grabbed.":
      "Zurück in die Mitte der Soi, wo die Lautstärke auf die Hälfte fällt und die Bars dich in Ruhe lassen. Ein Kaltes-Bier-Abschnitt, gebaut zum Zuschauen, nicht zum Gegrapscht-Werden.",
    "The quiet middle again — the Shady Lady's awning, the Front Row's theatre stools, the Verandah's raised deck, and the Queen Vic glowing calm in the thick of it.":
      "Die stille Mitte, wieder — die Markise der Shady Lady, die Theaterhocker des Front Row, die erhöhte Terrasse der Verandah, und mittendrin die Queen Vic, die ruhig vor sich hin leuchtet.",
    "You come back into the soi's soft spot. Down at the west end a barker loses a fight with a foam noodle; up here nobody bothers, and that's the whole appeal.":
      "Du kommst zurück in den ruhigen Fleck der Soi. Unten am Westende verliert ein Anwerber einen Kampf gegen eine Schaumstoff-Nudel; hier oben stört dich niemand, und genau das ist der ganze Reiz.",
    "Back to the people-watching stretch, where the pullers are off-duty and the men who wanted a ringside seat without the hassle nurse their Changs and rate the parade.":
      "Zurück zum Leute-Beobachten-Abschnitt, wo die Anwerberinnen Feierabend haben und die Männer, die einen Logenplatz ohne den ganzen Stress wollten, ihre Changs nippen und die Parade bewerten.",
    "The middle takes you back — the Queen Vic glowing calm, the easy bars either side, the loud ends holding the noise at arm's length for once.":
      "Die Mitte nimmt dich wieder auf — die Queen Vic leuchtet ruhig, die entspannten Bars zu beiden Seiten, die lauten Enden halten den Lärm für einmal auf Abstand.",
    "Back into the calm centre of the storm. West and east the soi does its shouting; here it just streams past your stool while you drink and watch.":
      "Zurück in das ruhige Zentrum des Sturms. Im Westen und Osten schreit sich die Soi die Kehle aus; hier zieht alles nur an deinem Hocker vorbei, während du trinkst und schaust.",
    "The quiet stretch again, the Queen Vic's aircon leaking cold onto the pavement, three easy beer bars and nobody on the soi trying to climb you. Rare. Enjoy it.":
      "Der stille Abschnitt, wieder, die Klimaanlage der Queen Vic lässt kalte Luft aufs Pflaster tropfen, drei entspannte Bierbars, und niemand auf der Soi, der an dir hochklettern will. Selten. Genieß es.",
    "Deeper into the soi again, where the noise doubles down and the bars run on toward Second Road. A girl swings off a Kitten Corner stool to intercept you: \"Where you go? You go with ME.\"":
      "Wieder tiefer in die Soi, wo der Lärm sich verdoppelt und die Bars weiter bis zur Second Road reichen. Ein Mädchen schwingt sich von einem Kitten-Corner-Hocker, um dich abzufangen: \"Where you go? You go with ME.\"",
    "Back into the far stretch, wrist-grabs down both sides, three-colour neon, three staircases the menus don't mention. \"HANDSOME! Cherry Pop! No — Ruby Kiss! He come here!\"":
      "Zurück in den hinteren Abschnitt, Handgelenk-Griffe auf beiden Seiten, dreifarbiges Neon, drei Treppenhäuser, die auf keiner Speisekarte stehen. \"HANDSOME! Cherry Pop! No — Ruby Kiss! He come here!\"",
    "The deep end of Soi 6 takes you back — same open fronts, same offers, louder if anything. A hand finds your arm before you've picked a bar; the bar gets picked for you.":
      "Das tiefe Ende der Soi 6 nimmt dich wieder auf — dieselben offenen Fronten, dieselben Angebote, wenn überhaupt noch lauter. Eine Hand findet deinen Arm, bevor du dich für eine Bar entschieden hast; die Bar wird für dich entschieden.",
    "Back past the Queen Vic into the thick of it, where every doorway has a girl and every girl has a plan for your evening and none of them is subtle about it.":
      "Zurück, vorbei an der Queen Vic, mitten hinein, wo in jeder Türöffnung ein Mädchen steht und jedes Mädchen einen Plan für deinen Abend hat, und keine davon macht ein Geheimnis draus.",
    "You round into the deep soi and the pitches overlap into one wall of sound: drink, upstairs, short time, long time, come come come, all of it aimed at you and meant.":
      "Du biegst in die tiefe Soi und die Anmachsprüche überlappen sich zu einer einzigen Wand aus Lärm: Drink, upstairs, short time, long time, come come come, alles auf dich gerichtet und alles ernst gemeint.",
    "Back into the far stretch, the last hundred metres before Second Road, where the girls read your wallet through your shorts and grab accordingly.":
      "Zurück in den hinteren Abschnitt, die letzten hundert Meter vor der Second Road, wo die Mädchen deine Brieftasche durch die Shorts hindurch lesen und entsprechend zugreifen.",
    "The deep soi again. Kitten, Cherry, Ruby — three fronts, three staircases, three sets of hands already reaching. You are, once more, the entire economy walking past.":
      "Die tiefe Soi, wieder. Kitten, Cherry, Ruby — drei Fronten, drei Treppenhäuser, drei Paar Hände, die schon nach dir greifen. Du bist, einmal mehr, die gesamte Wirtschaft, die hier vorbeiläuft.",
    "Back to where the soi runs out toward Second Road, neon stacked to the roofline, a girl on your sleeve saying the quiet part first and loud: \"Come upstairs, tilac. Why we pretend?\"":
      "Zurück dorthin, wo die Soi auf die Second Road zuläuft, Neon bis zur Dachkante gestapelt, ein Mädchen an deinem Ärmel, das das Unausgesprochene zuerst und laut sagt: \"Come upstairs, tilac. Why we pretend?\"",
    "Back into Kitten Corner and the grab-and-giggle is instant — Praewa in your lap, Nangfah at your ear, both purring the offer. \"You want kitten tonight? Two kitten? Buy us drink, we go up, we play.\"":
      "Zurück im Kitten Corner, und das Grapschen-und-Kichern setzt sofort ein — Praewa auf deinem Schoß, Nangfah an deinem Ohr, beide schnurren das Angebot. \"You want kitten tonight? Two kitten? Buy us drink, we go up, we play.\"",
    "The neon paw flickers you back in and a girl is already climbing you like furniture. \"Meow, handsome.\" A grin, a hand, a price. \"Short time upstairs — you like? Everybody like.\"":
      "Die Neon-Pfote flackert dich zurück hinein, und ein Mädchen erklimmt dich schon wie ein Möbelstück. \"Meow, handsome.\" Ein Grinsen, eine Hand, ein Preis. \"Short time upstairs — you like? Everybody like.\"",
    "Cat posters and quick hands. A girl hooks her claws gently into your collar and puts it plainly: \"Why you play hard to get? Nobody play hard to get on Soi 6. Buy me drink, take me up.\"":
      "Katzenposter und schnelle Hände. Ein Mädchen hakt ihre Krallen sanft in deinen Kragen und sagt es klipp und klar: \"Why you play hard to get? Nobody play hard to get on Soi 6. Buy me drink, take me up.\"",
    "Back to the paw print and the pounce. Two of them close in, delighted, competitive, direct — a thigh, a purr, a number — and Kesinee watches the till and lets the girls work.":
      "Zurück zum Pfotenabdruck und zum Sprung. Zwei von ihnen rücken näher, entzückt, konkurrierend, direkt — ein Schenkel, ein Schnurren, eine Zahl — und Kesinee behält die Kasse im Auge und lässt die Mädchen arbeiten.",
    "Kitten Corner takes you back and does not pretend otherwise: a lap claimed, a mouth at your ear, the staircase nodded at. \"Upstairs is where the kitten really play, tilac.\"":
      "Kitten Corner nimmt dich wieder auf und tut nicht so, als wäre es anders: ein Schoß beansprucht, ein Mund an deinem Ohr, ein Nicken zur Treppe. \"Upstairs is where the kitten really play, tilac.\"",
    "Back into the cat glow. \"Same handsome! You come back for me — say you come back for me.\" She is already arranging herself across your knees. \"Buy me drink first. Then upstairs. Then you never leave Soi 6.\"":
      "Zurück in den Katzen-Schimmer. \"Same handsome! You come back for me — say you come back for me.\" Sie drapiert sich schon über deinen Knien. \"Buy me drink first. Then upstairs. Then you never leave Soi 6.\"",
    "Into Kitten Corner, all posters and pounce, where the girls tell you exactly what the staircase is for inside the first breath and dare you to be shocked.":
      "Hinein in den Kitten Corner, ganz Poster und Sprung, wo dir die Mädchen im ersten Atemzug haargenau sagen, wofür die Treppe da ist, und dich herausfordern, schockiert zu sein.",
    "Back to the paw and the purr, and a girl who has decided you are hers for the night. \"No shy, handsome. This Soi 6. We say what we want, you buy the drink, we go up. Easy, na?\"":
      "Zurück zur Pfote und zum Schnurren, und ein Mädchen, das entschieden hat, dass du ihr für die Nacht gehörst. \"No shy, handsome. This Soi 6. We say what we want, you buy the drink, we go up. Easy, na?\"",
    "Back into Cherry Pop, red on red, and a girl pops a cherry between her teeth and the offer in the same grin. \"Handsome! You taste cherry with me upstairs? Buy me drink, we find out.\"":
      "Zurück im Cherry Pop, Rot auf Rot, und ein Mädchen zerbeißt eine Kirsche zwischen den Zähnen und das Angebot im selben Grinsen. \"Handsome! You taste cherry with me upstairs? Buy me drink, we find out.\"",
    "The bubblegum loop and the wall of red take you back, and Tabtim takes your lap. \"You came back for Cherry. Everybody come back for Cherry.\" A hand, a price, a wink. \"Short time, sweet like the name.\"":
      "Die Bubblegum-Schleife und die Wand aus Rot nehmen dich wieder auf, und Tabtim nimmt sich deinen Schoß. \"You came back for Cherry. Everybody come back for Cherry.\" Eine Hand, ein Preis, ein Augenzwinkern. \"Short time, sweet like the name.\"",
    "Red floor to ceiling and a girl already on you before you have sat. \"Why you wait? On Soi 6 nobody wait. One drink, then up, then you go home smiling like a idiot. Good idiot.\"":
      "Rot vom Boden bis zur Decke, und ein Mädchen ist schon an dir, bevor du dich gesetzt hast. \"Why you wait? On Soi 6 nobody wait. One drink, then up, then you go home smiling like a idiot. Good idiot.\"",
    "Back to the cherries nobody eats and the girls who eat you alive. Chaba drapes over you and names the whole thing — drink, room, price — sweetly, cheerfully, without a shred of shame.":
      "Zurück zu den Kirschen, die niemand isst, und den Mädchen, die dich bei lebendigem Leib fressen. Chaba drapiert sich über dich und benennt das Ganze — Drink, Zimmer, Preis — süß, fröhlich, ohne einen Funken Scham.",
    "Cherry Pop reels you in on sugar and directness in equal measure: a thigh across yours, a purr in your ear, and a girl telling you precisely what the staircase behind the bar is for.":
      "Cherry Pop zieht dich mit Zucker und Direktheit zu gleichen Teilen an: ein Schenkel über deinem, ein Schnurren an deinem Ohr, und ein Mädchen, das dir haargenau erklärt, wofür die Treppe hinter der Bar da ist.",
    "Back into the red. \"Same handsome, same Cherry, same idea!\" She laughs, climbs half into your lap, gets to the point. \"Buy me drink. Take me up. The playlist is bad but I am not.\"":
      "Zurück ins Rote. \"Same handsome, same Cherry, same idea!\" Sie lacht, klettert halb auf deinen Schoß, kommt zum Punkt. \"Buy me drink. Take me up. The playlist is bad but I am not.\"",
    "Into Cherry Pop, where the come-on is as loud and sweet and relentless as the one bubblegum song, and just as impossible to argue with.":
      "Hinein ins Cherry Pop, wo die Anmache so laut, süß und unerbittlich ist wie der eine Bubblegum-Song, und genauso unmöglich zu widerlegen.",
    "Back to the bowl of untouched cherries and a girl who has claimed your stool and your evening. \"You buy me one drink, I make you forget the flight, the wife, your own name. Upstairs. Yes? Yes.\"":
      "Zurück zur Schale unberührter Kirschen und einem Mädchen, das sich deinen Hocker und deinen Abend geschnappt hat. \"You buy me one drink, I make you forget the flight, the wife, your own name. Upstairs. Yes? Yes.\"",
    "Back into Ruby Kiss and a lipstick-marked glass is in your hand before a girl is in your lap — but only just. \"You have my kiss. Now you want the rest?\" Wilai grins at the mirror, at the two of you the glass makes four. \"Buy me drink, we go up.\"":
      "Zurück in die Ruby Kiss, und ein lippenstiftbeschmiertes Glas ist in deiner Hand, noch bevor ein Mädchen auf deinem Schoß sitzt — aber nur knapp. \"Du hast meinen Kuss. Jetzt willst du den Rest?\" Wilai grinst in den Spiegel, aus euch beiden macht das Glas vier. \"Kauf mir Drink, wir gehen hoch.\"",
    "Lipstick lighting, mirror wall, and Kluay already arranging herself across you. \"Last bar on the soi, best girls on the soi — you save the best, na?\" A hand, a price, a nod at the stairs.":
      "Lippenstift-Beleuchtung, Spiegelwand, und Kluay drapiert sich schon über dich. \"Letzte Bar auf der Soi, beste Mädchen auf der Soi — du hebst dir das Beste auf, na?\" Eine Hand, ein Preis, ein Nicken zur Treppe.",
    "The red mirror-glare takes you back and doubles the come-on: two Benzes leaning in, two hands on your thigh, one very direct question about upstairs asked twice at once.":
      "Der rote Spiegelglanz holt dich zurück und verdoppelt die Anmache: zwei Benzes, die sich zu dir lehnen, zwei Hände auf deinem Oberschenkel, eine sehr direkte Frage nach oben, gleichzeitig zweimal gestellt.",
    "Back to the lipstick and the last-loud-front energy. A girl marks your cheek with a kiss and the deal in the same motion. \"Short time, long time — you choose, handsome. But you choose me.\"":
      "Zurück zum Lippenstift und der Energie der letzten lauten Front. Ein Mädchen markiert deine Wange mit einem Kuss und den Deal in derselben Bewegung. \"Short time, long time — du entscheidest, Handsome. Aber du entscheidest dich für mich.\"",
    "Ruby Kiss reels you in on mirrors and mouths. Somebody already has the offer against your ear — drink, room, price — and the wall behind the bar is showing you both exactly how it looks.":
      "Die Ruby Kiss zieht dich an mit Spiegeln und Mündern. Jemand hat das Angebot schon an deinem Ohr — Drink, Zimmer, Preis — und die Wand hinter der Bar zeigt euch beiden ganz genau, wie das aussieht.",
    "Back into the red. \"Handsome came back to Ruby! Of course. Everybody save Ruby for last.\" She climbs on, points at the stairs, does not stop smiling. \"Buy me drink — then last is best.\"":
      "Zurück ins Rot. \"Handsome ist zu Ruby zurückgekommen! Klar doch. Alle heben sich Ruby für zuletzt auf.\" Sie klettert auf dich, zeigt zur Treppe, hört nicht auf zu lächeln. \"Kauf mir Drink — dann ist zuletzt am besten.\"",
    "Into Ruby Kiss, where the girls kiss the glass, kiss your cheek, and name the whole transaction in one breath, and the mirror makes an audience of it.":
      "Hinein in die Ruby Kiss, wo die Mädchen das Glas küssen, deine Wange küssen und das ganze Geschäft in einem Atemzug benennen, und der Spiegel macht ein Publikum daraus.",
    "Back to the lipstick marks and a girl draped over your shoulders, chin on your head, watching you both in the mirror wall. \"See? We look good together. Buy me drink. We look even better upstairs.\"":
      "Zurück zu den Lippenstiftspuren und einem Mädchen, das über deinen Schultern hängt, das Kinn auf deinem Kopf, und euch beide in der Spiegelwand beobachtet. \"Siehst du? Wir sehen gut aus zusammen. Kauf mir Drink. Oben sehen wir noch besser aus.\"",
    "Back into the Queen Vic — real aircon, real wood, the dartboard, and the soi safely on the far side of the glass.":
      "Zurück in die Queen Vic — echte Klimaanlage, echtes Holz, die Dartscheibe, und die Soi sicher auf der anderen Seite des Glases.",
    "The pub folds you back into its calm. Terry lifts his beer from the corner stool without quite looking up.":
      "Der Pub nimmt dich zurück in seine Ruhe. Terry hebt sein Bier vom Eckhocker, ohne wirklich aufzublicken.",
    "You step back into the one quiet room on Soi 6. The bass from outside arrives pre-muffled, the way it should.":
      "Du trittst zurück in den einen ruhigen Raum auf Soi 6. Der Bass von draußen kommt schon gedämpft an, so wie es sein soll.",
    "The Queen Vic again — the dartboard, the panelling, the deliberate refusal to be Soi 6. It works.":
      "Wieder die Queen Vic — die Dartscheibe, die Holzvertäfelung, die bewusste Weigerung, Soi 6 zu sein. Es funktioniert.",
    "Back through the door and the volume drops to a civilised hum. Somebody's mid-dart, somebody's mid-story, nobody's mid-grab. Bliss.":
      "Zurück durch die Tür, und die Lautstärke sinkt auf ein zivilisiertes Summen. Einer ist mitten im Wurf, einer mitten in der Geschichte, niemand mitten im Grapschen. Herrlich.",
    "The Vic takes you back into wood and cold air and the low murmur of men who have found their spot and mean to keep it.":
      "Die Vic nimmt dich zurück in Holz und kalte Luft und das leise Murmeln von Männern, die ihren Platz gefunden haben und ihn behalten wollen.",
    "Back to the calm eye of the soi's storm — a pint, a dartboard, a window onto the chaos you don't have to join.":
      "Zurück zum ruhigen Auge im Sturm der Soi — ein Pint, eine Dartscheibe, ein Fenster in das Chaos, an dem du nicht teilnehmen musst.",
    "Back up to your balcony room over the Queen Vic — the fan turning its opinions over, Soi 6 still howling up over the rail two floors down.":
      "Zurück hoch in dein Balkonzimmer über der Queen Vic — der Ventilator wälzt seine Meinungen, Soi 6 heult noch immer über das Geländer zwei Stockwerke tiefer herauf.",
    "The room again: wood floors, the recliner on the balcony, the soi throwing its light and its bass up the wall like a fish tank with the volume left on.":
      "Das Zimmer wieder: Holzböden, der Liegestuhl auf dem Balkon, die Soi wirft ihr Licht und ihren Bass die Wand hoch wie ein Aquarium, bei dem die Lautstärke aufgedreht blieb.",
    "You climb back to the balcony room. Somewhere below a girl is shrieking WHERE YOU GO SEXY MAN at a man who is, in fact, going. The blackout curtains will fix most of it.":
      "Du steigst zurück ins Balkonzimmer. Irgendwo unten kreischt ein Mädchen WHERE YOU GO SEXY MAN einen Mann an, der tatsächlich gerade geht. Die Verdunkelungsvorhänge werden das meiste davon regeln.",
    "Home, such as it is — one recliner, one small table, and the whole loud soi laid out below like it is putting on the show for you alone.":
      "Zuhause, so wie es eben ist — ein Liegestuhl, ein kleiner Tisch, und die ganze laute Soi liegt unten ausgebreitet, als würde sie die Show nur für dich allein abziehen.",
    "Back to the balcony. Six bars' worth of music arrives as one blurred throb, a hostess laughs like a car alarm, and none of it follows you past the blackout curtains.":
      "Zurück auf den Balkon. Die Musik von sechs Bars kommt als ein einziges verschwommenes Wummern an, eine Hostess lacht wie eine Autoalarmanlage, und nichts davon folgt dir hinter die Verdunkelungsvorhänge.",
    "Up the stairs to the fan and the recliner. The soi does not quiet down for anyone — but draw the blackout curtains and it drops to a rumour you can sleep through.":
      "Die Treppe hoch zum Ventilator und zum Liegestuhl. Die Soi wird für niemanden leiser — aber zieh die Verdunkelungsvorhänge zu, und sie sinkt zu einem Gerücht herab, bei dem du durchschlafen kannst.",
    "The balcony room takes you back in. HANDSOME MAN! floats up from the pavement, aimed at somebody, everybody, nobody. You have learned to hear it as weather.":
      "Das Balkonzimmer nimmt dich wieder auf. HANDSOME MAN! schwebt vom Gehsteig herauf, gerichtet an jemanden, alle, niemanden. Du hast gelernt, es wie Wetter zu hören.",
    "Back to your patch of quiet-ish over the loudest hundred metres in Thailand — recliner, small table, and blackout curtains thick enough to turn the neon and the shouting into a lullaby.":
      "Zurück zu deinem einigermaßen ruhigen Fleckchen über den lautesten hundert Metern Thailands — Liegestuhl, kleiner Tisch, und Verdunkelungsvorhänge dick genug, um Neon und Geschrei in ein Schlaflied zu verwandeln.",
    "phone":
      "Handy",
    "Your phone. Battery anxiety made object. The flashlight works — for now.":
      "Dein Handy. Akku-Angst, gegenständlich geworden. Die Taschenlampe funktioniert – vorerst.",
    "7-Eleven receipt":
      "7-Eleven-Kassenbon",
    "A crumpled 7-Eleven receipt from your pocket. The print is in Thai.":
      "Ein zerknüllter 7-Eleven-Kassenbon aus deiner Tasche. Der Aufdruck ist auf Thai.",
    "packet of Mama noodles":
      "Packung Mama-Nudeln",
    "Half a packet of Mama noodles, chicken flavour. Dry. Technically food. A soi dog would commit crimes for this.":
      "Eine halbe Packung Mama-Nudeln, Geschmacksrichtung Huhn. Trocken. Technisch gesehen Essen. Ein Soi-Hund würde dafür Verbrechen begehen.",
    "empty Chang bottle":
      "leere Chang-Flasche",
    "An empty Chang big bottle. Deposit value: ฿5 to the right buyer.":
      "Eine leere große Chang-Flasche. Pfandwert: ฿5 beim richtigen Käufer.",
    "empty Leo bottle":
      "leere Leo-Flasche",
    "An empty Leo bottle, sand in the neck. Worth ฿5 in deposit.":
      "Eine leere Leo-Flasche, Sand im Flaschenhals. ฿5 Pfand wert.",
    "empty Singha bottle":
      "leere Singha-Flasche",
    "An empty Singha bottle, rinsed by somebody more organised than its drinker. ฿5 of glass.":
      "Eine leere Singha-Flasche, ausgespült von jemandem, der ordentlicher ist als ihr Trinker. ฿5 Glas.",
    "phone charger":
      "Handy-Ladegerät",
    "A ฿59 USB charger of heroic optimism. Pair with an outlet to resurrect your phone.":
      "Ein USB-Ladegerät für ฿59, voller heldenhaftem Optimismus. Mit einer Steckdose kombinieren, um dein Handy wiederzubeleben.",
    "spare helmet":
      "Ersatzhelm",
    "Bank's spare helmet — hot pink, with a Rainbow Girls Bar sticker on the side. He wants it delivered to Pim at the Starlight Bar.":
      "Banks Ersatzhelm – knallpink, mit einem Rainbow-Girls-Bar-Aufkleber an der Seite. Er will, dass er bei Pim in der Starlight Bar abgeliefert wird.",
    "som tam (extra spicy)":
      "Som Tam (extra scharf)",
    "A takeaway box of som tam poo plara, spicy enough to be classed as a weapon. Candy's peace offering for Ploy, the cashier at Rainbow Girls.":
      "Eine Take-away-Box Som Tam Poo Plara, scharf genug, um als Waffe zu gelten. Candys Friedensangebot für Ploy, die Kassiererin bei Rainbow Girls.",
    "bottle of Sang Som":
      "Flasche Sang Som",
    "A boxed bottle of Sang Som with a rose-pink ribbon and a card in Candy's handwriting: 'เปิดร้านใหม่ สู้ๆ นะ' — for the opening shelf at Candy Bar 2.":
      "Eine verpackte Flasche Sang Som mit rosa Schleife und einer Karte in Candys Handschrift: 'เปิดร้านใหม่ สู้ๆ นะ' – für das Eröffnungsregal in der Candy Bar 2.",
    "ring of site keys":
      "Ring mit Geländeschlüsseln",
    "A heavy ring of brass site keys, every one oiled and worn — the locks of Hyper A Go-Go as they were the day the hoarding came down. Kept polished by a widow's thumb for years.":
      "Ein schwerer Ring mit Messingschlüsseln, jeder geölt und abgegriffen – die Schlösser des Hyper A Go-Go, genau wie an dem Tag, als der Bauzaun fiel. Jahrelang vom Daumen einer Witwe blank poliert.",
    "Peacock revue flyer":
      "Flyer der Peacock-Revue",
    "A glossy flyer for the Peacock Cabaret's revue: Petch mid-lip-sync in a gown made of light, Miss Mala's headdress filling the top corner like weather. On the back, in careful biro: 'for the Alcazar man — M.'":
      "Ein Hochglanz-Flyer für die Revue des Peacock Cabaret: Petch mitten im Playback in einem Kleid aus Licht, Miss Malas Kopfschmuck füllt die obere Ecke wie ein Wetterphänomen. Auf der Rückseite, in sorgfältigem Kugelschreiber: 'für den Alcazar-Mann – M.'",
    "brass dog tag":
      "Hundemarke aus Messing",
    "A brass dog tag gone green with four rainy seasons: SEAMUS — THE SHAMROCK — GOOD BOY. The pub is shuttered and Paddy is long gone home, but somebody once paid to have GOOD BOY engraved in brass, and they were right.":
      "Eine Hundemarke aus Messing, grün angelaufen nach vier Regenzeiten: SEAMUS — THE SHAMROCK — GOOD BOY. Der Pub ist verrammelt und Paddy längst zurück in der Heimat, aber irgendjemand hat einmal bezahlt, um GOOD BOY in Messing gravieren zu lassen, und er hatte recht.",
    "genuine Rolex (allegedly)":
      "echte Rolex (angeblich)",
    "A 'Rolex' of tremendous confidence and negligible mass. The second hand moves in a way Rolex engineers would describe as 'jazz'. It has already started a conversation at every bar you've worn it to.":
      "Eine 'Rolex' von enormem Selbstbewusstsein und verschwindend geringem Gewicht. Der Sekundenzeiger bewegt sich auf eine Weise, die Rolex-Ingenieure als 'Jazz' bezeichnen würden. Sie hat in jeder Bar, in der du sie getragen hast, schon für Gesprächsstoff gesorgt.",
    "designer sunglasses":
      "Designer-Sonnenbrille",
    "RayBens. The B is doing a lot of work. Worn at night, indoors, they say either 'international man of mystery' or 'hungover' — both true.":
      "RayBens. Das B leistet ganze Arbeit. Nachts, drinnen getragen, sagen sie entweder 'internationaler Mann des Mysteriums' oder 'verkatert' – beides stimmt.",
    "packet of 'vitamins'":
      "Packung 'Vitamine'",
    "A foil strip of blue diamonds from the peddler's deepest pocket, labelled in four languages, none convincingly. Sold with a wink you didn't ask for.":
      "Ein Folienstreifen mit blauen Rauten aus der tiefsten Tasche des Straßenhändlers, in vier Sprachen beschriftet, keine davon überzeugend. Verkauft mit einem Augenzwinkern, um das du nicht gebeten hast.",
    "moo ping skewer":
      "Moo-Ping-Spieß",
    "A grilled pork skewer, still warm, glistening with the good marinade. Technically dinner. A soi dog would trade its entire territory for this.":
      "Ein gegrillter Schweinefleischspieß, noch warm, glänzend von der guten Marinade. Technisch gesehen Abendessen. Ein Soi-Hund würde dafür sein ganzes Revier eintauschen.",
    "bottle of hair tonic":
      "Flasche Haartonikum",
    "HIMALAYAN HERBAL HAIR TONIC — 100% GROW BACK GUARANTEE. Smells of cooking oil and ambition. The ฿99 you paid for it is in another province by now.":
      "HIMALAYA-KRÄUTER-HAARTONIKUM — 100% NACHWUCHS-GARANTIE. Riecht nach Speiseöl und Ehrgeiz. Die ฿99, die du dafür bezahlt hast, sind längst in einer anderen Provinz.",
    "faded poster":
      "verblasstes Poster",
    "A faded Walking Street poster from another decade: 'CRYSTAL PALACE PRESENTS — MISS OY — DANCER No. 71'. The young woman in the photo has a look you recognise from somewhere much more recent.":
      "Ein verblasstes Walking-Street-Poster aus einem anderen Jahrzehnt: 'CRYSTAL PALACE PRESENTS — MISS OY — DANCER No. 71'. Die junge Frau auf dem Foto hat einen Blick, den du von irgendwo viel Jüngerem wiedererkennst.",
    "marigold offering":
      "Ringelblumen-Opfergabe",
    "Somebody's offering. Absolutely not yours to take. The red Fanta too.":
      "Die Opfergabe von jemandem. Ganz sicher nicht deine, um sie zu nehmen. Die rote Fanta auch nicht.",
    "two soi cats":
      "zwei Soi-Katzen",
    "Two gray-and-white shorthairs holding down the end of a lounger like a deposit. Sisters, plainly — same coat, same sea-watching squint — though the little one is a runt who never grew into her ears, and the big one sits slightly in front of her the way she always has and always will. The beach calls them Big One and Little One; Auntie Nok feeds them scraps and calls them her security. They have watched a thousand of these sunsets and fully intend to watch a thousand more. (PET them, if Big One permits it.)":
      "Zwei grau-weiße Kurzhaarkatzen, die das Ende einer Liege besetzt halten wie ein Pfand. Schwestern, ganz offensichtlich – gleiches Fell, gleiches meerwärts blinzelndes Kneifen –, wobei die Kleine ein Kümmerling ist, die nie in ihre Ohren hineingewachsen ist, und die Große leicht vor ihr sitzt, wie sie es immer getan hat und immer tun wird. Der Strand nennt sie Big One und Little One; Auntie Nok füttert sie mit Resten und nennt sie ihre Security. Sie haben tausend solcher Sonnenuntergänge gesehen und haben fest vor, noch tausend weitere zu sehen. (PET sie, wenn Big One es erlaubt.)",
    "steel safe":
      "Stahltresor",
    "A floor-bolted steel safe. The keypad's buttons are Thai numerals: ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙. It wants three digits.":
      "Ein bodenverschraubter Stahltresor. Die Tasten des Zahlenfelds sind Thai-Ziffern: ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙. Er verlangt drei Stellen.",
    "your wallet":
      "deine Brieftasche",
    "Your wallet! Cards, hotel key card, and — miraculously — most of the cash. Tucked inside: a note in careful English: 'Farang — you buy Mot's dinner tonight. Be more careful. — Oy'.":
      "Deine Brieftasche! Karten, Hotel-Schlüsselkarte und – wie durch ein Wunder – der größte Teil des Bargelds. Darin steckt ein Zettel in sorgfältigem Englisch: 'Farang – du kaufst Mot heute Abend Abendessen. Sei vorsichtiger. – Oy'.",
    "a number on a beer mat":
      "eine Nummer auf einem Bierdeckel",
    "A phone number biro'd onto a soggy beer mat, and under it, underlined twice: \"my place.\"":
      "Eine mit Kugelschreiber auf einen durchweichten Bierdeckel gekritzelte Telefonnummer, darunter, zweimal unterstrichen: \"bei mir.\"",
    "saleng sandals":
      "Saleng-Sandalen",
    "Sequinned sandals from a saleng cart, carried in a thin plastic bag. Sized for a Thai woman's foot. They are not for you — but you know who they are for.":
      "Pailletten-Sandalen von einem Saleng-Karren, in einer dünnen Plastiktüte getragen. Für den Fuß einer Thai-Frau geschnitten. Sie sind nicht für dich – aber du weißt, für wen.",
    "saleng heels":
      "Saleng-Highheels",
    "Platform heels from the saleng cart, still in the carry bag. Someone is going to look very good in these. You are not that someone.":
      "Plateau-Highheels vom Saleng-Karren, noch in der Tragetasche. Jemand wird darin sehr gut aussehen. Du bist nicht dieser Jemand.",
    "saleng lingerie":
      "Saleng-Dessous",
    "A bag of lingerie from the saleng cart — lace, silk-adjacent, the kind of purchase that requires a recipient to make sense.":
      "Eine Tüte Dessous vom Saleng-Karren – Spitze, seidenähnlich, die Art Einkauf, die nur mit einer Empfängerin einen Sinn ergibt.",
    // ── Social text (flirt/kiss/spank/fondle) — {n}=name, Opus-translated ──
    "{n} receives your best line with the professional warmth of a woman who has heard nine thousand better ones tonight alone. “Ooo, so sweet, na.”":
      "{n} nimmt deinen besten Spruch mit der professionellen Wärme einer Frau entgegen, die allein heute Abend neuntausend bessere gehört hat. “Ooo, so süß, na.”",
    "{n} tilts her head, gives your line a two-second appraisal, and files it under harmless. “You funny man. Buy me drink, funny man.”":
      "{n} legt den Kopf schief, mustert deinen Spruch zwei Sekunden lang und legt ihn unter harmlos ab. “Du lustig, na. Kauf mir Drink, lustiger Mann.”",
    "{n} laughs for real this time, touches your arm, and tells you something genuinely rude about the man at the end of the bar. Progress.":
      "{n} lacht diesmal echt, berührt deinen Arm und erzählt dir etwas richtig Gemeines über den Mann am Ende der Bar. Fortschritt.",
    "{n} actually snorts, covers it, and leans an inch closer than the job requires. For a second the meter isn't running. Then it is again — but you saw it.":
      "{n} prustet tatsächlich los, verbirgt es und lehnt sich einen Zentimeter näher, als der Job es verlangt. Eine Sekunde lang läuft die Uhr nicht. Dann läuft sie wieder — aber du hast es gesehen.",
    "{n} slides onto the stool beside you, steals a sip of your drink, and starts flirting back with alarming professionalism. The other girls exchange looks.":
      "{n} gleitet auf den Hocker neben dir, klaut einen Schluck von deinem Drink und flirtet mit beunruhigender Professionalität zurück. Die anderen Mädchen tauschen Blicke.",
    "{n} decides you'll do for the night and turns the full wattage on — knee against yours, laughing before you finish the joke. The other girls give you up for lost.":
      "{n} entscheidet, dass du für heute Abend reichst, und dreht voll auf — Knie an deinem, lacht schon, bevor du den Witz zu Ende bringst. Die anderen Mädchen geben dich verloren.",
    "You lean in. {n} leans back — the full matador. The kiss lands on ambient air; a slap lands on you, precisely, like punctuation. The bar notices.":
      "Du lehnst dich vor. {n} lehnt sich zurück — der volle Torero. Der Kuss landet in der Luft; eine Ohrfeige landet auf dir, präzise, wie ein Satzzeichen. Die Bar bemerkt es.",
    "You go for it; {n} simply isn't there. Where her face was is a flat palm and a look that could curdle Chang. “No.” Just the one word, and the bar heard it.":
      "Du machst deinen Zug; {n} ist einfach nicht da. Wo ihr Gesicht war, sind eine flache Hand und ein Blick, der Chang gerinnen lassen könnte. “Nein.” Nur das eine Wort, und die Bar hat es gehört.",
    "{n} presents a cheek at the last microsecond — professional deflection, executed with the footwork of a woman who has dodged far better. “Buy drink first, tilac.”":
      "{n} bietet in der letzten Mikrosekunde eine Wange an — professionelle Abwehr, ausgeführt mit der Beinarbeit einer Frau, die weit Besseren ausgewichen ist. “Erst Drink kaufen, tilac.”",
    "{n} turns the kiss into a hug you didn't ask for and a laugh that closes the subject. “Slow, tilac. You want everything free tonight?”":
      "{n} verwandelt den Kuss in eine Umarmung, um die du nicht gebeten hast, und ein Lachen, das das Thema beendet. “Langsam, tilac. Du willst heute alles umsonst?”",
    "A quick peck is permitted, the way one permits a puppy on a sofa. {n} pats your cheek: “Okay, okay. Sanuk.”":
      "Ein schnelles Küsschen wird gestattet, so wie man einem Welpen das Sofa gestattet. {n} tätschelt deine Wange: “Okay, okay. Sanuk.”",
    "A brief kiss is granted, then withdrawn like a sample. {n} taps your nose. “Enough. You greedy.”":
      "Ein kurzer Kuss wird gewährt, dann wie eine Kostprobe wieder zurückgezogen. {n} tippt dir auf die Nase. “Genug. Du gierig.”",
    "{n} allows it — and takes her time about it. The cashier rings the till just to make a noise.":
      "{n} lässt es zu — und lässt sich dabei Zeit. Die Kassiererin klingelt die Kasse, nur um Lärm zu machen.",
    "{n} meets you halfway and holds it a beat past friendly. When she pulls back she's smiling at something she's decided not to tell you.":
      "{n} kommt dir auf halbem Weg entgegen und hält ihn einen Moment länger, als freundlich wäre. Als sie sich zurückzieht, lächelt sie über etwas, das sie beschlossen hat, dir nicht zu verraten.",
    "{n} kisses YOU, decisively, to a smattering of applause from the far end of the bar. You are now, officially, sitting with her.":
      "{n} küsst DICH, entschlossen, begleitet von vereinzeltem Applaus vom anderen Ende der Bar. Du sitzt jetzt, ganz offiziell, bei ihr.",
    "{n} takes your face in both hands and kisses you like she means the version of it she's selling. A glass goes up down the bar. You're hers for the night.":
      "{n} nimmt dein Gesicht in beide Hände und küsst dich, als meinte sie die Version davon, die sie verkauft. Weiter unten an der Bar hebt sich ein Glas. Du gehörst ihr für heute Nacht.",
    "{n} catches your wrist mid-air with a speed that suggests long practice, and the look she gives you drops the bar five degrees. Somewhere behind you, security uncrosses its arms.":
      "{n} fängt dein Handgelenk mitten in der Luft ab, mit einer Schnelligkeit, die auf lange Übung schließen lässt, und der Blick, den sie dir zuwirft, kühlt die Bar um fünf Grad. Irgendwo hinter dir löst der Türsteher die verschränkten Arme.",
    "Your hand doesn't get halfway. {n} steps out of range without appearing to move, and the temperature around you drops. A large man near the door stops chewing.":
      "Deine Hand schafft nicht mal die Hälfte des Wegs. {n} tritt aus der Reichweite, ohne sich sichtbar zu bewegen, und die Temperatur um dich herum sinkt. Ein großer Mann neben der Tür hört auf zu kauen.",
    "{n} sidesteps neatly. “Uh-uh. You not buy enough drink for that, tilac.” The mamasan's eyes flick your way like a till drawer closing.":
      "{n} weicht sauber aus. “Äh-äh. Du nicht genug Drink kaufen für das, tilac.” Die Augen der Mamasan zucken zu dir herüber wie eine zufallende Kassenlade.",
    "{n} pivots and your hand meets air. “Aht aht. That one cost more than you spend so far, tilac.” The till drawer of her eyes slides shut.":
      "{n} dreht sich weg und deine Hand trifft nur Luft. “Aht aht. Das kostet mehr, als du bisher ausgibst, tilac.” Die Kassenlade ihrer Augen schiebt sich zu.",
    "A token swat is absorbed with an eye-roll and precisely zero sincerity. “Hundred-fifty baht says you can try again, na.”":
      "Ein pflichtschuldiger Klaps wird mit einem Augenrollen und exakt null Ernsthaftigkeit hingenommen. “Hundertfünfzig Baht, dass du es nochmal versuchen darfst, na.”",
    "A glancing swat lands and is filed with an unimpressed hum. “Mm. Buy two more drink, maybe I let you.” She's joking. Mostly.":
      "Ein streifender Klaps landet und wird mit einem unbeeindruckten Summen abgelegt. “Mm. Kauf zwei Drink mehr, vielleicht lass ich dich.” Sie scherzt. Meistens.",
    "{n} yelps theatrically, laughs, and returns fire twice as hard. Yours was a swat; hers is a correction.":
      "{n} quiekt theatralisch, lacht und feuert doppelt so hart zurück. Deiner war ein Klaps; ihrer ist eine Korrektur.",
    "{n} jumps, laughs, and retaliates immediately and harder, to whoops from the next stool. You started a war you are structurally guaranteed to lose.":
      "{n} zuckt hoch, lacht und schlägt sofort und härter zurück, begleitet von Jubel vom Nachbarhocker. Du hast einen Krieg angefangen, den zu verlieren dir strukturell garantiert ist.",
    "{n} struts past deliberately slowly — then spanks YOU on the way back, to a roar from the entire bar. You have been out-Pattaya'd.":
      "{n} stolziert betont langsam vorbei — und versohlt dann auf dem Rückweg DICH, begleitet von einem Gebrüll der ganzen Bar. Du wurdest in Sachen Pattaya ausgestochen.",
    "{n} lets it happen, turns, and returns the favour with interest and a wink, timing it for the exact moment the whole bar is looking. The applause is for her.":
      "{n} lässt es geschehen, dreht sich um und revanchiert sich mit Zinsen und einem Zwinkern, exakt in dem Moment getimt, in dem die ganze Bar hinsieht. Der Applaus gilt ihr.",
    "Your hand sets off in a direction it has no visa for. {n} removes it like a bomb-disposal expert, and the smile she keeps on while doing it is the scariest thing you've seen tonight.":
      "Deine Hand macht sich in eine Richtung auf, für die sie kein Visum hat. {n} entfernt sie wie eine Bombenentschärferin, und das Lächeln, das sie dabei aufbehält, ist das Gruseligste, was du heute Abend gesehen hast.",
    "Your hand embarks; {n} intercepts it at the border and hands it back, still smiling — the smile of a woman who has ended men for less and found it tedious.":
      "Deine Hand bricht auf; {n} fängt sie an der Grenze ab und gibt sie dir zurück, immer noch lächelnd — das Lächeln einer Frau, die Männer für weniger erledigt und es langweilig gefunden hat.",
    "{n} intercepts your hand and returns it to your own knee, patting it twice — stay. “Naughty hands drink more first, na.”":
      "{n} fängt deine Hand ab und legt sie zurück auf dein eigenes Knie, tätschelt sie zweimal — bleib. “Freche Hände erst mehr trinken, na.”",
    "{n} lifts your wandering hand by the wrist, sets it on the bar, and puts her cold drink in it. “Hold this. Safer.”":
      "{n} hebt deine wandernde Hand am Handgelenk, setzt sie auf die Theke und drückt ihren kalten Drink hinein. “Halt das. Sicherer.”",
    "{n} tolerates approximately 1.5 seconds of wandering hand before redirecting it to the Connect 4 box. “Play this instead.”":
      "{n} toleriert etwa 1,5 Sekunden wandernde Hand, bevor sie sie zum Vier-gewinnt-Karton umleitet. “Spiel lieber das.”",
    "{n} allows the scenic route for exactly as long as it amuses her, then redirects your hand to your own beer. “Drink. Cool down, tilac.”":
      "{n} erlaubt die Panoramaroute genau so lange, wie es sie amüsiert, dann leitet sie deine Hand zu deinem eigenen Bier um. “Trink. Abkühlen, tilac.”",
    "{n} settles in closer and lets the moment linger just past professional. The mamasan develops an intense interest in the till.":
      "{n} rückt näher und lässt den Moment gerade eben über professionell hinaus andauern. Die Mamasan entwickelt ein intensives Interesse an der Kasse.",
    "{n} doesn't move your hand away this time — just raises an eyebrow that sets a price, and settles closer while you decide whether to pay it.":
      "{n} schiebt deine Hand diesmal nicht weg — hebt nur eine Augenbraue, die einen Preis festsetzt, und rückt näher, während du entscheidest, ob du ihn zahlst.",
    "{n} takes both your hands, inspects them like market produce, and puts them where she wants them — around her waist, while she orders herself another lady drink on your tab. Checkmate, but you don't mind.":
      "{n} nimmt beide deiner Hände, begutachtet sie wie Marktware und legt sie dahin, wo sie sie haben will — um ihre Taille, während sie sich auf deine Rechnung noch einen Lady Drink bestellt. Schachmatt, aber es macht dir nichts aus.",
    "{n} sighs, gives up the pretence, and arranges you around her like furniture she's chosen — then orders herself another lady drink on your tab, because winning shouldn't be free.":
      "{n} seufzt, gibt die Fassade auf und arrangiert dich um sich herum wie Möbel, die sie ausgesucht hat — dann bestellt sie sich auf deine Rechnung noch einen Lady Drink, denn Gewinnen sollte nicht umsonst sein.",
    // ── HELP_SOI6 command reference (commands/venues English; prose German) ──
    "Common commands:\n  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)\n  N/S/E/W · IN/OUT · ENTER <place> · TRAVEL <bar> (fast-hop to any bar you've seen)\n  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>\n  WAI [person] · SAY <thai phrase> [TO <person>]\n  WATCH TV · READ PAPER — the day's real headlines · OWL — the Nite Owl newsletter · WEATHER · SCORES · LOTTERY\n  WATCH SUNSET (Blue Dog & Stinky Pinky, early evening — the junction show)\n  WATCH SOI · BALCONY (your balcony above, the Queen Vic window below, or the quiet middle of the soi — watch, don't join)\n  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in the beer bars)\n  FLIRT/KISS/SPANK/FONDLE <lady> · BUY DRINK FOR <lady> · BUY BEER · BUY MAN DRINK\n  RING BELL (฿300, instant popularity) · TALK TO PATRON · BARFINE <lady>\n  BUY CONDOM (฿40 a pack, the 7-Eleven — a barfine uses one; go without at your peril)\n  DIAGNOSE (how bad is it) · GET TESTED (free clinic — clears a barfine souvenir)\n  QUESTS · ACCEPT <quest> · ABANDON <quest>   (the soi has its own jobs going)\n  EAT <food> · DRINK <thing> · BUY WATER / FOOD (street carts & the 7-Eleven)\n  WITHDRAW <amount> · CHECK BALANCE (the street ATM — ฿300 a pull, ฿20,000 a day)\n  SLEEP (your room, ends the night) · OPEN FRIDGE · TAKE WATER (two free bottles a day)\n  PHONE / EXAMINE PHONE (battery, messages, weather, headlines)\n  CONTACT <lady> (swap numbers) · CONTACTS · MESSAGE <lady> · CHECK MESSAGES\n  WHO / BLACKBOOK (your ladies, ranked by how they feel about you) · WHO AM I (who you chose to be)\n  SEND <amount> TO <lady> (banking app)\n  FEED DOG (a friendship you cannot undo) · PET DOG · NAME DOG <name>\n  LIGHT ON / LIGHT OFF · CHARGE PHONE\n  TIME · MAP · WAIT UNTIL <hour> · TIP <lady> <amount> · PHOTO · CHEERS · TAO RAI (ask the price)\n  AGAIN or G (repeat last command)\n  SCORE (happiness & progress) · SHARE (your week card — one emoji a night, copy & compare)\n  UNDO · RESTART   (the night autosaves itself)\n  PLAY AGAIN (once the week's up — another seven days on the soi)\n  Highlighted words are tappable: tap for the quick menu, RIGHT-CLICK (or press and hold)\n    for the full one — a person's ask-topics, and the actions a single tap shouldn't fire\n  QUIT / END / LOGOUT (sign off; your night is saved) · RESET (wipe the save — asks first)":
      "Gängige Befehle:\n  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)\n  N/S/E/W · IN/OUT · ENTER <place> · TRAVEL <bar> (Schnellsprung zu jeder Bar, die du gesehen hast)\n  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>\n  WAI [person] · SAY <thai phrase> [TO <person>]\n  WATCH TV · READ PAPER — die echten Schlagzeilen des Tages · OWL — der Nite-Owl-Newsletter · WEATHER · SCORES · LOTTERY\n  WATCH SUNSET (Blue Dog & Stinky Pinky, früher Abend — die Show an der Kreuzung)\n  WATCH SOI · BALCONY (dein Balkon oben, das Fenster des Queen Vic unten oder die stille Mitte der Soi — zuschauen, nicht mitmachen)\n  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in den Bierbars)\n  FLIRT/KISS/SPANK/FONDLE <lady> · BUY DRINK FOR <lady> · BUY BEER · BUY MAN DRINK\n  RING BELL (฿300, sofortige Beliebtheit) · TALK TO PATRON · BARFINE <lady>\n  BUY CONDOM (฿40 pro Packung, der 7-Eleven — ein Barfine verbraucht eines; ohne auf eigene Gefahr)\n  DIAGNOSE (wie schlimm steht es) · GET TESTED (kostenlose Klinik — beseitigt ein Barfine-Souvenir)\n  QUESTS · ACCEPT <quest> · ABANDON <quest>   (die Soi hat ihre eigenen Aufträge am Laufen)\n  EAT <food> · DRINK <thing> · BUY WATER / FOOD (Straßenkarren & der 7-Eleven)\n  WITHDRAW <amount> · CHECK BALANCE (der Straßen-Geldautomat — ฿300 pro Abhebung, ฿20.000 am Tag)\n  SLEEP (dein Zimmer, beendet die Nacht) · OPEN FRIDGE · TAKE WATER (zwei Gratisflaschen am Tag)\n  PHONE / EXAMINE PHONE (Akku, Nachrichten, Wetter, Schlagzeilen)\n  CONTACT <lady> (Nummern tauschen) · CONTACTS · MESSAGE <lady> · CHECK MESSAGES\n  WHO / BLACKBOOK (deine Ladys, sortiert danach, was sie für dich empfinden) · WHO AM I (wer du sein wolltest)\n  SEND <amount> TO <lady> (Banking-App)\n  FEED DOG (eine Freundschaft, die du nicht rückgängig machen kannst) · PET DOG · NAME DOG <name>\n  LIGHT ON / LIGHT OFF · CHARGE PHONE\n  TIME · MAP · WAIT UNTIL <hour> · TIP <lady> <amount> · PHOTO · CHEERS · TAO RAI (nach dem Preis fragen)\n  AGAIN oder G (letzten Befehl wiederholen)\n  SCORE (Zufriedenheit & Fortschritt) · SHARE (deine Wochenkarte — ein Emoji pro Nacht, kopieren & vergleichen)\n  UNDO · RESTART   (die Nacht speichert sich selbst)\n  PLAY AGAIN (wenn die Woche um ist — weitere sieben Tage auf der Soi)\n  Hervorgehobene W\u00f6rter sind antippbar: tippen f\u00fcr das Schnellmen\u00fc, RECHTSKLICK (oder gedr\u00fcckt halten)\n    f\u00fcr das vollst\u00e4ndige — die Themen einer Person und die Aktionen, die ein einzelner Tipp nicht ausl\u00f6sen sollte\n  QUIT / END / LOGOUT (abmelden; deine Nacht ist gespeichert) · RESET (Speicherstand löschen — fragt vorher)",

    // ── soi6 night-loop ambience — de-sweep batch 1 (tools/soak.mjs --lang de,
    // 2026-08-05): the highest-frequency FIXED strings from the gap report.
    // Templated lines (interpolated ฿/amounts) need _fmt refactors — next batch. ──
    "The saleng packs up its trestles and putters on down the soi, the girls waving after it.":
      "Der Saleng packt seine Klappböcke zusammen und knattert die Soi hinunter, die Mädchen winken ihm hinterher.",
    "You only know the way to bars and hotels you've already found. (Bare TRAVEL lists them.)":
      "Du kennst den Weg nur zu Bars und Hotels, die du schon gefunden hast. (TRAVEL ohne Ziel listet sie auf.)",
    "The far stools run to the usual weathered faces — here before you, here after you, and not looking for anyone new tonight.":
      "Auf den hinteren Hockern die üblichen verwitterten Gesichter — schon vor dir da, nach dir noch da, und heute Nacht nicht auf der Suche nach jemand Neuem.",
    "Down the far end, a knot of regulars are welded to the bar, deep in an argument only they follow — part of the furniture, not the cast.":
      "Ganz hinten ist eine Traube Stammgäste mit dem Tresen verschweißt, tief in einem Wortgefecht, dem nur sie folgen — Teil des Mobiliars, nicht der Besetzung.",
    "Nothing on the books, and nobody's asked you for anything. Talk to people — the jobs in this town come out of conversations, not noticeboards.":
      "Nichts im Auftragsbuch, und niemand hat dich um etwas gebeten. Sprich mit den Leuten — die Jobs in dieser Stadt entstehen aus Gesprächen, nicht an schwarzen Brettern.",
    "Nothing on the books. What's open:":
      "Nichts im Auftragsbuch. Was offensteht:",
    "You dance between the stools. A hostess joins you instantly and without inquiry — enthusiasm is the house style — and for eight bars of luk thung you are the floor show.":
      "Du tanzt zwischen den Hockern. Sofort und ungefragt tanzt eine Hostess mit — Begeisterung ist der Hausstil — und für acht Takte Luk Thung bist du die Showeinlage.",
    "{{Ice}} settling in buckets, Connect Four counters clacking, and the chorus of “HELLO WELCOME” as somebody richer walks past outside.":
      "Eis sackt in den Kübeln nach, Vier-gewinnt-Steine klackern, und der Chor aus „HELLO WELCOME“ setzt ein, sobald draußen jemand Reicheres vorbeigeht.",
    "Perfume, cold Chang, cigarette ghosts in the upholstery, and the bleach that fights a nightly holding action against all three. Every bar in town, one smell.":
      "Parfüm, kaltes Chang, Zigarettengeister im Polster und der Chlorreiniger, der Nacht für Nacht ein Hinhaltegefecht gegen alle drei führt. Jede Bar der Stadt, ein und derselbe Geruch.",
    "The sky over the gulf goes grey, then pink, and even Pattaya blinks. 04:00. The last bars stack their stools; the baht buses carry home the wreckage; somewhere a rooster who fears nothing starts up. You drift back and let the day take you.":
      "Der Himmel über dem Golf wird grau, dann rosa, und selbst Pattaya blinzelt. 04:00. Die letzten Bars stapeln ihre Hocker; die Baht-Busse tragen die Trümmer der Nacht heim; irgendwo legt ein Hahn los, der nichts und niemanden fürchtet. Du lässt dich zurücksinken und überlässt dich dem Tag.",
    "“ชนแก้ว!” (chon gaew — glasses meet!) Every glass within reach angles toward yours: the girls', the regular's, possibly the mamasan's calculator. Nobody needs a reason. Not needing a reason is the entire custom.":
      "“ชนแก้ว!” (chon gaew — die Gläser treffen sich!) Jedes Glas in Reichweite neigt sich deinem zu: die Gläser der Mädchen, das Glas des Stammgasts, womöglich der Taschenrechner der Mamasan. Niemand braucht einen Grund. Keinen Grund zu brauchen ist der ganze Brauch.",
    "A lifer holds down the corner stool, holding forth at the room in general; the kind of fixture you nod past, never actually meet.":
      "Ein Urgestein hält den Eckhocker besetzt und doziert in den Raum hinein; die Sorte Inventar, der man zunickt und die man nie wirklich kennenlernt.",
    "The 7-Eleven fridge hums somewhere, but this calls for a bar stool.":
      "Irgendwo brummt ein 7-Eleven-Kühlschrank, aber dafür braucht's einen Barhocker.",
    "You give it a verse. Three hostesses join the chorus without asking what the song is. It has never once mattered.":
      "Du gibst eine Strophe zum Besten. Drei Hostessen steigen in den Refrain ein, ohne zu fragen, welches Lied es ist. Das hat noch nie eine Rolle gespielt.",
    "A peddler drifts in off the street with a display board of watches, a fan of sunglasses, and — produced from an inner pocket with a meaningful eyebrow — certain 'vitamins'. He stations himself at your elbow, patient as weather.":
      "Ein fliegender Händler treibt von der Straße herein, mit einem Brett voller Uhren, einem Fächer Sonnenbrillen und — aus der Innentasche gezogen, mit einer bedeutungsvollen Augenbraue dazu — gewissen „Vitaminen“. Er bezieht Stellung an deinem Ellbogen, geduldig wie das Wetter.",
    "A slow head-shake. He re-shoulders the display board — watches swinging like wind chimes — and moves down the bar to a man who has already made eye contact, the fatal error.":
      "Ein langsames Kopfschütteln. Er schultert das Brett wieder — die Uhren schaukeln wie Windspiele — und zieht den Tresen entlang zu einem Mann, der schon Blickkontakt aufgenommen hat: der fatale Fehler.",
    "A soi dog with one clipped ear falls in beside you for half a block, matching your pace with off-duty professionalism, then peels away at the soi mouth with one look back. (FEED DOG, if you'd like that to go differently.)":
      "Ein Soi-Hund mit gestutztem Ohr schließt für einen halben Block zu dir auf, hält mit dienstfreier Professionalität dein Tempo und schert mit einem letzten Blick zurück an der Soi-Mündung aus. (FEED DOG, wenn das anders ausgehen soll.)",
    "You concede with what dignity remains.":
      "Du gibst auf, mit dem bisschen Würde, das dir noch bleibt.",
    "You toast the night air. The night, in fairness, has earned it.":
      "Du stößt mit der Nachtluft an. Fairerweise hat sie es sich verdient.",
    "You sing to the street. Somewhere down the soi a karaoke bar answers, worse. Honour is satisfied.":
      "Du singst der Straße etwas vor. Irgendwo weiter unten an der Soi antwortet eine Karaoke-Bar, schlechter. Der Ehre ist Genüge getan.",
    "You dance alone on the pavement. A passing baht bus honks the beat, which is generous, because you weren't keeping one.":
      "Du tanzt allein auf dem Gehweg. Ein vorbeifahrender Baht-Bus hupt den Takt, was großzügig ist, denn du hast keinen gehalten.",
    "Soi 6's shutters are down, the frontages black, the sound systems finally and mercifully off. Whatever you were after here shut at midnight — the beer bars and the Queen Vic are what's still awake now.":
      "Die Rollläden der Soi 6 sind unten, die Fronten schwarz, die Anlagen endlich und gnädig aus. Was auch immer du hier wolltest, hat um Mitternacht geschlossen — wach sind jetzt noch die Bierbars und die Queen Vic.",
    "Perfume applied with intent, cheap floor cleaner, and hotel soap from rooms rented by the hour.":
      "Absichtsvoll aufgetragenes Parfüm, billiger Bodenreiniger und Hotelseife aus stundenweise vermieteten Zimmern.",
    "No water for sale here. 7-Elevens, bars, and the street carts all have it.":
      "Hier gibt es kein Wasser zu kaufen. 7-Elevens, Bars und Straßenkarren haben alle welches.",
    "At the far end a regular reigns{g} — the sort of scene you watch from across the bar, not one you walk into.":
      "Am hinteren Ende regiert ein Stammgast{g} — die Sorte Szene, die man von der anderen Seite der Bar aus betrachtet, nicht die, in die man sich einmischt.",
    "A ซาเล้ง hung with sequinned sandals and platform heels rolls up outside; the girls are on it before it stops.":
      "Ein ซาเล้ง, behängt mit Pailletten-Sandalen und Plateauschuhen, rollt draußen heran; die Mädchen sind drauf, bevor er hält.",
    "A ซาเล้ง putters up outside, burner going and pork smoke ahead of it; the girls drift to the window.":
      "Ein ซาเล้ง knattert draußen heran, der Brenner an, der Grillrauch voraus; die Mädchen ziehen ans Fenster.",
    "You thumb the room's TV on. A wall-mounted flatscreen, the hotel's welcome channel giving up to actual programming: the news, sound low, Thai subtitles racing.":
      "Du schaltest den Fernseher im Zimmer an. Ein Flachbildschirm an der Wand, der Begrüßungskanal des Hotels weicht echtem Programm: die Nachrichten, leise, die thailändischen Untertitel im Renntempo.",
    "Tonight it's muay thai highlights and the lottery draw. You watch two rounds, content, and let the rest wash over you.":
      "Heute Abend: Muay-Thai-Highlights und die Lottoziehung. Du schaust zwei Runden zu, zufrieden, und lässt den Rest über dich hinwegrauschen.",
    "You call it. The air-con rattles its lullaby, the neon leaks through the curtains, and Pattaya carries on politely without you.":
      "Du machst Schluss für heute. Die Klimaanlage rattert ihr Schlaflied, das Neon sickert durch die Vorhänge, und Pattaya macht höflich ohne dich weiter.",

    // ── de-sweep batch 2 (2026-08-07): the TEMPLATED lines. Each of these was
    // an interpolated string baked with live ฿ amounts, so `de` would have
    // needed one entry per amount — the gap report showed 7 variants of the
    // beer refusal alone. The _say sites were refactored to _fmt first, so one
    // entry per template now covers every amount. {slots} must survive
    // translation verbatim; German word order may move them, which is fine. ──
    "A big bottle is ฿{p} here. You have ฿{m}. The cashier's calculator stays in the drawer.":
      "Eine große Flasche kostet hier ฿{p}. Du hast ฿{m}. Der Taschenrechner der Kassiererin bleibt in der Schublade.",
    "Lady drinks are ฿{p}. You have ฿{m}. The math is not on your side.":
      "Lady Drinks kosten ฿{p}. Du hast ฿{m}. Die Rechnung geht nicht auf.",
    "฿{p} for a cold bottle, and you don't have it. Grim.":
      "฿{p} für eine kalte Flasche, und das hast du nicht. Bitter.",
    "The toastie is ฿{p}. You have ฿{m}. The doorbell jingles in sympathy.":
      "Der Toastie kostet ฿{p}. Du hast ฿{m}. Die Türglocke bimmelt mitfühlend.",
    "You let the night idle past — ice melting, songs turning over, the street rearranging itself. {t}.":
      "Du lässt die Nacht im Leerlauf vorbeiziehen — schmelzendes Eis, wechselnde Lieder, eine sich neu ordnende Straße. {t}.",
    "฿{p} for the {item} — you have ฿{m}. The driver clocks it without embarrassing you and putters on.":
      "฿{p} für {item} — du hast ฿{m}. Der Fahrer bemerkt es, ohne dich bloßzustellen, und knattert weiter.",
    "The bell rope dangles there, daring you. A ring is a round for the house — ฿{p} — and you have ฿{m}. Ringing a bell you can't pay for is how farang end up in the khlong.":
      "Das Glockenseil baumelt da und fordert dich heraus. Einmal läuten heißt eine Runde für alle — ฿{p} — und du hast ฿{m}. Eine Glocke zu läuten, die man nicht bezahlen kann, ist der sicherste Weg für einen Farang, im Khlong zu landen.",
    "The night clerk takes in the situation and adds ฿{r} to the book without a word — ฿{d} on it now. His kindness is the heaviest thing you'll carry today.":
      "Der Nachtportier überblickt die Lage und schreibt wortlos ฿{r} an — ฿{d} stehen jetzt drauf. Seine Freundlichkeit ist das Schwerste, was du heute trägst.",
    "── DAY {d}{home} — you surface mid-afternoon, and by the time you're human again the sun is sliding into the gulf and the neon is waking up ──":
      "── TAG {d}{home} — du tauchst am Nachmittag auf, und bis du wieder ein Mensch bist, sinkt die Sonne schon in den Golf und das Neon wacht auf ──",
    // (" of 7" is already keyed further up — one entry serves both the TIME
    // readout and the day header.)
    " · PATTAYA, HOME": " · PATTAYA, ZUHAUSE",

    // The {item} slot in the saleng-cart refusal is filled with _L(item), so the
    // bare cart nouns need entries of their own — without them a German sentence
    // renders "฿150 für sandals". Caught by the batch-2 review: the kind of seam
    // only a second pair of eyes looking at the RUNTIME will notice. Thai dish
    // names stay Thai, same rule as Chang/farang/som tam elsewhere.
    "noodles": "Nudeln",
    "sandals": "Sandalen",
    "heels": "High Heels",
    "lingerie": "Dessous",
    "fruit": "Obst",

    // ── de-sweep batch 3 (2026-08-07) ────────────────────────────────────────
    // Top of the remaining gap. Note what four of these are: the phone-Tan beat
    // shipped THIS DAY — 144 leak occurrences from one feature, which is the
    // whole argument for translating at authoring time rather than in sweeps.
    // keyed on the RAW message body, not the composed "📱 Tan: “…”" line —
    // _readMessages calls _L on msg.text and adds the wrapper itself.
    "I am not your mamasan, my friend. When I want something from you, I will ask for it — and it will not be money. 🙂":
      "Ich bin nicht deine Mamasan, mein Freund. Wenn ich etwas von dir will, bitte ich dich darum — und Geld wird es nicht sein. 🙂",
    "You text Tan — nothing much, the kind of message you'd send a mate.":
      "Du schreibst Tan — nichts Besonderes, die Sorte Nachricht, die man einem Kumpel schickt.",
    "\"A ride? My friend — the whole week is one soi. You can fall home from anywhere on it. Enjoy the falling.\" Click.":
      "„Eine Fahrt? Mein Freund — die ganze Woche ist eine einzige Soi. Da fällst du von überall nach Hause. Genieß das Fallen.“ Klick.",
    "555 you bored. go make some sanuk, my friend — that is what the town is FOR.":
      "555 dir ist langweilig. geh Sanuk machen, mein Freund — genau DAFÜR ist die Stadt da.",
    "฿{a} crosses town in one green blink — and comes straight back in another, before you've pocketed the phone.":
      "฿{a} fliegen in einem grünen Blinken durch die Stadt — und im nächsten schon wieder zurück, bevor du das Handy eingesteckt hast.",
    "฿{a} crosses town in one green blink. (฿{m} left.)":
      "฿{a} fliegen in einem grünen Blinken durch die Stadt. (฿{m} übrig.)",

    // the saleng cart, arriving and being swarmed
    "A ซาเล้ง strung with lingerie idles up outside, and every girl in the place turns her head at once.":
      "Ein ซาเล้ง, behängt mit Dessous, tuckert draußen heran, und jedes Mädchen im Laden dreht auf einen Schlag den Kopf.",
    "A som-tam ซาเล้ง drifts to a stop outside, pestle already going, and the girls call their orders over your head.":
      "Ein Som-Tam-ซาเล้ง rollt draußen aus, der Stößel schon am Stampfen, und die Mädchen rufen ihre Bestellungen über deinen Kopf hinweg.",
    "Two of them have turned the saleng into a fashion show, striking increasingly theatrical poses at the punters with each new slip. Nobody at the bar is pretending to watch the football any more.":
      "Zwei von ihnen haben den Saleng in eine Modenschau verwandelt und posieren mit jedem neuen Hemdchen theatralischer für die Kundschaft. Niemand am Tresen tut noch so, als würde er Fußball schauen.",
    "The girls swarm the lingerie line in a giggling scrum, holding lace up against each other and turning to pose at the rail — the customers are the mirror they're using. One drapes a slip across your shoulder, delighted, before her friend snatches it back.":
      "Die Mädchen fallen kichernd über die Dessous-Leine her, halten sich gegenseitig Spitze an und drehen sich zum Tresen, um zu posieren — die Gäste sind der Spiegel, den sie benutzen. Eine legt dir begeistert ein Hemdchen über die Schulter, bevor ihre Freundin es sich wieder schnappt.",
    "A bra is held up, then held up against you for scale, to shrieks of laughter; the girls model the better pieces down the bar with the straight-faced confidence of women who know exactly what the room is worth.":
      "Ein BH wird hochgehalten, dann zum Größenvergleich an dich gehalten, unter kreischendem Gelächter; die Mädchen führen die besseren Stücke den Tresen entlang vor, mit der ungerührten Sicherheit von Frauen, die genau wissen, was das Publikum wert ist.",
    "You already have one. The driver shrugs and keeps the change for your indecision. Just kidding — ฿{p} back.":
      "Du hast schon welche. Der Fahrer zuckt mit den Schultern und behält das Wechselgeld als Gebühr für deine Unentschlossenheit. Kleiner Scherz — ฿{p} zurück.",

    // journal / black book, when there is nothing in them yet
    "The wallet's yours and the opening's behind you — out here there are no wrong answers, only better nights.":
      "Die Brieftasche gehört wieder dir und der Anfang liegt hinter dir — hier draußen gibt es keine falschen Antworten, nur bessere Nächte.",
    "(QUESTS lists jobs, WHO your black book, MAP the lay of the land.)":
      "(QUESTS listet die Jobs, WHO dein schwarzes Buch, MAP die Gegend.)",
    "The black book's empty. You earn names the honest way out here — CONTACT a lady in her own bar once she likes you, and she goes in the book.":
      "Das schwarze Buch ist leer. Namen verdient man sich hier draußen auf die ehrliche Tour — CONTACT eine Lady in ihrer eigenen Bar, sobald sie dich mag, und sie landet im Buch.",

    // ── de-sweep batch 4 (2026-08-07) — the templating batch ─────────────────
    // 20 _say sites were refactored to _fmt FIRST (batch 2's lesson): these lines
    // carry a NAME or an AMOUNT, so without a slot German needed one entry per
    // character and per price. "Terry laughs it off" and "Doyle laughs it off"
    // were two separate leaks of one sentence.

    // the flirt rebuffs — a name, and a no
    "{n} blinks, then snorts. \"Ha — no. Not that way, mate. Buy me a beer if you like, but keep the eyelashes to yourself.\" More baffled than bothered.":
      "{n} blinzelt, dann schnaubt. „Ha — nein. Nicht so, Kumpel. Gib mir ein Bier aus, wenn du magst, aber den Augenaufschlag behalt für dich.“ Mehr verdutzt als verärgert.",
    "A beat of confusion, then {n} laughs it off and shifts his stool an inch away. \"Steady on, fella. Wrong tree entirely.\" Good-natured, but that's a no.":
      "Ein Moment Verwirrung, dann tut {n} es mit einem Lachen ab und rückt seinen Hocker ein Stück beiseite. „Ganz ruhig, Kollege. Da bist du bei mir komplett an der falschen Adresse.“ Gutmütig, aber ein Nein.",
    "{n} laughs, not unkindly. \"Aww, tilac — not my type. I like the ladies, same-same you.\" A pat on the cheek, and she's moved on.":
      "{n} lacht, nicht unfreundlich. „Aww, Tilac — nicht mein Typ. Ich mag die Ladys, same-same wie du.“ Ein Klaps auf die Wange, und sie ist weitergezogen.",
    "\"Handsome, but—\" {n} tips her head at a girl across the bar and grins. \"—wrong team, na. I bat the other way.\" No offence in it, plenty of amusement.":
      "„Hübsch, aber—“ {n} deutet mit dem Kinn auf ein Mädchen auf der anderen Seite der Bar und grinst. „—falsches Team, na. Ich spiele für die andere Mannschaft.“ Nicht böse gemeint, und sichtlich amüsiert.",
    "{n}'s face shuts like a door. \"No. Do that again and we have a problem.\" The temperature in your corner of the bar drops several degrees.":
      "{n} macht das Gesicht zu wie eine Tür. „Nein. Mach das noch mal und wir haben ein Problem.“ Die Temperatur in deiner Ecke der Bar fällt um mehrere Grad.",
    "\"You WHAT?\" {n} sets the glass down very deliberately. That is not a look you flirt through. Leave it.":
      "„Bitte WAS?“ {n} stellt das Glas sehr bedächtig ab. Durch diesen Blick flirtet man nicht hindurch. Lass es.",

    // Connect 4 / Jackpot / pool / darts — the opponent's name, and the stake
    "{n} lights up, fetches the frame, and drops a counter on the way over. She sorts the colours carefully and counts hers twice. Down the bar, one of the older girls watches with something between fondness and pity.":
      "{n} strahlt, holt das Spielbrett und lässt auf dem Weg einen Stein fallen. Sie sortiert die Farben sorgfältig und zählt ihre zweimal nach. Weiter hinten am Tresen schaut eine von den älteren Mädels zu, mit etwas zwischen Zuneigung und Mitleid.",
    "{n} racks the frame with the easy speed of a woman who plays every shift, and gives you first drop like it costs her nothing. It doesn't.":
      "{n} baut das Spiel auf, flott und beiläufig wie eine, die jede Schicht spielt, und überlässt dir den ersten Zug, als koste es sie nichts. Tut es auch nicht.",
    "฿{s} on the table.": "฿{s} liegen auf dem Tisch.",
    "{n} slides over the battered Jackpot box — nine tiles up, two dice, the felt worn smooth by ten thousand losing farang. Flip the dice, or flip their sum. Lowest score wins; shut the box and it's JACKPOT.":
      "{n} schiebt dir den ramponierten Jackpot-Kasten hin — neun Klappen oben, zwei Würfel, der Filz blank gescheuert von zehntausend verlierenden Farang. Klapp die Würfelzahlen um, oder ihre Summe. Wer am wenigsten stehen lässt, gewinnt; alle Klappen zu, und es ist JACKPOT.",
    "฿{s} rides on it.": "฿{s} stehen auf dem Spiel.",
    "{n} catches the look on your face and grins. \"First time, na? Okay — I show you. Slow-slow. You do every flip yourself tonight; you learn faster that way.\" She rolls for you.":
      "{n} liest dir den Blick vom Gesicht ab und grinst. „Erstes Mal, na? Okay — ich zeig dir. Langsam-langsam. Heute Abend klappst du jede Klappe selbst um; so lernst du schneller.“ Sie würfelt für dich.",
    "{n} leans in. \"Two ways here, na. Flip the two dice numbers — or flip their sum, one tile. Never both. Whatever's still standing at the end is your score, and low wins. You choose.\"":
      "{n} beugt sich vor. „Zwei Wege, na. Klapp die beiden Würfelzahlen um — oder ihre Summe, eine Klappe. Nie beides. Was am Ende noch steht, ist dein Ergebnis, und wenig gewinnt. Du entscheidest.“",
    "{n} taps the felt. \"This roll, only one way to play it — so play it. Type the flip. The box doesn't move itself… not until you know it does.\"":
      "{n} tippt auf den Filz. „Dieser Wurf, nur ein Weg — also spiel ihn. Tipp den Flip ein. Der Kasten bewegt sich nicht von allein… jedenfalls nicht, bevor du weißt, dass er es doch tut.“",
    "You rack. {n} breaks — dry. Seven balls each, then the black.":
      "Du baust auf. {n} breakt — nichts fällt. Sieben Kugeln für jeden, dann die Schwarze.",
    "฿{s} under the corner cushion.": "฿{s} liegen unter der Eckbande.",
    "Chalk up: 501 each, straight off, check out on a double. {n} throws for the bull to start and lands it like breathing.":
      "Angeschrieben: 501 für jeden, Straight In, Double Out. {n} bullt aus und trifft, als wäre es Atmen.",
    "฿{s} on the shelf under the board.": "฿{s} liegen auf der Ablage unter der Scheibe.",

    // shops, the app, and walking there
    "A pack is ฿{p}. You have ฿{m}. The cashier slides it back with a knowing look.":
      "Eine Packung kostet ฿{p}. Du hast ฿{m}. An der Kasse schiebt man sie dir mit wissendem Blick zurück.",
    "The app regrets to inform you: ฿{m} available, ฿{a} dreamed of.":
      "Die App bedauert mitteilen zu müssen: ฿{m} verfügbar, ฿{a} erträumt.",
    "You point yourself at {v} and let your feet do the remembering — one turn of soi, neon, and shortcuts.":
      "Du peilst {v} an und überlässt das Erinnern deinen Füßen — eine Ecke Soi, Neon und Abkürzungen.",
    "You point yourself at {v} and let your feet do the remembering — {n} turns of soi, neon, and shortcuts.":
      "Du peilst {v} an und überlässt das Erinnern deinen Füßen — {n} Ecken Soi, Neon und Abkürzungen.",

    // the quest journal frames. The name and desc are _L'd separately (they are
    // world.js data), so a frame translated alone still reads half-German until
    // batch 5 does the quest text — deliberate: the frames are what repeat.
    "On the books: {name} — {desc}{where}": "Im Auftragsbuch: {name} — {desc}{where}",
    "{giver} has a job going — “{name}”. Take it on with ACCEPT {id}.":
      "{giver} hätte da einen Auftrag — „{name}“. Nimm ihn an mit ACCEPT {id}.",
    "✦ {who} has a job for you: “{name}” — {desc}":
      "✦ {who} hat einen Auftrag für dich: „{name}“ — {desc}",
    "✦ Quest accepted: {name}": "✦ Auftrag angenommen: {name}",
    "✦ Abandoned: {name}. The soi forgives; the giver may offer it again.":
      "✦ Aufgegeben: {name}. Die Soi verzeiht; wer ihn vergeben hat, bietet ihn vielleicht wieder an.",
    // "▶ {name} — {desc}{where}" and "▶ {name}" need no entry: they are
    // punctuation and slots only, identical in both languages.
    "✦ On offer: {name} (ACCEPT {id})": "✦ Zu vergeben: {name} (ACCEPT {id})",

    // fixed lines riding along
    // these two land in the {n} slot of the pool/darts intros — a DESCRIPTION, not
    // a name, so without _L at the assignment German prose wrapped an English
    // clause. Same defect class the {item} slot had: invisible in the string
    // pairs, obvious the moment you run a German game.
    "a leathery expat off the rail who hasn't missed since 1997":
      // NB: no trailing relative clause. The host sentence's verb resumes right
      // after this slot, and German would need a closing comma the template
      // cannot supply ("…hat stößt an"). A mid-sentence slot filler must be a
      // self-contained noun phrase.
      "ein ledriger, seit 1997 unfehlbarer Dauergast vom Tresen",
    "a leathery expat with his own darts in a belt case":
      "ein ledriger Auswanderer mit eigenen Darts im Gürteletui",
    "You're broke, so this one's for sanuk — and her professional pride.":
      "Du bist pleite, also geht die hier auf Sanuk — und auf ihren Berufsstolz.",
    // ── de-sweep batch 5 (2026-08-07) — the quest journal ────────────────────
    // Quest names and descs are world.js DATA, now routed through _L by the
    // batch-4 render templating. Rules that bind every entry below:
    //   · the (ALL CAPS IN PARENS) hints are literal typed commands AND the
    //     decorate() tap targets — they stay English, capitalised, in parens.
    //   · character and venue names stay as-is (they are tap targets too).
    //   · no {{…}} braces needed on the league desc: the English suppressed a
    //     collision with the host NPC "Win", and German "Gewinne" doesn't
    //     contain that word.

    "The White Dish Offer": "Das Angebot von White Dish",
    "White Dish want to buy Bert's bar out from under its dying owner. Get him the real picture — the history (ASK TERRY ABOUT WHITE DISH), the inside view (ASK KESINEE at the Kitten Corner ABOUT WHITE DISH), and the pitch (ASK GAVIN at the Golden Dragon ABOUT THE OFFER) — then tell Bert (ASK BERT ABOUT THE OFFER).":
      "White Dish will Berts Bar dem sterbenden Besitzer unter dem Hintern wegkaufen. Verschaff ihm das ganze Bild — die Vorgeschichte (ASK TERRY ABOUT WHITE DISH), die Sicht von innen (ASK KESINEE at the Kitten Corner ABOUT WHITE DISH) und das Angebot selbst (ASK GAVIN at the Golden Dragon ABOUT THE OFFER) — und dann sag es Bert (ASK BERT ABOUT THE OFFER).",

    "Gavin's Errand": "Gavins Botengang",
    "Gavin would like a quiet favour: have a word with Bert about selling the Stinky to White Dish. \"Friend to friend. Soften him up. Everyone wins, and White Dish looks after its friends.\" (Take it to Bert — ASK BERT ABOUT SELLING — or don't. No one's forcing you.)":
      "Gavin hätte gern einen stillen Gefallen: Red mal mit Bert darüber, das Stinky an White Dish zu verkaufen. „Von Freund zu Freund. Mach ihn weich. Alle gewinnen, und White Dish kümmert sich um seine Freunde.“ (Sprich mit Bert darüber — ASK BERT ABOUT SELLING — oder lass es. Dich zwingt niemand.)",

    "The President's Table": "Der Tisch des Präsidenten",
    "Get eyes on the Orchid Room's good table — the back room off the Pink Lotus — and see who really holds it, then tell Doyle (ASK DOYLE ABOUT THE TABLE).":
      "Wirf einen Blick auf den guten Tisch im Orchid Room — dem Hinterzimmer vom Pink Lotus — und sieh nach, wer dort wirklich das Sagen hat, dann sag es Doyle (ASK DOYLE ABOUT THE TABLE).",

    "The Silent Partner": "Der stille Teilhaber",
    "Wayne's about to sign as the farang face of a bar he'll never really own. Once you've seen how White Dish works, set him straight (ASK WAYNE ABOUT THE PARTNER).":
      "Wayne steht kurz davor, als Farang-Gesicht einer Bar zu unterschreiben, die ihm nie wirklich gehören wird. Wenn du erst mal gesehen hast, wie White Dish arbeitet, sag ihm die Wahrheit (ASK WAYNE ABOUT THE PARTNER).",

    "The Old Days": "Die alten Zeiten",
    "Buy Roy's time and let the old soi come back to him — the bars before the brands, and the ghosts still propping the place up (ASK ROY ABOUT THE OLD DAYS).":
      "Kauf dir Roys Zeit und lass die alte Soi zu ihm zurückkommen — die Bars vor den Marken, und die Geister, die den Laden immer noch stützen (ASK ROY ABOUT THE OLD DAYS).",

    "Easy Come": "Wie gewonnen",
    "Macca's redundancy is going out faster than he'll admit. Give him the honest maths (ASK MACCA ABOUT THE PAYOUT).":
      "Maccas Abfindung geht schneller raus, als er zugeben will. Rechne es ihm ehrlich vor (ASK MACCA ABOUT THE PAYOUT).",

    "A Quiet One": "Ein Stiller",
    "Pete is sitting on something heavy. Earn his trust and hear it (ASK PETE ABOUT THE NAME).":
      "Pete trägt etwas Schweres mit sich herum. Verdien dir sein Vertrauen und hör es dir an (ASK PETE ABOUT THE NAME).",

    "Her Brother": "Ihr Bruder",
    "Rob's ex-wife's brother rides with the club in the Orchid's back room. Carry his word if you ever get in there (ASK ROB ABOUT THE BROTHER).":
      "Der Bruder von Robs Ex-Frau fährt für den Club im Hinterzimmer des Orchid. Nimm seine Botschaft mit, falls du je da reinkommst (ASK ROB ABOUT THE BROTHER).",

    "The Wrong Photo": "Das falsche Foto",
    "Somewhere in Barry's eleven years of trophy snaps is one he shouldn't have. Get a proper look once you know what you're looking at (ASK BARRY ABOUT THE PHOTO).":
      "Irgendwo in den Trophäenfotos aus Barrys elf Jahren ist eins, das er nicht haben sollte. Sieh es dir genau an, sobald du weißt, was du da vor dir hast (ASK BARRY ABOUT THE PHOTO).",

    "The Sister-Bar Run": "Die Tour zur Schwesterbar",
    "Carry Candy's gift bottle of Sang Som to Bee (GIVE SANG SOM TO BEE).":
      "Bring Candys Geschenkflasche Sang Som zu Bee (GIVE SANG SOM TO BEE).",

    "King of the Killer Table": "König des Killer-Tisches",
    "{{Win}} a killer pool league night — every third night, ฿100 entry (PLAY KILLER).":
      "Gewinne einen Killer-Pool-Ligaabend — jede dritte Nacht, ฿100 Startgeld (PLAY KILLER).",

    "Bee's First Investor": "Bees erster Investor",
    "Bee wants her expansion fund taken seriously: get her number (CONTACT BEE) and wire ฿100 through the banking app (SEND 100 TO BEE).":
      "Bee will, dass ihr Expansionsfonds ernst genommen wird: Besorg dir ihre Nummer (CONTACT BEE) und überweis ฿100 über die Banking-App (SEND 100 TO BEE).",

    "The Man Out of Time": "Der Mann, der aus der Zeit gefallen ist",
    "Sit with Glam a while and let him tell you about the tour (ASK GLAM ABOUT MUSIC).":
      "Setz dich eine Weile zu Glam und lass ihn von der Tour erzählen (ASK GLAM ABOUT MUSIC).",

    "The Foreman's Keys": "Die Schlüssel des Poliers",
    "Carry her late husband's site keys to the bar he built, for the shrine (GIVE KEYS TO DIAMOND).":
      "Bring die Baustellenschlüssel ihres verstorbenen Mannes für den Schrein in die Bar, die er gebaut hat (GIVE KEYS TO DIAMOND).",

    "The Quiet Money": "Das stille Geld",
    "Nobody asks the Samson brothers where the seed money came from. Ask the man out of time instead (ASK GLAM ABOUT HIS SONS).":
      "Niemand fragt die Samson-Brüder, woher das Startkapital kam. Frag stattdessen den Mann, der aus der Zeit gefallen ist (ASK GLAM ABOUT HIS SONS).",

    "Family": "Familie",
    "Wimon thinks you have earned the whole of it, and gives her blessing to ask (ASK DIAMOND ABOUT GLAM).":
      "Wimon findet, du hast dir die ganze Geschichte verdient, und gibt ihren Segen zu fragen (ASK DIAMOND ABOUT GLAM).",

    "Candy's Competition Recce": "Candys Feindaufklärung",
    "Walk the new drinking strips with your eyes open — Myth Night's container rows, Tree Town's far lane, and the quiet middle stretch of Soi 6.":
      "Lauf die neuen Kneipenmeilen mit offenen Augen ab — die Containerreihen von Myth Night, die hintere Gasse von Tree Town und das ruhige Mittelstück der Soi 6.",

    "A Scout for Petch": "Ein Scout für Petch",
    "Carry the revue flyer to Diamond — she danced with half of Alcazar in her day, and her scout friend owes her a favour (GIVE FLYER TO DIAMOND).":
      "Bring den Revue-Flyer zu Diamond — sie hat seinerzeit mit dem halben Alcazar getanzt, und ein befreundeter Scout schuldet ihr einen Gefallen (GIVE FLYER TO DIAMOND).",

    "The Collection Run": "Die Inkasso-Tour",
    "฿500 to jog a deadbeat's memory — no rough stuff, just find Fergie in his maze and ASK him ABOUT THE DEBT.":
      "฿500 dafür, dem Gedächtnis eines Zahlungsmuffels auf die Sprünge zu helfen — nichts Grobes, find einfach Fergie in seinem Labyrinth und ASK him ABOUT THE DEBT.",

    "The Shamrock Dog": "Der Shamrock-Hund",
    "Bert swears your dog is the old Shamrock bar dog, out on Soi Khao Talo. Walk him out to the dead pub and let him see it.":
      "Bert schwört, dein Hund sei der alte Barhund vom Shamrock, draußen an der Soi Khao Talo. Lauf mit ihm raus zum toten Pub und lass ihn es sehen.",

    // Act One's own journal block — the founding adventure isn't a QUESTS entry,
    // so its header and milestone labels need their own keys. The labels are
    // _L'd individually because the line is composed with a ✓/· marker.
    "▶ The Last Baht Bus — find your wallet, get back to room 412 in Naklua.":
      "▶ The Last Baht Bus — finde deine Brieftasche, zurück auf Zimmer 412 in Naklua.",
    "Worked out where you were last night": "Herausgefunden, wo du letzte Nacht warst",
    "Learned who lifted the wallet": "Erfahren, wer die Brieftasche mitgehen ließ",
    "Traced the wallet to Madam Oy": "Die Brieftasche bis zu Madam Oy zurückverfolgt",
    "Learned the office door trick": "Den Trick mit der Bürotür gelernt",
    "Clue: the number 71": "Hinweis: die Zahl 71",
    "Clue: the lucky 9": "Hinweis: die Glückszahl 9",
    "WALLET RECOVERED": "BRIEFTASCHE WIEDER DA",

    // _questWhere — the live "where" clause shared by HINT and the QUESTS journal.
    // Both article variants map to one German line: German takes no article
    // before a proper venue name, so there is nothing to guess at.
    " {who} is at {v}, over in {r}.": " {who} ist bei {v}, drüben in {r}.",
    " That's {v}, in {r}.": " Das ist {v}, drüben in {r}.",
    " That's the {v}, in {r}.": " Das ist {v}, drüben in {r}.",

    // ── de-sweep batch 6 (2026-08-07) — vacation mode ────────────────────────
    // First batch aimed at the FULL game rather than the Soi 6 challenge. Room
    // descs need no code change: _describeRoom does _say(r.desc), so _L already
    // sees the whole string — they only ever needed entries.

    // the single biggest leak in the game, by a factor of four: the MAP header.
    // (The ASCII map below it is monospace art and place names — left alone.)
    "The bar-mat map of greater Pattaya, not to scale, like all bar maps:":
      "Die Bierdeckelkarte vom Großraum Pattaya, nicht maßstabsgetreu, wie alle Bierdeckelkarten:",

    // the dark, the dog, and the clock — the three things that kill you
    "It is pitch dark. If your phone has any battery left, its flashlight would help. Sois this dark tend to have soi dogs in them.":
      "Es ist stockdunkel. Falls dein Handy noch Saft hat, wäre jetzt der Moment für die Taschenlampe. In so dunklen Sois treiben sich gern Soi-Hunde herum.",
    // dog prose is authored against "Sai Krok" and re-lettered by _dogN at
    // render time — which now localises FIRST, so this key stays the authored
    // form and the German keeps the placeholder name for the same treatment.
    "A growl starts somewhere in the dark ahead — and Sai Krok answers it, once, low, without breaking stride. Silence. The dark has done the maths.":
      "Irgendwo vorn im Dunkeln hebt ein Knurren an — und Sai Krok antwortet, einmal, tief, ohne aus dem Tritt zu geraten. Stille. Das Dunkel hat nachgerechnet.",
    // templated first (the fare is BUS_FARE) — otherwise de needs one entry per price
    "Somewhere a songthaew driver checks his watch and turns the truck toward the depot. The last baht bus makes its final run at two — call it half an hour off. Get to a main road for the ฿{fare} ride home, or the small hours belong to the piwins and their prices. This is the hour the whole night has been counting down to.":
      "Irgendwo schaut ein Songthaew-Fahrer auf die Uhr und lenkt den Pick-up Richtung Depot. Der letzte Baht-Bus fährt um zwei — sagen wir, in einer halben Stunde. Ab auf eine Hauptstraße, wenn du die ฿{fare}-Fahrt heim willst, sonst gehören die frühen Morgenstunden den Piwins und ihren Preisen. Das ist die Stunde, auf die die ganze Nacht heruntergezählt hat.",
    // the RAW message body — _readMessages composes the "📱 Sender: “…”" wrapper
    // and calls _L on msg.text. (Same trap as batch 3; the dead-key test caught
    // it both times.) The donation URL is the game's one fourth-wall line — it
    // stays verbatim.
    "Word on the soi says you've adopted one of Pattaya's own — khob khun, khun jai dee! 🐕 The rest of them still need jabs, food, and a vet who works for smiles. Pay it forward for the dogs still on the street: https://www.soidog.org/content/make-donation 🙏":
      "Auf der Soi heißt es, du hast einem von Pattayas Straßenhunden ein Zuhause gegeben — khob khun, khun jai dee! 🐕 Die anderen brauchen weiterhin Impfungen, Futter und einen Tierarzt, der für ein Lächeln arbeitet. Gib das Glück weiter — an die Hunde, die noch auf der Straße sind: https://www.soidog.org/content/make-donation 🙏",

    // Act One, before the wallet is back
    "Your bank card was in the wallet — and the wallet is the whole problem. No card, no cash. Solve that first.":
      "Deine Bankkarte war in der Brieftasche — und die Brieftasche ist ja das ganze Problem. Keine Karte, kein Bargeld. Erst mal das lösen.",
    "Your card's in your wallet, wherever that's got to. Nothing to check until it's back.":
      "Deine Karte steckt in deiner Brieftasche, wo immer die abgeblieben ist. Nichts zu prüfen, solange sie weg ist.",

    // ── the Soi 7 / Jomtien pocket (rooms) ──────────────────────────────────
    "The beach end of Soi 7, off the south end of the beach road: a mellow strip of open-front beer bars strung with fairy lights, a couple of massage shops, and the easy Jomtien pace — older expats, cold beer, nobody in a hurry. The soi runs east, deeper inland toward Second Road; the sea breeze follows you a little way in.":
      "Das Strandende der Soi 7, am Südende der Strandstraße: eine gemächliche Reihe offener Bierbars mit Lichterketten, ein paar Massageläden und das entspannte Jomtien-Tempo — ältere Expats, kaltes Bier, niemand in Eile. Die Soi führt nach Osten, tiefer landeinwärts Richtung Second Road; die Meeresbrise begleitet dich noch ein Stück hinein.",
    "The south end of the beach road, where it meets the mouth of Soi 7. A 7-Eleven glows on the corner, its air-con bleeding into the street; Soi 7's beer bars and massage shops run inland to the east, the bus stop is back to the north, and the sand and the sea lie west.":
      "Das Südende der Strandstraße, wo sie auf die Mündung der Soi 7 trifft. An der Ecke leuchtet ein 7-Eleven, seine Klimaanlage blutet auf die Straße; die Bierbars und Massageläden der Soi 7 ziehen sich nach Osten landeinwärts, die Bushaltestelle liegt ein Stück zurück im Norden, und Sand und Meer liegen im Westen.",
    "Where Soi 7 finally gives out onto the sand: a scrap of hard-packed beach, a couple of upturned boats, and Auntie Nok's drinks cart parked in the lee of a sea almond tree, cooler humming. The beach opens north; Soi 7 runs back inland to the east.":
      "Wo die Soi 7 endlich auf den Sand ausläuft: ein Flecken festgetretener Strand, ein paar umgedrehte Boote und Tante Noks Getränkewagen im Windschatten eines Seemandelbaums, die Kühlbox brummt. Der Strand öffnet sich nach Norden; die Soi 7 läuft nach Osten landeinwärts zurück.",
    "The middle of Soi 7, where the beer bars thin to guesthouses and a lone som tam cart doing quiet business. CHEAP CHARLIE'S has the corner unit — the Jomtien branch, and the newer regulars swear by it. The soi runs west toward the sea and the beach road, and east toward the Second Road roar.":
      "Die Mitte der Soi 7, wo die Bierbars Gästehäusern weichen und ein einzelner Som-Tam-Wagen in aller Ruhe verkauft. CHEAP CHARLIE'S hat die Ecke — die Filiale in Jomtien, und die neueren Stammgäste schwören darauf. Die Soi führt nach Westen zum Meer und zur Strandstraße, nach Osten zum Getöse der Second Road.",
    "The far end of Soi 7, where it spills onto Second Road by a 7-Eleven. A couple more beer bars and a massage shop see out the strip. On the south side, set back behind a fence and a flagpole, squats the grey bulk of the Chonburi Immigration Office — dark and locked at this hour, a place farang only ever visit in daylight and never fondly.":
      "Das andere Ende der Soi 7, wo sie neben einem 7-Eleven auf die Second Road mündet. Noch ein paar Bierbars und ein Massageladen beschließen die Reihe. Auf der Südseite, zurückgesetzt hinter Zaun und Fahnenmast, hockt der graue Klotz des Chonburi Immigration Office — dunkel und verschlossen um diese Zeit, ein Ort, den Farang nur bei Tageslicht aufsuchen und nie gern.",
    "A pink-lit oil shop halfway down Soi 7, girls on the step, the small sticker on the mirror, and the beach breeze doing its best to keep it wholesome. It fails, pleasantly.":
      "Ein rosa beleuchteter Ölmassage-Laden auf halber Höhe der Soi 7, Mädchen auf den Stufen davor, der kleine Aufkleber am Spiegel, und die Meeresbrise gibt ihr Bestes, die Sache anständig zu halten. Sie scheitert, angenehm.",
    "The soi's namesake: a friendly open-front beer bar with sevens painted on everything, a Connect 4 frame, and a knot of regulars who've been coming since before the fairy lights. The girls know every one of them by their drink.":
      "Die Bar, die so heißt wie die Soi: eine freundliche offene Bierbar mit aufgemalten Siebenen auf allem, einem Vier-gewinnt-Brett und einer Traube Stammgäste, die schon vor den Lichterketten hier waren. Die Mädchen erkennen jeden von ihnen am Getränk.",
    "Stools that catch the wind straight off the beach, a battered guitar somebody strums between customers, and the most relaxed hostesses in Jomtien. Nobody hard-sells here; the beer is cold and the evening goes where it goes.":
      "Hocker, die den Wind direkt vom Strand abbekommen, eine ramponierte Gitarre, die jemand zwischen zwei Bestellungen anschlägt, und die entspanntesten Hostessen in Jomtien. Hier bedrängt dich niemand; das Bier ist kalt und der Abend geht, wohin er geht.",
    "The north end of Jomtien Beach: raked sand, stacked loungers under folded umbrellas, the surf hissing to the west and the beach road's bus stop lit up to the east. The sand runs south back toward the Soi 7 end and north to where Dongtan's quieter stretch begins.":
      "Das Nordende von Jomtien Beach: geharkter Sand, gestapelte Liegen unter zusammengeklappten Schirmen, die Brandung zischt im Westen und im Osten leuchtet die Bushaltestelle der Strandstraße. Nach Süden läuft der Sand zurück zum Ende der Soi 7, nach Norden dorthin, wo Dongtans ruhigerer Abschnitt beginnt.",

    // SMELL / LISTEN on the beach
    "Waves, a beach dog arguing with a kite, the flat slap of sandals on the promenade.":
      "Wellen, ein Strandhund im Streit mit einem Drachen, das trockene Klatschen von Sandalen auf der Promenade.",
    "Salt, yesterday's sunscreen, grilled squid from a cart you can't see. Underneath it all, the sea — patient.":
      "Salz, die Sonnencreme von gestern, gegrillter Tintenfisch von einem Wagen, den du nicht sehen kannst. Unter allem das Meer — geduldig.",

    // ── the Dolphin roundabout (on the Act One walk home, so it gets German
    //    at birth rather than joining docs/i18n-de-gaps.md) ──────────────────
    "The top of the town, where four roads give up arguing and go round in a circle instead. The dolphins are in the middle of it — a concrete pod of them mid-leap, floodlit, permanently about to enter water that is two hundred metres west. Terminal 21 sits on the corner pretending to be an airport, its departure boards lit all night for a terminal nobody flies from. Beach Road runs south along the sea, Second Road south into town, Naklua Road north-east toward the quieter money, and the songthaews go round and round because this is where the loop turns.":
      "Das obere Ende der Stadt, wo vier Straßen aufhören zu streiten und stattdessen im Kreis fahren. Die Delfine stehen mittendrin — eine Betonschule mitten im Sprung, angestrahlt, für immer kurz davor, in Wasser einzutauchen, das zweihundert Meter weiter westlich liegt. An der Ecke gibt Terminal 21 den Flughafen, die Abflugtafeln leuchten die ganze Nacht für ein Terminal, von dem keiner fliegt. Die Beach Road läuft nach Süden am Meer entlang, die Second Road nach Süden in die Stadt, die Naklua Road nach Nordosten Richtung des ruhigeren Geldes, und die Songthaews drehen ihre Runden, weil hier die Schleife wendet.",
    "Round go the songthaews. The dolphins remain mid-leap.":
      "Die Songthaews drehen ihre Runden. Die Delfine bleiben im Sprung.",
    "Terminal 21's boards announce destinations to a car park.":
      "Die Tafeln von Terminal 21 verkünden Reiseziele an einen Parkplatz.",
    "A bus full of tourists takes the roundabout twice, deliberating.":
      "Ein Bus voller Touristen nimmt den Kreisel zweimal, unschlüssig.",
    "Four roads' worth of traffic, folding into each other and out again.":
      "Der Verkehr von vier Straßen, ineinander gefaltet und wieder auseinander.",

    // ── de-sweep batch 7 (2026-08-09): the ACT ONE path ─────────────────────
    // The walk every player takes, and the last part of the game still in
    // English. Ranked by how often a five-seed act1 soak actually hits them.
    // The five templated ones came from converting `${}` interpolation to _fmt
    // first — with a literal amount baked in, every price minted its own
    // catalog key and the line could never be translated at all.

    // the hint whisper + the fail screen — the opening's own voice
    "The soi whispers — you're {r}/{t} of the way home. ":
      "Die Soi flüstert — du bist {r}/{t} des Wegs nach Hause. ",
    "THE NIGHT BEAT YOU HOME. You got {r} of {t} steps down the road back to room 412{w}.":
      "DIE NACHT WAR SCHNELLER ALS DU. Du hast {r} von {t} Schritten auf dem Weg zurück zu Zimmer 412 geschafft{w}.",
    " — wallet in hand, just not the hours left to spend it":
      " — die Brieftasche in der Hand, nur nicht mehr die Stunden, sie auszugeben",
    "★ Furthest yet: {r}/{t}. The next run starts cold — but you know the way a little better now.":
      "★ Bisher am weitesten: {r}/{t}. Der nächste Versuch fängt bei null an — aber du kennst den Weg jetzt ein bisschen besser.",
    "(Your best is still {b}/{t}. Beat it.)":
      "(Dein Bestwert steht weiter bei {b}/{t}. Schlag ihn.)",
    "No hints your first night, tilac — the town is yours to read. But it remembers a face: miss home by dawn and you start over, and the second run… the soi begins to whisper.":
      "Keine Tipps in deiner ersten Nacht, tilac — die Stadt darfst du selbst lesen. Aber sie merkt sich Gesichter: schaffst du es bis zum Morgengrauen nicht nach Hause, fängst du von vorn an — und beim zweiten Lauf… fängt die Soi an zu flüstern.",

    // ── the ambient furniture the opening walks past all night ──────────────
    // Commands and <placeholders> stay English verbatim — the _HELP_SOI6
    // convention above. Only the prose around them turns.
    "(TRAVEL <place>. Walking pace — no shortcuts through the clock.)":
      "(TRAVEL <place>. Zu Fuß — die Uhr lässt sich nicht abkürzen.)",
    "A motosai stand is here. (MOTOSAI TO <place>)":
      "Hier steht ein Motosai-Stand. (MOTOSAI TO <place>)",
    "A baht bus can be caught here. (RIDE BUS TO <place>)":
      "Hier hält der Baht-Bus. (RIDE BUS TO <place>)",
    "An ATM stands against the wall. (WITHDRAW <amount> · CHECK BALANCE)":
      "An der Wand steht ein Geldautomat. (WITHDRAW <amount> · CHECK BALANCE)",
    "A 7-Eleven glows across the way (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM).":
      "Gegenüber leuchtet ein 7-Eleven (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM).",
    "A Connect 4 frame and a Jackpot dice box sit within reach (PLAY …).":
      "Ein Vier-gewinnt-Brett und ein Jackpot-Würfelbecher stehen in Reichweite (PLAY …).",
    // NB "Play what? PLAY CONNECT 4 · …" and "(-1 สนุก — you're parched)" are
    // COMPOSED at runtime (_playOptions builds the first, the happy-delta
    // template the second), so they are not catalog keys and cannot be
    // translated until they go through _fmt. Both are high-hit. Left for the
    // next batch, which should start by templating them.

    // the body, which nags constantly and in English
    "(Your throat is sandpaper. Drink something — ideally water.)":
      "(Deine Kehle ist Schmirgelpapier. Trink was — am besten Wasser.)",
    "(Dizzy. The neon is doing things it shouldn't. WATER.)":
      "(Schwindelig. Das Neon macht Sachen, die es nicht sollte. WATER.)",
    "Nothing to drink out here but the humidity. Find a bar stool, or a 7-Eleven fridge (BUY WATER).":
      "Hier draußen gibt es nichts zu trinken außer der Luftfeuchtigkeit. Such dir einen Barhocker oder einen 7-Eleven-Kühlschrank (BUY WATER).",
    "Nothing edible on you. The street sells everything.":
      "Nichts Essbares dabei. Die Straße verkauft alles.",
    "No messages. The phone judges you gently.":
      "Keine Nachrichten. Das Handy verurteilt dich sanft.",

    // the two massage shops the opening actually passes
    "Reclining chairs, tiger balm, a price list on the wall. (MASSAGE — foot, Thai, or oil, the one honest kind in town.)":
      "Liegesessel, Tigerbalsam, eine Preisliste an der Wand. (MASSAGE — Fuß, Thai oder Öl, die eine ehrliche Sorte in dieser Stadt.)",
    "Curtained cubicles, a wall of mirrors, a small NO SEX sticker nobody quite believes. (MASSAGE — then SPECIAL, up to you.)":
      "Kabinen mit Vorhängen, eine Spiegelwand, ein kleiner NO SEX-Aufkleber, den niemand so recht glaubt. (MASSAGE — dann SPECIAL, wie du magst.)",

    // dawn, and the reset
    "Dawn wipes the slate. Same beach, same day two, same empty pockets — go again.":
      "Der Morgen wischt die Tafel sauber. Gleicher Strand, gleicher zweiter Tag, gleiche leere Taschen — noch mal.",

    // the soi dog — the opening's one real teeth-and-claws threat
    "Something shifts in the dark nearby. A low growl. You are likely to be bitten by a soi dog.":
      "Irgendwas bewegt sich in der Dunkelheit. Ein tiefes Knurren. Du wirst hier wahrscheinlich von einem Soi-Hund gebissen.",

    // the massage refusals — templated, so one entry covers every price
    "A proper hour is ฿{p}; you have ฿{m}. {n} waves you to come back with the fare — she isn't going anywhere.":
      "Eine richtige Stunde kostet ฿{p}; du hast ฿{m}. {n} winkt dich weg — komm wieder, wenn du das Geld hast; sie geht nirgendwohin.",
    "The oil massage is ฿{p}; you have ฿{m}. {n} pouts, forgives you instantly.":
      "Die Ölmassage kostet ฿{p}; du hast ฿{m}. {n} schmollt und verzeiht dir augenblicklich.",

    // the rooms the opening walks through
    "A breezy open front on the beach road, ceiling fans turning, a rack of aloe gel by the till for the day's crop of sunburned farang. Foot chairs face the sea, the ladies wear a tidy uniform, and the only oil on offer goes on your shoulders. After a day frying on Dongtan, this is the kindest ฿300 in Jomtien.":
      "Eine luftige offene Front an der Strandstraße, Deckenventilatoren drehen sich, ein Ständer mit Aloe-Gel an der Kasse für die verbrannten Farang des Tages. Die Fußpflegestühle zeigen aufs Meer, die Damen tragen eine ordentliche Uniform, und das einzige Öl, das es hier gibt, kommt auf deine Schultern. Nach einem Tag Braten am Dongtan sind das die freundlichsten ฿300 in Jomtien.",
    "The cold blast of air-con and the doorbell jingle of civilisation. Shelves of toasties, Mama noodles, and {{phone}} accessories. There's a power outlet by the window.":
      "Der kalte Schwall Klimaanlage und das Türglöckchen der Zivilisation. Regale mit Toasties, Mama-Nudeln und {{phone}}-Zubehör. Am Fenster gibt es eine Steckdose.",
    "The bus-stop bench sits empty — the last songthaew of the night is long gone.":
      "Die Bank an der Haltestelle ist leer — der letzte Songthaew der Nacht ist längst weg.",

    // the sand, walked up and down all night for bottles
    "The last of the light has gone out of the sea. The loungers stay folded.":
      "Das letzte Licht ist aus dem Meer verschwunden. Die Liegen bleiben zusammengeklappt.",
    "The cats have not moved. The big one checks you, decides, and looks back at the water.":
      "Die Katzen haben sich nicht bewegt. Die Große mustert dich, entscheidet sich, und schaut wieder aufs Wasser.",
    "A dog trots the tide line with somewhere to be, and does not look up.":
      "Ein Hund trabt die Flutlinie entlang, hat ein Ziel, und schaut nicht hoch.",
    "Sand still warm through your soles. It will not be for much longer.":
      "Der Sand ist durch die Sohlen noch warm. Nicht mehr lange.",
    "Somebody's flip-flops sit neatly by a lounger, ownership unclear, hours old.":
      "Jemandes Flip-Flops stehen ordentlich neben einer Liege, Besitzverhältnisse unklar, seit Stunden.",

    // dawn, and the food you live on

    "Last call — the mamasan taps her watch: about half an hour to closing. This place shuts at midnight, so if you mean to take a lady home tonight, now is the moment to BARFINE. After the shutters come down it's the street.":
      "Letzte Runde — die Mamasan tippt auf ihre Uhr: noch etwa eine halbe Stunde bis Feierabend. Der Laden macht um Mitternacht zu, wenn du also heute Nacht eine Lady mitnehmen willst, ist jetzt der Moment für BARFINE. Wenn die Rollläden unten sind, bleibt nur noch die Straße.",
  },
};
