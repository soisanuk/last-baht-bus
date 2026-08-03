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
  },
};
