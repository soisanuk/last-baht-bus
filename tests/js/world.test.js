// World data integrity: every exit resolves, all 16 canon bars are enterable,
// the full hostess roster is placed, and the gossip chain's flags connect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

test("every exit points to a real room", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    for (const [dir, to] of Object.entries(room.exits)) {
      assert.ok(ROOMS[to], `${id} exit ${dir} → ${to} (missing room)`);
    }
  }
});

test("every room is reachable from the start", () => {
  // BFS over walking exits, plus transit edges: standing at a bus stop opens
  // every stop on its lines; standing at a motosai stand opens every listed
  // destination. Iterate until the reachable set stops growing.
  const seen = new Set(["jomtien_beach"]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...seen]) {
      const room = ROOMS[id];
      const next = [...Object.values(room.exits)];
      if (room.busStop) {
        for (const [, stops] of Object.entries(BUS_LINES)) {
          if (stops.includes(id)) next.push(...stops);
        }
      }
      if (room.motosai) {
        next.push(...Object.values(MOTOSAI_DESTS).map(d => d.room));
      }
      for (const to of next) {
        if (!seen.has(to)) { seen.add(to); grew = true; }
      }
    }
  }
  for (const id of Object.keys(ROOMS)) {
    assert.ok(seen.has(id), `room ${id} unreachable`);
  }
});

test("all 20 canon bars exist as enterable rooms", () => {
  const barRooms = Object.values(ROOMS).filter(r => r.bar).map(r => r.bar);
  assert.equal(CANON_BARS.length, 20);
  for (const bar of CANON_BARS) {
    assert.ok(barRooms.includes(bar), `${bar} missing from map`);
  }
});

test("full canon hostess roster is placed in real rooms", () => {
  for (const key of CANON_HOSTESSES) {
    const npc = NPCS[key];
    assert.ok(npc, `hostess ${key} missing`);
    assert.ok(ROOMS[npc.room], `${key} placed in missing room ${npc.room}`);
  }
});

test("every NPC is in a real room and has dialogue", () => {
  for (const [id, npc] of Object.entries(NPCS)) {
    assert.ok(ROOMS[npc.room], `${id} in missing room ${npc.room}`);
    assert.ok(npc.dialogue.length > 0, `${id} has no dialogue`);
    // every NPC needs at least one unconditional fallback line
    const fallback = npc.dialogue.some(d => !d.req && !d.topic);
    assert.ok(fallback, `${id} has no unconditional fallback line`);
  }
});

test("dialogue items that give an item reference real items", () => {
  for (const [id, npc] of Object.entries(NPCS)) {
    for (const d of npc.dialogue) {
      if (d.gives) assert.ok(ITEMS[d.gives], `${id} gives missing item ${d.gives}`);
    }
  }
});

test("room signs reference real sign entries", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    if (room.sign) assert.ok(SIGNS[room.sign], `${id} sign ${room.sign} missing`);
  }
});

test("gossip chain flags connect: every required flag is set somewhere", () => {
  const settable = new Set(["knowWasHere", "waiedOy", "waiedPloy", "greetedFon",
    "hasWallet", "gotBusFare", "somTamDelivered", "officeOpen",
  ]); // set by engine actions (read/wai/give/enter), not dialogue
  for (const npc of Object.values(NPCS)) {
    for (const d of npc.dialogue) {
      for (const f of d.sets || []) settable.add(f);
    }
  }
  for (const [id, npc] of Object.entries(NPCS)) {
    for (const d of npc.dialogue) {
      for (const f of [...(d.req || []), ...(d.notFlags || [])]) {
        assert.ok(settable.has(f), `${id} requires flag ${f} that nothing sets`);
      }
    }
  }
});

test("items start in real locations", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.location && item.location !== "inventory") {
      assert.ok(ROOMS[item.location], `${id} starts in missing room ${item.location}`);
    }
  }
});

test("bus lines and motosai destinations reference real rooms", () => {
  for (const [line, stops] of Object.entries(BUS_LINES)) {
    for (const s of stops) assert.ok(ROOMS[s], `bus line ${line} stop ${s} missing`);
    // a stop may serve several lines (beach_rd_s is the interchange) — the tag
    // only marks "a bus stops here"; line membership lives in BUS_LINES
    for (const s of stops) assert.ok(ROOMS[s].busStop, `${s} not tagged as a bus stop`);
  }
  for (const [name, d] of Object.entries(MOTOSAI_DESTS)) {
    assert.ok(ROOMS[d.room], `motosai dest ${name} → ${d.room} missing`);
    assert.ok(d.price > 0);
  }
});

test("encounters reference real, lit, street-side rooms", () => {
  for (const [id, e] of Object.entries(ENCOUNTERS)) {
    assert.ok(e.intro, `${id} has no intro`);
    assert.ok(e.rooms.length, `${id} has no rooms`);
    for (const r of e.rooms) {
      assert.ok(ROOMS[r], `${id} room ${r} missing`);
      assert.ok(!ROOMS[r].bar, `${id} room ${r} is a bar — encounters are street-only`);
      assert.ok(!ROOMS[r].dark, `${id} room ${r} is dark — the dark belongs to soi dogs`);
    }
  }
  // the items encounters hand out exist and start off-map
  assert.equal(ITEMS.moo_ping.location, null);
  assert.equal(ITEMS.hair_tonic.location, null);
});

test("bar-social roles reference real NPCs and cover the roster", () => {
  for (const [id, role] of Object.entries(NPC_ROLES)) {
    assert.ok(NPCS[id], `role assigned to missing NPC ${id}`);
    assert.ok(["hostess", "cashier", "mamasan"].includes(role), `${id}: odd role ${role}`);
  }
  for (const h of CANON_HOSTESSES) assert.ok(NPC_ROLES[h], `${h} has no role`);
});

test("the safe PIN's clue flags both exist in dialogue", () => {
  assert.equal(SAFE_PIN, 719);
  const allSets = Object.values(NPCS).flatMap(n => n.dialogue.flatMap(d => d.sets || []));
  assert.ok(allSets.includes("pinPart71"), "nothing sets pinPart71");
  assert.ok(allSets.includes("pinPart9"), "nothing sets pinPart9");
});
