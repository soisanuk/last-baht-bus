// THE DIGITAL BARSTOOL (Mario, 2026-10-22, from the canon essay — pattern only): four of the group's Soi 6 bars stream
// the floor, a drink bought through the link pays the stool's cut and buys a handle said to the lens, and at one bar
// (the Jade Lounge) the girls would rather work the camera than the stools while the big tipper is online.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const t = c => { out = []; doCommand(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const JADE = "jade_lounge";

beforeEach(() => {
  newGame(); out = [];
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
  G.money = 20000; G.bank = 50000; quiet();
});

// a night and an hour the big tipper is online and a girl at the camera has no day's reason of her own
const onCamera = () => {
  G.room = JADE;
  for (let d = 2; d < 80; d++) for (let h = 20; h < 70; h += 10) {
    G.day = d; G.nightTurn = h;
    const g = _cameraGirls().filter(x => _bfDayPeek(x) === "stream" && !_bfDayRefusal(x));
    if (_whaleOn() && g.length) { quiet(); return g[0]; }
  }
  throw new Error("no night with the tipper online");
};

const INDIE = ["dollhouse", "gold_rush", "honey_trap", "lucky_tiger", "the_bucket"];
test("the cameras: four of the group's rooms on Soi 6 (never the room behind the rope), five independent beer bars across the map, one pull", () => {
  const all = Object.keys(ROOMS).filter(id => ROOMS[id].stream);
  const streams = all.filter(id => _PLG_ROOMS.includes(id));
  assert.deepEqual(streams.sort(), ["golden_dragon", "jade_lounge", "peach_lounge", "pink_lotus"]);
  assert.deepEqual(all.filter(id => !_PLG_ROOMS.includes(id)).sort(), INDIE);
  assert.equal(new Set(INDIE.map(id => ROOMS[id].region)).size, INDIE.length, "one a district");
  for (const id of INDIE) {
    assert.equal(ROOMS[id].barType, "beer", id + " is a beer bar — no camera in a go-go, a gents' club or a lock-in");
    assert.match(ROOMS[id].desc, /\{\{phone\}\}|tablet/, id + " says so, and the bar's phone never taps as yours");
    G.room = id; assert.match(t("examine camera"), /WATCH STREAM/);
  }
  for (const id of streams) {
    assert.match(_licenceOf(id).name, /Pattaya Leisure/);
    assert.match(ROOMS[id].desc, /camera/, id + " says so in its own room");
    G.room = id; assert.match(t("examine camera"), /WATCH STREAM/, id + " has a close look at it");
  }
  assert.ok(!ROOMS.orchid_room.stream, "nobody films the room behind the rope");
  assert.deepEqual(streams.filter(id => _streamPull(id)), [JADE]);
});

test("every camera has its big tipper, by a pure hash — no dice: the Jade's most nights, the others' some nights, each his own man", () => {
  const r0 = G.rng, streams = Object.keys(ROOMS).filter(id => ROOMS[id].stream), nights = {};
  for (const r of streams) { nights[r] = 0;
    for (let d = 1; d <= 120; d++) { let on = false;
      for (let h = 0; h < 120; h += 5) { G.day = d; G.nightTurn = h; if (_whaleOn(r)) { on = true; assert.ok(h >= 20 && h < 70, "his hours"); } }
      if (on) nights[r]++; } }
  assert.equal(G.rng, r0, "reading his hours rolls nothing");
  for (const r of streams) if (r !== JADE) { assert.ok(nights[r] > 5, r + " has nights"); assert.ok(nights[r] < nights[JADE] / 2, r + " fewer than the Jade"); }
  assert.ok(!_whaleOn("seabreeze") && !_whaleOn("rainbow_girls"), "no camera, no tipper");
  assert.equal(_whaleOf(JADE).h, STREAM_WHALE);
  assert.ok(streams.filter(r => r !== JADE).every(r => _whaleOf(r).h !== STREAM_WHALE), "the others are other men");
});

