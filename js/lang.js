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
    "฿100,000 for the week sits in the bank. ฿1,000 is in your pocket — the rest comes out of the ATM on the street (฿300 a pull, ฿20,000 a day) when you need it.":
      "฿100.000 für die Woche liegen auf der Bank. ฿1.000 hast du in der Tasche — der Rest kommt aus dem Geldautomaten auf der Straße (฿300 pro Abhebung, ฿20.000 am Tag), wenn du ihn brauchst.",
    "Goal: สบายสบาย. Get happy. Max out the week. ★":
      "Ziel: สบายสบาย. Werd glücklich. Hol das Maximum aus der Woche. ★",
    "(HELP lists commands. Your night is DOWN the stairs — the pub first, then out into the soi.)":
      "(HELP zeigt die Befehle. Dein Abend geht die Treppe DOWN — erst der Pub, dann raus auf die Soi.)",

    "a Pattaya misadventure · Soi Sanuk universe":
      "ein Pattaya-Schlamassel · Soi-Sanuk-Universum",
    "Day two of your week in Pattaya, and it starts like this: face-down on Jomtien beach, sunset bleeding into the sea, your head pounding like a bass bin outside Neon Paradise A-Go-Go. Day one went well, is the thing. Too well.":
      "Tag zwei deiner Woche in Pattaya, und er beginnt so: mit dem Gesicht nach unten am Strand von Jomtien, der Sonnenuntergang blutet ins Meer, dein Kopf dröhnt wie eine Bassbox vor dem Neon Paradise A-Go-Go. Tag eins lief gut, das ist die Sache. Zu gut.",
    "Your wallet is GONE. Your phone reads 13% battery. Your hotel is in Naklua — the whole town away. The baht bus is ฿15 a head.":
      "Deine Brieftasche ist WEG. Dein Handy zeigt 13% Akku. Dein Hotel ist in Naklua — am anderen Ende der Stadt. Der Baht-Bus kostet ฿15 pro Kopf.",
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
    "buy water": "Wasser kaufen", "buy condom": "Kondom kaufen",
    "buy toastie": "Toastie kaufen", "buy food": "Essen kaufen",
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
    "Actual air conditioning. Actual wood panelling. A dartboard. The Queen Vic Inn anchors the quiet middle stretch of Soi 6 with the righteous calm of a man who has seen it all and ordered another pint — the one place on the soi that isn't shouting. Through the window, the soi performs — the show without the sweat (WATCH SOI). Terry holds down the corner stool with a beer and the settled air of a man who has watched it all twice. A staircase behind the bar leads UP to the guest rooms.":
      "Echte Klimaanlage. Echte Holzvertäfelung. Eine Dartscheibe. Das Queen Vic Inn verankert das ruhige Mittelstück der Soi 6 mit der gerechten Gelassenheit eines Mannes, der alles gesehen und noch ein Pint bestellt hat — der einzige Ort auf der Soi, der nicht schreit. Durchs Fenster führt die Soi ihr Stück auf — die Show ohne den Schweiß (WATCH SOI). Terry hält den Eckhocker mit einem Bier und der abgeklärten Ruhe eines Mannes, der alles zweimal gesehen hat. Eine Treppe hinter der Bar führt nach oben zu den Gästezimmern.",
    "The middle of Soi 6, where the wall of noise thins to something you can hear yourself think over. The hard-selling open fronts of the west end give way to a run of easygoing beer bars whose whole business is letting you sit and watch the parade rather than be dragged into it. The pullers here are lazier, or wiser — they leave the grabbing to the loud ends and pick up the men who wander through wanting a cold one and a ringside seat. THE SHADY LADY, FRONT ROW BAR, and THE VERANDAH line the quiet stretch, and the QUEEN VIC INN — real aircon, real wood, a dartboard — anchors it, the one place on the soi that isn't shouting. West, the racket starts up again; east, it's worse.":
      "Die Mitte der Soi 6, wo die Lärmwand auf etwas ausdünnt, bei dem du dich selbst denken hörst. Die aufdringlichen offenen Fronten des Westendes weichen einer Reihe entspannter Bierbars, deren ganzes Geschäft darin besteht, dich sitzen und die Parade beobachten zu lassen, statt dich hineinzuziehen. Die Schlepper hier sind fauler, oder klüger — sie überlassen das Grabschen den lauten Enden und sammeln die Männer ein, die durchspazieren und ein kühles Bier und einen Logenplatz wollen. THE SHADY LADY, FRONT ROW BAR und THE VERANDAH säumen das ruhige Stück, und das QUEEN VIC INN — echte Klimaanlage, echtes Holz, eine Dartscheibe — verankert es, der einzige Ort auf der Soi, der nicht schreit. Im Westen geht der Krach wieder los; im Osten ist es schlimmer.",
    "The west end of the soi, and it hits you the moment you step in — a wall of bars at volume, each trying to drown the next in bass and shouted Thai pop. No stages, no dark rooms: just open-air fronts at street level thrown wide to the pavement, and the ladies working them, spilling out in sequins and very little else to reel in anything that walks. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" You are grabbed by the wrist. You are grabbed by the other wrist. Someone significantly shorter than you attempts to climb onto your back. A couple of the girls have armed themselves with foam pool noodles and swat anyone who dares walk past without stopping. PINK LOTUS LOUNGE, GOLDEN DRAGON BAR, and SUNSET DREAMS LOUNGE are the main combatants here. East, the soi opens into a quieter middle stretch before the racket picks up again at the far end.":
      "Das Westende der Soi, und es trifft dich in dem Moment, in dem du hineintrittst — eine Wand aus Bars auf voller Lautstärke, jede versucht die nächste in Bass und gebrülltem Thai-Pop zu ertränken. Keine Bühnen, keine dunklen Zimmer: nur Freiluft-Fronten auf Straßenniveau, weit zum Gehweg hin aufgerissen, und die Damen, die sie bespielen, quellen in Pailletten und sehr wenig sonst heraus, um alles hereinzuangeln, was vorbeiläuft. \"HANDSOME MAN!\" \"Hey! WHERE YOU GO!\" Du wirst am Handgelenk gepackt. Du wirst am anderen Handgelenk gepackt. Jemand deutlich Kleineres als du versucht, dir auf den Rücken zu klettern. Ein paar der Mädchen haben sich mit Schaumstoff-Poolnudeln bewaffnet und hauen jeden, der es wagt, ohne anzuhalten vorbeizugehen. PINK LOTUS LOUNGE, GOLDEN DRAGON BAR und SUNSET DREAMS LOUNGE sind hier die Hauptkämpfer. Im Osten öffnet sich die Soi in ein ruhigeres Mittelstück, bevor der Krach am anderen Ende wieder losgeht.",
    "The east end of the soi, past the quieter middle, where the bars run on toward Second Road and the volume comes roaring back. KITTEN CORNER, CHERRY POP BAR, and RUBY KISS BAR trade wrist-grabs down this stretch — same open ground-floor fronts, same three-colour neon, same staircases behind the bar the menu doesn't mention, and the same foam pool noodles that find your ribs if you try to walk on by.":
      "Das Ostende der Soi, hinter der ruhigeren Mitte, wo die Bars weiter zur Second Road hin laufen und die Lautstärke brüllend zurückkommt. KITTEN CORNER, CHERRY POP BAR und RUBY KISS BAR tauschen auf diesem Stück Handgelenk-Griffe aus — dieselben offenen Erdgeschossfronten, dasselbe dreifarbige Neon, dieselben Treppen hinter der Bar, die die Karte nicht erwähnt, und dieselben Schaumstoff-Poolnudeln, die deine Rippen finden, wenn du versuchst vorbeizugehen.",

    // ══ TAITCH — Mercedes (gold_rush) ════════════════════════════════════════
    // A Taitch lady: 5 years in Munich, so she meets a German punter in the German
    // that once made her small — now on HER terms. NARRATION → clean German; HER
    // SPEECH → Taitch (dropped endings, no articles, Thai syntax + German vocab,
    // her dry wit intact). Thai particles (na, tilac, mai pen rai) stay. Only her
    // lines are catalogued, so every other NPC still falls back to English speech.
    "A little older than the Gold Rush's other girls and a great deal less nervous — she moves like someone who has already seen the worst a room can do to a person. Her English is good, with a flat European edge the soi doesn't usually carry.":
      "Ein bisschen älter als die anderen Mädchen im Gold Rush und ein gutes Stück weniger nervös — sie bewegt sich wie jemand, der das Schlimmste, das ein Raum einem Menschen antun kann, schon gesehen hat. Ihr Deutsch ist gut, mit einer flachen europäischen Kante, die die Soi sonst nicht trägt.",

    "\"Welcome to the Gold Rush.\" A small, real smile. \"The gold is paint — Nong will tell you, she cannot help herself. Sit. I am Mercedes. Yes, like the car. I had one in the driveway in Munich and never once the keys. Now I keep the name and skip the car.\"":
      "\"Willkommen im Gold Rush.\" Ein kleines, echtes Lächeln. \"Gold ist Farbe — Nong wird dir sagen, sie kann nicht anders. Setz. Ich bin Mercedes. Ja, wie Auto. Ich hab einen gehabt in Einfahrt in München, und nie einmal Schlüssel. Jetzt ich behalt Name und lass Auto weg.\"",
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

    "\"Nong?\" She glances at the trembling new girl with something almost maternal. \"First week. Scared of the door, scared of Mamasan, scared of the paint. I was her, fifteen years ago, a go-go on Soi 6.\" A softer smile. \"Somebody should tell her the worst thing that happen is you go all the way to Munich and come back. Not so bad, in the end. I keep an eye on her.\"":
      "\"Nong?\" Sie schaut zum zitternden neuen Mädchen mit etwas fast Mütterlichem. \"Erste Woche. Angst vor Tür, Angst vor Mamasan, Angst vor Farbe. Ich war sie, vor fünfzehn Jahr, Go-go auf Soi 6.\" Ein weicheres Lächeln. \"Jemand soll ihr sag: schlimmste, was passier, ist du geh ganz bis München und komm zurück. Nicht so schlimm, am Ende. Ich pass auf sie auf.\"",
    "\"Nong is me, fifteen years ago. I keep an eye on her.\"":
      "\"Nong ist ich, vor fünfzehn Jahr. Ich pass auf sie auf.\"",

    "\"You keep coming back to the Gold Rush for ME — the paint is not that charming, we both know it.\" For once Mercedes lets the dry line land soft. \"After Munich I made myself one promise: no more man I have to manage. And here is you — needing no managing, buying the paint-bar girl her drink like it is Vienna. Don't make me like you, farang. I am badly out of practice.\"":
      "\"Du komm immer zurück zum Gold Rush für MICH — Farbe ist nicht so charmant, wir wissen beide.\" Ausnahmsweise lässt Mercedes die trockene Zeile weich landen. \"Nach München ich hab mir ein Versprech gemacht: kein Mann mehr, den ich manag muss. Und hier bist du — brauch kein Managen, kaufst dem Farb-Bar-Mädchen ihr Drink wie es Wien wär. Mach nicht, dass ich dich mag, Farang. Ich bin schlecht aus Übung.\"",
    "\"Don't make me like you, farang. I'm badly out of practice.\"":
      "\"Mach nicht, dass ich dich mag, Farang. Ich bin schlecht aus Übung.\"",

    "\"Sit — the good stool, I saved it.\" Mercedes slides your drink over without asking; she knows the order now. \"You are the only one in here who asks me a question and then waits for the answer. It is a low bar, I know. Munich was lower.\"":
      "\"Setz — guter Hocker, ich hab gespart.\" Mercedes schiebt dir dein Drink rüber, ohne zu frag; sie kennt die Bestellung jetzt. \"Du bist einzige hier, der mir Frage stellt und dann wart auf Antwort. Ist niedrige Latte, ich weiß. München war niedriger.\"",
    "\"You ask a question and wait for the answer. Low bar. Munich was lower.\"":
      "\"Du stell Frage und wart auf Antwort. Niedrige Latte. München war niedriger.\"",
  },
};
