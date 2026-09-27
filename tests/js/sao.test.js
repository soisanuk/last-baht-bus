// THE BANGKOK ARC, PLAYED ON THE REAL PATH — the coverage map's last never-walked
// system (2026-09-27). The bkktourist encounter answered kindly hands you Sao's
// number; her texts arrive on a Bangkok clock across the nights you SLEEP through;
// the car is outside your hotel the night after the invitation; GO puts the bill in
// its black folder; LET or GRAB ends it. Every step here is the game's own trigger
// (_startEnc, doCommand, the tick), never a hand-set stage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");

function expat() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "expat"; _setFlag("expatLife"); G.money = 30000; G.bank = 80000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2; G.nightTurn = 30; G.battery = 90; G.lightOn = true;   // the hotel soi is dark; TRAVEL stops at its edge with the torch off (round 52)
}
// a night slept through in your own bed, on the real path; then out and home again,
// because her clock moves on ARRIVAL (_arriveAt calls _bkkArcTick), not on the tick
function sleepNight() {
  G.room = _hotelRoomId(); G.hunger = 10; G.thirst = 10; G.soc.drunk = 0; G.battery = 90;
  const d = G.day; doCommand("sleep");
  assert.equal(G.day, d + 1, "SLEEP in your room ends the night");
  G.nightTurn = 20; G.battery = 90; G.hunger = 10; G.thirst = 10;
  doCommand("out"); doCommand("travel home");
  assert.equal(G.room, _hotelRoomId(), "back in your room");
}

test("Sao: met kindly on the promenade, texted on her clock, the car outside your hotel, the bill in its folder", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;
    expat(); G.room = "promenade";
    _startEnc("bkktourist"); out = []; doCommand("hello");
    assert.ok(G.phone.contacts.sao && G.bkk && G.bkk.stage === 1, "she leaves her number, hers to give");
    assert.match(text(), /Sao\. Give me your phone/);
    // stage 2: the coffee text, 3–5 nights on — the tick moves her clock, not a hand
    let nights = 0;
    while (G.bkk.stage === 1 && nights < 8) { sleepNight(); nights++; }
    assert.equal(G.bkk.stage, 2, "the coffee text arrived on her clock");
    assert.ok(G.phone.inbox.some(m => /flat whites/.test(m.text || m.body || JSON.stringify(m))), "…and is in the inbox");
    // stage 3: the invitation, 7–10 nights after the coffee
    nights = 0;
    while (G.bkk.stage === 2 && nights < 14) { sleepNight(); nights++; }
    assert.equal(G.bkk.stage, 3, "the invitation arrived");
    // stage 4: the next night, in your room, the car is outside — a modal, wired the standard way
    out = []; sleepNight();
    assert.equal(G.pendingChoice, "bkkdinner", "the dinner is offered where the arc says: your hotel, the night after");
    assert.match(text(), /Grey Alphard/);
    // the resume redraw is the same prompt (the saveload contract, on the arc's own modal)
    const blob = serializeGame(); out = []; _renderResume(); const live = text();
    newGame(); deserializeGame(blob); out = []; _renderResume(); assert.equal(text(), live);
    // GO: Sathorn, the family, the bill — then LET it go
    out = []; doCommand("go");
    assert.equal(G.pendingChoice, "bkkbill", "the bill sits in its black folder");
    assert.ok(_flag("bkkArcDone"));
    const h0 = G.happy; out = []; doCommand("let");
    assert.equal(G.pendingChoice, null);
    assert.ok(G.happy >= h0 - 2, "letting it go is not punished");
    // once per game: the tick never re-arms it
    G.bkk = { met: G.day - 30, stage: 3, invite: G.day - 2 }; G.room = "naklua_rd"; out = []; doCommand("travel home");
    assert.equal(G.pendingChoice, null, "bkkArcDone is final");
  } finally { _rand = saved; }
});

test("Sao: DECLINE closes the door quietly, once", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;
    expat(); G.room = "naklua_rd"; G.bkk = { met: G.day - 20, stage: 3, invite: G.day - 1 };
    out = []; doCommand("travel home");   // her clock moves on arrival
    assert.equal(G.pendingChoice, "bkkdinner");
    out = []; doCommand("decline");
    assert.equal(G.pendingChoice, null); assert.ok(_flag("bkkArcDone"));
    assert.match(text(), /Another time/);
  } finally { _rand = saved; }
});