test("a tipper night at another camera bar is the Jade's tension in that bar's words — its own man, its own device", () => {
  G.room = "honey_trap"; let g = null;
  for (let d = 2; d < 200 && !g; d++) for (let h = 20; h < 70 && !g; h += 10) { G.day = d; G.nightTurn = h; if (_cameraGirls().length) g = _cameraGirls()[0]; }
  assert.ok(g, "a night at the Honey Trap"); quiet();
  const w = _whaleOf("honey_trap"), n = NPCS[g].name.toLowerCase();
  out = []; _describeRoom(true); assert.match(said(), new RegExp(w.h)); assert.doesNotMatch(said(), /ring light|tripod/, "the Jade's furniture stays at the Jade");
  assert.match(t("talk to " + n), new RegExp(`TIP ${NPCS[g].name.toUpperCase()} ${STREAM_MATCH}`));
  assert.match(t(`ask ${n} about the tipper`), new RegExp(w.h + "|" + w.nick + "|" + w.from));
  assert.match(t("ring bell"), new RegExp(w.h + "|nobody goes"));
  assert.deepEqual(_cameraGirls(), []);
});

test("the camera can be a tablet: the Honey Trap and the Dollhouse stream from one, and say so", () => {
  for (const id of ["honey_trap", "dollhouse"]) {
    assert.equal(ROOMS[id].streamDevice, "tablet");
    assert.match(ROOMS[id].desc, /tablet/); assert.doesNotMatch(ROOMS[id].reads.camera, /phone/);
    G.room = id; assert.equal(_camDev(), "tablet"); assert.match(t("examine tablet"), /WATCH STREAM/);
  }
  G.room = "lucky_tiger"; assert.equal(_camDev(), "{{phone}}");
});

test("at the camera: a bare TALK gets one finger, FLIRT lands on the lens, and nothing moves the meter", () => {
  const g = onCamera(), n = NPCS[g].name.toLowerCase(), h0 = G.happy;
  const r = t("talk to " + n);
  assert.ok([..._STREAM_BUSY_KNOWN, ..._STREAM_BUSY_NEW].some(f => r.includes(f(NPCS[g].name, _whaleOf(JADE), _camDev(JADE)).slice(0, 30))), r);
  assert.match(r, new RegExp(`TIP ${NPCS[g].name.toUpperCase()} ${STREAM_MATCH}`));
  const f = t("flirt " + n);
  assert.ok(_STREAM_FLIRT.some(x => f.includes(x(NPCS[g].name, _whaleOf(JADE), _camDev(JADE)).slice(0, 25))), f);
  assert.equal(G.happy, h0);
});

test("a drink is taken — the cut is the cut — and she goes back to the lens; the stairs wait till he logs off", () => {
  const g = onCamera(), n = NPCS[g].name.toLowerCase(), m = G.money;
  const d = t("buy " + n + " a drink");
  assert.equal(G.money, m - _ladyPrice(JADE), "charged as any lady drink");
  assert.ok(_STREAM_GOES_BACK.some(x => d.includes(x(NPCS[g].name, _whaleOf(JADE), _camDev(JADE)).slice(0, 25))), d);
  assert.ok(!_TOAST_LINES.some(x => d.includes(x(NPCS[g].name).slice(0, 30))), "no warm toast from a girl walking back to the camera");
  const b = t("barfine " + n);
  assert.match(b, /SilverFox_Leeds|he tip/); assert.equal(G.pendingBf || null, null, "no negotiation opens");
  assert.equal(_bfDayPeek(g), "stream", "her own talk of the stairs says the same");
});

test("the remedies: match him (TIP the song price) or ring the bell — each holds ten turns; a smaller note does not", () => {
  const g = onCamera(), n = NPCS[g].name.toLowerCase();
  t(`tip ${n} 100`); assert.ok(_atCamera(g), "a hundred does not move a man who pays five hundred a song");
  t(`tip ${n} ${STREAM_MATCH}`); assert.ok(!_atCamera(g), "matched");
  G.nightTurn += 5; assert.ok(!_atCamera(g)); G.nightTurn += 6; G.soc.streamAway = {};
  const g2 = onCamera(); G.soc.streamWon = {};
  const r = t("ring bell");
  assert.match(r, /camera corner empties|leave the camera|comes back to the stools/);
  assert.deepEqual(_cameraGirls(), [], "the room is the room again");
  assert.ok(g2);
});

