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


// ── the quest graph: GIVEN_BY, DONE_BY and AT read together ──
// A two-leg quest's where-clause follows the step (the pattern safecracker and lake_errand set): once the
// middle stop is done, HINT points back at the mouth that closes the quest, not at the stop already made.
const GRAPH = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/world-graph.json", import.meta.url)), "utf8"));
test("a quest whose flag is set by one character's node does not keep a static destination somewhere else", () => {
  const setters = {}; for (const e of GRAPH.edges) if (e.type === "SETS") (setters[e.to] = setters[e.to] || []).push(e.from.split("#")[0]);
  const bad = [];
  for (const q of GRAPH.quests) {
    const Q = QUESTS[q.id]; if (!Q || typeof Q.at === "function" || !Q.at) continue;
    const who = [...new Set(setters[q.doneFlag] || [])]; if (!who.length) continue;
    const atRoom = ROOMS[Q.at] ? Q.at : (NPCS[Q.at] && NPCS[Q.at].room);
    const setRooms = who.map(w => NPCS[w] && NPCS[w].room).filter(Boolean);
    if (!who.includes(Q.at) && atRoom && setRooms.length && !setRooms.includes(atRoom)) bad.push(`${q.id}: at ${Q.at} (${atRoom}) but ${who.join(",")} close it in ${setRooms.join(",")} — make at a function of the step`);
  }
  assert.deepEqual(bad, []);
});
test("after the middle stop, the four two-leg quests point home", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife");
  assert.equal(_qAt(QUESTS.fiftyone), "orathai"); _setFlag("fiftyoneSigned"); assert.equal(_qAt(QUESTS.fiftyone), "reginald");
  assert.equal(_qAt(QUESTS.quietside), "nok"); _setFlag("heardGordon"); assert.equal(_qAt(QUESTS.quietside), "sumalee");
  assert.equal(_qAt(QUESTS.hill_photo), "bali_hai"); G.visited.bali_hai = true; assert.equal(_qAt(QUESTS.hill_photo), "bob");
  assert.equal(_qAt(QUESTS.orchid_recon), "orchid_room"); G.visited.orchid_room = true; assert.equal(_qAt(QUESTS.orchid_recon), "doyle");
  G.quests.fiftyone = "active"; G.room = "beach_rd_c";
  assert.match(t("hint"), /Reginald is at|Where Reginald is/);
  assert.doesNotMatch(said(), /Where Orathai is tonight/);
});

// ── the massage shops (read 2026-11-02) ──
test("Waan's sign reads what the shop's own wall reads, and Pensri's register has no tilac", () => {
  const sign = NPCS.waan.dialogue.find(d => /^sign\|/.test(String(d.topic)));
  assert.ok(sign); assert.match(String(sign.text) + String(sign.short), /NO SEX/); assert.doesNotMatch(String(sign.text) + String(sign.short), /NO BOOM BOOM,/);
  assert.match(JSON.stringify(ROOMS.smile_massage), /NO SEX/, "the room's sticker is the source");
  for (const d of NPCS.pensri.dialogue) assert.doesNotMatch(String(d.text || "") + String(d.short || ""), /\btilac\b/, "pensri: " + d.topic);
});

