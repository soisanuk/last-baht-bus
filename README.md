# The Last Baht Bus

A Zork-style adventure-turned-sandbox set in the neon streets of Pattaya —
part of the [Soi Sanuk](https://soisanuk.github.io/) universe.

You wake face-down on Jomtien beach at sunset. Wallet: gone. Phone: 13%.
Your hotel is in Naklua, a long way north. The baht bus is ฿15 a head.
You have ฿0.

That's day two of your week-long holiday (day one is how you ended up on the
beach), and it's only **Act One**. Solve it — the wallet, the gossip chain,
the safe, the ride home — and the room safe opens: ฿3,000 of emergency cash
and the rest of the vacation to spend it in. The goal is the oldest one on
the soi: **get happy**. A สนุก meter climbs (and dips) with everything you do
— bar games, barfines, bell rings, wai-ed mamasans, soi dogs, scams,
ejections — from เหนื่อย (running on empty) all the way to สบายสบาย.

Nights run 18:00–04:00 and your body keeps its own books: hunger, thirst,
drink, and injuries all pull at the meter, and red-lining any of them ends
the night early. When the week is up, choose: **fly home and come back**
(a fresh vacation, no lead-in adventure, chasing a new happiness high), or
**make the move** — expat mode, the true endless sandbox. (They say the
smart ones end up owning a bar. One day, so will you.)

## Play

Open `web/index.html` in a browser — no build step, no dependencies, works from `file://`.
Mobile gets tappable verb chips; desktop gets ↑/↓ command history.

## The game

- **~45 rooms** across Jomtien, Pratumnak Hill, Beach Road, Walking Street,
  Soi Buakhao, the LK Metro maze, Soi 6, the Darkside (Lake Mabprachan &
  Soi Khao Talo), and Naklua. All 15 canon bars are enterable.
- **Money**: scrounge your first ฿15, then work the soi economy — bottle
  deposits, favours for the piwin, lady-drink diplomacy (฿150, as ever).
- **Phone battery is your lamp**: 13% and falling. Dark sois have soi dogs.
  ("You are likely to be bitten by a soi dog.")
- **Transport**: baht buses (฿15, the driver quotes the fare in spoken Thai —
  pay attention and pay exactly), motosai (faster, pricier, and the piwin
  network remembers a favour), or your own feet in the dark.
- **Thai as puzzle**: read เปิด/ปิด signs, navigate the LK Metro maze by its
  painted Thai arrows, and crack a safe whose keypad speaks only ๐–๙.
  A `wai` and a `sawatdee` open more doors than money.
- **Two solutions**: burgle the safe behind the go-go, or earn the Mamasan's
  respect and be handed your wallet like a gentleman. The Act One score
  reflects style — and converts into a happiness head start.
