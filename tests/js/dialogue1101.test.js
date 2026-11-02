// THE DIALOGUE WALK OF 2026-11-01 (docs/dialogue-walk-2026-11-01.md) — the whole node graph walked as a graph,
// then read character by character. Each fix below is pinned against the node or the pool, never one string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const t = c => { out = []; run(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const talk = id => { G.room = _npcRoom(id); G.convo = null; run("talk to " + NPCS[id].name.toLowerCase()); out = []; };
const nodeIdx = (id, re) => NPCS[id].dialogue.findIndex(d => re.test(String(d.topic || "")));
// six-word runs two texts share, normalised the way tools/dialogue-walk.mjs --shared does
const grams = s => { const w = stripMarkup(String(s || "")).toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean); const g = new Set(); for (let k = 0; k + 6 <= w.length; k++) g.add(w.slice(k, k + 6).join(" ")); return g; };
const shared = (a, b) => [...grams(a)].filter(g => grams(b).has(g));
const nodeText = (id, i) => { const d = NPCS[id].dialogue[i]; return [d.text, d.short].filter(x => typeof x === "string").join(" "); };

// ── the graph pass: pre-empts, a dead atom, an uncomputed hour ──
test("Jenny's first alias for how she met Klaus reaches her own node (the camera tipper's name no longer swallows it)", () => {
  sandbox(); G.nightTurn = 40; talk("jenny");
  const i = nodeIdx("jenny", /met klaus/); assert.ok(i >= 0);
  const first = String(NPCS.jenny.dialogue[i].topic).split("|")[0];
  assert.match(t("ask jenny about " + first), /real name/);
  assert.ok((G.talked.jenny || []).includes(i), "the node is recorded as heard");
});
test("Pensri's price node is reached by its first alias (the massage menu answers OIL, not PRICES)", () => {
  sandbox(); G.nightTurn = 40; talk("pensri");
  const i = nodeIdx("pensri", /sunburn/); assert.ok(i >= 0);
  const first = String(NPCS.pensri.dialogue[i].topic).split("|")[0];
  t("ask pensri about " + first);
  assert.ok((G.talked.pensri || []).includes(i), "the node is recorded as heard");
});
test("Nont's kid-path node closes on the day he was told no, and reopens the day after (no dead flag in the gate)", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.rabbitWay = "kid"; G.known.nont = true;
  const d = NPCS.nont.dialogue[nodeIdx("nont", /rabbit's job/)];
  assert.ok(d && d.when);
  G.kidRefusedDay = G.day; assert.equal(!!d.when(_npcState("nont"), G), false, "refused today: closed");
  G.kidRefusedDay = G.day - 1; assert.equal(!!d.when(_npcState("nont"), G), true, "refused yesterday: open again");
  assert.doesNotMatch(String(d.when), /kidRefused"/, "the flag nothing sets is gone from the gate");
});
test("Bert's opening night names no clock hour the game did not compute", () => {
  const ds = NPCS.bert.dialogue.filter(d => d.topic === "opening");
  assert.equal(ds.length, 2, "one opening night per partner");
  for (const d of ds) assert.doesNotMatch(String(d.text), /\bat half (?:ten|eleven|twelve)\b|\bat (?:ten|eleven|twelve|midnight)\b/i);
});
test("Bert's errand and his league rules repeat as directions, not as a brush-off", () => {
  sandbox(); G.nightTurn = 40; talk("bert");
  const errand = NPCS.bert.dialogue.find(d => d.topic === "offer" && (d.notFlags || []).includes("plgResolved") && !(d.req || []).length);
  assert.ok(errand && errand.short && /Kitten Corner/.test(errand.short) && /Golden Dragon/.test(errand.short));
  const rules = NPCS.bert.dialogue.find(d => d.topic === "league" && !(d.req || []).length && !d.when);
  assert.ok(rules && rules.short && /third night/.test(rules.short));
  G.talked.bert = [NPCS.bert.dialogue.indexOf(rules)];
  assert.match(t("ask bert about league"), /third night/);
});
test("Bert does not give the group most of Soi 6 (the buying is one segment)", () => {
  for (const d of NPCS.bert.dialogue) assert.doesNotMatch(String(d.text || ""), /most of the paper on Soi 6/i);
});

// ── one line in two mouths (dialogue-walk --shared) ──
test("Howard explains the bank's side in his own sentences, not Nont's", () => {
  const H = NPCS.howard.dialogue.map((d, i) => nodeText("howard", i)).join("\n");
  for (let i = 0; i < NPCS.nont.dialogue.length; i++) assert.deepEqual(shared(H, nodeText("nont", i)), [], "nont#" + i);
  for (let i = 0; i < NPCS.wayne.dialogue.length; i++) assert.deepEqual(shared(H, nodeText("wayne", i)), [], "wayne#" + i);
});
test("Grace's reading of Nigel's listing is not Nigel's aphorism", () => {
  const g = nodeIdx("grace", /green neon/), n = nodeIdx("nigel", /brass plate/);
  assert.ok(g >= 0 && n >= 0);
  assert.deepEqual(shared(nodeText("grace", g), nodeText("nigel", n)), []);
});
test("Somo's family line is her own, not a floor pool line a colleague may deal the same week", () => {
  const i = nodeIdx("somo", /husband/); assert.ok(i >= 0);
  for (const line of _H_FAMILY) if (typeof line === "string") assert.deepEqual(shared(nodeText("somo", i), line), [], line.slice(0, 40));
});
test("the Queen Vic's regulars do not share the 'never once asked me' tic across three mouths", () => {
  const te = nodeIdx("terry", /^doyle/), mo = nodeIdx("mort", /sponsor/), an = nodeIdx("angela", /^terry/);
  assert.ok(te >= 0 && mo >= 0 && an >= 0);
  assert.deepEqual(shared(nodeText("terry", te), nodeText("mort", mo)), []);
  assert.deepEqual(shared(nodeText("terry", te), nodeText("angela", an)), []);
});

// ── the reader pass: claims against the constants and the dossiers ──
test("Lek's salary is the beer-bar base (BAR_SALARY), said in words her node can carry", () => {
  const d = NPCS.lek.dialogue.find(d => /^salary\|/.test(String(d.topic)));
  assert.ok(d);
  const WORDS = { 8000: "eight thousand", 9000: "nine thousand", 10000: "ten thousand", 11000: "eleven thousand", 12000: "twelve thousand", 15000: "fifteen thousand" };
  const w = WORDS[BAR_SALARY]; assert.ok(w, "BAR_SALARY has a word form in this test");
  assert.match(String(d.text).toLowerCase(), new RegExp("salary is " + w));
  assert.match(String(d.short).toLowerCase(), new RegExp("^\"" + w));
  assert.ok(String(d.topic).includes(w), "the alias matches the figure");
});
test("Orathai's two accounts of the lawyer's cut agree (ten times her thousand)", () => {
  const fee = NPCS.orathai.dialogue.find(d => /ten times that/.test(String(d.text)));
  const law = NPCS.orathai.dialogue.find(d => /^lawyer\|/.test(String(d.topic)) && !(d.req || []).length);
  assert.ok(fee && law);
  assert.match(String(law.text), /takes ten thousand for the paper/);
  assert.doesNotMatch(String(law.text), /three thousand/);
});
test("Colin keeps his own voice (no 'squire', which is Mort's) and no calendar month the game did not compute", () => {
  for (const d of NPCS.colin.dialogue) {
    const all = String(d.text || "") + " " + String(d.short || "");
    assert.doesNotMatch(all, /\bsquire\b/, "colin: " + d.topic);
    assert.doesNotMatch(all, /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/, "colin: " + d.topic);
  }
});
test("Tan's condo figures read the constants", () => {
  const d = NPCS.tan.dialogue.find(d => /^condo\|/.test(String(d.topic)));
  assert.ok(d);
  assert.ok(String(d.text).includes("฿" + CONDO_RENT.toLocaleString()));
  assert.ok(String(d.short).includes("฿" + CONDO_RENT.toLocaleString()));
});
test("nobody but Wayne and Tan (who quotes him) hands you their passport", () => {
  const who = [];
  for (const id of Object.keys(NPCS)) for (const d of NPCS[id].dialogue || []) if (/hand your passport to/.test(String(d.text))) who.push(id);
  assert.deepEqual([...new Set(who)].sort(), ["tan", "wayne"]);
});