// ── slice 1 of the second reader pass: the eight hand-authored Soi 6 floors (read 2026-11-02) ──
test("a floor woman's look is the one her own words describe", () => {
  assert.match(FLOOR_STAFF.peach_lounge_noot.look, /motherly/); assert.match(NPCS.peach_lounge_noot.dialogue[1].text, /motherly/);
  assert.match(FLOOR_STAFF.hula_hula_min.look, /Rings on every finger/); assert.match(NPCS.hula_hula_min.dialogue[1].text, /finger ringed|rings/i);
  assert.match(FLOOR_STAFF.hot_pepper_gina.look, /Half-moon glasses/); assert.ok(NPCS.hot_pepper_gina.dialogue.filter(d => /glasses/i.test(d.text)).length >= 3, "her glasses are in her own words");
  assert.match(FLOOR_STAFF.hula_hula_noon.look, /neat bun/); assert.match(NPCS.hula_hula_noon.dialogue[1].text, /neat bun/);
  for (const id of ["peach_lounge_noot", "hula_hula_min", "hot_pepper_gina", "hula_hula_noon"]) assert.ok(FLOOR_STAFF[id].desc.startsWith(FLOOR_STAFF[id].look.replace(/\.$/, "")), id + ": desc opens on the look");
  const relook = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/portrait-relook.json", import.meta.url)), "utf8")).ids;
  for (const id of ["peach_lounge_noot", "hula_hula_min", "hot_pepper_gina", "hula_hula_noon"]) assert.ok(relook[id] && relook[id].was, id + " is on the relook queue");
  assert.match(NPCS.firecracker_bar_napa.dialogue[1].text, /Early fifties.*bun.*gold hoops/);
  for (const i of [0, 1]) assert.match(NPCS.sweet_tamarind_tukta.dialogue[i].text, /cropped hair/);
});
test("no two mamasans or two cashiers on Soi 6 open with the same sentence", () => {
  const ids = Object.keys(FLOOR_OWN || {}).filter(id => /^(jade_lounge|peach_lounge|lollipop_bar|sweet_tamarind|firecracker_bar|hot_pepper|hula_hula|ladybird_bar)_/.test(id));
  const hellos = ids.flatMap(id => (NPCS[id].dialogue || []).filter(d => !d.topic && !d.when && !(d.req || []).length && !d.bond).map(d => [id, String(d.text)]));
  for (let a = 0; a < hellos.length; a++) for (let b = a + 1; b < hellos.length; b++) if (hellos[a][0].split("_").slice(0, -1).join("_") !== hellos[b][0].split("_").slice(0, -1).join("_"))
    assert.deepEqual(shared(hellos[a][1], hellos[b][1]), [], hellos[a][0] + " / " + hellos[b][0]);
});
test("the Peach, the two doors, the tiki and the count agree with themselves", () => {
  const far = NPCS.peach_lounge_farida.dialogue; assert.doesNotMatch(far.find(d => /^bar\|/.test(d.topic)).text, /ledger|run on paper/); assert.match(far[0].short, /Singha/);
  assert.match(NPCS.peach_lounge_noot.dialogue[1].text, /most of the girls/);
  assert.match(NPCS.peach_lounge_keng.dialogue[0].text, /Company man say: bin/); assert.doesNotMatch(NPCS.peach_lounge_keng.dialogue[0].text, /New boss want/);
  for (const [id, i] of [["sweet_tamarind_view", 11], ["lollipop_bar_khing", 11], ["lollipop_bar_mona", 4]]) assert.doesNotMatch(NPCS[id].dialogue[i].text, /two doors? (apart|down)/, id);
  assert.match(NPCS.hula_hula_bright.dialogue[1].text, /come with the bar/);
  assert.doesNotMatch(NPCS.hula_hula_tarn.dialogue[0].text, /number six/);
  assert.match(String(NPCS.hula_hula_tarn.dialogue[1].topic), /ayutthaya/); assert.doesNotMatch(String(NPCS.hula_hula_tarn.dialogue[1].topic), /rayong/);
  for (const [id, i] of [["peach_lounge_noot", 11], ["firecracker_bar_pang", 11], ["sweet_tamarind_tukta", 10]]) assert.doesNotMatch(NPCS[id].dialogue[i].text, /night ago/, id);
});
test("Somsri's and Mint's shorts keep their own grammar, and the Firecracker's water is a verb, not a gift", () => {
  const som = NPCS.ladybird_bar_somsri.dialogue; assert.match(som[6].short, /wife plant\. He come/); assert.match(som[7].short, /If he come out/); assert.match(som[5].text, /\{\{phone\}\}/);
  assert.match(NPCS.peach_lounge_mint.dialogue[0].short, /I am the one who notice/); assert.doesNotMatch(NPCS.peach_lounge_mint.dialogue[3].text, /how a village works/);
  const nam = NPCS.firecracker_bar_namtan.dialogue[0]; assert.match(nam.text, /\(DRINK WATER\)/); assert.doesNotMatch(nam.text, /puts a bottle in front of you/);
  sandbox(); G.nightTurn = 40; G.room = "firecracker_bar"; const m = G.money; t("drink water"); assert.ok(G.money < m, "the water is charged, as the prose now lets it be");
});

