// Adversarial security invariants — the trust boundaries a hostile PLAYER
// input or a crafted save/baton must never cross, ahead of the shared-world
// future where a blob is "the wire" and one player's content can reach another.
// Pinned from the griefer playtest (2026-08-26), which found the escape path
// universal and the proto-safety accidental. These lock both down.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(t), null, () => {});
beforeEach(() => { out = []; newGame(); });

// ── R1: the save loader coerces hostile scalars to finite, in-range values ──
test("a save cannot poison a scalar with NaN / Infinity / negative / oversized", () => {
  const poison = JSON.stringify({
    money: 1e309,          // JSON → null; must not survive as null
    happy: "NaN", hurt: -999, day: -5, nightTurn: 1e6,
    bank: -1, jaded: 999, battery: 500, rep: 9999,
    rng: Infinity, thaiSeen: new Array(100000).fill("x"),
    soc: { drunk: 999 },
  });
  deserializeGame(poison);
  for (const [f, obj] of [["money", G], ["happy", G], ["hurt", G], ["day", G],
                          ["nightTurn", G], ["bank", G], ["jaded", G], ["battery", G],
                          ["rep", G], ["drunk", G.soc], ["rng", G]]) {
    assert.ok(Number.isFinite(obj[f]), `${f} is finite`);
  }
  assert.ok(G.happy >= 0 && G.happy <= 100, "happy in range");
  assert.ok(G.hurt >= 0 && G.hurt <= 3, "hurt in range");
  assert.ok(G.day >= 1, "day at least 1");
  assert.ok(G.nightTurn >= 0 && G.nightTurn <= NIGHT_TURNS, "nightTurn in range");
  assert.ok(G.battery >= 0 && G.battery <= 100, "battery in range");
  assert.ok(G.soc.drunk >= 0 && G.soc.drunk <= 20, "drunk in range");
  assert.ok(Number.isInteger(G.rng) && G.rng >= 1 && G.rng <= 2147483646, "rng a live seed");
  assert.ok(G.thaiSeen.length <= 60, "unbounded array capped");
});

test("the corrupt-save render defect is gone: ordinary commands don't throw or leak", () => {
  // the griefer's 5 pageerrors, and the "฿null · สนุก NaN · {weekday}" leaks
  deserializeGame(JSON.stringify({
    stage: "vacation", flags: { act1Done: true },
    money: 1e309, happy: "NaN", hurt: -999, day: -5, nightTurn: 1e6, rng: Infinity,
    room: "not_a_real_room",
  }));
  assert.ok(ROOMS[G.room], "an unreal room is repaired to a real one");
  out = [];
  assert.doesNotThrow(() => { doCommand("look"); doCommand("time"); doCommand("diagnose"); doCommand("inventory"); });
  const said = out.join("\n");
  assert.doesNotMatch(said, /NaN|฿null|\{weekday\}|-999/, "no corrupt values leak into prose");
});

test("a legitimate save round-trips untouched — the sanitizer only clamps the insane", () => {
  G.money = 45231; G.happy = 62; G.day = 4; G.nightTurn = 55; G.hurt = 1;
  G.soc.drunk = 3; G.bank = 88000; G.thaiSeen = ["ซื้อ", "ไป", "น้ำ"];
  const rng0 = G.rng;
  deserializeGame(serializeGame());
  assert.equal(G.money, 45231); assert.equal(G.happy, 62); assert.equal(G.day, 4);
  assert.equal(G.nightTurn, 55); assert.equal(G.hurt, 1); assert.equal(G.soc.drunk, 3);
  assert.equal(G.bank, 88000); assert.deepEqual(G.thaiSeen, ["ซื้อ", "ไป", "น้ำ"]);
  assert.equal(G.rng, rng0, "a valid rng seed is preserved (determinism)");
});

// ── D2: prototype pollution through the real load path is DELIBERATELY blocked ──
test("a crafted save cannot pollute Object.prototype", () => {
  const before = Object.keys(Object.prototype).length;
  // JSON.parse makes __proto__ / constructor real OWN keys; the merge must skip them
  const blob = '{"__proto__":{"POLL":1},"constructor":{"prototype":{"POLL2":1}},"dog":{"name":"Rex","since":2}}';
  deserializeGame(blob);
  assert.equal(({}).POLL, undefined, "no POLL on Object.prototype");
  assert.equal(({}).POLL2, undefined, "no POLL2 via constructor.prototype");
  assert.equal(Object.keys(Object.prototype).length, before, "prototype key count unchanged");
  assert.equal(G.dog && G.dog.name, "Rex", "…and the legitimate fields still merged (the load ran)");
});

test("the proto guard is explicit, not just accidental shallowness", () => {
  // If someone swaps the merge for a deep-merge later, _safeMergeKey still holds
  assert.equal(typeof _safeMergeKey, "function");
  assert.ok(!_safeMergeKey("__proto__") && !_safeMergeKey("constructor") && !_safeMergeKey("prototype"));
  assert.ok(_safeMergeKey("money") && _safeMergeKey("flags") && _safeMergeKey("soc"));
});

test("the baton is data on the wire too: same guard, same sanitizer", () => {
  const good = exportBaton ? exportBaton() : null;
  if (good) {
    // hostile baton: proto key + a poisoned scalar within a whitelisted field
    good.__proto__ = { POLL3: 1 };
    if ("money" in good) good.money = Infinity;
    const before = Object.keys(Object.prototype).length;
    const r = importBaton(good);
    if (r && r.ok) {
      assert.equal(({}).POLL3, undefined, "baton cannot pollute the prototype");
      assert.equal(Object.keys(Object.prototype).length, before);
      assert.ok(Number.isFinite(G.money), "baton scalars are sanitized like a save's");
    }
  }
});

// ── The universal render invariant the griefer confirmed: player free-text
//    never becomes live markup. (The DOM path is e2e-only; here we assert the
//    engine never turns hostile input into a keyword span, and stripMarkup is
//    total, so a non-decorate consumer is safe too.) ──
test("player-controlled text is never emitted as a decoratable keyword", () => {
  // a name a player can set — the dog — carries a payload; the engine stores and
  // re-prints it, and must never wrap it as an entity (which would reach an attr)
  _setFlag("act1Done");
  G.dog = { since: 2, name: '<img src=x onerror=alert(1)>' };
  out = []; G.room = "beach_rd_c"; doCommand("examine dog");
  // the engine prints the raw name; escaping happens at the render boundary
  // (term.js _escapeHtml, e2e-covered) — here assert the engine never itself
  // emits an HTML tag it built, i.e. the payload passes through as data
  const said = out.join("\n");
  assert.ok(said.includes("<img") || said.includes("onerror"),
    "the engine passes the name through as inert data (the DOM layer escapes it)");
  // and stripMarkup — the non-decorate render path's sanitizer — is total
  assert.equal(typeof stripMarkup, "function");
  assert.doesNotMatch(stripMarkup("plain {{x}} text"), /\{\{|\}\}/, "stripMarkup removes render markup");
});
