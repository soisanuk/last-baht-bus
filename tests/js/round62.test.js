// Round 62 (2026-10-02): Ingrid (companion-through-the-cons — a girl on her arm walked into
// every con and every verb the party had forgotten), Piet (the third trip — what the women
// remember across a vacation, and what the town retold), Hal (owner-trough-levers — a
// publican in the wet working the board and the terms with nothing moving under him).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});
const _party = (id = "lek") => { G.party = { ids: [id], stops: 1, spent: 0, seen: {} }; };

// ── Ingrid: the woman on your arm ─────────────────────────────────────────────
test("TAKE <her> OUT is the verb the company refusal promises, and it reaches the ledger with her name intact", () => {
  G.room = "candy_bar"; G.nightTurn = 30; _party("lek"); G.money = 20000;
  const other = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && i !== "lek");
  out = []; run("barfine " + NPCS[other].name);
  assert.match(said(), /TAKE [A-Z]+ OUT/); assert.equal(G.lastBfAsk, other);
  out = []; run("take " + NPCS[other].name + " out");
  assert.doesNotMatch(said(), /not working this bar|don't see that here/);
  assert.ok(/drink|talk to me|counts it out|drifts over|pendingBf/.test(said()) || G.pendingBf, "the ask reached the favour gate or the ledger");
});
test("a bare TALK to the girl on your arm is company, not a customer at her own rail; BYE ends the subject and keeps her", () => {
  G.room = "candy_bar"; G.nightTurn = 30; _party("lek");
  out = []; run("talk to lek");
  assert.doesNotMatch(said(), /again|no other bar|Candy Bar.*welcome/i);
  assert.ok(_PARTY_TALK.some(f => said().includes(f("Lek", _barName("candy_bar")).slice(0, 30))), "her company register");
  _convoStart("lek"); out = []; run("bye");
  assert.match(said(), /keeps your arm/); assert.ok(G.party && G.party.ids.includes("lek"));
});
test("a thing bought FOR her is hers: the toastie and the stall plate feed the companion, and cost the same", () => {
  G.room = "beach_rd_c"; _party("lek"); G.money = 1000; G.hunger = 0;
  out = []; run("buy toastie for lek");
  assert.match(said(), /Lek/); assert.equal(G.money, 1000 - TOASTIE_PRICE); assert.equal(G.hunger, 0, "you did not eat it");
  const stall = Object.keys(FOOD_STALLS)[0]; G.room = stall; G.money = 1000;
  out = []; run("eat for lek"); assert.match(said(), /Lek/); assert.equal(G.money, 1000 - FOOD_STALLS[stall].price);
});
test("the bus charges her seat too; the police tell prints once; the fortune-teller and tonic man meet the Thai no", () => {
  G.room = "beach_rd_c"; _party("lek"); G.nightTurn = 30; G.money = 1000;
  run("ride bus"); run("beach road south"); assert.ok(G.pendingFare, "a fare"); assert.equal(G.pendingFare.price, BUS_FARE * 2); G.pendingFare = null;
  G.encDone.fortune = false; out = []; _startEnc("fortune");
  assert.ok(_COMPANION_TELL.some(l => said().includes(l.replace("{n}", "Lek").slice(0, 25))), "she says up to you");
  G.pendingEnc = null; G.encDone.tonic = false; out = []; _startEnc("tonic");
  assert.match(said(), /Up to you|up to you/); G.pendingEnc = null;
  // the companion is a solo guard: an encounter flagged solo never starts with her beside you
  const solo = Object.keys(ENCOUNTERS).find(k => ENCOUNTERS[k].solo);
  if (solo) { G.encDone[solo] = false; out = []; _startEnc(solo); assert.equal(G.pendingEnc, null); }
});
test("two women called the same thing: the one you know is the one you mean, in the elsewhere line", () => {
  const byName = {}; for (const id of Object.keys(NPCS)) { const n = String(NPCS[id].name || "").toLowerCase(); (byName[n] = byName[n] || []).push(id); }
  const twins = Object.values(byName).find(ids => ids.length > 1 && ids.every(i => NPC_ROLES[i]));
  if (!twins) return;
  G.soc.drinks[twins[1]] = 8; G.phone.contacts[twins[1]] = true;
  G.room = "beach_rd_c"; out = []; run("talk to " + NPCS[twins[1]].name);
  const where = _barName(_npcRoom(twins[1]));
  if (where) assert.ok(said().includes(where) || /isn't|not here|around/.test(said()), "placed at her bar, not her namesake's: " + said());
});
test("the first downpour of the night is not at half past six five nights of seven", () => {
  const hours = []; for (let d = 1; d <= 7; d++) { G.day = d; hours.push(_rainEarliest()); }
  assert.ok(new Set(hours.map(h => Math.floor(h / 10))).size >= 3, "spread across the evening: " + hours.join(" "));
});

// ── Piet: the third trip ──────────────────────────────────────────────────────
test("a confidence told on trip one is not told again on trip two: the books ride the vacation", () => {
  G.soc.drinks.lek = 8; G.soc.bondSaid = { lek: [0, 1] }; G.soc.bondHeard = [0, 1]; G.soc.ledgerHeard = ["x"];
  const t = _bondTier("lek");
  _newVacation();
  assert.deepEqual(G.soc.bondSaid.lek, [0, 1]); assert.deepEqual(G.soc.bondHeard, [0, 1]);
  assert.equal(G.everBond.lek, t, "the tier she reached is remembered");
});
test("a woman whose confidences the town has all given you says so, instead of repeating one", () => {
  G.soc.bondHeard = { 2: _BOND_TALK[2].map((_, i) => i) };
  const r = _bondPick("lek", 2, _BOND_TALK[2]);
  assert.equal(r, null, "nothing left unsaid");
});
test("I FLY HOME TOMORROW is a topic, by tier, and once a night; the money sent is askable by what it was for", () => {
  G.room = NPCS.lek.room; G.nightTurn = 30; G.soc.drinks.lek = 8;
  out = []; run("ask lek about my flight home"); assert.match(said(), /Lek/); assert.doesNotMatch(said(), /not my story|didn't understand/i);
  out = []; run("ask lek about my flight home"); assert.match(said(), /heard you the first time/);
  G.phone.asks = { lek: [{ kind: "medicine", paid: true, day: 1 }] };
  out = []; run("ask lek about the medicine"); assert.match(said(), /medicine/);
});
test("what you told her is remembered, and the name she calls you is askable at her-farang", () => {
  G.room = NPCS.lek.room; G.nightTurn = 30; G.soc.drinks.lek = 14; G.player.said = { home: "Rotterdam" };
  out = []; run("ask lek about rotterdam"); assert.match(said(), /Rotterdam. You tell me/);
  out = []; run("ask lek about her name for me"); assert.match(said(), new RegExp(_herNameForYou("lek")));
});

// ── Hal: the levers in the trough ─────────────────────────────────────────────
function _owner() {
  G.stage = "expat"; for (const f of ["expatLife", "barPartner", "partnerCandy", "barPaid", "barOpen"]) _setFlag(f);
  G.day = 10; G.bar.lastMonthDay = 10; G.bar.owed = 1680000; G.bar.cash = 30000; G.bar.lease = { paid: true }; G.money = 20000; G.bank = 50000;
  Object.assign(G.bar, { rentUp: 0, takeLog: [], trafficLog: [], notice: null, gone: {}, months: 0, noticeDay: 0, markup: "list", terms: "commission", loan: null });
  G.room = "stinky_bar"; G.nightTurn = 30;
}
const _night = (stood) => { G.day++; if (stood) { G.bar.workedLast = true; G.bar.workedDay = G.day - 1; G.bar.stoodTurns = 40; } out = []; _barSettle(G.day - 1); return said(); };
test("a mixed fortnight of UP and STEEP in the trough crosses the floor: the notice is reachable from a ten-night window", () => {
  _owner(); const saved = _rand; _rand = () => 0.5;
  try {
    G.season0 = 8;   // September start: the trough
    let noticeDay = null;
    for (let i = 0; i < 24 && !noticeDay; i++) {
      G.bar.markup = i % 3 === 0 ? "steep" : "up";
      _night(i % 2 === 0); if (G.bar.notice) noticeDay = G.day;
    }
    assert.ok(noticeDay, "a notice inside twenty-four nights of a dear board in the wet");
  } finally { _rand = saved; }
});
test("the floor's last woman never goes home for the season — a one-woman bar keeps its one woman", () => {
  G.season0 = 8; G.day = 3;
  for (const room of Object.keys(ROOMS)) {
    if (!ROOMS[room].barType) continue;
    const floor = Object.keys(NPCS).filter(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === room);
    if (floor.length !== 1) continue;
    assert.equal(_awayForSeason(floor[0]), false, room + " kept " + floor[0]);
  }
});
test("the bar opposite is seen once per phase from your own doorway, and answers EXAMINE and the rail", () => {
  _owner(); G.bar.oppStart = G.day - 1;
  out = []; _oppTick(); const first = said(); assert.ok(first.length > 0, "a line");
  out = []; _oppTick(); assert.equal(said(), "", "not twice in the phase");
  out = []; run("examine the bar opposite"); assert.ok(said().length > 0);
});

// ── The dialogue walk (2026-10-02): what a machine finds before a reader is paid ─────
test("no authored node is dead: an ungated earlier node never shadows a later one, and a printed label lands on its own node", () => {
  const dead = [];
  for (const id of Object.keys(NPCS)) {
    const nodes = NPCS[id].dialogue || [];
    nodes.forEach((d, i) => {
      if (!d.topic || d.superseded) return;
      const t = String(d.topic).split("|")[0].trim();
      const shadow = nodes.slice(0, i).find(e => e.topic && !e.req?.length && !e.notFlags?.length && !e.when && !e.bond && _topicExact(e.topic, t));
      if (shadow) dead.push(`${id}#${i} (${t}) behind #${nodes.indexOf(shadow)}`);
    });
  }
  assert.deepEqual(dead, []);
  G.room = _npcRoom("waen"); G.nightTurn = 30; _npcState("waen").trust = 3;
  out = []; run("ask waen about teacher"); assert.match(said(), /Nine years/);
  out = []; run("ask waen about two jobs"); assert.match(said(), /Which one pays/);
});
test("a hello that has been heard gives way to one that has not — but never to a plain fallback behind a warmer one", () => {
  G.room = _npcRoom("bill"); G.nightTurn = 30;
  run("talk to bill"); out = []; run("talk to bill"); assert.match(said(), /proper question/);
  G.room = "lucky_tiger"; G.soc.drinks.lek = 14; G.talked.lek = []; G.soc.helloed = {};
  for (let k = 0; k < 4; k++) { out = []; run("talk to lek"); assert.doesNotMatch(said(), /Hello handsome/, "talk " + (k + 1)); }
});
test("Nont's own words about Tan are heard, and cost nothing", () => {
  G.room = _npcRoom("nont"); G.nightTurn = 40; const m = G.money;
  out = []; run("ask nont about tan"); assert.match(said(), /single baht/); assert.equal(G.money, m);
});

// ── The dialogue walk's readers (2026-10-02): subeditors on every authored node ──────
test("the repeat brush-off follows the speaker's English: fluent Thai, Tinglish, farang", () => {
  const n = "Tan";
  assert.ok(_ASK_AGAIN_FLUENT.every(f => !/tilac|same-same|talk to the wall/i.test(f(n))));
  for (const id of ["tan", "nont", "jun"]) { for (let k = 0; k < 6; k++) { out = []; _say(_askAgain(id)); assert.ok(_ASK_AGAIN_FLUENT.some(f => said().includes(f(NPCS[id].name))), id); } }
  assert.ok(!_PATRON_AGAIN.some(f => /goldfish|memory/i.test(f("Glam", "his"))), "no memory joke reaches a man with dementia");
});
test("the massage special stays PG-13 in every shop", () => {
  for (const id of Object.keys(NPCS)) for (const d of NPCS[id].dialogue || []) {
    assert.doesNotMatch(String(d.text || "") + " " + String(d.short || ""), /hand,? (or )?mouth/i, id);
  }
});
test("facts the readers caught stay caught", () => {
  const t = (id, re) => NPCS[id].dialogue.some(d => re.test(String(d.text) + " " + String(d.short || "")));
  assert.ok(!t("mort", /The fourth I did write up/), "Mort's three and four");
  assert.ok(!t("daeng", /better knees/), "Daeng's own knee story");
  assert.ok(!t("toi", /Germany, the husband/), "Mercedes married in Austria");
  assert.ok(!t("drew", /Twenty years Navy/), "Drew's years add up to DLI");
  assert.ok(!t("terry", /in your feed/) && !t("bert", /film himself/), "Vasseur has no content-creator trait");
  assert.ok(!t("nok", /Iran war/), "no dated real event");
  assert.ok(!t("macca", /full fare/), "Tan takes no fare");
  assert.ok(!t("superman", /The bay is going gold/), "no sunset asserted at any hour");
});

// ── The quarter-turned glass is Tan's (Mario, 2026-10-02) ───────────────────────────
// The officer's coffee cup turned a quarter is "Tan's exact gesture" — the one reveal that the
// officer learned something from Tan — and nineteen other characters did it first, so it could
// not land. Tan and the officer only; everybody else has business of their own with a glass.
test("only Tan and the officer turn a glass a quarter", () => {
  const RX = /(?:turns?|spins?|gives? it)\b[^.!?]{0,40}\ba (?:slow |friendly )?quarter(?![- ]inch)|quarter-turn of\b/i;
  const off = [];
  for (const id of Object.keys(NPCS)) {
    if (id === "tan") continue;
    const n = NPCS[id];
    for (const s of [n.desc, ...(n.dialogue || []).flatMap(d => [d.text, d.short])]) if (s && RX.test(String(s))) off.push(id);
  }
  assert.deepEqual([...new Set(off)], []);
  for (const f of ["engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"]) {
    const src = readFileSync(W + f + ".js", "utf8");
    for (const m of src.matchAll(/^function (\w+)[\s\S]*?^}/gm)) if (RX.test(m[0].replace(/"\s*\+\s*"/g, ""))) assert.ok(["_ccibVisit", "_ccibCoffee"].includes(m[1]), f + ": " + m[1]);
  }
});