test("a woman who is yours, or on your arm, stays with you", () => {
  const g = onCamera();
  G.soc.drinks[g] = 20; assert.equal(_knownTier(g), 3); assert.ok(!_atCamera(g), "her-farang");
  G.soc.drinks[g] = 0; G.party = { ids: [g], stops: 0, spent: 0, seen: {} }; assert.ok(!_atCamera(g), "companion");
});

test("the town answers the camera: what it is at a streaming bar, the tipper at the Jade, and the bars that have one elsewhere", () => {
  G.room = "pink_lotus"; G.nightTurn = 30; quiet();
  const joy = "joy";
  t("talk to joy"); const a = t("ask joy about the camera");
  assert.ok(_TOWN.stream.floor.some(l => a.includes(_fmt(l, { n: "Joy", p: _num(_ladyPrice("pink_lotus")), c: _num(LADY_CUT) }).slice(0, 30))), a);
  const g = onCamera(); const n = NPCS[g].name.toLowerCase();
  assert.match(t(`ask ${n} about silverfox`), /Silver|Leeds|England|tip/i);
  G.room = "sunset_rail"; G.nightTurn = 30; quiet();
  const p = t("ask pukky about the camera");
  assert.match(p, /Pink Lotus Lounge, Golden Dragon Bar, Jade Lounge and Peach Lounge/);
  // …and an independent with its own phone says so: no "company put" from a bar that is nobody's group
  G.room = "lucky_tiger"; G.nightTurn = 30; quiet();
  const ind = t("ask ging about the camera");
  assert.doesNotMatch(ind, /Company put|The group put|head office/i, ind);
  assert.ok([..._TOWN.stream_indie.floor, ..._TOWN.stream_indie.house, ..._TOWN_THAI.stream_indie].some(l => ind.includes(_fmt(l, { n: "Ging", p: _num(_ladyPrice("lucky_tiger")), c: _num(LADY_CUT) }).slice(0, 25))), ind);
  assert.ok(joy);
});

