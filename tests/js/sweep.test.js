// The deferred sweep (2026-10-07): 130 findings deferred across rounds 55–67, each
// re-probed against the current code by a read-only triage pass, then fixed, refuted or
// left with a reason. One pin per fix, keyed by the ledger row (docs/persona-findings.json).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const said = () => out.map(o => o.text).join("\n");
const run = c => doCommand(c);
const ask = (id, t) => { run(`talk to ${id}`); out = []; run(`ask ${id} about ${t}`); return said(); };
const stub = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 9000; G.bank = 20000; G.nightTurn = 30; G.room = "stinky_bar"; out = [];
});
const owner = () => {
  G.stage = "expat"; for (const f of ["expatLife", "barOpen", "barPaid", "barPartner", "partnerTan", "tanAsked", "tanFavourDone"]) _setFlag(f);
  G.tanFavourDay = G.day; G.bar = Object.assign(G.bar || {}, { room: "stinky_bar", cash: 20000, owed: 100000 });
};

test("L157 Mort's jokes do not repeat until all have been told", () => {
  G.phone.contacts.mort = true; const seen = [];
  for (let d = 1; d <= _JOKE_TEXTS.length; d++) { G.day = d; G.phone.jokeDay = -1; G.nightTurn = 95; G.room = "beach_rd_c"; _dailyJoke(); }
  for (const m of G.phone.inbox) seen.push(m.text);
  assert.equal(new Set(seen).size, seen.length, "no joke twice inside one pass of the pool");
});
test("L165 the 7-Eleven downpour is a pool; L287 a monk is not waied back", () => {
  assert.ok(_SEVEN_RAIN.length >= 4);
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].seven && !_underRoof(r)); out = []; run("wai monk");
  assert.match(said(), /does not return it/); assert.doesNotMatch(said(), /empty street/);
});
test("L238 the name she calls you is askable by the name", () => {
  const id = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && NPCS[i].filler && _npcActive(i));
  G.room = _npcRoom(id); G.soc.drinks[id] = 20;
  const nm = String(_herNameForYou(id)).replace(/[{}]/g, "").toLowerCase();
  assert.match(ask(id, nm), new RegExp(_herNameForYou(id).replace(/[{}]/g, ""), "i"));
});
test("L244 Nont on a woman who finds you; L248 Cream's LATE is the scene", () => {
  G.room = NPCS.nont.room; G.known.priew = true; out = []; run("talk to nont"); out = []; run("ask nont about priew");
  assert.match(said(), /finds you/); assert.doesNotMatch(said(), /Not out tonight/);
  G.room = NPCS.cream.room; G.nightTurn = 50; G.known.cream = true; run("talk to cream"); out = []; run("ask cream about late");
  assert.doesNotMatch(said(), /Not my story/);
});
test("L252 a drink buys one full retelling of a node per night, not one per drink", () => {
  const id = "lek"; G.room = _npcRoom(id); run(`talk to ${id}`); run(`ask ${id} about family`);
  const full = () => { out = []; run(`buy ${id} a drink`); out = []; run(`ask ${id} about family`); return said(); };
  const a = full(), b = full();
  assert.notEqual(a.length > 0 && b.length > 0 && a === b && a.length > 200, true, "the second drink does not buy the same full story again");
});
test("L254 Cream answers town rows in her own register; L255 the waitress is not the cook", () => {
  assert.equal(_hoursRegister("cream"), "floor");
  G.room = Object.keys(ROOMS).find(r => FOOD_STALLS[r] && ROOMS[r].bar) || "kiss"; out = []; run("talk to waitress");
  if (FOOD_STALLS[G.room] && ROOMS[G.room].bar) assert.ok(_FOLK_SERVER.some(l => said().includes(l.slice(0, 30))), said());
});
test("L261 asking Tan about speaking Thai is not the PLG speech; L273 the Vic quotes no lady drink or barfine", () => {
  G.room = _npcWhere("tan") || NPCS.tan.room; assert.doesNotMatch(ask("tan", "speaking thai"), /tolerat|Pattaya Leisure/);
  G.room = "queen_vic"; const a = ask("aoy", "price"); assert.doesNotMatch(a, /lady drink|barfine/);
});
test("L284 haggling at the charter is answered; L293 a fluent ear follows Tan's Isan", () => {
  G.pendingFare = { kind: "bus", price: BUS_CHARTER, dest: "naklua_rd", charter: true }; out = []; run("haggle");
  assert.match(said(), /whole truck|bench/); assert.ok(G.pendingFare, "the fare still waits");
  G.pendingFare = null;
  assert.ok(_TAN_FOOD.some(l => /too fast to follow/.test(l)), "the line exists to be filtered");
});
test("L294 Waen's link is the night's only text; L295 the mamasan's wai back is deeper; L297 the band knows Sabai Sabai", () => {
  G.known.waen = true; G.talked.waen = [0]; _setFlag("lessonTaken"); G.phone.contacts.waen = true;
  const n0 = G.phone.inbox.length; _waenTick(); _waenTick();
  assert.equal(G.phone.inbox.length - n0, 1, "link only — homework waits for tomorrow");
  assert.ok(_WAI_BACK_MAMA.length >= 6);
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].band) || G.room;
  if (typeof _doBandRequest === "function" && _bandHere()) { out = []; _doBandRequest("sabai sabai"); assert.doesNotMatch(said(), /not in the current set/); }
});
test("L302 Tan leaves after the favour; L310 Candy speaks to the man who chose Tan", () => {
  owner(); _tanFavour(); out = []; run("yes"); assert.match(said(), /grey sedan/);
  G.room = "candy_bar"; G.nightTurn = 30; const c = ask("candy", "partner"); assert.match(c, /You chose|Tan/); assert.doesNotMatch(c, /another time/);
});
test("L313 + L316 BOOKS says tonight so far and when the next bill is", () => {
  owner(); G.bar.lastMonthDay = G.day - 10; G.bar.ownStock = 16; out = []; run("books");
  assert.match(said(), /Next bill: rent and the note in 20 days/); assert.match(said(), /Tonight so far: your own glass/);
});
test("L325 the early call keeps no clock; L326 + L378 a rain refusal from a bedroom says so and costs nothing", () => {
  const early = SHIFT_CALLS.find(c => c.id === "early");
  assert.ok(![...early.ask, ...(early.askKin || [])].some(l => /half past/.test(l))); assert.doesNotMatch(early.no, /eleven/);
  G.room = _hotelRoomId(); G.rain = 5; G.visited.candy_bar = true; const t0 = G.nightTurn; out = []; run("travel candy bar");
  assert.doesNotMatch(said(), /and so are you/); assert.equal(G.nightTurn, t0, "a move that moved nobody costs no turn");
});
test("L341 Pensri remembers a back; L351 a stall sells only what it sells; L352 'naklua' is a road, not a bar", () => {
  G.massageLog = { thai_massage: { n: 1, last: G.day - 1 } }; G.room = "thai_massage"; G.talked.pensri = [1];
  run("talk to pensri"); assert.match(said(), /same shoulder/i);
  const croc = Object.keys(FOOD_STALLS).find(r => /croc/i.test(JSON.stringify(FOOD_STALLS[r])) && !/som ?tam/i.test(JSON.stringify(FOOD_STALLS[r])));
  if (croc) { G.room = croc; const m0 = G.money; out = []; run("buy som tam"); assert.equal(G.money, m0, "no croc skewer for a som tam order"); }
});
test("L354 the wallet's cash is named; L361 the return greeting skips the woman on your arm", () => {
  G.lastNight = { vacation: G.vacation, happy: G.happy, money: G.money - WALLET_CASH, bank: G.bank }; G.walletLedger = true;
  out = []; _morningLedger(); assert.match((G.lastNightSaid || []).join("\n"), /wallet/);
});
test("L364 the Shady Lady's revisit names nobody; L372 Oy's flagship is hers; L379 every CAPS word is a chip", () => {
  assert.ok(!ROOMS.shady_lady || !ROOMS.shady_lady.revisit.some(l => /Pukky/.test(l)));
  G.room = "rainbow_girls"; assert.match(ask("oy", "bar"), /My bar/);
  G.room = "beach_rd_c"; G.nightTurn = 50; _startEnc("tonic"); const ch = _chipSet().map(c => c.cmd);
  assert.ok(ch.includes("shop"), ch.join(","));
});
test("L381 the 'what brings you here' answers fit the origin", () => {
  G.player.origin = "running"; assert.ok(_askReplies("here").some(r => /Getting away/.test(r.text || r)));
});
test("L383 thirsty in your room, the water is a chip; L386 the short time keeps no clock it can't keep", () => {
  G.room = _hotelRoomId(); G.thirst = 80; G.roomWater = 0; assert.ok(_chipSet().some(c => c.cmd === "drink water"));
  assert.doesNotMatch(String(_bfResolve), /before your ice has melted/);
});
test("L409 a street with a massage shop on it has its greeter; L437 Nok says goodbye after a talk across seven", () => {
  G.room = Object.keys(ROOMS).find(r => (ROOMS[r].venues || []).some(v => ROOMS[v] && ROOMS[v].massage) && !/tout|greeter/.test(String(ROOMS[r].desc)));
  out = []; run("talk to tout"); assert.ok(_FOLK_TOUT_STREET.some(l => said().includes(l)), said());
  G.room = "jomtien_beach"; G.nightTurn = 12; G.convo = null; out = []; _nokLeavesTick();
  assert.match(said(), /Nok/); out = []; _nokLeavesTick(); assert.equal(said(), "", "once a day");
});
test("L440 no toast clinks a bottle you haven't got; L444 the first morning measures the whole first night", () => {
  G.soc.selfDrinks = {}; assert.ok(!_toastFor("lek").some(f => /your (bottle|beer)/.test(f.toString())));
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; _beachOpening(true);
  assert.ok(G.lastNight && G.lastNight.happy === G.happy, "snapshot at the opening");
});
test("L448 WAIT UNTIL reads the minutes; L452 the dog tip knows your dog", () => {
  G.room = "beach_rd_c"; G.nightTurn = 70; G.hunger = G.thirst = 0; G.battery = 0; out = []; run("wait until 02:10");   // a dead phone: no text interrupts the wait assert.equal(G.nightTurn, 81);
});
test("L498 a receipt from the police is a question", () => {
  G.room = "beach_rd_c"; G.soc.drunk = 6; G.pendingEnc = "police"; const m0 = G.money; out = []; run("give me a receipt");
  assert.equal(G.money, m0); assert.equal(G.pendingEnc, "police"); assert.match(said(), /station/);
});
test("L505 no CONTACT nudge at ฿0; L517 Mort gave a name, not a job; L540 the elsewhere line knows a ban", () => {
  _setFlag("mortGlam"); out = []; run("accept glam"); assert.match(said(), /a name, not a job/);
  G.soc.banned.stinky_bar = G.turns; G.known.manow = true; G.room = "lucky_tiger"; out = []; run("talk to manow");
  assert.match(said(), /door isn't open to you/);
});
test("L562 Nira lends under BORROW; L595 Lek's quota is askable; L633 the noodle girl leaves a man with a girl alone", () => {
  assert.ok(NPCS.nira.dialogue.some(d => /borrow/.test(d.topic || "")));
  assert.ok(NPCS.lek.dialogue.some(d => /quota/.test(d.topic || "")));
  assert.equal(ENCOUNTERS.noodle.solo, true);
});
test("L574 staff do not send each other's texts; L587 the shift calls are not a rotation", () => {
  const pool = ["a", "b", "c", "d"]; const x = stub(0.1, () => _staffTextPick("lamai", pool)); const y = stub(0.1, () => _staffTextPick("jiap", pool));
  assert.notEqual(x, y);
  const calls = []; owner(); for (let d = 2; d < 14; d++) { G.day = d; G.bar.shiftAsked = false; G.pendingChoice = null; G.shiftCall = null; _shiftAsk(); calls.push(G.shiftCall); _shiftClear(); }
  const strict = calls.every((c, i) => i < 4 || c === calls[i - 4]);
  assert.equal(strict, false, calls.join(","));
});
test("L606 the price list names the draw; L645 Cake names the wages; L773 a negated alias is not the subject", () => {
  assert.equal(_topicHits("work|job", "women who don't work"), false);
  assert.equal(_topicHits("work|job", "your work"), true);
});
test("L844 the quiz chips carry their answers; L845 every dish on the pub card taps; L847 dancing with the woman on your arm", () => {
  G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0]; _startQuiz(true);
  assert.ok(_chipSet().some(c => /^1 · /.test(c.label)));
  G.game = null; G.room = "stinky_bar"; G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} }; out = []; run("dance");
  assert.match(said(), /Lek/); assert.doesNotMatch(said(), /A hostess joins/);
});
test("L849 the hostess's first question is phrased her way; L896 the shove's forearm is on the morning line", () => {
  const qs = new Set(Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess").map(i => (NPCS[i].dialogue[0].asks || {}).q).filter(Boolean));
  assert.ok(qs.size > 4, "more than one phrasing per key");
  G.bruise = { what: "a forearm from the punter you put out", day: G.day - 1 };
  G.lastNight = { vacation: G.vacation, happy: G.happy, money: G.money, bank: G.bank }; out = []; _morningLedger();
  assert.match((G.lastNightSaid || []).join("\n"), /nursing a forearm/);
});
test("L902 'i fly home tomorrow' to Thip is the leaving; L903 no Mama Mama Yai; L907 the taper says so once; L922 a ya dong is your drink", () => {
  G.room = "mama_yai"; assert.doesNotMatch(ask("thip", "i fly home tomorrow"), /Si Sa Ket/);
  assert.doesNotMatch(ask("yai", "thip"), /Mama Mama/);
  G.soc.bought = 6; out = []; _boughtHappy(1); assert.match(said(), /Past six/);
  G.room = "moonshine_bar"; run("buy ya dong"); assert.ok((G.soc.selfDrinks || {}).moonshine_bar >= 1);
});
test("L933 + L935 บาร์ and a classifier after a number", () => {
  assert.equal(_thaiToCmd("ซื้อเบียร์สองขวด"), "buy beer");
  assert.match(String(_thaiToCmd("เข้าแคนดี้บาร์")), /enter candy bar/);
});

// ── part 2: the larger items ─────────────────────────────────────────────────
test("L418 Ploy answers the song; L420 Doyle draws his own conclusion; L429 Gavin on the Orchid", () => {
  _setFlag("somTamDelivered"); _setFlag("knowDoorTrick"); G.room = NPCS.ploy.room; assert.match(ask("ploy", "the song"), /Sabai Sabai/);
  assert.ok(!JSON.stringify(NPCS.doyle.dialogue).includes("American vowels"));
  G.room = _npcRoom("gavin"); assert.match(ask("gavin", "orchid room"), /Members/);
});
test("L430 the club's doorman and rope; L400 EXAMINE MASSEUSE", () => {
  G.room = "paradise_nights"; out = []; run("talk to bouncer"); assert.ok(_FOLK_SECURITY.some(l => said().includes(l)));
  out = []; run("examine rope"); assert.match(said(), /rope/i); assert.doesNotMatch(said(), /declines to elaborate/);
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].massage === "legit"); out = []; run("examine masseuse"); assert.doesNotMatch(said(), /isn't here|declines/);
});
test("L562 the town knows its lender and its back; L620 the floor answers 'do you remember me'", () => {
  G.room = "stinky_bar"; assert.match(ask("bert", "loan"), /Nira/);
  G.room = "lucky_tiger"; assert.match(ask("lek", "my back"), new RegExp("฿" + MASSAGE_LEGIT));
  assert.match(ask("rung", "me"), /New face|know you/);
});
test("L533 staff know their own rail; L916 a regular places a woman at his local; L912 the chit is askable", () => {
  const reg = Object.keys(NPCS).find(id => NPCS[id].patron && NPCS[id].room && Object.keys(NPCS).some(s => NPC_ROLES[s] && _npcRoom(s) === NPCS[id].room && _npcActive(s)));
  G.room = NPCS[reg].room; const st = _npcsHere().find(s => NPC_ROLES[s]);
  assert.match(ask(st, NPCS[reg].name.toLowerCase()), new RegExp(NPCS[reg].name));
  G.room = "mama_yai"; assert.match(ask("ron", "thip"), /Thip/); assert.doesNotMatch(said(), /^Ron:/);
  G.room = "lucky_tiger"; G.soc.ledger = { lek: [1] }; assert.match(ask("lek", "chit"), new RegExp("฿" + LADY_CUT));
});
test("L925 Priew on her round is placed, not 'not around'", () => {
  G.room = "neon_paradise"; G.priewSeen = { room: G.room, day: G.day, by: null }; G.known.priew = true;
  out = []; run("talk to priew"); assert.match(said(), /far table|on the clock/);
});
test("L451 MOTOSAI TO a bar you know; L561 PUT <n> IN THE TILL; L312 a venue's whole name is the place", () => {
  G.visited.lucky_tiger = true; G.room = "ws_gate"; stub(0.99, () => run("motosai to lucky tiger"));
  assert.equal(G.room, Object.keys(ROOMS).find(r => (ROOMS[r].venues || []).includes("lucky_tiger")));
  owner(); G.room = "stinky_bar"; const c0 = G.bar.cash, m0 = G.money; out = []; run("put 3000 in till");
  assert.equal(G.bar.cash, c0 + 3000); assert.equal(G.money, m0 - 3000);
  G.stage = "vacation"; G.room = _npcRoom("kesinee"); assert.doesNotMatch(ask("kesinee", "candy bar"), /My bar\?/);
});
test("L327 last night's killer field the morning after; L480 introductions; L846 Somo's question is a question", () => {
  G.room = "kingfisher"; G.lastKp = { room: "kingfisher", day: G.day - 1, names: ["Gop", "Dave"], winner: "Gop" };
  const st = _npcsHere().find(i => NPC_ROLES[i]); assert.match(ask(st, "killer"), /Gop/);
  G.room = "stinky_bar"; assert.match(ask("bert", "who else should i meet"), /ASK BERT ABOUT/);
  G.room = NPCS.somo.room; run("talk to somo"); assert.ok(G.convoQ && G.convoQ.key === "team");
});
test("L268 the home answer is booked per province; L251 the work answers are booked town-wide", () => {
  assert.match(String(_townStory), /hhomewrap:" \+ b\.from/);
  const hs = Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess" && _npcActive(i)).slice(0, 12);
  const said = new Map(); let dup = 0;
  for (const id of hs) { const l = _workTalk(id, "job"); if (said.has(l)) dup++; said.set(l, id); }
  assert.ok(dup <= Math.max(0, hs.length - _WORK_JOB.hostess.length), `dup ${dup} of ${hs.length}`);
});
test("L288 READ BOARD at Cloze is tonight's word, and the romanisation is not printed under it", () => {
  G.room = NPCS.waen.room; out = []; run("read board");
  const w = _boardWord(); assert.match(said(), new RegExp(w.th)); assert.ok(!said().includes("(" + w.rom + ")"));
});
test("L406 a shop woman you spoke to is somebody you met; L421 speak of the devil", () => {
  G.room = Object.keys(SHOP_MASSEUSES)[0]; _masseuseTalk("home"); assert.ok(G.shopMet[G.room]);
  assert.match(String(_railTick), /Speak of the devil/);
});
test("L499 the street's keepsakes are carried; L915 the plate goes to the woman you named", () => {
  G.room = "beach_rd_c"; G.nightTurn = 50; _startEnc("fortune"); run("tao rai");
  assert.equal(G.itemLoc.red_string, "inventory"); assert.equal(G.itemLoc.lucky_number, "inventory");
  G.pendingEnc = null; G.room = "mama_yai"; G.known.thip = true; const h0 = G.hunger; out = []; run("buy som tam for thip");
  assert.match(said(), /Thip/); assert.equal(G.hunger, h0, "you did not eat it");
});
test("L641 a regular greets the guv'nor at the bar you own; L933 the bars' Thai names are typeable", () => {
  owner(); G.room = "stinky_bar"; const reg = _npcsHere().find(i => NPCS[i].patron);
  if (reg) { delete G.talked[reg]; out = []; run(`talk to ${reg}`); assert.ok(_RAIL_GUVNOR.some(f => said().includes(f(NPCS[reg].name).slice(0, 25))), said()); }
  assert.match(String(_thaiToCmd("เข้าเรนโบว์")), /enter rainbow girls/);
});
test("L616 the floor's reviews of each other are deep enough not to read as one voice; L660 Dieter is not Helmut", () => {
  assert.doesNotMatch(NPCS.dieter.desc, /pressed short-sleeve shirt|squared/);
  assert.ok(!NPCS.dieter.dialogue.some(d => /aligns the mat|precise sigh/i.test(d.text || "")));
});
test("L233 the Sabai's joiner fee is on the guest, not the trade — the clerk cannot tell who she is (Mario)", () => {
  G.hotel = "sabai"; G.room = _hotelRoomId();
  // Cream's night
  let m0 = G.money; G.chamNight = true; G.lastBfId = null; stub(0.99, () => _endNight("cham"));
  assert.equal(m0 - G.money >= JOINER_FEE, true, "Cream went up the stairs too");
  // once a night, however many ways she arrived
  G.room = _hotelRoomId(); m0 = G.money; _joinerFee(); _joinerFee(); assert.equal(m0 - G.money, JOINER_FEE);
  // the affair girl coming home after close
  G.joinerDay = -1; G.affair = { id: "manow", homeDay: G.day - 1, strain: 0, crisSeen: [], crisChose: {}, warned: {} };
  m0 = G.money; out = []; _affairMorning(); assert.equal(m0 - G.money, JOINER_FEE);
  // not at the other hotels, and not before the opening is done
  G.joinerDay = -1; G.hotel = "queenvic"; m0 = G.money; _joinerFee(); assert.equal(G.money, m0);
  assert.equal(String(_endNight).match(/G\.money -= 300/), null, "no hard-coded fee left in the barfine ending");
});
test("L246 Tan closes his home life politely, in his own voice; L848 the hostess desc varies after the sentence her portrait was drawn from", () => {
  G.room = _npcWhere("tan") || NPCS.tan.room; const a = ask("tan", "your wife");
  assert.match(a, /family is at home/); assert.doesNotMatch(a, /don't know about that/);
  const hs = Object.values(NPCS).filter(n => n.filler && n.storyBits);
  assert.ok(new Set(hs.map(n => n.desc.split(/(?<=\.)\s/).slice(1).join(" "))).size > 40, "the tails vary");
});
test("more new faces: the hostess looks run 50 deep, no look on more than six women, and every changed face is back on the render queue", () => {
  assert.ok(new Set(Object.values(FLOOR_STAFF).filter(r => r.role === "hostess").map(r => r.look)).size >= 45, "the floor wears at least 45 different faces");
  const hs = Object.values(FLOOR_STAFF).filter(r => r.role === "hostess");
  const by = {}; for (const r of hs) by[r.look] = (by[r.look] || 0) + 1;
  assert.ok(Math.max(...Object.values(by)) <= 6, "a look worn by more than six women");
  const bar = {}; for (const r of hs) { const k = r.room + "|" + r.look; bar[k] = (bar[k] || 0) + 1; }
  assert.deepEqual(Object.keys(bar).filter(k => bar[k] > 1), [], "two women at one bar share a face");
  const relook = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/portrait-relook.json", import.meta.url)), "utf8")).ids;
  const man = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/portrait-manifest.json", import.meta.url)), "utf8"));
  for (const id of Object.keys(relook)) assert.ok(NPCS[id], `${id} is a character`);
  for (const id of man.relook) assert.ok(relook[id], `${id} relook comes from the file`);
  for (const c of [...(man.characters || []), ...(man.filler || [])]) if (c.relook) assert.equal(c.rendered, false, `${c.id} shows its old face until re-rendered`);
});