// ── slice D of the second reader pass: the Darkside, the Silk Rose, the Doghouse, Succubus (read 2026-11-02) ──
test("Oy's message for Daeng has a door: Daeng takes it once Oy has sent you, and once only", () => {
  sandbox(); G.nightTurn = 40; talk("oy"); t("ask oy about daeng");
  G.room = _npcRoom("daeng"); G.convo = null; run("talk to daeng");
  assert.match(t("ask daeng about the pig"), /Dead/); assert.ok(_flag("pigTold"));
  assert.doesNotMatch(t("ask daeng about oy"), /The pig\?/, "told once; her old Oy node answers after");
  const d = NPCS.daeng.dialogue.find(d => /^pig\|/.test(d.topic)); assert.ok(d && d.when && !d.when(_npcState("daeng"), Object.assign({}, G, { talked: {} })), "closed until Oy has spoken");
});
test("the hill's facts agree: Helmut's years, the Doghouse's two years, the Jomtien run, Wassana's gold", () => {
  assert.match(NPCS.helmut.dialogue[0].text, /twenty-eight years/);
  assert.match(NPCS.sunee.dialogue.find(d => d.topic === "gof").text, /two years/);
  for (const d of NPCS.tukky.dialogue) assert.doesNotMatch(String(d.text) + String(d.short), /Naklua run/);
  assert.match(NPCS.wassana.dialogue.find(d => /^gold\|/.test(d.topic)).text, /one salung/); assert.match(NPCS.wassana.dialogue.find(d => d.topic === "late").text, /America is awake/);
  assert.match(NPCS.sunee.dialogue.find(d => /^rule\|/.test(d.topic)).text, /Bob's room across the road/);
  assert.doesNotMatch(NPCS.doghouse_bow.dialogue[0].text, /a year ago/);
  assert.doesNotMatch(NPCS.duan.dialogue.find(d => d.topic === "daeng").text, /two bar up/);
  assert.doesNotMatch(NPCS.somjai.dialogue.find(d => /^shamrock\|/.test(d.topic)).text, /tape measure/);
  assert.doesNotMatch(NPCS.somjai.dialogue.find(d => /^family\|/.test(d.topic)).text, /February/);
  assert.match(NPCS.somjai.dialogue.find(d => /^plan\|/.test(d.topic)).text, /Aim will be a lawyer/);
  assert.match(NPCS.daeng.dialogue.find(d => d.topic === "covid").text, /we ride to the beach/);
});
test("Wa does not carry Tarn's factory, and does not recite Nid's rules twice", () => {
  assert.doesNotMatch(NPCS.wa.dialogue.find(d => /^factory\|/.test(d.topic)).text, /hard drives|Vietnam/);
  assert.match(NPCS.hula_hula_tarn.dialogue[1].text, /Hard drive/);
  assert.doesNotMatch(NPCS.wa.dialogue.find(d => d.topic === "nid").text, /never cry where a customer see/);
  assert.match(NPCS.wa.dialogue.find(d => /^rules\|/.test(d.topic)).text, /[Nn]ever cry where a customer see/);
});

// ── slice E1 of the second reader pass: the Beach Road and Jomtien story characters and patrons (read 2026-11-02) ──
const node = (id, re) => NPCS[id].dialogue.find(d => re.test(String(d.topic || "")));
test("Neil's record holds: no boy at the move, the stool line said once, the Boathouse man 'wasn't' as she puts it", () => {
  const n = NPCS.neil.dialogue;
  assert.doesNotMatch(node("neil", /^darkside/).text, /took the boy/); assert.match(node("neil", /^darkside/).text, /She went to her cousin's/);
  assert.doesNotMatch(node("neil", /^nigel/).text, /from a stool it looked the same/); assert.match(node("neil", /^mates/).text, /looked the same from a stool/);
  assert.doesNotMatch(nodeText("neil", 9), /went home/); assert.match(node("neil", /boathouse/).text, /then he wasn't, as she puts it/);
  assert.match(node("duangjai", /^father/).text, /then he was not/);
});
test("Jerry's calendar: out by noon on his beer days, no weekday asserted, and a short that adds nothing", () => {
  const hello = NPCS.david.dialogue[1]; assert.match(hello.text, /out by noon/); assert.doesNotMatch(hello.text, /days off|one of THOSE days/);
  assert.doesNotMatch(node("david", /^money/).short, /super happy|colder/);
});
test("Wayne stays Gold Coast: no 'bosh', no 'motor', no narrator's verdict, his own words for the nominee, no fixed capital", () => {
  const w = NPCS.wayne.dialogue;
  for (const d of w) assert.doesNotMatch(nodeText("wayne", w.indexOf(d)), /\bBosh\b|\bmotor\b/i, "wayne#" + w.indexOf(d));
  assert.doesNotMatch(w[5].text, /sort of man you cannot/);
  assert.deepEqual(shared(w[7].text, node("tan", /^licence/).text).filter(g => /nominee|company is real/.test(g)), []);
  assert.doesNotMatch(w[7].text, /hundred and twenty/); assert.match(w[7].text, /haven't got two million/);
  assert.match(w[8].text, /has priced it/); assert.match(w[8].text, /one, two or four/);
  sandbox(); G.nightTurn = 40; G.room = _npcRoom("wayne"); run("talk to wayne"); assert.match(t("ask wayne about work permit"), /one, two or four/);
});
test("Waen's shorts keep her uncontracted English, her beer is priced by the helper not the line, and the tap hint sits outside her quote", () => {
  for (const i of [3, 6, 11]) assert.doesNotMatch(String(NPCS.waen.dialogue[i].short), /n't|I'm|they're/, "waen#" + i);
  assert.doesNotMatch(node("waen", /two jobs/).text, /eighty baht/);
  assert.match(node("waen", /^online/).text, /nobody can\."\s*\(TEACH ONLINE/);
  assert.doesNotMatch(NPCS.waen.dialogue[0].text, /eight farang/);
});
test("the keys hang in one place — the hook under Diamond's shrine behind the till — and Wimon counts no week", () => {
  assert.match(node("wimon", /shrine/).text, /shrine behind the till/); assert.match(node("diamond", /^keys/).text, /hook under my shrine, behind the till/);
  assert.doesNotMatch(nodeText("wimon", 0), /one week/);
  assert.match(node("diamond", /^hyper/).text, /LIVED upstairs/); assert.doesNotMatch(node("diamond", /^hyper/).text, /they live UPSTAIRS/);
  for (const d of NPCS.diamond.dialogue) assert.doesNotMatch(String(d.text), /kathoey/); assert.doesNotMatch(NPCS.diamond.desc, /kathoey/);
});
test("Thip: the dress is going with customers again, the tense beat lands, two hours to Suvarnabhumi", () => {
  assert.match(node("thip", /^work/).text, /now I go with customer again/);
  assert.match(node("thip", /^husband/).text, /WORKED/); assert.doesNotMatch(node("thip", /^husband/).text, /past tense/);
  assert.match(node("thip", /^airport/).text, /Two hours on the bus/);
});
test("the old-soi mamasans keep their Tinglish in the shared pool, and Toi sells Mercedes's German, not her English", () => {
  assert.match(nodeText("toi", 8), /Best German/); assert.doesNotMatch(nodeText("toi", 8), /Best English/);
  assert.doesNotMatch(NPCS.toi.dialogue[6].text, /On the house/);
  assert.doesNotMatch(_OLD_SOI_KNOWS.peung[0].text, /puts four|its landlords|is a victim/); assert.match(_OLD_SOI_KNOWS.peung[0].text, /Nobody here is victim/);
  assert.doesNotMatch(_OLD_SOI_KNOWS.malai[0].text, /gets skipped|gets a folder/);
  assert.doesNotMatch(_OLD_SOI_KNOWS.toi[0].text, /trained half|finishes the other side|they will look/); assert.match(_OLD_SOI_KNOWS.toi[0].text, /keep walking/);
  for (const i of [3, 6]) assert.doesNotMatch(NPCS.peung.dialogue[i].text, /pours the beer|sets the beer down without a bill/, "peung#" + i);
  assert.doesNotMatch(node("peung", /^free/).text, /The beer I send you/);
});
test("Mercedes says 'furniture' once, her German drops its ending, Nee's narrator passes no sentence, Chompoo is thirty and on the relook queue", () => {
  assert.doesNotMatch(nodeText("mercedes", 4), /furniture/); assert.match(node("mercedes", /^german/).text, /Warm Haus/); assert.doesNotMatch(node("mercedes", /^german/).text, /Warmes/);
  assert.doesNotMatch(NPCS.nee.dialogue[4].text, /will not survive/);
  assert.match(NPCS.chompoo.look, /of thirty/); assert.match(FLOOR_STAFF.chompoo ? FLOOR_STAFF.chompoo.look : NPCS.chompoo.look, /of thirty/);
  const relook = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/portrait-relook.json", import.meta.url)), "utf8")).ids;
  assert.ok(relook.chompoo && /twenty-five/.test(relook.chompoo.was));
  assert.doesNotMatch(node("pukky", /^family/).text, /quite proud, actually/); assert.doesNotMatch(String(node("pukky", /^home/).short), /weren't/);
});
test("Pim's helmet bargain is one free answer in both mouths, Bank's boy is not judged in the short, and his hello asks before it answers", () => {
  assert.match(NPCS.pim.dialogue[9].text, /one answer, free/); assert.doesNotMatch(nodeText("pim", 9), /whatever you like/);
  assert.doesNotMatch(node("pim", /^bank/).short, /did right by/); assert.match(node("pim", /^bank/).short, /knows your face/);
  assert.match(NPCS.bank.dialogue[6].text, /^"You looking for Mot\?/); assert.match(NPCS.bank.dialogue[1].text, /in my own life/);
  assert.match(node("preeda", /^funeral/).text, /My husband had just bought a car/);
});
test("Cream's shorts speak her own English; Vasseur keeps his French register; Wilf's emphasis is caps; Nok's water has no hour; Duangjai points at NONT", () => {
  for (const i of [4, 5, 6, 8]) assert.doesNotMatch(String(NPCS.cream.dialogue[i].short), /says|tells|works|I'm|doesn't|She's/, "cream#" + i);
  assert.doesNotMatch(NPCS.powers.dialogue[2].choices[1].text, /Bit RICH/); assert.match(NPCS.powers.dialogue[2].choices[1].text, /"Rich, from a man drinking in one\."/);
  assert.doesNotMatch(node("wilf", /^pension/).text, /\*taking\*/); assert.match(node("wilf", /^pension/).text, /has been taking\./);
  assert.doesNotMatch(node("nok", /^regular/).text, /evening water/);
  assert.match(node("duangjai", /^family/).text, /Ask me about NONT/);
});