test("the phone: WATCH STREAM shows a channel you know; STREAM DRINK comes from the account, builds nothing, and she can't place you", () => {
  G.room = "soi6_mid"; G.nightTurn = 40; quiet();
  assert.match(t("watch stream"), /don't know a bar/);
  G.visited.pink_lotus = true;
  const w = t("watch stream pink lotus");
  assert.match(w, /Pink Lotus Lounge on your phone/); assert.match(w, /STREAM DRINK/);
  const b0 = G.bank, m0 = G.money, d0 = G.soc.drinks.joy || 0, h0 = G.happy;
  const r = t("stream drink joy");
  assert.match(r, new RegExp(_myHandle()));
  assert.equal(G.bank, b0 - _ladyPrice("pink_lotus"), "through the link, from the account");
  assert.equal(G.money, m0, "not the pocket");
  assert.equal(G.soc.drinks.joy || 0, d0, "no bond: the appearance of attention");
  assert.equal(G.happy, h0 + 1, "once a night");
  t("stream drink joy"); assert.equal(G.happy, h0 + 1);
  G.room = "pink_lotus"; quiet();
  assert.match(t("stream drink joy"), /right there/);
  t("talk to joy"); const me = t("ask joy about the stream");
  assert.ok(_TOWN.stream_me.floor.some(l => me.includes(_fmt(l, { n: "Joy", h: _myHandle() }).slice(0, 25))), me);
});

test("the morning ledger names drinks bought through the stream", () => {
  G.room = "soi6_mid"; G.nightTurn = 40; G.visited.pink_lotus = true; quiet(); _nightSnapshot();
  t("stream drink joy"); out = [];
  _endNight("sleep");
  assert.match(said(), /through the stream — drinks and bells/);
});

test("three surfaces: the parser, the wheel away from her bar, and the completion; and HELP names it", () => {
  G.room = "soi6_mid"; G.nightTurn = 40; G.visited.pink_lotus = true; quiet();
  assert.ok(_npcActions("joy", true).includes("streamdrink"), "the wheel");
  assert.ok(engineComplete("stream drink ").includes("joy"), "the completion");
  assert.ok(engineComplete("watch ").includes("stream"));
  G.room = "pink_lotus"; assert.ok(!_npcActions("joy", true).includes("streamdrink"), "not across the stool");
  assert.match(_HELP, /WATCH STREAM/); assert.match(_HELP_SOI6, /STREAM DRINK/);
});

test("the real path: the tick puts the camera to work in a streaming room, and the corner fills while he is online", () => {
  G.room = "pink_lotus"; G.nightTurn = 20; quiet(); out = [];
  for (let i = 0; i < 60; i++) { _tick(); G.soc.streamLast = G.soc.streamLast || {}; }
  assert.ok(_STREAM_TOAST.some(f => said().includes(f("@@", "@@").split("@@")[1] || "~")) || /camera|lens/.test(said()), "a girl raises a glass to the lens");
  onCamera(); out = []; _describeRoom(true);
  assert.match(said(), /SilverFox_Leeds/);
});

// STREAMERS CAN RING THE BELL (Mario, 2026-10-22)
test("STREAM BELL <bar> from your phone: the room's own bell price from the account, the room drinks on your handle, the ledger says so", () => {
  G.nightTurn = 30; G.visited.lucky_tiger = true; G.room = "soi6_mid";
  const p = _bellPrice("lucky_tiger"), b0 = G.bank, m0 = G.money;
  const a = t("stream bell lucky tiger");
  assert.match(a, new RegExp(_myHandle())); assert.match(a, /Lucky Tiger/);
  assert.equal(G.bank, b0 - p); assert.equal(G.money, m0, "never the pocket"); assert.equal(G.streamSpent, p);
  assert.match(t("ring the bell at lucky tiger"), /Lucky Tiger/, "RING THE BELL AT <bar> is the same thing");
  assert.match(t("ring the bell on the stream"), /Lucky Tiger/);
  G.room = "lucky_tiger"; assert.match(t("stream bell lucky tiger"), /You're standing in/, "in the room, ring it with your hand");
  assert.deepEqual(_streamBarActs("Lucky Tiger Bar"), [], "no wheel bell for the room you are in");
  G.room = "soi6_mid"; assert.equal(_streamBarActs("Lucky Tiger Bar").length, 2);
  assert.ok(engineComplete("stream ").includes("bell"));
});

test("the floor that drank your stream bell remembers it, by when", () => {
  G.nightTurn = 30; G.visited.lucky_tiger = true; G.room = "soi6_mid"; t("stream bell lucky tiger");
  G.room = "lucky_tiger"; const g = _npcsHere().find(x => NPC_ROLES[x] === "hostess"), n = NPCS[g].name.toLowerCase();
  t("talk to " + n); const a = t("ask " + n + " about the bell");
  assert.ok(_TOWN.stream_bellme[_hoursRegister(g)].some(l => a.includes(_fmt(l, { n: NPCS[g].name, h: _myHandle(), when: "tonight", hp: _pr(g).p }).slice(0, 25))) ||
    _TOWN_THAI.stream_bellme.some(l => a.includes(_fmt(l, { n: NPCS[g].name, h: _myHandle(), when: "tonight" }).slice(0, 25))), a);
});

test("the big tipper rings it himself, once a night: the room drinks on him — your glass too — and the floor goes to the camera", () => {
  G.room = JADE; let fired = false;
  for (let d = 2; d < 120 && !fired; d++) { G.day = d; G.soc.whaleBell = {}; for (let h = 20; h < 70 && !fired; h++) { G.nightTurn = h; if (_whaleOn() && _hm("whaleBell:" + JADE + ":" + d + ":" + h, 41) % 100 < 6) {
    G.soc.streamLast = {}; G.soc.drunk = 0; out = []; _streamTick(); fired = true; } } }
  assert.ok(fired, "a night he rang it");
  assert.match(said(), /bell/i); assert.equal(G.soc.whaleBell[JADE], G.day, "once a night");
  assert.equal(G.soc.drunk, 1, "a round for the room is a drink in your hand");
  const hs = _npcsHere().filter(x => NPC_ROLES[x] === "hostess" && _knownTier(x) < 3);
  assert.ok(hs.every(x => _atCamera(x)), "his bell sends the floor to the camera");
  out = []; G.soc.streamLast = {}; _streamTick(); assert.doesNotMatch(said(), /bell.*rings|rings the bell|ring the bell!/i, "not twice a night");
});