- **The sandbox**: no key card, no Room 412 (it's in the wallet) — but once
  Act One is done, Pattaya stays open. Chase สบายสบาย (happiness 100): the
  meter moves with wins and losses across every system in the game, and
  hitting the top is a celebration, not a credits roll.
- **Barfines** (PG-13, as ever): earn her favor first — this is Pattaya, not
  a vending machine. Beer bars ฿400, go-gos ฿1,000, and the rest of that
  night is nobody's business but the soi's (+10 สนุก). Soi 6 (฿700) has
  "upstairs", and the night carries on. Mamasans are not barfineable;
  cashiers only after the bell has rewritten the rules. **The clock sets the
  rate**: before 21:00 you pay for her whole lost shift (×1.5); after
  midnight most beer bars quietly close the book — except for the popular
  girls, who stay on it at any hour. And if you're a true regular, late
  enough and liked enough, a girl may pay her **own** barfine. It's the
  highest compliment the soi pays; don't say no.
- **The daily damage**: on vacation, the lobby ATM surrenders ฿3,000 on your
  way out each evening. Spend it well — or don't, and see which feels better.
- **The boy in brown**: weave down a lit street five bottles deep and a
  police officer may take up station in your path. Pay the "fine" (฿500), wai
  and apologise in Thai (฿300), or argue (฿1,000, plus a friend). If a
  mamasan you've treated well is in line of sight, she may cross the soi at
  ramming speed and collect you like an aunt.
- **Survival, lightly**: EAT and BUY WATER at street carts, 7-Elevens, and
  Auntie Nok's — every district has a 7-Eleven pressing the iconic cheese
  toastie (฿35, eaten molten on the kerb like every farang before you). Too
  hungry, too thirsty, too drunk, or too banged-up and the night ends early —
  a burned vacation day and a sadder meter. SLEEP at the hotel ends a night
  on your own terms; 04:00 ends it regardless.
- **Bar life**: FLIRT, KISS, and worse — outcomes scale with how many lady
  drinks (฿150) you've bought her, from a slap through tolerance to genuine
  reciprocation. Roles matter: cashiers and mamasans allow light contact only.
  A drink for the mamasan warms the whole bar (and the house may pour one
  back); RING BELL (฿300) makes you everyone's favourite for a while — and has
  been known to soften the rules. TALK TO the resident PATRON for beer-soaked
  wisdom (mind whose girl you buy drinks for — bad form travels). Push your
  luck too far and security walks you out; in LK Metro the whole complex
  remembers. Try the same moves on the street at your own risk — though the
  Beach Road ladyboy famously appreciates a man who flirts back.
- **Bar games**: every beer bar keeps a Connect 4 frame (the hostess never
  loses), a Jackpot box (the Thai shut-the-box dice game — flip the dice or
  flip their sum, lowest score wins, shut all nine for JACKPOT), and the
  Midnight Sun and Daeng's Place have pool tables. Stakes in baht; broke
  players play for sanuk. `PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL`.
- **Street encounters**: the sois have their own weather — a two-handed
  pickpocket on Beach Road, a sentimental drunk bargirl, an angry Brit who's
  sixty per cent sure it was you, a piwin with a power bank, and a man with a
  briefcase full of hair tonic. Some want your baht; some hand you theirs;
  most depend on what you say next. Each strikes at most once a night, and the
  dice live in your save — UNDO won't reroll them.

Type `HELP` in-game for the command list. The night autosaves after every
command (localStorage); reopening the page offers to continue where you left
off, and `UNDO` rewinds your last command.

## World map

<details>
<summary>Open the map (mild spoilers — room layout and who's where)</summary>

🌑 dark rooms · 🔌 charging outlets · 🚏 bus stops · 🏍️ motosai stands
(any stand reaches any destination; the dotted edge is the only practical
way across Sukhumvit). Solid = walking, dashed = baht bus.

```mermaid
flowchart TD
  classDef dark fill:#1a1030,stroke:#666,color:#bbb
  classDef bar fill:#2a0a3f,stroke:#ff1493,color:#ffcce8
  classDef special fill:#3f2a0a,stroke:#ffe600,color:#ffe600

  subgraph JOMTIEN
    dongtan[🌑 Dongtan Beach]:::dark
    beach([⭐ START: Jomtien Beach])
    jbr[Jomtien Beach Rd<br>Auntie Nok 🥭]
    rompho[Soi Rompho]
    sev[7-Eleven 🔌]
    jbus[🚏 Bus Stop 🏍️]
    beach --- dongtan
    beach --- jbr
    dongtan --- jbr
    jbr --- rompho
    jbr --- sev
    jbr --- jbus
  end

  subgraph PRATUMNAK["PRATUMNAK HILL (dark walk)"]
    prat[🌑 Hill Road]:::dark
    buddha[🌑 Buddha Hill]:::dark
    prat --- buddha
  end

  subgraph BEACHRD["BEACH ROAD"]
    brs[🚏 Beach Rd South 🏍️<br>Bank the piwin]
    brc[🚏 Beach Rd Central]
    brn[🚏 Beach Rd North]
    prom[Promenade]
    brs --- brc --- brn
    brc --- prom
  end

  subgraph WS["WALKING STREET"]
    gate[WS Gate]
    wss[WS South]
    wsn[WS North]
    alley[🌑 Side-Alley]:::dark
    np[🍹 Neon Paradise<br>Noi]:::bar
    cm[🍹 Club Mirage<br>Aom]:::bar
    cp[🍹 Crystal Palace<br>Gift]:::bar
    pn[🍹 Paradise Nights<br>Ping]:::bar
    ms[🍺 Midnight Sun]:::bar
    gate --- wss --- wsn
    wss --- alley
    wss --- np
    wss --- cm
    wsn --- cp
    wsn --- pn
    wsn --- ms
  end

  subgraph BUAKHAO["SOI BUAKHAO"]
    bkn[Buakhao North]
    bkm[Buakhao Market]
    bks[Buakhao South 🏍️]
    cindy[🍺 Cindy Bar 🔌<br>Cindy 🌹 HUB]:::bar
    lt[🍺 Lucky Tiger<br>Lek]:::bar
    sr[🍺 Silk Rose]:::bar
    jg[🍺 Jasmine Garden<br>Fon]:::bar
    bkn --- bkm --- bks
    bkn --- lt
    bkm --- cindy
    bkm --- sr
    bks --- jg
  end

  subgraph LK["LK METRO (maze)"]
    lke[LK Entrance]
    m1[Inner Lane]
    m2[Cross Lane]
    m3[🌑 Back Lane]:::dark
    m4[🌑 Deep Corner]:::dark
    gr[🍺 Gold Rush<br>Nong]:::bar
    sl[🍺 Starlight<br>Pim 💋]:::bar
    rg[🍹 Rainbow Girls<br>Madam Oy 👑]:::bar
    office[🔒 Oy's Office]:::special
    lke --- m1
    m1 --- m2
    m1 --- m3
    m1 --- gr
    m2 --- m3
    m2 --- m4
    m2 --- sl
    m3 --- m4
    m4 --- rg
    rg --- office
  end

  subgraph SOI6["SOI 6"]
    s6[Soi 6 Street]
    pl[🍺 Pink Lotus<br>Joy]:::bar
    gd[🍺 Golden Dragon]:::bar
    sd[🍺 Sunset Dreams<br>Kwan]:::bar
    s6 --- pl
    s6 --- gd
    s6 --- sd
  end

  subgraph DARKSIDE["THE DARKSIDE (motosai only)"]
    sk[Sukhumvit Crossing 🏍️]
    kt[Soi Khao Talo]
    ktb[🍺 Daeng's Place 🔌<br>Daeng 🌶️]:::bar
    lake[Lake Mabprachan<br>Lake Gary 🎣]
    sk --- kt
    kt --- ktb
    kt --- lake
  end

  subgraph NAKLUA
    nak[🚏 Naklua Rd]
    hsoi[🌑 Hotel Soi]:::dark
    hotel([🏁 GOAL: Room 412])
    nak --- hsoi --- hotel
  end

  %% region connectors (walking)
  jbus --- prat
  prat --- gate
  gate --- brs
  gate --- wss
  brs --- bks
  brc --- bkn
  brn --- s6
  brn --- nak
  bks --- lke

  %% baht bus lines (฿15)
  jbus -. "bus ฿15" .- brs
  brs -. "bus ฿15" .- brc
  brc -. "bus ฿15" .- brn
  brn -. "bus ฿15" .- nak

  %% motosai
  bks -. "motosai ฿100" .-> kt
```

</details>

## Test

```sh
node --test
```

120 tests: Thai number composition, world/map integrity (every exit resolves,
all 15 canon bars present, the gossip chain's flags all connect), parser,
systems, street encounters, bar mini-games and social life, and a full
scripted playthrough from the beach to the happy ending — run headless via
`node:vm` against the same files the browser loads.

## Structure

```
web/
  index.html       terminal shell + all CSS (Soi Sanuk neon palette)
  js/              classic scripts sharing globals (no modules — file:// works)
    thai.js        Thai numbers/numerals, signs, phrase matching (pure)
    world.js       rooms, items, NPCs, dialogue, bus/motosai lines (pure data)
    games.js       bar mini-games: Connect 4, Jackpot dice, pool (pure logic)
    engine.js      parser, verb handlers, systems, endings (DOM-free at load)
    tts.js         th-TH Web Speech (Capacitor-ready)
    term.js        terminal DOM: scrollback, history, verb chips
    main.js        boot + save/load wiring (loaded last)
tests/js/          node:vm-loaded tests against the real sources
```

Engine and world are DOM-free at load time and print through an injected
callback, so the whole game runs headless in tests — same convention as the
Soi Sanuk trainer.

The terminal is a disposable frontend: all rules live in `engine.js` as
per-action functions (`_doGo`, `_doTalk`, …) that the text parser merely maps
words onto, and all world content is declarative data in `world.js`. A future
2D version would call the same actions directly and read the same data —
see `CLAUDE.md` for the conventions that keep that possible.
