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

test("the cameras are the group's: four PLG rooms on Soi 6, never the room behind the rope, one with the pull", () => {
  const streams = Object.keys(ROOMS).filter(id => ROOMS[id].stream);
  assert.deepEqual(streams.sort(), ["golden_dragon", "jade_lounge", "peach_lounge", "pink_lotus"]);
  for (const id of streams) {
    assert.ok(_PLG_ROOMS.includes(id), id + " is on the group's paper");
    assert.match(_licenceOf(id).name, /Pattaya Leisure/);
    assert.match(ROOMS[id].desc, /camera/, id + " says so in its own room");
    G.room = id; assert.match(t("examine camera"), /WATCH STREAM/, id + " has a close look at it");
  }
  assert.ok(!ROOMS.orchid_room.stream, "nobody films the room behind the rope");
  assert.deepEqual(streams.filter(id => _streamPull(id)), [JADE]);
});

test("the big tipper keeps hours by a pure hash — no dice — and only at the Jade Lounge", () => {
  const r0 = G.rng; let on = 0;
  for (let d = 1; d < 40; d++) for (let h = 0; h < 120; h += 5) { G.day = d; G.nightTurn = h; if (_whaleOn(JADE)) { on++; assert.ok(h >= 20 && h < 70, "an English afternoon"); } assert.ok(!_whaleOn("pink_lotus")); }
  assert.equal(G.rng, r0, "reading his hours rolls nothing");
  assert.ok(on > 0, "he is online some nights");
});

test("at the camera: a bare TALK gets one finger, FLIRT lands on the lens, and nothing moves the meter", () => {
  const g = onCamera(), n = NPCS[g].name.toLowerCase(), h0 = G.happy;
  const r = t("talk to " + n);
  assert.ok([..._STREAM_BUSY_KNOWN, ..._STREAM_BUSY_NEW].some(f => r.includes(f(NPCS[g].name).slice(0, 30))), r);
  assert.match(r, new RegExp(`TIP ${NPCS[g].name.toUpperCase()} ${STREAM_MATCH}`));
  const f = t("flirt " + n);
  assert.ok(_STREAM_FLIRT.some(x => f.includes(x(NPCS[g].name).slice(0, 25))), f);
  assert.equal(G.happy, h0);
});

test("a drink is taken — the cut is the cut — and she goes back to the lens; the stairs wait till he logs off", () => {
  const g = onCamera(), n = NPCS[g].name.toLowerCase(), m = G.money;
  const d = t("buy " + n + " a drink");
  assert.equal(G.money, m - _ladyPrice(JADE), "charged as any lady drink");
  assert.ok(_STREAM_GOES_BACK.some(x => d.includes(x(NPCS[g].name).slice(0, 25))), d);
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
  assert.match(r, /camera corner empties|leave the ring light|comes back to the stools/);
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
  assert.match(said(), /on drinks through the stream/);
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
